"use client";

import { useActionState, useState } from "react";

import type { Tables } from "@/types/database";

import { removeMealItemAction, updateMealItemAction } from "./actions";
import { initialMealItemState } from "./schemas";

export function MealItemRow({
  item,
  planId,
  editable,
}: {
  item: Tables<"meal_plan_items">;
  planId: string;
  editable: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [foodName, setFoodName] = useState(item.food_name);
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [unit, setUnit] = useState(item.unit);
  const [guidance, setGuidance] = useState(item.guidance ?? "");
  const [state, action, pending] = useActionState(
    updateMealItemAction,
    initialMealItemState,
  );

  function cancelEdit() {
    setFoodName(item.food_name);
    setQuantity(String(item.quantity));
    setUnit(item.unit);
    setGuidance(item.guidance ?? "");
    setEditing(false);
  }

  if (editing) {
    return (
      <li className="py-4">
        <form
          action={action}
          className="grid gap-3 sm:grid-cols-[1fr_6rem_7rem_auto]"
          noValidate
        >
          <input name="itemId" type="hidden" value={item.id} />
          <input name="planId" type="hidden" value={planId} />
          <div>
            <label className="sr-only" htmlFor={`edit-food-${item.id}`}>
              Alimento
            </label>
            <input
              className="field-input h-10"
              id={`edit-food-${item.id}`}
              name="foodName"
              onChange={(event) => setFoodName(event.target.value)}
              value={foodName}
            />
          </div>
          <div>
            <label className="sr-only" htmlFor={`edit-quantity-${item.id}`}>
              Cantidad
            </label>
            <input
              className="field-input h-10"
              id={`edit-quantity-${item.id}`}
              min="0.01"
              name="quantity"
              onChange={(event) => setQuantity(event.target.value)}
              step="0.01"
              type="number"
              value={quantity}
            />
          </div>
          <div>
            <label className="sr-only" htmlFor={`edit-unit-${item.id}`}>
              Unidad
            </label>
            <input
              className="field-input h-10"
              id={`edit-unit-${item.id}`}
              name="unit"
              onChange={(event) => setUnit(event.target.value)}
              value={unit}
            />
          </div>
          <div className="flex gap-2">
            <button className="button-primary h-10" disabled={pending}>
              {pending ? "Guardando…" : "Guardar"}
            </button>
            <button
              className="button-secondary h-10"
              onClick={cancelEdit}
              type="button"
            >
              Cancelar
            </button>
          </div>
          <div className="sm:col-span-4">
            <label className="sr-only" htmlFor={`edit-guidance-${item.id}`}>
              Indicación opcional
            </label>
            <input
              className="field-input h-10"
              id={`edit-guidance-${item.id}`}
              name="guidance"
              onChange={(event) => setGuidance(event.target.value)}
              placeholder="Indicación opcional"
              value={guidance}
            />
            {state.status !== "idle" && (
              <p
                className={`mt-2 text-xs ${state.status === "success" ? "text-[var(--success)]" : "text-[var(--danger)]"}`}
              >
                {state.message ?? Object.values(state.errors ?? {}).flat()[0]}
              </p>
            )}
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-start gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {item.quantity} {item.unit} · {item.food_name}
        </p>
        {item.guidance && (
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {item.guidance}
          </p>
        )}
      </div>
      {editable && (
        <div className="flex gap-3">
          <button
            className="text-xs font-semibold text-[var(--brand-700)] hover:underline"
            onClick={() => setEditing(true)}
            type="button"
          >
            Editar
          </button>
          <form action={removeMealItemAction.bind(null, item.id, planId)}>
            <button className="text-xs font-semibold text-[var(--danger)] hover:underline">
              Quitar
            </button>
          </form>
        </div>
      )}
    </li>
  );
}
