# Runbook: Releases

> Audience: whoever ships the first release. Date: 2026-07-28.
> **Nothing has been released. No deployment target exists.**

---

## Current state

|                     |                              |
| ------------------- | ---------------------------- |
| Environments        | **None**                     |
| Release process     | **None executed**            |
| CI deploy workflows | **None**, deliberately       |
| Versioning scheme   | Decided below, never applied |

An automatic production deploy is a loaded weapon. Writing one before there is an environment
to deploy to, a tested rollback, and monitoring that would notice a bad deploy, produces
untested automation pointed at production — worse than no automation.

The CI workflows that exist **verify** code. They do not ship it.

---

## Branching

```text
main                      always releasable, always green
  ├── feat/CW-0007-...    features
  ├── fix/...             fixes
  ├── chore/...           tooling, dependencies
  └── docs/...            documentation only
```

**`main` is always releasable.** Not "usually". If `main` is red, fixing it is the priority
over any other work.

Branch names carry the task id where there is one, so a branch traces to its packet.

---

## Commits

[Conventional Commits](https://www.conventionalcommits.org):

```text
<type>(<scope>): <subject>

feat(economy): add ledger transfer invariants
fix(api): return 404 rather than 403 for a non-owned resource
docs(adr): record the ledger-first decision
chore(deps): upgrade drizzle-orm to 0.45.2
```

Types: `feat` · `fix` · `docs` · `chore` · `refactor` · `test` · `perf` · `build` · `ci`

A breaking change gets `!` and a `BREAKING CHANGE:` footer explaining what breaks and what to
do about it.

**The subject says what changed and why it matters**, not which files were edited — Git
already knows the files.

---

## Pull requests

Every change goes through one. Even a solo project benefits: the diff is reviewed once,
deliberately, away from the editor.

- [ ] `pnpm verify` passes locally
- [ ] The task packet is updated
- [ ] Documentation changed in the same commit as the behaviour
- [ ] A security-sensitive change has the security checklist applied
- [ ] An economy-affecting change has the economy checklist applied
- [ ] Any real decision is recorded as an ADR

Template: `.github/pull_request_template.md`.

---

## Versioning

**The applications are not published packages**, so semantic versioning does not carry its
usual meaning. Two things do get versioned, and both matter:

**The API** — `/api/v1/`. A breaking change creates a new version. A **released mobile build
keeps calling `v1` after `v2` ships**, and there is no way to force an update. Deprecating a
version takes months, not weeks.

**Mobile builds** — a user-visible version plus a monotonic build number, per store
requirements.

`ContentVersion` and `BattleEngineVersion` are separate from both, and are stamped onto
outcomes rather than onto releases.

---

## When there is somewhere to release to

The intended shape:

1. `main` is green.
2. Tag the release.
3. CI builds and pushes images.
4. **Apply migrations first** — expand-only, safe for the running version.
5. Deploy the API, one replica at a time.
6. Verify `/ready` on each.
7. Deploy the workers.
8. Deploy web and admin.
9. Watch error rate and readiness.
10. Contract migrations in a **later** release.

Step 10 being separate is the whole point of [expand/contract](MIGRATIONS.md#expand--contract).

### Rolling back

- **Application:** redeploy the previous image. Fast and safe; the API is stateless.
- **Database:** generally impossible. That is why every intermediate schema state must be one
  the previous version can also run against.
- **An untested rollback is not a rollback.** It must be executed in staging first.

---

## Mobile releases

Different, and slower:

- Store review takes days, and can reject.
- **Users update on their own schedule, or never.** Old clients must keep working.
- Over-the-air updates cover JavaScript-only changes; native changes need a store release.
- A bad release cannot be rolled back — only superseded by another release, which needs
  another review.

This asymmetry is the reason the API is versioned in the path.

---

## Before the first production release

- [ ] A hosted environment exists
- [ ] Secret management that is not a file
- [ ] Automated backups **with a tested restore**
- [ ] Log aggregation with search
- [ ] Alerting on error rate, readiness and economy reconciliation
- [ ] Rate limiting active
- [ ] Authentication implemented and threat-modelled
- [ ] **A rollback executed in staging**
- [ ] An incident runbook someone has read
- [ ] Store listings, privacy policy and terms

Related: [Deployment architecture](../architecture/DEPLOYMENT_ARCHITECTURE.md) ·
[Migrations](MIGRATIONS.md) · [Incident response](INCIDENT_RESPONSE.md)
