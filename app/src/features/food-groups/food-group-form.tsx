"use client";

import { useActionState } from "react";

import type { Tables } from "@/types/database";

import { createFoodGroupAction, updateFoodGroupAction } from "./actions";
import { initialFoodGroupState } from "./schemas";

function ErrorText({ errors }: { errors?: string[] }) {
  return errors?.[0] ? (
    <p className="mt-1.5 text-sm text-[var(--danger)]">{errors[0]}</p>
  ) : null;
}

export function FoodGroupForm({ group }: { group?: Tables<"food_groups"> }) {
  const action = group
    ? updateFoodGroupAction.bind(null, group.id)
    : createFoodGroupAction;
  const [state, formAction, pending] = useActionState(
    action,
    initialFoodGroupState,
  );
  const current = state.values;

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <section className="panel p-5 sm:p-6">
        <h2 className="text-base font-semibold">Definición del equivalente</h2>
        <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
          Los valores son configuración propia de la clínica y se aplican por un
          equivalente.
        </p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="name">
              Nombre
            </label>
            <input
              className="field-input"
              id="name"
              name="name"
              defaultValue={current?.name ?? group?.name ?? ""}
              aria-invalid={Boolean(state.errors?.name)}
              placeholder="Ej. Cereales"
            />
            <ErrorText errors={state.errors?.name} />
          </div>
          <div>
            <label className="field-label" htmlFor="sortOrder">
              Orden
            </label>
            <input
              className="field-input"
              id="sortOrder"
              name="sortOrder"
              type="number"
              min="0"
              max="1000"
              defaultValue={current?.sortOrder ?? group?.sort_order ?? "100"}
              aria-invalid={Boolean(state.errors?.sortOrder)}
            />
            <ErrorText errors={state.errors?.sortOrder} />
          </div>
          <div className="sm:col-span-2">
            <label className="field-label" htmlFor="description">
              Descripción
            </label>
            <textarea
              className="field-input min-h-24 py-3"
              id="description"
              name="description"
              maxLength={500}
              defaultValue={current?.description ?? group?.description ?? ""}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="field-label" htmlFor="portionGuidance">
              Guía de porción
            </label>
            <input
              className="field-input"
              id="portionGuidance"
              name="portionGuidance"
              maxLength={300}
              defaultValue={
                current?.portionGuidance ?? group?.portion_guidance ?? ""
              }
              placeholder="Ej. 1/2 taza cocida o 1 unidad mediana"
            />
          </div>
        </div>
      </section>

      <section className="panel p-5 sm:p-6">
        <h2 className="text-base font-semibold">Nutrientes por equivalente</h2>
        <div className="mt-5 grid grid-cols-2 gap-5 lg:grid-cols-4">
          {[
            [
              "energyKcal",
              "Energía (kcal)",
              current?.energyKcal ?? group?.energy_kcal ?? "",
              "1",
            ],
            [
              "proteinG",
              "Proteína (g)",
              current?.proteinG ?? group?.protein_g ?? "",
              "0.1",
            ],
            [
              "carbohydrateG",
              "Carbohidratos (g)",
              current?.carbohydrateG ?? group?.carbohydrate_g ?? "",
              "0.1",
            ],
            ["fatG", "Grasas (g)", current?.fatG ?? group?.fat_g ?? "", "0.1"],
          ].map(([name, label, value, step]) => (
            <div key={String(name)}>
              <label className="field-label" htmlFor={String(name)}>
                {label}
              </label>
              <input
                className="field-input"
                id={String(name)}
                name={String(name)}
                type="number"
                min="0"
                step={String(step)}
                defaultValue={String(value)}
                aria-invalid={Boolean(state.errors?.[String(name)])}
              />
              <ErrorText errors={state.errors?.[String(name)]} />
            </div>
          ))}
        </div>
        {group && (
          <label className="mt-5 flex items-center gap-3 text-sm font-medium">
            <input
              className="size-4 accent-[var(--brand-700)]"
              name="isActive"
              type="checkbox"
              defaultChecked={current?.isActive ?? group.is_active}
            />
            Disponible para nuevos alimentos del plan
          </label>
        )}
      </section>

      {state.message && (
        <div
          className={state.status === "success" ? "form-success" : "form-error"}
        >
          {state.message}
        </div>
      )}
      <div className="flex justify-end">
        <button className="button-primary w-full sm:w-auto" disabled={pending}>
          {pending ? "Guardando…" : group ? "Guardar cambios" : "Crear grupo"}
        </button>
      </div>
    </form>
  );
}
