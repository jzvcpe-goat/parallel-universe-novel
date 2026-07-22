# Visual Regression Checklist

## Creator Shell

The Creator shell must read as a professional local author workbench:

- route title matches the current page;
- local status pill is visible;
- six-entry navigation is stable;
- header copy uses product language;
- no Reader hero/background image appears behind Creator panels.

Before handoff, capture:

- `/creator/login`
- `/creator`
- `/creator/requests`
- `/creator/editor`
- `/creator/works`
- `/creator/publish`
- `/creator/settings`

Use `npm run qa:local-creator-routes` to build the Creator bundle, open these
routes, scan visible copy, and write screenshots to
`artifacts/visual-qa/local-creator/`.

Also capture the signed-in workbench state with:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run qa:local-creator-authenticated-routes
```

This uses the QA-only `creator-qa` Vite mode and writes screenshots to
`artifacts/visual-qa/local-creator-authenticated/`. It must not be used as a
production data path; it exists only to prove that signed-in Creator pages are
not empty shells.

Check:

- No Reader planet image.
- No concept-board residue.
- No banned product terms.
- Editor background is quiet.
- Navigation has six primary entries.
- Disabled states are understandable.
- Signed-in pages do not show locked-state copy.
- Reduced motion and reduced transparency remain readable.
