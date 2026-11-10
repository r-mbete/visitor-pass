/** v1 serves one estate in Kenya, so times are shown in Nairobi time on server and device alike. */
const TIME_ZONE = "Africa/Nairobi";

const time = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});

const dayTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/** "14:05" */
export const formatTime = (date: Date | number) => time.format(date);

/** "Tue 14:05" */
export const formatDayTime = (date: Date | number) => dayTime.format(date);

const day = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
});

/** "Tuesday 10 November" */
export const formatDay = (date: Date | number) => day.format(date);

/** Nairobi is UTC+3 all year (no daylight saving), so its midnight is a fixed offset. */
const NAIROBI_OFFSET = 3 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

/** Midnight at the start of `now`'s day in Nairobi, as an instant. */
export function startOfDay(now: Date): Date {
  const local = now.getTime() + NAIROBI_OFFSET;
  return new Date(local - (local % DAY) - NAIROBI_OFFSET);
}

/** Midnight at the end of `now`'s day in Nairobi. */
export const endOfDay = (now: Date) =>
  new Date(startOfDay(now).getTime() + DAY);
