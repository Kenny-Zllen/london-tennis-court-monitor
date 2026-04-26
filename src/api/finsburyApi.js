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
  const data = await getJson(`/api/venues/${venueId}/snapshots`);
  return data.availableDates || [];
}

export async function fetchVenueSnapshot(venueId, date) {
  const query = date ? `?date=${encodeURIComponent(date)}` : "";
  return getJson(`/api/venues/${venueId}/snapshot${query}`);
}
