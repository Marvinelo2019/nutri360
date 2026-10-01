import { z } from "zod";

import { requireWorkspace } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  context: RouteContext<"/planes/[id]/pdf">,
) {
  const { workspace } = await requireWorkspace();
  if (workspace.role !== "owner" && workspace.role !== "nutritionist")
    return new Response("No autorizado", { status: 403 });
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success)
    return new Response("Documento no encontrado", { status: 404 });

  const supabase = await createServerSupabaseClient();
  const { data: objectPath, error: accessError } = await supabase.rpc(
    "record_meal_plan_pdf_download",
    { target_plan_id: id },
  );
  if (accessError || !objectPath)
    return new Response("Documento no encontrado", { status: 404 });

  const { data, error } = await supabase.storage
    .from("meal-plan-pdfs")
    .download(objectPath);
  if (error || !data)
    return new Response("Documento no disponible", { status: 404 });
  return new Response(data, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": 'inline; filename="plan-alimenticio.pdf"',
      "Content-Type": "application/pdf",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
