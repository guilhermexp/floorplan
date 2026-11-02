# Proposals and real captures, in one screen

Each screen can keep the interface you planned and screenshots of what you actually built. A new capture is another record; it never replaces the original proposal. The manifest and images live in `floorplan/`, survive rebuilds and refreshes, and are ignored by git with the rest of the map.

## Browse and preview

In **Visuais**, click a thumbnail to preview its image inside the gallery. Previous/next buttons and the left/right arrow keys browse all versions in the current search and filter. The counter shows the current image and total. **Miniaturas** returns to the full grid; **Ampliar** opens a larger image; **Abrir no canvas** navigates to its screen. Missing images and empty searches have an explicit empty state.

Gallery thumbnails and previews use thin frames fitted to the image viewport: phone, tablet or browser. Titles stay outside the frame. Use explicit `Mobile`, `Tablet` or `Desktop` labels alongside viewport dimensions when the device type is ambiguous. Frames preserve the entire image without transforming the original file.

On narrow screens, the preview uses the gallery width and **Miniaturas** returns to browsing. On wider screens, thumbnails remain alongside the preview.

## Interface language

Portuguese (Brazil) is the default. Use the **PT/EN** globe button in the header to switch to English. The browser remembers the choice using `floorplan.language`; portable exports include both languages. Menus, buttons, help, tooltips and the technical glossary follow the selected language. Graph identifiers, file paths, source code, typed input and image pixels retain their original contents.

## Add an image from the map

Serve the map with its generated `floorplan/serve.mjs`. In **Visuais**, choose a screen and **Adicionar visual**. Choose **Proposta** for a mockup or **Captura real** for a screenshot of a running app. A real capture requires its capture time and source URL. Label its viewport, state and version so comparisons have context. Uploading a file does not take a screenshot or generate an image: it attaches the image you selected.

The server accepts only its own page's origin and per-start token. Images stay on this machine; no generation service or cloud upload is involved. PNG, JPEG and WebP are supported, up to 12 MiB each. An invalid image or a failed rebuild produces an error and the attempted addition is rolled back.

## Add an image from an agent

First build the map, so it has known screens. Then run the plugin's script:

```sh
node /path/to/floorplan/skills/floorplan/scripts/visuals.mjs /path/to/project add \
  --screen 'mobile/screens/T01.tsx' \
  --kind proposal \
  --image /path/to/mockup.png \
  --title 'Home — mobile, approved proposal' \
  --viewport '390x844' --state default --version v1 --approved
```

A capture also needs provenance:

```sh
node /path/to/floorplan/skills/floorplan/scripts/visuals.mjs /path/to/project add \
  --screen 'screen:mobile:/home' \
  --kind capture \
  --image /path/to/browser-screenshot.png \
  --title 'Home — actual browser capture' \
  --viewport '390x844' --state default --version build-123 \
  --created-at '2026-11-01T08:00:00Z' \
  --source-url 'http://127.0.0.1:3000/home'
```

`--screen` accepts the exact screen ID in `graph.json`, or its file path if that file defines exactly one screen. The script copies the input image to a unique filename, appends the record and rebuilds the map. It does not alter the input image or approve a proposal unless `--approved` is supplied. A supplied capture URL is metadata; the importer does not visit that address or verify the page's implementation.

For a new capture, use the actual screenshot time. A proposal's time defaults to its import time if `--created-at` is omitted. `--notes` can retain a prompt, design decision or short observation. Version and viewport are descriptive text, not a claim of pixel-accurate matching.

## Manifest

`floorplan/visuals.json` is the editable source:

```json
{
  "version": 1,
  "items": [
    {
      "id": "home-v1",
      "screen": "screen:mobile:/home",
      "kind": "proposal",
      "title": "Home — approved mobile proposal",
      "asset": "visuals/home-v1.png",
      "viewport": "390x844",
      "state": "default",
      "version": "v1",
      "createdAt": "2026-11-01T08:00:00Z",
      "approved": true,
      "notes": "Design reference, not an implemented screen."
    }
  ]
}
```

IDs are unique and contain letters, numbers, hyphens or underscores. Captures use `kind: "capture"` and require `createdAt` plus `sourceUrl` (HTTP or HTTPS, without embedded credentials). Do not place access tokens in source URLs. A separate record preserves each version.

Assets must be raster files inside `floorplan/visuals/`; traversal paths and symlinks are rejected. Missing images and removed/renamed screens produce build warnings and retain the original manifest records. Reassign an orphaned record's `screen` to reconnect it. Refresh does not guess which new screen should inherit a removed screen's images.

The generated `graph.visuals` array resolves screen IDs and file paths, and gives each image a relative `src`. It marks missing files with `missing: true` and unmatched screen references with `unresolved: true`. Do not edit the generated graph to add images.

## Local API

- `GET /api/visuals`: `{ "visuals": [...] }`.
- `POST /api/visuals`: a flat object with `screen`, `kind`, `title`, optional metadata and `dataUrl` (`data:image/png;base64,...`). IDs and filenames are assigned by the server.
- Success: HTTP 201, `{ "ok": true, "visual": {...}, "visuals": [...] }`.
- Invalid input: HTTP 400 with `{ "ok": false, "error": "..." }`; excessive payload: 413.
- Both methods require the current `x-floorplan-token`, and requests from another origin are refused.

The token is provided only to the locally served map. Static HTML and exported maps cannot add images. An export can still browse included visuals without a server.

## Share a portable copy

Images are opt-in when exporting, since they may show non-public UI or data:

```sh
node floorplan/serve.mjs --export shared-map.html --include flows,notes,visuals
```

This embeds the selected visual catalog's image bytes into the HTML. The copy can be moved to another folder or machine without the image files. Source URL, capture date and other supplied metadata remain visible. Without `visuals`, the export omits the image catalog. `build.mjs --artifact` keeps relative image references just like the local map: carry its sibling `visuals/` directory with it, or use the export above when you need one portable HTML file. Large catalogs make larger exported files; normal local viewing references images separately and loads previews as needed.

## Teste em projeto local

A galeria foi validada com um catálogo de planejamento real, incluindo várias propostas por tela e versões previamente aprovadas. Os documentos, nomes, contagens e imagens desse projeto permanecem fora do repositório do plugin. Uma proposta visual não é evidência de implementação; capturas reais têm identificação e metadados próprios.
