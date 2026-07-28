# Transaction Boundaries

> Audience: anyone writing an operation that changes state. Date: 2026-07-28.

---

## The rule

**One player action = one transaction.**

If a player pressed one button, everything that follows commits together or not at all. There
is no acceptable state in which a battle was recorded but its rewards were not.

---

## Boundaries per operation

| Operation                 | Inside the transaction                                                  | Isolation        |
| ------------------------- | ----------------------------------------------------------------------- | ---------------- |
| **Register**              | user, profile, settings                                                 | READ COMMITTED   |
| **Choose starter**        | idempotency reserve, owned creature, history, event                     | READ COMMITTED   |
| **Create / edit team**    | team, members (delete + insert), ownership re-check                     | READ COMMITTED   |
| **Resolve battle**        | battle session, actions, rewards, inventory, experience, history, event | READ COMMITTED   |
| **Claim reward**          | idempotency reserve, inventory, experience, history, event              | READ COMMITTED   |
| **Level up**              | creature update (version-checked), material consume, history, event     | READ COMMITTED   |
| **Craft**                 | idempotency, consume inputs, produce outputs, history, event            | **SERIALIZABLE** |
| **Marketplace list**      | ownership check, lock, escrow, listing, event                           | **SERIALIZABLE** |
| **Marketplace purchase**  | listing lock, ledger entries, ownership transfer, close, history, event | **SERIALIZABLE** |
| **Any currency movement** | ledger entries (balanced), audit                                        | **SERIALIZABLE** |

`SERIALIZABLE` is used where an invariant spans rows the statements do not themselves lock —
"the total escrowed must not exceed the balance", "this listing sells once". `READ COMMITTED`
is correct where a single versioned row carries the invariant.

The authoritative list is `SERIALIZABLE_OPERATIONS` in
`packages/domain/src/unit-of-work.ts`. It is data, not folklore.

---

## What must never be inside a transaction

```ts
await unitOfWork.run(async (tx) => {
  await repo.update(creature, tx);
  await sendPushNotification(...);   // ✗ a rollback cannot un-send this
  await fetch('https://...');        // ✗ holds the transaction open on a network call
  await new Promise(r => setTimeout(r, 5000)); // ✗ holds locks while sleeping
});
```

**Side effects go to the outbox**, inside the transaction, and are delivered after it commits:

```ts
await unitOfWork.run(async (tx) => {
  await repo.update(creature, tx);
  await outbox.enqueue(creatureLevelledUp({ ... }), tx);   // ✓ a row, not a call
});
```

The event exists **if and only if** the business change committed. Nothing else gives that
guarantee without distributed transactions.

---

## Battle resolution: the ordering that matters

```ts
// 1. OUTSIDE the transaction — reads and pure computation.
//    Resolution is CPU-bound and can take milliseconds; holding a transaction open across it
//    would hold locks for no reason.
const { team, creatures, encounter } = await load(playerId, nodeId);
const seed = randomBytes(16).toString('hex');
const result = engine.resolve(buildInput(team, creatures, encounter, seed));

// 2. INSIDE the transaction — every write, together.
await unitOfWork.run(async (tx) => {
  const existing = await idempotency.reserve(key, 'pve.battle', tx);
  if (existing) return existing.result;          // a retry returns the original

  await battles.record(result, tx);
  await rewards.grant(playerId, result.rewards, 'battle', result.battleId, key, tx);
  await progress.markCleared(playerId, nodeId, tx);
  await outbox.enqueue(battleResolved({ ... }), tx);
  await idempotency.complete(key, 'pve.battle', response, tx);
  return response;
});
```

Pure computation outside; every write inside. This is the pattern every game operation
follows.

---

## Idempotency

**Required** on any operation that creates value or changes ownership:

starter selection · reward claim · level-up · craft · marketplace list, cancel and purchase ·
any currency movement.

The mechanism is the **unique index** on `(key, scope)`, not an application check.

```ts
// ✗ a race. Under concurrency this resolves as double execution.
const existing = await findByKey(key);
if (!existing) await create(key);

// ✓ the database decides. One insert wins; the other gets a unique violation.
const existing = await idempotency.reserve(key, scope, tx);
if (existing?.completed) return existing.result;
```

`scope` namespaces the key by operation, so a client reusing one key across two different
operations does not receive the wrong cached result from the second.

---

## Optimistic concurrency

Mutable player rows carry a `version`. Every update includes the version it read:

```sql
UPDATE owned_creatures
   SET level = $1, experience = $2, version = version + 1, updated_at = now()
 WHERE id = $3 AND player_id = $4 AND version = $5 AND deleted_at IS NULL;
-- 0 rows → someone else wrote first → STALE_WRITE → re-read and retry
```

Note `player_id` in the `WHERE` clause. **Ownership is re-verified inside the write itself**,
not checked earlier and trusted — a creature can be sold between the check and the write.

---

## Serialization failures are expected

Under `SERIALIZABLE`, PostgreSQL will sometimes abort a transaction with SQLSTATE `40001`.
**This is the isolation level working**, not an error.

`createUnitOfWork` retries with jittered backoff. Two consequences for anything written inside
a transaction:

- it must be **safe to run twice** — which is why side effects go to the outbox;
- it should be **short**, because a long transaction conflicts more often.

> **This retry path has never executed.** PGlite is single-connection and cannot produce a
> serialization conflict. Verifying it needs real PostgreSQL —
> [ADR-0025](../adr/ADR-0025-pglite-for-integration-tests.md).

---

## Checklist for a new operation

- [ ] One player action, one transaction
- [ ] Pure computation outside; writes inside
- [ ] No external side effect inside — outbox instead
- [ ] Idempotency key if it creates value or moves ownership
- [ ] Ownership re-verified **in the write**, via `WHERE player_id = ...`
- [ ] Optimistic concurrency on mutable rows
- [ ] Correct isolation level; `SERIALIZABLE` if listed
- [ ] History row for anything auditable
- [ ] Domain event enqueued in the same transaction
- [ ] Tested: success · failure rolls back · **retry returns the original**

Related: [DATA_ARCHITECTURE.md](DATA_ARCHITECTURE.md) ·
[GAME_STATE_OWNERSHIP.md](GAME_STATE_OWNERSHIP.md) ·
[EVENT_ARCHITECTURE.md](EVENT_ARCHITECTURE.md)
