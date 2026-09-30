"use client";

import { useActionState, useEffect, useRef } from "react";

import { addMealItemAction } from "./actions";
import { initialMealItemState } from "./schemas";

export function MealItemForm({
  mealId,
  planId,
}: {
  mealId: string;
  planId: string;
}) {
  const [state, action, pending] = useActionState(
    addMealItemAction,
    initialMealItemState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state.status]);

  return (
    <form
      ref={formRef}
      action={action}
      className="mt-4 grid gap-3 border-t border-[var(--line)] pt-4 sm:grid-cols-[1fr_6rem_7rem_auto]"
      noValidate
    >
      <input type="hidden" name="mealId" value={mealId} />
      <input type="hidden" name="planId" value={planId} />
      <div>
        <label className="sr-only" htmlFor={`food-${mealId}`}>
          Alimento
        </label>
        <input
          className="field-input h-10"
          id={`food-${mealId}`}
          name="foodName"
          placeholder="Alimento o preparación"
        />
      </div>
      <div>
        <label className="sr-only" htmlFor={`quantity-${mealId}`}>
          Cantidad
        </label>
        <input
          className="field-input h-10"
          id={`quantity-${mealId}`}
          name="quantity"
          type="number"
          min="0.01"
          step="0.01"
          placeholder="Cant."
        />
      </div>
      <div>
        <label className="sr-only" htmlFor={`unit-${mealId}`}>
          Unidad
        </label>
        <input
          className="field-input h-10"
          id={`unit-${mealId}`}
          name="unit"
          placeholder="Unidad"
        />
      </div>
      <button className="button-secondary h-10" disabled={pending}>
        {pending ? "…" : "Agregar"}
      </button>
      <div className="sm:col-span-4">
        <label className="sr-only" htmlFor={`guidance-${mealId}`}>
          Indicación opcional
        </label>
        <input
          className="field-input h-10"
          id={`guidance-${mealId}`}
          name="guidance"
          placeholder="Indicación opcional"
        />
        {state.message && (
          <p
            className={`mt-2 text-xs ${state.status === "success" ? "text-[var(--success)]" : "text-[var(--danger)]"}`}
          >
            {state.message}
          </p>
        )}
        {state.errors && (
          <p className="mt-2 text-xs text-[var(--danger)]">
            {Object.values(state.errors).flat()[0]}
          </p>
        )}
      </div>
    </form>
  );
}
