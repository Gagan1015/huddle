const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 1000 * 60 * 60 * 24 * 365],
  ["month", 1000 * 60 * 60 * 24 * 30],
  ["week", 1000 * 60 * 60 * 24 * 7],
  ["day", 1000 * 60 * 60 * 24],
  ["hour", 1000 * 60 * 60],
  ["minute", 1000 * 60],
];

export function formatRelativeTime(iso: string, now = Date.now()) {
  const diff = new Date(iso).getTime() - now;

  for (const [unit, size] of units) {
    if (Math.abs(diff) >= size) {
      return relative.format(Math.round(diff / size), unit);
    }
  }

  return "just now";
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function pluralize(
  count: number,
  singular: string,
  plural = `${singular}s`,
) {
  return `${count} ${count === 1 ? singular : plural}`;
}
