# Device mockups in the visual gallery

The user approved the thin device frames already shown on the canvas and requested the same treatment in gallery thumbnails and the large carousel preview.

Keep the existing gallery navigation, labels, filters, images and canvas. Replace the full-width gray image well with a tightly fitted frame. Use a phone frame for mobile, a tablet frame for tablet viewports, and a browser frame with decorative chrome for web/desktop. Read explicit device labels first, then viewport dimensions, with a phone fallback matching the canvas. Preserve the entire image, its aspect ratio and the missing-image state. Titles and metadata remain outside the frame. Share the canvas border, surface and shadow declarations rather than creating a competing visual style.

Verify phone and desktop records in the real local test project gallery, thumbnail and preview navigation, and the mobile layout. Check the tablet classification with an explicit tablet viewport. No new dependencies or image transformations.
