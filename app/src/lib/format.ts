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
