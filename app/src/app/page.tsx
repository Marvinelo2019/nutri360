import { redirect } from "next/navigation";

import { getCurrentContext } from "@/lib/auth/session";

export default async function Home() {
  const context = await getCurrentContext();

  if (!context) redirect("/login");
  redirect(context.workspace ? "/dashboard" : "/onboarding");
}
