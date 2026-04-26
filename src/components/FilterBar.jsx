import React from "react";

function FilterBar({
  areas,
  platforms,
  selectedArea,
  selectedPlatform,
  searchTerm,
  onAreaChange,
  onPlatformChange,
  onSearchChange,
}) {
  return (
    <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
      <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
        Area
        <select
          className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          value={selectedArea}
          onChange={(event) => onAreaChange(event.target.value)}
        >
          <option value="All">All areas</option>
          {areas.map((area) => (
            <option key={area} value={area}>
              {area}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
        Booking platform
        <select
          className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          value={selectedPlatform}
          onChange={(event) => onPlatformChange(event.target.value)}
        >
          <option value="All">All platforms</option>
          {platforms.map((platform) => (
            <option key={platform} value={platform}>
              {platform}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
        Search
        <input
          className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          type="search"
          placeholder="Search venue, area, or platform"
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </label>
    </div>
  );
}

export default FilterBar;
