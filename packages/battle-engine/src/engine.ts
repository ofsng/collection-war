import {
  applyBp,
  applyDefense,
  createSeededRandom,
  deriveSeed,
  elementDamageMultiplier,
  elementStatusMultiplier,
  classifyEffectiveness,
} from '@collection-war/domain';
import type { RandomSource } from '@collection-war/shared-types';
import { CURRENT_RULESET, type BattleRuleset } from './ruleset';
import type {
  Ability,
  BattleCreature,
  BattleEngine,
  BattleEvent,
  BattleInput,
  BattleOutcome,
  BattleResult,
} from './types';

/**
 * The deterministic battle engine.
 *
 * Same input + same seed ⇒ byte-identical output, on any machine, in any process, forever.
 *
 * Everything in this file obeys the five properties in
 * docs/adr/ADR-0015-deterministic-battle-engine.md:
 *   framework-independent · deterministic · pure · server-authoritative · versioned.
 *
 * The engine never reads a clock, never draws ambient randomness, performs no I/O, does not
 * mutate its input, and never iterates an unordered collection where it affects the result.
 */

/** Mutable per-battle state. Built from the input; the input itself is never touched. */
interface CombatantState {
  readonly creature: BattleCreature;
  readonly side: 'A' | 'B';
  /** Position in the participant's ordered creature list — the turn-order tiebreak. */
  readonly order: number;
  health: number;
  energy: number;
  defending: boolean;
  burnTurnsRemaining: number;
}

class DeterministicBattleEngine implements BattleEngine {
  constructor(private readonly ruleset: BattleRuleset) {}

  get version() {
    return this.ruleset.version;
  }

  resolve(input: BattleInput): BattleResult {
    const events: BattleEvent[] = [];
    let sequence = 0;

    const emit = (turn: number, type: BattleEvent['type'], data: BattleEvent['data']): void => {
      sequence += 1;
      events.push({ turn, sequence, type, data });
    };

    // Separate random streams per purpose. Sharing one stream would mean that adding a new
    // roll anywhere shifts every subsequent value — and every recorded battle would replay
    // differently after the change.
    const damageRandom = createSeededRandom(deriveSeed(input.seed, 'damage-variance'));
    const critRandom = createSeededRandom(deriveSeed(input.seed, 'critical'));
    const statusRandom = createSeededRandom(deriveSeed(input.seed, 'status-application'));

    const combatants = this.buildCombatants(input);

    emit(0, 'battle_started', {
      combatants: combatants.length,
      seed: input.seed,
      ruleset: this.ruleset.version,
    });

    let turn = 0;
    let outcome: BattleOutcome = 'DRAW';

    while (turn < this.ruleset.maxTurns) {
      turn += 1;

      // Recomputed each turn: speed can change, and a defeated creature must drop out.
      const order = this.turnOrder(combatants);

      for (const actor of order) {
        if (actor.health <= 0) continue;

        emit(turn, 'turn_started', { actor: actor.creature.instanceId, energy: actor.energy });

        this.tickBurn(actor, turn, emit);
        if (actor.health <= 0) continue;

        actor.defending = false;
        actor.energy = Math.min(this.ruleset.maxEnergy, actor.energy + this.ruleset.energyPerTurn);

        const target = this.selectTarget(combatants, actor.side);
        if (!target) break;

        this.act(actor, target, turn, emit, { damageRandom, critRandom, statusRandom });

        if (this.sideDefeated(combatants, 'A') || this.sideDefeated(combatants, 'B')) break;
      }

      const aDown = this.sideDefeated(combatants, 'A');
      const bDown = this.sideDefeated(combatants, 'B');

      if (aDown || bDown) {
        outcome = aDown && bDown ? 'DRAW' : aDown ? 'SIDE_B' : 'SIDE_A';
        break;
      }
    }

    // Reaching the turn cap is a draw, not an error. An unbounded battle would be a hung
    // request and a permanently stuck player.
    emit(turn, 'battle_ended', { outcome, turns: turn });

    return {
      battleId: input.battleId,
      outcome,
      seed: input.seed,
      engineVersion: this.ruleset.version,
      contentVersion: input.contentVersion,
      turnCount: turn,
      events,
      finalState: combatants.map((c) => ({
        instanceId: c.creature.instanceId,
        side: c.side,
        remainingHealth: Math.max(0, c.health),
        maxHealth: c.creature.stats.health,
      })),
    };
  }

