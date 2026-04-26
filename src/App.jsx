import React from "react";
import { useMemo, useState } from "react";
import EthicalConstraints from "./components/EthicalConstraints.jsx";
import FinsburySnapshot from "./components/FinsburySnapshot.jsx";
import FilterBar from "./components/FilterBar.jsx";
import Header from "./components/Header.jsx";
import PipelineSection from "./components/PipelineSection.jsx";
import RoadmapSection from "./components/RoadmapSection.jsx";
import StatusCards from "./components/StatusCards.jsx";
import VenueCard from "./components/VenueCard.jsx";
import { defaultFinsburySnapshot } from "./data/finsburySnapshots/index.js";
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
      <StatusCards
        snapshotVenue={defaultFinsburySnapshot.meta.venueName}
        venueCount={venues.length}
      />
      <main>
        <section
          className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8"
          id="venues"
        >
          <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
                Venue discovery
              </p>
              <h2 className="text-2xl font-bold tracking-normal text-slate-950">
                Find London tennis venues
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

          {filteredVenues.length > 0 ? (
            <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
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

        <FinsburySnapshot />
        <PipelineSection />
        <EthicalConstraints />
        <RoadmapSection />
      </main>
    </div>
  );
}

export default App;
