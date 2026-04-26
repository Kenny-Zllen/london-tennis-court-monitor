import React from "react";

function Header() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="max-w-4xl">
          <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800">
            Frontend MVP + experimental static snapshot
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-normal text-slate-950 sm:text-6xl">
              London Tennis Court Monitor
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
            Discover London tennis venues, compare booking basics, and open
            official booking pages. The Finsbury Park section is an experimental
            static snapshot, not a live booking monitor.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
              href="#venues"
            >
              Explore venues
            </a>
            <a
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
              href="#finsbury-snapshot"
            >
              View Finsbury snapshot
            </a>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          Static data only in production. Use official booking pages to confirm
          availability and book courts.
        </div>
      </div>
    </header>
  );
}

export default Header;
