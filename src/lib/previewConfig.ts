/**
 * TAB_CLICK_OPENS_MODAL
 *
 * Controls whether clicking a tab on the preview/sample-report pages
 * immediately opens the upgrade modal, or just switches the tab
 * (modal only opens via the "Locked — choose a plan" pill).
 *
 *   true  → clicking any non-summary tab triggers the upgrade modal
 *   false → tab click only switches content; modal opens from lock pills
 *
 * See README § "Preview tab behaviour toggle" for context.
 */
export const TAB_CLICK_OPENS_MODAL = true;
