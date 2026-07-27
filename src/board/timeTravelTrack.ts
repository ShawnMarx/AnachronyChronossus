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

// The Chronobot's Warp-tile marker on the board (image + count underneath).
// `pos` is the image center [x, y] %; `width` is its % of the board width.
// Calibrate in-app and paste the emitted literal back here.
export interface WarpMarkerLayout {
  pos: [number, number];
  width: number;
}

export const WARP_MARKER: WarpMarkerLayout = {
  pos: [87.1, 57.9],
  width: 5.9,
};

// The Chronobot's 3 Paradox slots (filled 0–3 during the Paradox phase). Each
// `slots[i]` is an image center [x, y] %; the middle slot is drawn pointing left,
// the outer two pointing right. Calibrate in-app and paste the literal back.
export interface ParadoxLayout {
  slots: [number, number][];
  width: number;
}

export const PARADOX_SLOTS: ParadoxLayout = {
  slots: [
    [40, 30],
    [45, 30],
    [50, 30],
  ],
  width: 5,
};
