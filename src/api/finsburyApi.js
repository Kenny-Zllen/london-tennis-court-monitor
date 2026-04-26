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
  const data = await getJson("/api/finsbury/snapshots");
  return data.availableDates || [];
}

export async function fetchFinsburySnapshot(date) {
  const query = date ? `?date=${encodeURIComponent(date)}` : "";
  return getJson(`/api/finsbury/snapshot${query}`);
}
