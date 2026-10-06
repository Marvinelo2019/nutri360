import { product } from "../../lib/product";

export function appointmentTemplateVariables(startsAt: string) {
  const date = new Date(startsAt);
  return {
    "1": new Intl.DateTimeFormat(product.locale, {
      dateStyle: "full",
      timeZone: product.timeZone,
    }).format(date),
    "2": new Intl.DateTimeFormat(product.locale, {
      hour: "numeric",
      minute: "2-digit",
      timeZone: product.timeZone,
    })
      .format(date)
      .replaceAll("\u00a0", " "),
  };
}
