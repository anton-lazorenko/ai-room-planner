// Pixels per meter used for conversions (keep as before unless you want to change visual scale)
export const PX_PER_M = 40;

// Grid: one grid cell represents 10 cm (0.1 m). Compute pixels per 10cm.
export const GRID = Math.max(1, Math.round(PX_PER_M * 0.1));
export const MIN_M = 0.01; // 1 cm in meters
export const MIN_PX = Math.max(1, Math.round(MIN_M * PX_PER_M));
export const SCALE_MIN = 0.2;
export const SCALE_MAX = 4;
export const SCALE_STEP = 0.1;
export const ROT_SNAP = 15;