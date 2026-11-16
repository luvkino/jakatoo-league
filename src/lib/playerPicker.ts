/**
 * Draw-page player-picker button class.
 *
 * Selected players paint a solid accent fill with the strong, guaranteed
 * foreground (`.btn-selected` → `--accent-fg-strong`); unselected players keep
 * the standard recessed look, dimmed. Extracted so the exact selected-player
 * component state is directly testable (tests/selected-player.test.mts).
 */
export function playerPickerButtonClass(on: boolean): string {
  return on ? "btn btn-selected" : "btn opacity-70";
}
