/** Rental days, counting both the first and last day. */
export const nights = (start: string, end: string) =>
  Math.round((Date.parse(end) - Date.parse(start)) / 864e5) + 1;

/** Full weeks at the weekly rate, leftover days at the daily rate (never more than one week's price). */
export const rentalCents = (days: number, dailyCents: number, weeklyCents: number) =>
  Math.floor(days / 7) * weeklyCents + Math.min((days % 7) * dailyCents, weeklyCents);
