# Antigravity Rules

> **This is an index, not a rulebook.**
>
> Per [ADR-0018](../../docs/adr/ADR-0018-ai-tool-adapter-strategy.md), the canonical rules
> live in `docs/`. Copying them here would create a second source of truth that drifts from
> the first, and the copy a given agent happens to read would win.

---

## By area

| Working on                    | Read                                                                                                                                                                                                                |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Anything**                  | [AI agent rules](../../docs/constitution/AI_AGENT_RULES.md) — **mandatory**                                                                                                                                         |
| Architecture, boundaries      | [Architecture principles](../../docs/constitution/ARCHITECTURE_PRINCIPLES.md) · [Dependency rules](../../docs/architecture/DEPENDENCY_RULES.md) · [Module boundaries](../../docs/architecture/MODULE_BOUNDARIES.md) |
| API, workers, domain packages | [API architecture](../../docs/architecture/API_ARCHITECTURE.md) · [Component architecture](../../docs/architecture/COMPONENT_ARCHITECTURE.md) · [Event architecture](../../docs/architecture/EVENT_ARCHITECTURE.md) |
| Web, admin                    | [Component architecture](../../docs/architecture/COMPONENT_ARCHITECTURE.md) · [Localization](../../docs/architecture/LOCALIZATION_ARCHITECTURE.md) · [ADR-0006](../../docs/adr/ADR-0006-nextjs-for-web.md)          |
| Mobile                        | [ADR-0007](../../docs/adr/ADR-0007-expo-react-native-mobile.md) · [Localization](../../docs/architecture/LOCALIZATION_ARCHITECTURE.md)                                                                              |
| Database, migrations          | [Data architecture](../../docs/architecture/DATA_ARCHITECTURE.md) · [Migrations](../../docs/runbooks/MIGRATIONS.md) · [Database](../../docs/runbooks/DATABASE.md)                                                   |
| Testing                       | [Testing runbook](../../docs/runbooks/TESTING.md)                                                                                                                                                                   |
| Documentation                 | [Documentation rules](../../docs/constitution/DOCUMENTATION_RULES.md)                                                                                                                                               |
| Infrastructure                | [Deployment](../../docs/architecture/DEPLOYMENT_ARCHITECTURE.md) · [Cost strategy](../../docs/architecture/COST_STRATEGY.md) · [Local development](../../docs/runbooks/LOCAL_DEVELOPMENT.md)                        |
| **Security**                  | [Security rules](../../docs/constitution/SECURITY_RULES.md) · [Security architecture](../../docs/architecture/SECURITY_ARCHITECTURE.md) · [Review checklist](../../docs/security/SECURITY_REVIEW_CHECKLIST.md)      |
| **Economy**                   | [Economy integrity rules](../../docs/constitution/ECONOMY_INTEGRITY_RULES.md) — all twelve                                                                                                                          |
| **Marketplace**               | [Marketplace domain](../../docs/domains/marketplace/) + the economy rules                                                                                                                                           |
| Localization                  | [Localization architecture](../../docs/architecture/LOCALIZATION_ARCHITECTURE.md)                                                                                                                                   |

---

## The rules that must be seen even if no link is followed

1. **Never claim something works unless you ran it and saw it work.** Partial is acceptable;
   false is not.
2. **Do not start gameplay implementation** until
   [CW-0002](../../docs/tasks/BACKLOG.md) is approved.
3. **`pnpm verify` before claiming completion**, and paste the real output.
4. **Never weaken a check to make it pass.**
5. **Never create anything that costs money, and never push** without explicit approval.

Everything else is in `docs/`.
