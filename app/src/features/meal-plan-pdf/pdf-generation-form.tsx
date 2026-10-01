"use client";

import { useActionState } from "react";

import { generateMealPlanPdfAction, type PdfGenerationState } from "./actions";

const initialPdfGenerationState: PdfGenerationState = { status: "idle" };

export function PdfGenerationForm({
  hasPdf,
  planId,
}: {
  hasPdf: boolean;
  planId: string;
}) {
  const [state, action, pending] = useActionState(
    generateMealPlanPdfAction,
    initialPdfGenerationState,
  );
  return (
    <form action={action}>
      <input name="planId" type="hidden" value={planId} />
      <button className="button-primary" disabled={pending}>
        {pending ? "Generando…" : hasPdf ? "Regenerar PDF" : "Generar PDF"}
      </button>
      {state.message && (
        <p className="mt-3 max-w-md text-sm text-[var(--danger)]" role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
