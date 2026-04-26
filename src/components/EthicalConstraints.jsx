import React from "react";

const constraints = [
  "No auto-booking",
  "No login bypassing",
  "No aggressive polling",
  "No frontend scraping",
  "Users must book through official venue pages",
  "Snapshot may be stale or incomplete",
];

function EthicalConstraints() {
  return (
    <section className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Product boundaries
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950">
            Ethical constraints
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {constraints.map((constraint) => (
              <div
                className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700"
                key={constraint}
              >
                {constraint}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default EthicalConstraints;
