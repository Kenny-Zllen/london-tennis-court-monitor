import React from "react";

const steps = [
  {
    title: "Manual updater",
    text: "A developer runs the local snapshot updater when they want to refresh the static data.",
  },
  {
    title: "Single page load",
    text: "Playwright loads the public booking page once during that manual run.",
  },
  {
    title: "Parser candidates",
    text: "The parser extracts court, time, and status candidates from rendered text.",
  },
  {
    title: "Static display",
    text: "React displays the generated static file. The production website does not scrape ClubSpark.",
  },
];

function PipelineSection() {
  return (
    <section className="border-t border-slate-200 bg-white" id="pipeline">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Data pipeline
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950">
            How the snapshot pipeline works
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            This workflow is local-only and developer-operated. It is not a
            production scraper, scheduler, or live availability service.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <article
              className="rounded-lg border border-slate-200 bg-slate-50 p-5"
              key={step.title}
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-700 text-sm font-bold text-white">
                {index + 1}
              </span>
              <h3 className="mt-4 font-semibold text-slate-950">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {step.text}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default PipelineSection;
