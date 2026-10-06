import { z } from "zod";

export const reminderSettingsSchema = z.object({
  channel: z.enum(["whatsapp", "sms", "email"]),
  confirmationEnabled: z.boolean(),
  reminder24hEnabled: z.boolean(),
  reminder2hEnabled: z.boolean(),
});

export type ReminderSettingsState = {
  status: "idle" | "error" | "success";
  message?: string;
};

export const initialReminderSettingsState: ReminderSettingsState = {
  status: "idle",
};

export type SandboxTestState = {
  status: "idle" | "error" | "success";
  message?: string;
};

export const initialSandboxTestState: SandboxTestState = { status: "idle" };
