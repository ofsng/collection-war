# Runbook: Dependency Management

> Audience: anyone adding or upgrading a dependency. Date: 2026-07-28.

---

## Adding one

**Every dependency is a permanent liability**: a supply-chain surface, an upgrade treadmill,
and something the next person must learn. Adding one is a decision, and it needs a reason in
the pull request.

Answer these first:

1. **Can the platform do it?** Node, the browser and React Native cover far more than they
   used to — `fetch`, `crypto.randomUUID`, `Intl`, `AbortController`, `structuredClone`.
   This project uses native `fetch` rather than axios for exactly this reason.
2. **Is it small enough to write?** The localization package is under 200 lines and has zero
   dependencies. `i18next` would have been more capable and more surface.
3. **Who maintains it, and how actively?** Last release, open issues, single maintainer or a
   team.
4. **What does it pull in?** A package with forty transitive dependencies is forty packages.
5. **Does it run install scripts?** Those execute arbitrary code at install time. Blocked by
   default here.

Then:

```bash
pnpm --filter <package> add <dep>       # runtime
pnpm --filter <package> add -D <dep>    # dev
pnpm add -Dw <dep>                      # repository tooling only
```

**Add it to the package that uses it.** pnpm's isolated layout means an undeclared import
fails to resolve — which is the point. Do not add something to the root to make an import
work.

In the pull request, state: what it does · why the platform is insufficient · who maintains
it · its transitive footprint.

---

## Upgrading

```bash
pnpm outdated -r          # what is behind
pnpm update -r            # within existing ranges (we pin exact, so this is usually a no-op)
pnpm --filter <pkg> add <dep>@<version>   # a specific version
pnpm verify               # ALWAYS
```

### Order of risk

| Kind                      | Approach                                           |
| ------------------------- | -------------------------------------------------- |
| Patch, dev dependency     | Batch several, verify once                         |
| Patch, runtime dependency | Small batches, verify                              |
| Minor                     | One at a time for anything load-bearing            |
| **Major**                 | **One at a time, read the changelog, expect work** |
| **Security**              | **Immediately**, out of band                       |

**Never batch a major upgrade with anything else.** When something breaks, you want one
suspect.

### Framework majors

Next.js, NestJS, Expo and React Native majors are projects, not chores. Read the migration
guide first, do them in isolation, and expect the ecosystem around them to lag.

---

## Why versions are pinned exactly

`save-exact=true` in `.npmrc`. Every dependency is an exact version — `"zod": "4.4.3"`, not
`"^4.4.3"`.

**Because "it worked yesterday" should mean something.** A caret range means two developers,
or CI and a laptop, can silently resolve different versions. Debugging a bug that exists on
one machine and not another is expensive, and the cause is invisible.

Upgrades become explicit, reviewable commits instead of something that happens when someone
reinstalls.

`pnpm-lock.yaml` is committed, and CI installs with `--frozen-lockfile`.

---

## Install scripts

Blocked by default via `onlyBuiltDependencies` in `pnpm-workspace.yaml`. Currently allowed:

```yaml
onlyBuiltDependencies:
  - '@tailwindcss/oxide'
  - esbuild
  - sharp
  - unrs-resolver
```

**Adding an entry is a supply-chain decision**, not a build fix. An install script executes
arbitrary code on every developer machine and in CI, which is why compromised packages
usually use one.

Two packages are currently blocked and working correctly without their scripts:

- `@scarf/scarf` — telemetry. Blocking it is a feature.
- `msgpackr-extract` — optional native acceleration for BullMQ. Falls back to JavaScript.

---

## Auditing

```bash
pnpm audit
pnpm audit --audit-level high
pnpm why <package>          # who pulled this in
pnpm licenses list          # license inventory
```

`pnpm why` is the one to remember. When a vulnerability is reported in something you have
never heard of, it tells you which of your actual dependencies brought it.

### Responding to a vulnerability

1. **Is it reachable?** A vulnerability in a dev-only tool is different from one in the API's
   runtime path.
2. **Is there a fixed version?** Upgrade, verify, ship.
3. **Is it transitive with no fix?** `pnpm.overrides` can force a resolution — document why.
4. **No fix at all?** Assess exploitability, mitigate around it, record it in
   [risks](../status/RISKS.md), and plan removal.

---

## Removing one

The best dependency change. Removing a dependency reduces surface, size and maintenance
permanently.

```bash
pnpm --filter <package> remove <dep>
pnpm verify
```

Worth doing whenever a dependency's job has become something the platform does natively.

---

## Current baseline

Versions were resolved live from the npm registry on 2026-07-28 and pinned. The full list is
in [bootstrap environment](../status/BOOTSTRAP_ENVIRONMENT.md#7-version-baseline-selected).

Two deliberate non-latest pins, both with reasons:

- **TypeScript 5.9.3**, not 7.x — the lint and build ecosystem is not yet aligned.
  See [ADR-0001](../adr/ADR-0001-typescript-as-primary-language.md).
- **ESLint 9.39.5**, not 10.x — plugin-ecosystem stability.
- **jsdom 29.1.1**, not 30.x — jsdom 30 requires Node ^22.22, and the machine has 22.16.
  Pinning the dependency was preferred over mutating the developer's global toolchain.

Related: [Supply chain security](../security/SUPPLY_CHAIN_SECURITY.md) ·
[Engineering principles](../constitution/ENGINEERING_PRINCIPLES.md#7-boring-technology-deliberately-chosen)
