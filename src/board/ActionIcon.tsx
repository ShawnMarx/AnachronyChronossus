import type { ChronobotActionId } from '../engine/rules/chronobotActions';

// One cropped action-tile image per Chronobot action, taken from the solo board
// (public/assets/solo/actions/<action-id>.png). Each source image is 142×96.
const CELL_W = 142;
const CELL_H = 96;

// The actions that have a tile image on disk (file name == action id).
const HAS_IMAGE: ChronobotActionId[] = [
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

const srcFor = (action: ChronobotActionId) =>
  `/assets/solo/actions/${action}.png`;

export function hasIcon(action: ChronobotActionId): boolean {
  return HAS_IMAGE.includes(action);
}

/** Renders one action-tile icon at the given height (px), preserving aspect. */
export function ActionIcon({
  action,
  size = 48,
}: {
  action: ChronobotActionId;
  size?: number;
}) {
  if (!hasIcon(action)) return null;
  const width = (CELL_W / CELL_H) * size;
  return (
    <img
      className="action-icon"
      src={srcFor(action)}
      alt=""
      aria-hidden="true"
      width={width}
      height={size}
      style={{ width: `${width}px`, height: `${size}px` }}
    />
  );
}
