/** Rute halaman detail yang dipush dari Stack root (bukan tab tersembunyi). */
export const RATING_HREF = '/admin-rating' as const;

export function ratingHref(): typeof RATING_HREF {
  return RATING_HREF;
}
