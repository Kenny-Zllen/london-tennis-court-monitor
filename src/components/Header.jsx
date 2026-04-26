import React from "react";

function Header() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              Frontend-only MVP
            </p>
            <h1 className="mt-3 text-3xl font-bold text-slate-950 sm:text-5xl">
              London Tennis Court Monitor
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
              Find London tennis venues, compare booking basics, and jump to
              official booking pages when you are ready to check court times.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm sm:w-72">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold text-slate-950">7 venues</p>
              <p className="mt-1 text-slate-600">Static MVP data</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold text-slate-950">Official links</p>
              <p className="mt-1 text-slate-600">No auto-booking</p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          This MVP does not show live availability yet. Use the official booking
          page to confirm and book courts.
        </div>
      </div>
    </header>
  );
}

export default Header;
