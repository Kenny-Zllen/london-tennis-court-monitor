import React from "react";

function StatusCards({ venueCount, snapshotVenue }) {
  const cards = [
    {
      label: "Venues indexed",
      value: venueCount,
      detail: "Static venue dataset",
    },
    {
      label: "Experimental snapshot",
      value: snapshotVenue,
      detail: "Cached backend data",
    },
    {
      label: "Production scraping",
      value: "Not enabled",
      detail: "Frontend does not request booking platforms",
    },
    {
      label: "Booking action",
      value: "Official sites only",
      detail: "No auto-booking",
    },
  ];

  return (
    <section className="border-b border-slate-200 bg-slate-50">
      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-6 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        {cards.map((card) => (
          <article
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            key={card.label}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {card.label}
            </p>
            <p className="mt-2 text-xl font-bold text-slate-950">
              {card.value}
            </p>
            <p className="mt-1 text-sm text-slate-600">{card.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default StatusCards;
