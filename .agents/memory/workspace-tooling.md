---
name: Workspace tooling compatibility
description: Known mismatches between installed skill instructions and runtime tool capabilities in this workspace.
---

Treat runtime capability errors as authoritative over skill examples. The documented testing-subagent kind was rejected by this workspace, although the design kind worked.

**Why:** Following the testing skill's exact call returned an unsupported-kind error. Skill presence alone did not establish that the corresponding runtime capability was enabled.

**How to apply:** Do not repeatedly retry an unsupported kind or weaken authentication to work around it. Use available browser verification capabilities, and disclose any authenticated UI that could not be checked.

The language-package installer could not target this pnpm workspace's artifact packages and failed at the workspace-root guard.

**Why:** Its invocation had no workspace-selection parameter and attempted a root install.

**How to apply:** If that limitation is still present, use explicitly scoped pnpm package operations rather than adding artifact dependencies to the root.