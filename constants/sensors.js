// FILE: constants/sensors.js
// Grid layout matching the requested heatmap screenshot:
// Row 0 (top):    S1  S2  S3  S4
// Row 1:          S14 [ FARM ] S5
// Row 2:          S13 [ FARM ] S6
// Row 3:          S12 [ FARM ] S7
// Row 4 (bottom): S11 S10 S9  S8

export const SENSORS = {
  // Top row
  S1:  { zone: "Zone-1",  row: 0, col: 0 },
  S2:  { zone: "Zone-2",  row: 0, col: 1 },
  S3:  { zone: "Zone-3",  row: 0, col: 2 },
  S4:  { zone: "Zone-4",  row: 0, col: 3 },
  // Right column
  S5:  { zone: "Zone-5",  row: 1, col: 3 },
  S6:  { zone: "Zone-6",  row: 2, col: 3 },
  S7:  { zone: "Zone-7",  row: 3, col: 3 },
  // Bottom row
  S8:  { zone: "Zone-8",  row: 4, col: 3 },
  S9:  { zone: "Zone-9",  row: 4, col: 2 },
  S10: { zone: "Zone-10", row: 4, col: 1 },
  S11: { zone: "Zone-11", row: 4, col: 0 },
  // Left column
  S12: { zone: "Zone-12", row: 3, col: 0 },
  S13: { zone: "Zone-13", row: 2, col: 0 },
  S14: { zone: "Zone-14", row: 1, col: 0 },
};

export const GRID_ROWS = 5;
export const GRID_COLS = 4;

export const ZONES = Object.values(SENSORS).map(s => s.zone);
