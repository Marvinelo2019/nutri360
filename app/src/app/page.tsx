import { product } from "@/lib/product";

const foundations = [
  "Expediente clínico y antropometría",
  "Cálculo nutricional y planes",
  "Agenda, recordatorios y cobros",
  "Portal privado para pacientes",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f3f7f2] px-6 py-12 text-[#18322b] sm:px-10 lg:px-16">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-6xl flex-col justify-between rounded-[2rem] border border-[#dce8dd] bg-white p-8 shadow-[0_24px_80px_rgba(39,78,62,0.08)] sm:p-12 lg:p-16">
        <div className="flex items-center justify-between gap-4">
          <span className="text-lg font-semibold tracking-tight">
            {product.name}
          </span>
          <span className="rounded-full bg-[#e8f4ea] px-3 py-1 text-xs font-medium text-[#2d6a4f]">
            Fundamentos del MVP
          </span>
        </div>

        <section className="my-16 max-w-3xl">
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.2em] text-[#5f806f]">
            Sistema para nutricionistas
          </p>
          <h1 className="text-4xl font-semibold leading-tight tracking-[-0.04em] sm:text-6xl">
            Una práctica nutricional completa, organizada en un solo lugar.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-[#577067] sm:text-lg">
            La nueva base de Nutri360 está lista. Construiremos cada módulo con
            aislamiento por consultorio, trazabilidad clínica y una experiencia
            pensada para Guatemala.
          </p>
        </section>

        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {foundations.map((foundation, index) => (
            <li
              key={foundation}
              className="rounded-2xl border border-[#e2ebe3] bg-[#f8faf7] p-5"
            >
              <span className="text-xs font-semibold text-[#7a9988]">
                0{index + 1}
              </span>
              <p className="mt-3 text-sm font-medium leading-5">{foundation}</p>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
