/** Rows shown before a competitors table scrolls. */
export const GEO_COMPETITORS_TABLE_VISIBLE_ROWS = 12;
/** Competitor pickers get a search field once the list is longer than this. */
export const GEO_COMPETITOR_CHOICES_SEARCH_THRESHOLD = 12;
/** Cards a competitor picker renders at once; search narrows the rest. */
export const GEO_COMPETITOR_CHOICES_MAX_SHOWN = 30;
/** Brand rows in the recommendations-by-assistant heatmap, you included. */
export const GEO_ENGINE_MATRIX_MAX_ROWS = 15;
/** Heatmap rows shown before "Show all", you included. */
export const GEO_ENGINE_MATRIX_COLLAPSED_ROWS = 6;
/** Tint of the faintest non-zero heatmap cell, in percent of the full color. */
export const GEO_ENGINE_MATRIX_MIN_TINT = 6;
/** Tint of the strongest cell, in percent of the full color. */
export const GEO_ENGINE_MATRIX_MAX_TINT = 45;
/**
 * Tint above which cell text switches to the light foreground. Above the max
 * tint on purpose: the heatmap stays soft enough for dark text everywhere.
 */
export const GEO_ENGINE_MATRIX_LIGHT_TEXT_TINT = 100;
/**
 * Thin, softly rounded columns in the competitor mentions chart keep a 90-day
 * range readable and stop a short range from drawing slabs.
 */
export const COMPETITOR_MENTIONS_BAR_MAX_WIDTH_PX = 10;
export const COMPETITOR_MENTIONS_BAR_RADIUS_PX = 3;
/** Search param that opens the competitor detail sheet on any GEO page. */
export const GEO_COMPETITOR_DETAIL_QUERY_KEY = "competitor";
/**
 * A discovered brand needs this many mentions before it is suggested as a
 * competitor. One-off names are mostly noise from a single answer.
 */
export const GEO_COMPETITOR_SUGGESTION_MIN_MENTIONS = 2;
/** Suggestions listed on the competitors page. */
export const GEO_COMPETITOR_SUGGESTIONS_MAX = 12;
/** Brands ranked by share of voice while nothing is tracked yet. */
export const GEO_COMPETITOR_UNTRACKED_RANKING_MAX = 15;
/** Tracked competitors whose missing website is filled in per page visit. */
export const GEO_COMPETITOR_DOMAIN_BACKFILL_MAX = 25;
