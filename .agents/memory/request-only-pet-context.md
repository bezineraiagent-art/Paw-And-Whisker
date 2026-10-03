---
name: Request-only pet context
description: Privacy boundary for the browser pet card and AI processing, including indirect profile retention.
---
The owner requires the full pet card to stay browser-only except for processing each question. Do not persist new question/answer transcripts, photos or profiles on the server. Preserve historical stored data unless the owner explicitly requests deletion.

**Why:** Saving an AI answer can indirectly save names, ages, allergies and conditions copied from the transient profile, even if no dedicated profile table exists.

**How to apply:** Keep server analytics and usage counters content-free. Send the profile to the model only for the current request. Distinguish new request-only processing from historical chat records in privacy copy.