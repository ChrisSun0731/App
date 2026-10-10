/** CK navy, the Quasar app's primary colour (and the school emblem's). */
export const BRAND = '#03328d';

/**
 * The 現在 card's fill, the one CK-navy block in the app. Dark mode lifts it
 * a little so it still reads as a card on black. White text is 11.4:1 (light)
 * and 11.1:1 (dark); 78% white is 7.5:1 and 7.4:1.
 */
export const NOW_CARD = { light: '#03328D', dark: '#17377F' } as const;

/** Text on the 現在 card: white, and white at 78% for secondary lines ("#RRGGBBAA"). */
export const ON_NOW_CARD = '#FFFFFF';
export const ON_NOW_CARD_SOFT = '#FFFFFFC7';
/** The bell rail's parts still to come: white at 45% (3.45:1 on the card). */
export const NOW_RAIL_AHEAD = '#FFFFFF73';
