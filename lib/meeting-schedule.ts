const DEFAULT_SCHEDULED_MEETING_DURATION_MS = 60 * 60 * 1000;

type DateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

function parseDateParts(date: string) {
  const [year, month, day] = date.split("-").map(Number);

  return { year, month, day };
}

function parseTimeParts(time: string) {
  const [hour, minute] = time.split(":").map(Number);

  return { hour, minute };
}

function getFormatter(timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
}

function getOffsetFormatter(timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
  });
}

function getDateTimePartsInTimeZone(timestamp: number, timeZone: string): DateTimeParts {
  const parts = getFormatter(timeZone).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  ) as Record<string, number>;

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

function getOffsetInTimeZone(timestamp: number, timeZone: string) {
  const parts = getOffsetFormatter(timeZone).formatToParts(new Date(timestamp));
  const offsetPart = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT";

  if (offsetPart === "GMT") {
    return "+00:00";
  }

  const normalized = offsetPart.replace(/^GMT/, "");
  const match = normalized.match(/^([+-])(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) {
    return "+00:00";
  }

  const [, sign, hours, minutes = "00"] = match;
  return `${sign}${hours.padStart(2, "0")}:${minutes}`;
}

export function getLocalDateTimeTimestamp(date: string, time: string) {
  const { year, month, day } = parseDateParts(date);
  const { hour, minute } = parseTimeParts(time);

  return new Date(year, month - 1, day, hour, minute, 0, 0).getTime();
}

export function formatCalendarDateTimeInTimeZone(timestamp: number, timeZone: string) {
  const parts = getDateTimePartsInTimeZone(timestamp, timeZone);
  const offset = getOffsetInTimeZone(timestamp, timeZone);

  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}${offset}`;
}

export function formatMeetingTimeRange(
  startsAt: number,
  endsAt: number,
  timeZone?: string,
) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const formatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    ...(timeZone ? { timeZone } : {}),
  });
  const timeFormatter = new Intl.DateTimeFormat(undefined, {
    timeStyle: "short",
    ...(timeZone ? { timeZone } : {}),
  });

  const range = `${formatter.format(start)} - ${timeFormatter.format(end)}`;
  return timeZone ? `${range} (${timeZone})` : range;
}

export function resolveScheduledEndsAt(
  scheduledFor: number,
  scheduledEndsAt?: number,
) {
  return scheduledEndsAt ?? scheduledFor + DEFAULT_SCHEDULED_MEETING_DURATION_MS;
}
