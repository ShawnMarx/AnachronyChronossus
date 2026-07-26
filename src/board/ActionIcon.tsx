import type { ChronobotActionId } from '../engine/rules/chronobotActions';

// Sprite sheet of the 12 Chronobot action-tile icons, cropped from the solo
// board (public/assets/solo/chronobot-icons.png). 4 columns × 3 rows.
const SHEET = '/assets/solo/chronobot-icons.png';
const COLS = 4;
const ROWS = 3;
const CELL_W = 144;
const CELL_H = 90;

// Row-major order the sprite was packed in.
const ORDER: ChronobotActionId[] = [
  'construct-support',
  'time-travel',
  'construct-superproject',
  'remove-anomaly',
  'mine-resource',
  'construct-powerplant',
  'recruit',
  'construct-factory',
  'research',
  'construct-lab',
  'recruit-genius-research',
  'reboot',
];

export function hasIcon(action: ChronobotActionId): boolean {
  return ORDER.includes(action);
}

/** Renders one action-tile icon from the sprite sheet at the given height (px). */
export function ActionIcon({
  action,
  size = 48,
}: {
  action: ChronobotActionId;
  size?: number;
}) {
  const idx = ORDER.indexOf(action);
  if (idx < 0) return null;
  const col = idx % COLS;
  const row = Math.floor(idx / COLS);
  const scale = size / CELL_H;
  const dispW = CELL_W * scale;
  return (
    <span
      className="action-icon"
      role="img"
      aria-hidden="true"
      style={{
        width: `${dispW}px`,
        height: `${size}px`,
        backgroundImage: `url(${SHEET})`,
        backgroundSize: `${COLS * dispW}px ${ROWS * size}px`,
        backgroundPosition: `-${col * dispW}px -${row * size}px`,
        backgroundRepeat: 'no-repeat',
      }}
    />
  );
}
