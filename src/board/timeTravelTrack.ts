// Time Travel track overlay: the marker's 7 spots (start + 6 advances) as
// percentage points over the board image, plus the marker's render width
// (% of the board image width). Calibrate these in-app, then paste the emitted
// literal back here. The marker sits at spots[timeTravelSpot(bot)].

export interface TimeTravelTrackLayout {
  /** 7 spot centers [x, y] % — index 0 = start, 1..6 = each advance. */
  spots: [number, number][];
  /** Marker image width as % of the board image width. */
  markerWidth: number;
}

// Calibrated in-app (2026-07-26).
export const TIME_TRAVEL_TRACK: TimeTravelTrackLayout = {
  spots: [
    [58.2, 66.7],
    [62.7, 66.7],
    [67.5, 66.7],
    [72, 66.7],
    [76.7, 66.7],
    [81.5, 66.7],
    [85.9, 66.7],
  ],
  markerWidth: 5,
};
