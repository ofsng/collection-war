'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button, Card, DefinitionRow, Stack, StatusBadge, Text } from '@collection-war/design-system';
import type { BattleResultView } from '@collection-war/api-client';
import { useLocale } from './locale-provider';
import { gameApi, getSession, newIdempotencyKey, setSession } from '../lib/session';

/**
 * The playable loop, in the browser.
 *
 * Choose a starter → build a team → fight → see rewards → level up.
 *
 * The client DECIDES NOTHING. It sends intent and renders what the server returns, including
 * the battle replay log — which it animates rather than produces.
 */
export function GamePanel() {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [lastBattle, setLastBattle] = useState<BattleResultView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const profile = useQuery({ queryKey: ['profile'], queryFn: () => gameApi.profile(), retry: false });
  const creatures = useQuery({ queryKey: ['creatures'], queryFn: () => gameApi.creatures(), retry: false });
  const starters = useQuery({ queryKey: ['starters'], queryFn: () => gameApi.starters(), retry: false });
  const nodes = useQuery({ queryKey: ['pve'], queryFn: () => gameApi.pveNodes(), retry: false });
  const inventory = useQuery({ queryKey: ['inventory'], queryFn: () => gameApi.inventory(), retry: false });
  const team = useQuery({ queryKey: ['team'], queryFn: () => gameApi.activeTeam(), retry: false });

  /** Every mutation invalidates what it affects, so the next read is authoritative. */
  const refreshAll = () => {
    for (const key of ['profile', 'creatures', 'pve', 'inventory', 'team']) {
      void queryClient.invalidateQueries({ queryKey: [key] });
    }
  };

  const chooseStarter = useMutation({
    // The key is generated ONCE per intent, here — not inside a retry.
    mutationFn: (slug: string) => gameApi.chooseStarter(slug, newIdempotencyKey()),
    onSuccess: (result) => {
      if (!result.ok) setError(t('game.error.starter'));
      else {
        setError(null);
        refreshAll();
      }
    },
  });

  const setTeam = useMutation({
    mutationFn: (creatureId: string) =>
      gameApi.setActiveTeam({ name: 'Main', members: [{ slot: 0, creatureId }] }),
    onSuccess: refreshAll,
  });

  const fight = useMutation({
    mutationFn: (nodeId: string) => gameApi.fight(nodeId, newIdempotencyKey()),
    onSuccess: (result) => {
      if (!result.ok) {
        setError(t('game.error.battle'));
        return;
      }
      setError(null);
      setLastBattle(result.value);
      refreshAll();
    },
  });

  const levelUp = useMutation({
    mutationFn: (creatureId: string) => gameApi.levelUp(creatureId, newIdempotencyKey()),
    onSuccess: (result) => {
      if (!result.ok) setError(t('game.error.levelUp'));
      else {
        setError(null);
        refreshAll();
      }
    },
  });

  if (profile.isPending || creatures.isPending) {
    return (
      <Card>
        <Text role="status" aria-live="polite" tone="secondary">
          {t('common.loading')}
        </Text>
      </Card>
    );
  }

  const myCreatures = creatures.data?.ok ? creatures.data.value.creatures : [];
  const hasStarter = myCreatures.length > 0;
  const activeTeam = team.data?.ok ? team.data.value.team : null;

  return (
    <Stack gap="lg">
      {error ? (
        <Card>
          <Text role="alert" style={{ color: '#f85149' }}>
            {error}
          </Text>
        </Card>
      ) : null}

      {/* ── Starter selection ──────────────────────────────────────────── */}
      {!hasStarter ? (
        <Card>
          <Stack gap="md">
            <Text size="lg">{t('game.starter.title')}</Text>
            <Text tone="secondary" size="sm">
              {t('game.starter.description')}
            </Text>

            <Stack direction="row" gap="md" wrap>
              {(starters.data?.ok ? starters.data.value.starters : []).map((starter) => (
                <Card key={starter.slug} style={{ flex: '1 1 200px', minWidth: 200 }}>
                  <Stack gap="sm">
                    <Text size="lg">{t(starter.nameKey)}</Text>
                    {/* Element and class are shown as TEXT, never colour alone. */}
                    <Stack direction="row" gap="xs" wrap>
                      <StatusBadge tone="unknown" label={t(`element.${starter.element}`)} />
                      <StatusBadge tone="unknown" label={t(`class.${starter.class}`)} />
                    </Stack>
                    <Text tone="secondary" size="sm">
                      {t(starter.descriptionKey)}
                    </Text>
                    <Button
                      onClick={() => chooseStarter.mutate(starter.slug)}
                      disabled={chooseStarter.isPending}
                    >
                      {t('game.starter.choose')}
                    </Button>
                  </Stack>
                </Card>
              ))}
            </Stack>
          </Stack>
        </Card>
      ) : null}

      {/* ── Collection ─────────────────────────────────────────────────── */}
      {hasStarter ? (
        <Card>
          <Stack gap="md">
            <Text size="lg">{t('game.collection.title')}</Text>

            {myCreatures.map((creature) => {
              const inTeam = activeTeam?.members.some((m) => m.creatureId === creature.id) ?? false;
              const canLevel = creature.experience >= creature.experienceForNextLevel;

              return (
                <Card key={creature.id}>
                  <Stack gap="sm">
                    <Stack direction="row" justify="between" align="center" wrap gap="sm">
                      <Text size="lg">{t(creature.nameKey)}</Text>
                      <Stack direction="row" gap="xs" wrap>
                        <StatusBadge tone="unknown" label={t(`element.${creature.element}`)} />
                        <StatusBadge
                          tone={inTeam ? 'up' : 'unknown'}
                          label={t(inTeam ? 'game.team.inTeam' : 'game.team.notInTeam')}
                        />
                      </Stack>
                    </Stack>

                    <dl style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <DefinitionRow term={t('game.creature.level')}>{creature.level}</DefinitionRow>
                      <DefinitionRow term={t('game.creature.experience')}>
                        {creature.experience} / {creature.experienceForNextLevel}
                      </DefinitionRow>
                      <DefinitionRow term={t('game.creature.health')}>{creature.stats.health}</DefinitionRow>
                      <DefinitionRow term={t('game.creature.attack')}>{creature.stats.attack}</DefinitionRow>
                      <DefinitionRow term={t('game.creature.defense')}>
                        {creature.stats.defense}
                      </DefinitionRow>
                      <DefinitionRow term={t('game.creature.speed')}>{creature.stats.speed}</DefinitionRow>
                    </dl>

                    <Stack direction="row" gap="sm" wrap>
                      {!inTeam ? (
                        <Button onClick={() => setTeam.mutate(creature.id)} disabled={setTeam.isPending}>
                          {t('game.team.set')}
                        </Button>
                      ) : null}
                      <Button
                        variant="secondary"
                        onClick={() => levelUp.mutate(creature.id)}
                        disabled={!canLevel || levelUp.isPending}
                      >
                        {t('game.creature.levelUp')}
                      </Button>
                    </Stack>
                  </Stack>
                </Card>
              );
            })}
          </Stack>
        </Card>
      ) : null}

      {/* ── PvE ────────────────────────────────────────────────────────── */}
      {hasStarter && activeTeam ? (
        <Card>
          <Stack gap="md">
            <Text size="lg">{t('game.pve.title')}</Text>

            {(nodes.data?.ok ? nodes.data.value.nodes : []).map((node) => (
              <Stack key={node.id} direction="row" justify="between" align="center" wrap gap="sm">
                <Stack gap="xs">
                  <Text>{t(node.nameKey)}</Text>
                  <Text tone="secondary" size="xs">
                    {t('game.pve.opponentLevel')}: {node.opponentLevel}
                  </Text>
                </Stack>
                <Stack direction="row" gap="sm" align="center">
                  {node.cleared ? <StatusBadge tone="up" label={t('game.pve.cleared')} /> : null}
                  <Button onClick={() => fight.mutate(node.id)} disabled={!node.unlocked || fight.isPending}>
                    {node.unlocked ? t('game.pve.fight') : t('game.pve.locked')}
                  </Button>
                </Stack>
              </Stack>
            ))}
          </Stack>
        </Card>
      ) : null}

      {/* ── Battle result ──────────────────────────────────────────────── */}
      {lastBattle ? (
        <Card>
          <Stack gap="md">
            <Stack direction="row" justify="between" align="center" wrap>
              <Text size="lg">{t('game.battle.result')}</Text>
              <StatusBadge
                tone={lastBattle.outcome === 'SIDE_A' ? 'up' : 'down'}
                label={t(lastBattle.outcome === 'SIDE_A' ? 'game.battle.victory' : 'game.battle.defeat')}
              />
            </Stack>

            <dl style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <DefinitionRow term={t('game.battle.turns')}>{lastBattle.turnCount}</DefinitionRow>
              <DefinitionRow term={t('game.battle.experience')}>
                {lastBattle.rewards.experience}
              </DefinitionRow>
              {/* The seed is disclosed WITH the result, so a player could verify a replay. */}
              <DefinitionRow term={t('game.battle.seed')}>
                <code style={{ fontSize: 11 }}>{lastBattle.seed.slice(0, 16)}…</code>
              </DefinitionRow>
            </dl>

            {lastBattle.rewards.materials.length > 0 ? (
              <Stack gap="xs">
                <Text size="sm">{t('game.battle.materials')}</Text>
                {lastBattle.rewards.materials.map((material) => (
                  <Text key={material.materialSlug} tone="secondary" size="sm">
                    {t(`material.${material.materialSlug}.name`)} × {material.quantity}
                  </Text>
                ))}
              </Stack>
            ) : null}

            <details>
              <summary style={{ cursor: 'pointer', color: '#9aa5b1', fontSize: 14 }}>
                {t('game.battle.log')}
              </summary>
              <div style={{ maxHeight: 220, overflowY: 'auto', marginTop: 8 }}>
                {lastBattle.events.map((event) => (
                  <Text key={event.sequence} tone="secondary" size="xs">
                    {event.turn}. {event.type}
                    {typeof event.data.amount === 'number' ? ` — ${event.data.amount}` : ''}
                  </Text>
                ))}
              </div>
            </details>
          </Stack>
        </Card>
      ) : null}

      {/* ── Inventory ──────────────────────────────────────────────────── */}
      {hasStarter ? (
        <Card>
          <Stack gap="sm">
            <Text size="lg">{t('game.inventory.title')}</Text>
            {(inventory.data?.ok ? inventory.data.value.materials : []).map((material) => (
              <Stack key={material.materialSlug} direction="row" justify="between">
                <Text size="sm">{t(material.nameKey)}</Text>
                <Text size="sm">× {material.quantity}</Text>
              </Stack>
            ))}
            {(inventory.data?.ok ? inventory.data.value.materials.length : 0) === 0 ? (
              <Text tone="secondary" size="sm">
                {t('game.inventory.empty')}
              </Text>
            ) : null}
          </Stack>
        </Card>
      ) : null}

      <Button variant="secondary" onClick={() => setSession(null)}>
        {t('auth.signOut')}
      </Button>
    </Stack>
  );
}

/** Whether a session exists. Exported so the page can switch between auth and game. */
export function useHasSession(): boolean {
  return getSession() !== null;
}
