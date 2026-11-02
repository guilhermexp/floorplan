# Keep the intended interface and the actual app together

For a visual planning/mapping task, attach images to the corresponding screen instead of leaving them scattered in chat. `floorplan/visuals.json` and `floorplan/visuals/` are user content: never regenerate or delete them during scan, build, refresh, or plan changes.

## Planning

1. Build the blueprint first so each planned screen has an ID in `graph.json`'s `screens` array.
2. If the user has supplied or approved mockups, import them as `proposal`. Preserve original files and the user's screen IDs, version names, viewport and UI state.
3. If the user requests new images, use the available image-generation tool. Import each completed image immediately; do not wait until all screens have been generated. Do not generate images just because some screens have none.
4. Only set `--approved` when the user actually approved that proposal. Record the prompt/context in `--notes` when useful. Do not label a mockup as a real capture.

```sh
node <skill>/scripts/visuals.mjs <project> add --screen 'screen:tutor:/home' \
  --kind proposal --image /absolute/mockup.png --title 'Home — mobile' \
  --viewport '390x844' --state 'Default' --version v1 --approved
```

## Existing/running apps

When the task includes capturing the app, use the available browser or simulator tools to open the actual screen, verify it finished loading and capture it. Use the user-authorized application URL; discover local startup instructions from the project if needed. A source file alone is not evidence of a rendered screen. Do not mark a route with a failed login or error page as a successful capture of the intended screen; record the actual state or leave it uncaptured and report the blocker.

Match the screen ID, viewport and state before importing. For dynamic routes, use a concrete sample URL. Do not execute purchases, send messages, or change real data to manufacture screenshots. Capture only authorized UI; keep secrets and unrelated private information out of images and metadata. Do not put credential-bearing URLs in `sourceUrl`.

```sh
node <skill>/scripts/visuals.mjs <project> add --screen 'screen:tutor:/home' \
  --kind capture --image /absolute/browser-screenshot.jpg --title 'Home — implementation' \
  --viewport '390x844' --state 'Default' --version build-123 \
  --created-at '2026-11-01T08:00:00Z' --source-url 'http://127.0.0.1:3000/home'
```

Use the actual acquisition time and URL, not the example values above. Each import appends a unique file and record and rebuilds the map. The original mockup remains. If the app cannot run, keep the proposal and explicitly report that there is no real capture.

## Review and handoff

Open **Visuais**, verify that each image appears under the intended screen, and use **Comparar** to show a proposal alongside a capture. Missing sides are legitimate states. Report counts of planned screens, proposals, real captures and screens without images. A capture proves only that view at that time, not backend completeness.

An HTML export includes images only with `--include flows,notes,visuals`. Such exports embed the image bytes; ordinary local maps reference sibling image files. Importing and displaying images does not itself generate mockups or automate a browser.

## Navigation, not alphabetical image order

For planned UI, follow [navigation.md](navigation.md) and attach images to persistent screens used by `plan.journeys`. A journey step and a visual version are different things. The gallery defaults to the first journey, keeps branches and missing images visible, and retains the full catalog as an explicit alternative. Do not silently infer navigation from filenames, backend flows or image-generation order. Reusing a mockup for a different UI state requires an explicit note until a matching visual exists.
