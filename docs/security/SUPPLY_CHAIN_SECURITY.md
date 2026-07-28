# Supply Chain Security

> Audience: anyone adding a dependency or reviewing one. Date: 2026-07-28.

---

## The problem

A modern JavaScript application depends on hundreds of packages written by people it has
never met. Any one of them can execute arbitrary code on every developer machine and in every
CI run.

This is not theoretical. `event-stream`, `ua-parser-js`, `node-ipc` and `xz-utils` are all
real incidents where a legitimate package became malicious — usually through a maintainer
account compromise or a maintainer handover.

**Every dependency is a permanent liability.** The controls below reduce the surface and
raise the chance of noticing.

---

## Controls in place

### Exact versions, always

`save-exact=true`. `"zod": "4.4.3"`, never `"^4.4.3"`.

A caret range means a compromised patch release is picked up automatically, on the next
install, by everyone. Exact versions make every upgrade an explicit, reviewable commit.

### Committed lockfile, frozen in CI

`pnpm-lock.yaml` is committed; CI installs with `--frozen-lockfile`. A build that can silently
resolve a different version is not reproducible.

### Install scripts blocked by default

`onlyBuiltDependencies` in `pnpm-workspace.yaml`. **This is the single most valuable control
here**, because an install script is how a compromised package usually executes.

Currently allowed — each is a deliberate decision:

```yaml
onlyBuiltDependencies:
  - '@tailwindcss/oxide'
  - esbuild
  - sharp
  - unrs-resolver
```

Currently **blocked** and working correctly without their scripts:

- `@scarf/scarf` — telemetry. Blocking it is a feature.
- `msgpackr-extract` — optional native acceleration for BullMQ. Falls back to JavaScript.

**Adding an entry is a supply-chain decision, not a build fix.**

### Isolated node_modules

`node-linker=isolated`. A package can only import what it declares, so a transitive dependency
cannot be reached accidentally — and cannot be relied on by mistake.

### Justification in review

A new dependency requires, in the pull request: what it does · why the platform is
insufficient · who maintains it · its transitive footprint · whether it runs install scripts.

"It is popular" is not a justification.

---

## Evaluating a dependency

| Question                          | A bad answer               |
| --------------------------------- | -------------------------- |
| Can the platform do it?           | "Yes, but this is nicer"   |
| How many transitive dependencies? | Forty                      |
| Last release?                     | Three years ago            |
| Maintainers?                      | One, unresponsive          |
| Does it run install scripts?      | Yes, and unexplained       |
| Install size?                     | Large, for a small feature |
| Could we write it?                | Yes, in under 200 lines    |

The last question is worth taking seriously. `@collection-war/localization` is under 200
lines with zero dependencies, and replaced a library that would have been more capable and
much more surface.

Native `fetch` was chosen over axios on the same reasoning.

---

## Auditing

```bash
pnpm audit --audit-level high
pnpm why <package>          # which of our dependencies pulled this in
pnpm licenses list
pnpm outdated -r
```

`pnpm why` is the one to remember: when a vulnerability is reported in something nobody has
heard of, it names the actual dependency responsible.

### Responding to a vulnerability

1. **Is it reachable?** A dev-only tool differs from the API's runtime path.
2. Fixed version available → upgrade, verify, ship.
3. Transitive with no fix → `pnpm.overrides` to force a resolution, documented.
4. No fix → assess exploitability, mitigate around it, record in
   [risks](../status/RISKS.md), plan removal.

---

## CI

`.github/workflows/dependency-review.yml` runs GitHub's dependency review on pull requests,
and secret scanning is enabled at the repository level where available.

> **Never executed.** There is no Git remote — the workflows are written but unverified. See
> [risks](../status/RISKS.md).

---

## Things not done, and why

**No SBOM generation.** Worth adding before production; not useful without a deployment.

**No package signing verification (Sigstore).** npm's coverage is still partial.

**No private registry mirror.** A real control against a package being unpublished or
replaced, but it is infrastructure to run. Revisit if the project grows.

**No automated dependency update bot.** Deliberate: automatic pull requests bumping exact
versions would either be merged without review — defeating the point of pinning — or ignored
until they are noise.

---

## Development-machine hygiene

The supply chain includes the developer's machine.

- Never run an install from an untrusted branch without reading the lockfile diff.
- Never execute a script pasted from an issue, a document or a web page — including one an
  AI agent was reading.
- Treat a lockfile change in a review as a real change, not as noise.
- Keep the package manager and Node updated.

Related: [Dependency management](../runbooks/DEPENDENCY_MANAGEMENT.md) ·
[Security rules](../constitution/SECURITY_RULES.md)
