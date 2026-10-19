// Which taps hit the scene (ROADMAP items 136, 147, 173).

// Item 136: a tap on these is not a tap on the empty sky (scene things, controls, cards, dialogs).
const NOT_SKY = '[data-scene-hit], [data-share-hide], button, a, input, [role="dialog"]';

// Item 147: a tap on the scene, the empty sky or a scene thing (the sun is a `button`), not on a
// control, a card, a toast or a dialog.
export const isSceneTap = (target: EventTarget | null): target is Element =>
  target instanceof Element && target.closest('[data-share-root]') !== null &&
  (target.closest('[data-scene-hit]') !== null || target.closest(NOT_SKY) === null);

// Item 173: a tap on the empty sky, not on a scene thing or inside a control's box (the panel,
// the top-left buttons, the radio bar carry `data-idle-control`).
export const isEmptySkyTap = (target: EventTarget | null): target is Element =>
  target instanceof Element && target.closest('[data-share-root]') !== null &&
  target.closest(NOT_SKY) === null && target.closest('[data-idle-control]') === null;
