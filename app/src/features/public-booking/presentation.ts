type BookingSlot = {
  ends_at: string;
  professional_name: string;
  professional_user_id: string;
  starts_at: string;
};

function normalizeIntlSpacing(value: string) {
  return value.replace(/[\u00a0\u202f]/g, " ");
}

export function presentPublicBookingSlots(
  slots: BookingSlot[],
  timeZone: string,
) {
  const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  });
  const dateLabelFormatter = new Intl.DateTimeFormat("es-GT", {
    day: "numeric",
    month: "long",
    timeZone,
    weekday: "long",
  });
  const timeFormatter = new Intl.DateTimeFormat("es-GT", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  });

  return slots.map((slot) => {
    const startsAt = new Date(slot.starts_at);
    const rawDateLabel = dateLabelFormatter.format(startsAt);
    const normalizedDateLabel = normalizeIntlSpacing(rawDateLabel);
    return {
      ...slot,
      date_key: dateKeyFormatter.format(startsAt),
      date_label:
        normalizedDateLabel.charAt(0).toUpperCase() +
        normalizedDateLabel.slice(1),
      time_label: normalizeIntlSpacing(timeFormatter.format(startsAt)),
    };
  });
}
