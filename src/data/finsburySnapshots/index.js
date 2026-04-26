import {
  finsburySnapshot as snapshot20260426,
  finsburySnapshotMeta as meta20260426,
} from "./2026-04-26.js";

import {
  finsburySnapshot as snapshot20260427,
  finsburySnapshotMeta as meta20260427,
} from "./2026-04-27.js";

export const finsburySnapshots = [
  {
    date: "2026-04-26",
    label: "26 Apr 2026",
    meta: meta20260426,
    data: snapshot20260426,
  },
  {
    date: "2026-04-27",
    label: "27 Apr 2026",
    meta: meta20260427,
    data: snapshot20260427,
  },
];

export const defaultFinsburySnapshot =
  finsburySnapshots[finsburySnapshots.length - 1];
