# Disposable admin inbox browser test

The browser journey never reads the owner's credentials or edits application
code. It expects the isolated disposable fixture at `127.0.0.1:23178` (token
`inbox-browser-isolated-fixture`) and a disposable Chromium instance exposing
the Chrome DevTools Protocol on port 9225. The fixture owns creation and cleanup
of its seeded database records.

From the repository root:

```sh
# Build the production frontend used by the fixture.
PORT=23178 BASE_PATH=/ pnpm --filter @workspace/paw-and-whisker run build

# Terminal 1: start the fixture (uses only its isolated fixture token).
node artifacts/api-server/tests/inbox-browser-fixture.mjs

# Terminal 2: launch a separate, disposable browser profile.
chromium --headless=new --no-sandbox --disable-dev-shm-usage --no-first-run --no-default-browser-check \
  --remote-debugging-port=9225 \
  --user-data-dir=/tmp/inbox-browser-chrome about:blank

# Terminal 3: execute the browser journey.
node artifacts/api-server/tests/browser-inbox.mjs
```

Stop the fixture with Ctrl+C when finished; it removes only its own seeded rows
and rate-limit keys. The test uses a disposable local browser profile.

Set `CDP_URL` to use another CDP endpoint, or `INBOX_ORIGIN` to use another
fixture origin. Screenshots and the JSON check summary are written to
`.local/reports/inbox-*`; these outputs are local test artifacts, not published
or committed app data.

The script checks unauthenticated/wrong-token API protection, locked and
authenticated UI states, counts/dates/fixture records, PDF exclusion,
independent pagination, refresh, Lock/reload and token storage, responsive
layouts/themes, overflow, keyboard/labels, and axe-core when its CDN is
available. Error/empty/retry and delayed-response cases use CDP interception
and are labeled synthetic in the JSON summary; those responses do not come
from the fixture API.