import React from "react";
import { useMemo, useState } from "react";
import FilterBar from "./components/FilterBar.jsx";
import Header from "./components/Header.jsx";
import VenueCard from "./components/VenueCard.jsx";
import { venues } from "./data/venues.js";

function App() {
  const [selectedArea, setSelectedArea] = useState("All");
  const [selectedPlatform, setSelectedPlatform] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  const areas = useMemo(
    () => [...new Set(venues.map((venue) => venue.area))].sort(),
    [],
  );

  const platforms = useMemo(
    () => [...new Set(venues.map((venue) => venue.platform))].sort(),
    [],
  );

  const filteredVenues = venues.filter((venue) => {
    const matchesArea = selectedArea === "All" || venue.area === selectedArea;
    const matchesPlatform =
      selectedPlatform === "All" || venue.platform === selectedPlatform;
    const searchText =
      `${venue.name} ${venue.area} ${venue.platform} ${venue.facilities.join(" ")}`
      .toLowerCase()
      .trim();
    const matchesSearch = searchText.includes(searchTerm.toLowerCase().trim());

    return matchesArea && matchesPlatform && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main>
        <FilterBar
          areas={areas}
          platforms={platforms}
          selectedArea={selectedArea}
          selectedPlatform={selectedPlatform}
          searchTerm={searchTerm}
          onAreaChange={setSelectedArea}
          onPlatformChange={setSelectedPlatform}
          onSearchChange={setSearchTerm}
        />

        <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-2xl font-bold tracking-normal text-slate-950">
                Tennis venues
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Showing {filteredVenues.length}{" "}
                {filteredVenues.length === 1 ? "venue" : "venues"}
              </p>
            </div>
            <p className="max-w-xl text-sm text-slate-500">
              Static venue data for the MVP. Availability and booking details
              should always be checked on the official venue page.
            </p>
          </div>

          {filteredVenues.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredVenues.map((venue) => (
                <VenueCard key={venue.id} venue={venue} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
              <h3 className="text-xl font-semibold text-slate-950">
                No venues found
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                Try a broader area, choose all booking platforms, or search for
                a different venue name.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
