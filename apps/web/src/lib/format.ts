export function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-GH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(new Date(value));
}

export function formatMoney(value?: string | number | null, currency = "GHS") {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPercent(value?: string | number | null) {
  return `${(Number(value ?? 0) * 100).toFixed(2)}%`;
}
