# Screen Visuals Implementation Plan

> Execution: implement tasks in this session, with independent backend and project-fixture work where useful; review and integrate before delivery.

**Goal:** Centralize planned mockups and real captures per Floorplan screen, with image cards and comparison.
**Architecture:** Persist a separate visuals manifest and local image files. Build resolves it into graph.visuals; viewer adds visual cards to screen boards and provides a catalog and comparison dialog. Local server accepts authenticated additions; CLI supports agent workflows. Export embeds the selected visual assets.
**Tech Stack:** Existing Node.js standard library, vanilla JavaScript, SVG/HTML canvas viewer.
**Spec:** docs/plans/2026-11-01-screen-visuals-design.md

## Global Constraints

No new dependencies. Never overwrite source images. No fabricated screenshots of an implemented Uberdog. Preserve the 86 IDs and existing approved images. Store source separately from generated graph/index; fail explicitly on invalid image paths.

### Task 1 — Data, ingestion and export
Files: scripts/lib/visuals.mjs, scripts/visuals.mjs, scripts/build.mjs, assets/serve.mjs, tests/visuals.test.mjs, docs/visuals.md.
- [ ] Implement `buildVisuals({graph, outDir, warn})` producing an array of validated records with resolved `screen`, `file`, `src`, and optional `missing`; unknown screen references are retained and flagged.
- [ ] CLI: `node scripts/visuals.mjs ROOT add --screen FILE --kind proposal --image PATH --title TITLE`; capture requires `--source-url` and `--created-at`. Copy to a unique file, append only, validate before mutation.
- [ ] Authenticated POST `/api/visuals` accepts metadata plus `dataUrl`; GET returns the built records. Validate type, size, known screen, origin/token and file boundaries. Rebuild after addition.
- [ ] Export embeds local raster bytes as data URIs; metadata stays intact; no outside reads. Add `visuals` export option with explicit UI selection.
- [ ] Node tests: valid proposal/capture; reject traversal/symlink/invalid types; unknown screen warning; missing image; metadata retained across build/refresh; export travels without files; auth checks.

### Task 2 — Canvas and inspection
Files: assets/viewer.html, assets/ui/30-screens.js, new assets/ui/35-visuals.js, assets/ui/60-export.js.
- [ ] Add `v:ID` visual cards, dimensions and image rendering using safe source URLs and escaped metadata. Keep graph navigation intact.
- [ ] Screen boards include their visual cards, connected to the screen; retain screen identity when switching panels. Panel has Visuais section.
- [ ] Searchable catalog of all screens shows proposal/capture counts and missing states. Opening a screen loads its board.
- [ ] Accessible dialog enlarges images; compare selects any proposal and capture for the same screen with viewport/state labels. Empty sides explicitly say absent.
- [ ] Manual upload form posts to server; report errors and restore focus on close. Static exports are browse-only.
- [ ] Browser verification of actual images, navigation, comparison and empty states; no invented capture data in the real project.

### Task 3 — Uberdog end-to-end
Files: outputs/uberdog/docs, floorplan/plan.json, architecture.json, visuals.json, visuals/*.png.
- [ ] Copy scope and four approved source images; construct 86 planned screen entries grouped by C/T/P/S/E/A and guide flows from the scope.
- [ ] Build blueprint with this fork, import four proposals, regenerate and open served map.
- [ ] Confirm 86 screens, 4 proposals, 0 real captures, 82 screens waiting for images; verify rebuild preservation.
- [ ] Exercise capture plus comparison on a separate clearly labeled test app, using an actual browser screenshot, not the mockup renamed.
- [ ] Run relevant tests then full suite, update docs and package the local fork and usable Uberdog output.
