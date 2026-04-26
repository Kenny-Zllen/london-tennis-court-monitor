import React from "react";

function VenueCard({ venue }) {
  return (
    <article className="flex h-full flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-200 hover:shadow-md">
      <div className="flex-1">
        <div className="flex flex-col gap-3">
          <div>
            <h2 className="text-lg font-semibold leading-7 text-slate-950">
              {venue.name}
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-600">
              {venue.area}
            </p>
          </div>
          <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
            {venue.platform}
          </span>
        </div>

        <dl className="mt-5 grid gap-3 text-sm">
          <div className="grid grid-cols-[7rem_1fr] gap-3 border-t border-slate-100 pt-3">
            <dt className="font-semibold text-slate-950">Court count</dt>
            <dd className="text-slate-700">{venue.courts}</dd>
          </div>
          <div className="grid grid-cols-[7rem_1fr] gap-3 border-t border-slate-100 pt-3">
            <dt className="font-semibold text-slate-950">Booking rule</dt>
            <dd className="text-slate-700">{venue.bookingRule}</dd>
          </div>
          <div className="grid grid-cols-[7rem_1fr] gap-3 border-t border-slate-100 pt-3">
            <dt className="font-semibold text-slate-950">Facilities</dt>
            <dd className="flex flex-wrap gap-2">
              {venue.facilities.map((facility) => (
                <span
                  className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700"
                  key={facility}
                >
                  {facility}
                </span>
              ))}
            </dd>
          </div>
        </dl>
      </div>

      <a
        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
        href={venue.bookingUrl}
        target="_blank"
        rel="noreferrer"
      >
        Open official booking page
      </a>
    </article>
  );
}

export default VenueCard;