  /** Builds mutable state from the input without mutating the input. */
  private buildCombatants(input: BattleInput): CombatantState[] {
    const combatants: CombatantState[] = [];

    for (const participant of input.participants) {
      participant.creatures.forEach((creature, order) => {
        combatants.push({
          creature,
          side: participant.side,
          order,
          health: creature.stats.health,
          energy: this.ruleset.startingEnergy,
          defending: false,
          burnTurnsRemaining: 0,
        });
      });
    }

    return combatants;
  }

  /**
   * Turn order: fastest first.
   *
   * Ties break by side (A before B), then by the creature's position in its ordered list.
   * A deterministic tiebreak is essential — `sort` is not required to be stable across
   * engines, and an unstable tiebreak would make the same battle resolve differently on two
   * machines.
   */
  private turnOrder(combatants: readonly CombatantState[]): CombatantState[] {
    return combatants
      .filter((c) => c.health > 0)
      .slice()
      .sort((a, b) => {
        if (b.creature.stats.speed !== a.creature.stats.speed) {
          return b.creature.stats.speed - a.creature.stats.speed;
        }
        if (a.side !== b.side) return a.side === 'A' ? -1 : 1;
        return a.order - b.order;
      });
  }

  /**
   * Target selection.
   *
   * Deterministic: the first living opponent in list order. Not random, because a random
   * target would make the outcome depend on a stream that adding an ability could shift.
   */
  private selectTarget(combatants: readonly CombatantState[], actorSide: 'A' | 'B'): CombatantState | null {
    return combatants.find((c) => c.side !== actorSide && c.health > 0) ?? null;
  }

  private sideDefeated(combatants: readonly CombatantState[], side: 'A' | 'B'): boolean {
    return combatants.filter((c) => c.side === side).every((c) => c.health <= 0);
  }

  /**
   * Chooses and performs an action.
   *
   * The decision is deterministic and intentionally simple: use the strongest affordable
   * ability, otherwise a basic attack. It is the same logic for the player's team and the
   * opponent, because a PvE battle resolves in one server call — the client submits intent,
   * not per-turn actions. See docs/architecture/GAME_ARCHITECTURE.md.
   */
  private act(
    actor: CombatantState,
    target: CombatantState,
    turn: number,
    emit: (turn: number, type: BattleEvent['type'], data: BattleEvent['data']) => void,
    random: { damageRandom: RandomSource; critRandom: RandomSource; statusRandom: RandomSource },
  ): void {
    const affordable = actor.creature.abilities
      .filter((ability, index) => index > 0 && ability.energyCost <= actor.energy)
      .sort((a, b) => b.powerBp - a.powerBp);

    const chosen = affordable[0];

    if (!chosen) {
      const basic = actor.creature.abilities[0];
      if (!basic) return;

      actor.energy = Math.min(this.ruleset.maxEnergy, actor.energy + this.ruleset.energyPerBasicAttack);
      emit(turn, 'basic_attack', { actor: actor.creature.instanceId, target: target.creature.instanceId });
      this.applyDamage(actor, target, basic, turn, emit, random);
      return;
    }

    actor.energy -= chosen.energyCost;
    emit(turn, 'ability_used', {
      actor: actor.creature.instanceId,
      target: target.creature.instanceId,
      ability: chosen.slug,
      energyRemaining: actor.energy,
    });

    if (chosen.kind === 'HEAL') {
      const healed = applyBp(actor.creature.stats.focus, chosen.powerBp);
      const before = actor.health;
      actor.health = Math.min(actor.creature.stats.health, actor.health + healed);
      emit(turn, 'healed', { target: actor.creature.instanceId, amount: actor.health - before });
      return;
    }

    this.applyDamage(actor, target, chosen, turn, emit, random);
  }

