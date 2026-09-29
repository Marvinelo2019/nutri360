import { product } from "./product";

export function formatCurrency(amountCentavos: number) {
  return new Intl.NumberFormat(product.locale, {
    style: "currency",
    currency: product.currency,
    minimumFractionDigits: 2,
  }).format(amountCentavos / 100);
}

export function formatClinicDate(date: Date) {
  const value = new Intl.DateTimeFormat(product.locale, {
    timeZone: product.timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);

  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatClinicTime(date: Date) {
  return new Intl.DateTimeFormat(product.locale, {
    timeZone: product.timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function clinicDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: product.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${value.year}-${value.month}-${value.day}`;
}

export function shiftDateKey(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
