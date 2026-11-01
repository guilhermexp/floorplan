# Gallery device mockups implementation plan

**Goal:** Apply the approved canvas device frame treatment to gallery thumbnails and previews.
**Architecture:** Add one local `deviceFrame(visual)` markup helper in `35-visuals.js`, backed by viewport metadata. Reuse the canvas frame declarations, using a size container to fit each device to its available space without a wide image background.
**Tech stack:** Existing vanilla JavaScript and CSS; no dependencies.
**Spec:** docs/plans/2026-11-01-gallery-device-mockups-design.md

## Task: Replace the gallery image wells

- [x] Add device classification and proportional frame markup beside `image()`; retain missing-image text.
- [x] Share existing frame styling; add a compact decorative browser bar, and responsive fitting in gallery stages.
- [x] Use the helper in the carousel and gallery grid; keep titles, counters and navigation outside the devices.
- [x] Build the Uberdog map, verify the real UI at desktop and phone widths, and check phone/tablet/browser metadata classification.
- [x] Run existing relevant tests and the design detector, update checksums, commit and push to our fork.
