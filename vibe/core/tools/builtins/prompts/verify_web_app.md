Use `verify_web_app` to validate a running web application through real browser
journeys before claiming that implementation work is complete.

The tool delegates to Clanker Watchdog, which explores the application, saves
portable Playwright flows, and returns only independently reproduced failures.

- Use a local or staging URL containing test data, never a production system.
- Start with `mid` effort and use `high` when multiple user roles matter.
- Fix the smallest root cause supported by the evidence, then verify again.
- Do not report success for `inconclusive`; explain why no user flow ran.
- A `pass` covers the exercised flows, not every possible application behavior.
