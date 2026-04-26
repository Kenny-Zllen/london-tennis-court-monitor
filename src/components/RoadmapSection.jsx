import React from "react";

const roadmapItems = [
  "Manual validation workflow",
  "Finsbury Park cached backend prototype",
  "Conservative refresh strategy",
  "Multi-venue support",
  "Optional user alerts only after terms and rate limits are reviewed",
];

function RoadmapSection() {
  return (
    <section className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Roadmap
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950">
            Possible next steps
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Future work should keep the same cautious product boundaries and
            avoid claiming live availability until the architecture supports it.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {roadmapItems.map((item) => (
            <article
              className="rounded-lg border border-slate-200 bg-slate-50 p-5"
              key={item}
            >
              <h3 className="font-semibold text-slate-950">{item}</h3>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default RoadmapSection;
