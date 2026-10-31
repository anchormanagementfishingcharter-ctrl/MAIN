/** Rental days, counting both the first and last day. */
export const nights = (start: string, end: string) =>
  Math.round((Date.parse(end) - Date.parse(start)) / 864e5) + 1;

/** Full weeks at the weekly rate, leftover days at the daily rate (never more than one week's price). */
export const rentalCents = (days: number, dailyCents: number, weeklyCents: number) =>
  Math.floor(days / 7) * weeklyCents + Math.min((days % 7) * dailyCents, weeklyCents);

/** Today's date (YYYY-MM-DD) in Destin, which is on Central Time. */
export const todayInDestin = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(new Date());

/** How many days of notice you need. 1 = earliest booking is tomorrow, 2 = the day after tomorrow, and so on. */
export const MIN_DAYS_AHEAD = 1;

/** The first date customers may book (YYYY-MM-DD). */
export const earliestBookable = () => {
  const [y, m, d] = todayInDestin().split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + MIN_DAYS_AHEAD)).toISOString().slice(0, 10);
};
