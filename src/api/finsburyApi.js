const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

async function getJson(path) {
  const response = await fetch(`${API_BASE_URL}${path}`);

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  return response.json();
}

export async function fetchFinsburySnapshotDates() {
  return fetchVenueSnapshotDates("finsbury-park");
}

export async function fetchFinsburySnapshot(date) {
  return fetchVenueSnapshot("finsbury-park", date);
}

export async function fetchVenues() {
  const data = await getJson("/api/venues");
  return data.venues || [];
}

export async function fetchVenueSnapshotDates(venueId) {
  try {
    const live = await getJson(`/api/venues/${venueId}/live-dates`);
    if (live.availableDates && live.availableDates.length) {
      return live.availableDates;
    }
  } catch (err) {
    // fall through to cached snapshot dates
  }
  const data = await getJson(`/api/venues/${venueId}/snapshots`);
  return data.availableDates || [];
}

export async function fetchVenueSnapshot(venueId, date) {
  const query = date ? `?date=${encodeURIComponent(date)}` : "";
  try {
    const live = await getJson(`/api/venues/${venueId}/live${query}`);
    if (live && live.records && live.records.length) {
      return live;
    }
  } catch (err) {
    // fall through to cached snapshot
  }
  return getJson(`/api/venues/${venueId}/snapshot${query}`);
}