  /**
   * The damage pipeline.
   *
   * Integer arithmetic at every step. Coefficients are basis points applied with an explicit
   * floor, so two platforms cannot disagree in the last bit of a float.
   */
  private applyDamage(
    actor: CombatantState,
    target: CombatantState,
    ability: Ability,
    turn: number,
    emit: (turn: number, type: BattleEvent['type'], data: BattleEvent['data']) => void,
    random: { damageRandom: RandomSource; critRandom: RandomSource; statusRandom: RandomSource },
  ): void {
    const drivingStat = ability.kind === 'SPECIAL' ? actor.creature.stats.focus : actor.creature.stats.attack;

    // 1. Base damage from the driving stat and the ability coefficient.
    let damage = applyBp(drivingStat, ability.powerBp);

    // 2. Element interaction.
    const elementBp = elementDamageMultiplier(actor.creature.element, target.creature.element);
    damage = applyBp(damage, elementBp);

    // 3. Critical hit.
    const critRoll = random.critRandom.nextInt(1, 10_000);
    const isCritical = critRoll <= actor.creature.stats.critRate;
    if (isCritical) damage = applyBp(damage, actor.creature.stats.critPower);

    // 4. Variance, deterministic from the seed.
    const variance = random.damageRandom.nextInt(
      -this.ruleset.damageVarianceBp,
      this.ruleset.damageVarianceBp,
    );
    damage = applyBp(damage, 10_000 + variance);

    // 5. Defense mitigation — hyperbolic, so it never reaches zero or goes negative.
    damage = applyDefense(damage, target.creature.stats.defense, this.ruleset.defenseMitigationConstant);

    // 6. Defending.
    if (target.defending) damage = applyBp(damage, this.ruleset.defendMitigationBp);

    // 7. Floor, so a heavily-mitigated hit still does something.
    damage = Math.max(this.ruleset.minimumDamage, damage);

    target.health -= damage;

    emit(turn, 'damage_dealt', {
      actor: actor.creature.instanceId,
      target: target.creature.instanceId,
      ability: ability.slug,
      amount: damage,
      critical: isCritical,
      effectiveness: classifyEffectiveness(elementBp),
      remainingHealth: Math.max(0, target.health),
    });

    // 8. Status, on a separate stream so damage rolls are unaffected by status logic.
    if (ability.burnChanceBp > 0 && target.health > 0) {
      const statusBp = applyBp(
        ability.burnChanceBp,
        elementStatusMultiplier(actor.creature.element, target.creature.element),
      );
      // Resistance reduces the chance, but never to zero.
      const effectiveChance = Math.max(0, statusBp - target.creature.stats.resistance * 10);

      if (random.statusRandom.nextInt(1, 10_000) <= effectiveChance) {
        target.burnTurnsRemaining = this.ruleset.burnDurationTurns;
        emit(turn, 'status_applied', {
          target: target.creature.instanceId,
          status: 'BURN',
          turns: this.ruleset.burnDurationTurns,
        });
      }
    }

    if (target.health <= 0) {
      emit(turn, 'creature_defeated', { creature: target.creature.instanceId });
    }
  }

  /** Burn ticks at the start of the affected creature's own turn. */
  private tickBurn(
    combatant: CombatantState,
    turn: number,
    emit: (turn: number, type: BattleEvent['type'], data: BattleEvent['data']) => void,
  ): void {
    if (combatant.burnTurnsRemaining <= 0) return;

    const damage = Math.max(1, applyBp(combatant.creature.stats.health, this.ruleset.burnDamagePerTurnBp));

    combatant.health -= damage;
    combatant.burnTurnsRemaining -= 1;

    emit(turn, 'status_ticked', {
      target: combatant.creature.instanceId,
      status: 'BURN',
      amount: damage,
      remainingTurns: combatant.burnTurnsRemaining,
      remainingHealth: Math.max(0, combatant.health),
    });

    if (combatant.health <= 0) {
      emit(turn, 'creature_defeated', { creature: combatant.creature.instanceId });
    }
  }
}

/** Creates an engine for a ruleset. Defaults to the current one. */
export function createBattleEngine(ruleset: BattleRuleset = CURRENT_RULESET): BattleEngine {
  return new DeterministicBattleEngine(ruleset);
}
