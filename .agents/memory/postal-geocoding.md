---
name: Postal geocoding
description: Live-provider evidence and postal-locality interpretation for Find a Vet.
---
Do not treat unrestricted Nominatim ZIP results as reliable, or mock fixtures as live-provider evidence.

**Why:** Live checks on 2026-10-04 reproduced US ZIPs resolving to Lithuania, Finland, Ukraine and Algeria. Changing Nominatim's result limit also changed the leading result. Structured US postal lookup labeled 90210 as Los Angeles, while Zippopotam.us identified the mailing locality Beverly Hills.

**How to apply:** Preserve country verification and general postal-data verification rather than introducing postcode-specific exceptions. Allston is a Boston neighborhood and City of Westminster is within London; keep actual provider labels and disclose their meaning in verification reports. Use synthetic public queries only for retained test evidence.