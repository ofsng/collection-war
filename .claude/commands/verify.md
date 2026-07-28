---
description: Run the full quality gate and report the real result
---

Run the Collection War quality gate and report **exactly** what happened.

```bash
nvm use && pnpm verify
```

Then report:

1. The **real** summary table — which stages passed, which failed, and their timings.
2. For any failure: the actual error output, not a paraphrase.
3. An explicit note that `test:integration` and `test:e2e` are **not** covered by this gate,
   and their current status.

Do not describe the work as complete unless every stage passed. **Partial is an acceptable
outcome; false is not.**
