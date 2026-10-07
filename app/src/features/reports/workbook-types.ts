import type { getMonthlyReport } from "./data";

export type AwaitedMonthlyReport = Awaited<ReturnType<typeof getMonthlyReport>>;
