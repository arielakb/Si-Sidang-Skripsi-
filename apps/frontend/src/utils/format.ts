export function formatLabel(value: string) {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

export function formatDateTime(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function formatDateOnly(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium"
  }).format(new Date(value));
}

export function formatNumber(value?: string | number | null, fraction = 2) {
  const numberValue = Number(value ?? 0);

  if (Number.isNaN(numberValue)) return "0";

  return numberValue.toFixed(fraction);
}

export function toIsoDateTime(value: string) {
  return new Date(value).toISOString();
}