# Runbook: Backups

> Audience: whoever is responsible for not losing player data. Date: 2026-07-28.
> **No hosted database exists, so no backups are configured. This is the requirement, written
> before it is needed rather than during an incident.**

---

## The rule that matters most

> **An untested backup is not a backup. It is a hypothesis.**

Backup systems fail silently in ways that are only discovered when they are needed: the job
stopped weeks ago, the dump is truncated, the encryption key is on the machine that died, the
restore takes twelve hours nobody budgeted for.

**A restore must be performed on a schedule, from the real backups, into a real database.**
If a restore has not been done recently, the correct statement is "we do not know whether we
can recover", not "we have backups".

---

## Requirements

| Requirement                          | Why                                                                             |
| ------------------------------------ | ------------------------------------------------------------------------------- |
| Automated daily full backup          | Manual backups stop happening                                                   |
| **Point-in-time recovery**           | "Restore to just before the bad migration at 14:32"                             |
| **≥ 30 days retention**              | An economy bug can take weeks to notice; a 7-day window may already be too late |
| Encrypted at rest                    | It contains everything about every player                                       |
| **Key stored separately**            | A key alongside the backup protects nothing                                     |
| Stored off the database host         | A host failure must not take the backups with it                                |
| **Scheduled restore test**           | See above                                                                       |
| Restore time measured and documented | It is an input to every incident decision                                       |
| Monitored, with alerts on failure    | A silently stopped backup job is the normal failure                             |

### Why 30 days

Most retention windows are set for hardware failure, which is noticed immediately. The
scenario that actually drives this number is different: **a slow economy bug**.

A subtle duplication exploit can run for weeks before reconciliation or a player report
surfaces it. Investigating it requires data from before it started. A 7-day window means the
evidence is already gone by the time the question is asked.

---

## What must be backed up

| Data             | Backed up             | Notes                                                                                         |
| ---------------- | --------------------- | --------------------------------------------------------------------------------------------- |
| PostgreSQL       | **Yes**               | Everything durable. The critical one.                                                         |
| Object storage   | Yes                   | Versioning or cross-region replication                                                        |
| Redis            | **No**                | Cache and queue only. Rebuildable by design — see [ADR-0011](../adr/ADR-0011-redis-bullmq.md) |
| Application logs | Separately, shorter   | Diagnostic, not authoritative                                                                 |
| Secrets          | **Not with the data** | Separate store, separate access, separate backup                                              |

If losing Redis would lose something a player owns, that thing is in the wrong place.

---

## Local development

Local data is disposable. This is convenience, not disaster recovery:

```bash
# dump
docker compose -p collection-war exec -T postgres \
  pg_dump -U collection_war -d collection_war --format=custom \
  > infrastructure/database/backups/local-$(date +%Y%m%d-%H%M).dump

# restore
docker compose -p collection-war exec -T postgres \
  pg_restore -U collection_war -d collection_war --clean --if-exists \
  < infrastructure/database/backups/local-YYYYMMDD-HHMM.dump

# start over
pnpm infra:reset -- --yes && pnpm infra:up && pnpm db:migrate
```

`infrastructure/database/backups/` is git-ignored. **Never commit a dump** — even a local one
establishes the habit, and one day it will contain something real.

---

## Restore procedure (to be written properly when there is a database)

The shape it must take:

1. **Stop the bleeding.** Take the application offline or into read-only mode. Restoring
   underneath a running application produces a worse state than the one you started with.
2. **Decide the target time.** For a bad migration, just before it. For data corruption, just
   before the first bad write — which requires knowing when that was, which requires the
   audit trail.
3. **Restore to a new instance**, never over the live one. If the restore is wrong, you still
   have the original.
4. **Verify** before switching: row counts, the most recent records, and
   **economy reconciliation must balance**.
5. **Switch over**, then re-verify.
6. **Account for the gap.** Every write between the restore point and now is gone. For an
   economy that means players losing purchases and trades they have already seen — which is a
   communication and compensation problem, not just a technical one.
7. **Write it down.** See [incident response](INCIDENT_RESPONSE.md).

---

## Before production

- [ ] Automated daily backups with PITR
- [ ] Retention ≥ 30 days
- [ ] Encryption at rest, key stored separately
- [ ] **A restore performed successfully into a real database**
- [ ] Restore time measured and documented
- [ ] Alerting on backup failure
- [ ] A restore-test schedule agreed and someone owning it
- [ ] This runbook completed with the real, provider-specific commands

Related: [Database](DATABASE.md) · [Migrations](MIGRATIONS.md) ·
[Incident response](INCIDENT_RESPONSE.md)
