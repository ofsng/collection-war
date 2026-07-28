import { Body, Controller, Get, Headers, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { idempotencyKeySchema, localeSchema, uuidSchema } from '@collection-war/validation';
import { AuthGuard, actorOf } from '../auth/auth.guard';
import { parseBody, unwrapOrThrow } from '../common/http';
import { ContentService } from './content.service';
import { CreaturesService } from './creatures.service';
import { TeamsService } from './teams.service';
import { PveService } from './pve.service';
import { InventoryService } from './inventory.service';
import { ProfileService } from './profile.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

/**
 * The game API.
 *
 * Controllers are thin: parse, delegate, map. No business rule lives here — if a controller
 * decided whether a player could afford something, that rule would be untestable without
 * HTTP and invisible to the worker process that also needs it.
 *
 * **Every handler reads the player id from the authenticated actor**, never from the body or
 * a query parameter. A client-supplied player id would let any player act as any other.
 */
@ApiTags('game')
@Controller('api/v1')
export class GameController {
  constructor(
    private readonly content: ContentService,
    private readonly creatures: CreaturesService,
    private readonly teams: TeamsService,
    private readonly pve: PveService,
    private readonly inventory: InventoryService,
    private readonly profile: ProfileService,
  ) {}

  // ─────────────────────────────────────────────────────────────── catalog

  @Get('catalog/starters')
  @ApiOperation({ summary: 'The selectable starter species. Public.' })
  async starters() {
    const version = await this.content.currentVersion();
    const starters = await this.content.starters(version);

    return {
      contentVersion: version,
      starters: starters.map((species) => ({
        slug: species.slug,
        nameKey: species.nameKey,
        descriptionKey: species.descriptionKey,
        element: species.element,
        class: species.class,
        rarity: species.rarity,
        artKey: species.artKey,
        abilities: species.abilities.map((ability) => ({
          slug: ability.slug,
          nameKey: ability.nameKey,
          kind: ability.kind,
        })),
      })),
    };
  }

  // ─────────────────────────────────────────────────────────────── profile

  @Get('profile')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "The authenticated player's own profile." })
  async getProfile(@Req() request: unknown) {
    const actor = actorOf(request);
    const profile = await this.profile.get(actor.playerId);

    if (!profile) throw new NotFoundException('Profile not found');
    return profile;
  }

  @Put('profile/settings/locale')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Set the locale. Stored server-side, so every client agrees.' })
  async setLocale(@Req() request: unknown, @Body() body: unknown) {
    const actor = actorOf(request);
    const input = parseBody(z.object({ locale: localeSchema }), body);

    return unwrapOrThrow(await this.profile.setLocale(actor.playerId, input.locale));
  }

  // ────────────────────────────────────────────────────────────── creatures

  @Get('creatures')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "The player's own creatures." })
  async listCreatures(@Req() request: unknown) {
    const actor = actorOf(request);
    return { creatures: await this.creatures.listForPlayer(actor.playerId) };
  }

  @Get('creatures/:id')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'One creature. 404 if it is not the requester’s.' })
  async getCreature(@Req() request: unknown, @Param('id') id: string) {
    const actor = actorOf(request);
    const creature = await this.creatures.getById(actor.playerId, id);

    // Not found and not-yours are indistinguishable — distinguishing them would let an
    // attacker enumerate other players' creature ids.
    if (!creature) throw new NotFoundException('Creature not found');
    return creature;
  }

  @Post('creatures/starter')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Grant the starter creature. Idempotent; one per player, ever.' })
  async chooseStarter(
    @Req() request: unknown,
    @Body() body: unknown,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ) {
    const actor = actorOf(request);
    const input = parseBody(z.object({ speciesSlug: z.string().min(1).max(64) }), body);

    return unwrapOrThrow(
      await this.creatures.grantStarter(
        actor.playerId,
        input.speciesSlug,
        requireIdempotencyKey(idempotencyKey),
      ),
    );
  }

  @Post('creatures/:id/level-up')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Level a creature up by one. Idempotent; consumes materials.' })
  async levelUp(
    @Req() request: unknown,
    @Param('id') id: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ) {
    const actor = actorOf(request);

    return unwrapOrThrow(
      await this.creatures.levelUp(actor.playerId, id, requireIdempotencyKey(idempotencyKey)),
    );
  }

  // ────────────────────────────────────────────────────────────────── teams

  @Get('teams/active')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "The player's active team." })
  async getTeam(@Req() request: unknown) {
    const actor = actorOf(request);
    return { team: await this.teams.getActive(actor.playerId) };
  }

  @Put('teams/active')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Set the active team. Validates ownership of every member.' })
  async setTeam(@Req() request: unknown, @Body() body: unknown) {
    const actor = actorOf(request);
    const input = parseBody(
      z.object({
        name: z.string().trim().min(1).max(40),
        members: z
          .array(z.object({ slot: z.number().int().min(0).max(3), creatureId: uuidSchema }))
          .min(1)
          .max(4),
      }),
      body,
    );

    return unwrapOrThrow(await this.teams.setActiveTeam(actor.playerId, input.name, input.members));
  }

  // ──────────────────────────────────────────────────────────────────── PvE

  @Get('pve/nodes')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'PvE nodes with the player’s progress merged in.' })
  async listNodes(@Req() request: unknown) {
    const actor = actorOf(request);
    return { nodes: await this.pve.listNodes(actor.playerId) };
  }

  @Post('pve/nodes/:id/battles')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Fight a node. The server seeds, resolves and grants. Idempotent.',
  })
  async fight(
    @Req() request: unknown,
    @Param('id') nodeId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ) {
    const actor = actorOf(request);

    return unwrapOrThrow(await this.pve.fight(actor.playerId, nodeId, requireIdempotencyKey(idempotencyKey)));
  }

  @Get('battles/:id')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'A battle record and its replay log. 404 if not a participant.' })
  async getBattle(@Req() request: unknown, @Param('id') battleId: string) {
    const actor = actorOf(request);
    return unwrapOrThrow(await this.pve.getBattle(actor.playerId, battleId));
  }

  // ────────────────────────────────────────────────────────────── inventory

  @Get('inventory')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "The player's materials." })
  async getInventory(@Req() request: unknown) {
    const actor = actorOf(request);
    return { materials: await this.inventory.listForPlayer(actor.playerId) };
  }
}

/**
 * Requires and validates the idempotency key on a value-creating write.
 *
 * The key is client-supplied and therefore attacker-controlled: bounding its length and
 * character set stops it being used as a storage-abuse or injection vector.
 */
function requireIdempotencyKey(value: string | undefined): string {
  if (!value) {
    throw new BadRequestException(
      'An Idempotency-Key header is required for this operation. Generate one per intent and reuse it on retry.',
    );
  }

  const parsed = idempotencyKeySchema.safeParse(value);
  if (!parsed.success) {
    throw new BadRequestException('Idempotency-Key must be 16-128 URL-safe characters');
  }

  return parsed.data;
}
