---
name: Content build boundaries
description: Non-obvious boundaries between Node-loaded SEO configuration and browser article data.
---

Content used by the SEO configuration must use imports that work when Node loads that configuration; Vite-only glob macros are not available at that stage.

**Why:** The configuration consumes content before Vite's source transformation. A glob-based article registry broke configuration loading even though TypeScript passed.

**How to apply:** Keep registries Node-compatible. Keep full articles out of the homepage's client imports; route metadata and shared pricing constants should not eagerly pull in the entire article collection.