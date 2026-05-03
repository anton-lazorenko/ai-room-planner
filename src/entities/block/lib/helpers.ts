import { GRID, PX_PER_M, ROT_SNAP } from "../config/constants";

export const snap = (v: number) => Math.round(v / GRID) * GRID;
export const uid = () => Math.random().toString(36).slice(2, 9);

export const pxToM = (px: number) => px / PX_PER_M;
export const mToPx = (m: number) => snap(m * PX_PER_M);

export const pxToCm = (px: number) => Math.round((px / PX_PER_M) * 100);
export const cmToPx = (cm: number) => snap((cm / 100) * PX_PER_M);

export const fmt = (px: number) => (px / PX_PER_M).toFixed(2);
export const fmtCm = (px: number) => `${pxToCm(px)}`;
export const fmtRot = (deg: number) => `${Math.round(deg)}`;

export const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

export const snapRot = (deg: number) =>
  Math.round(deg / ROT_SNAP) * ROT_SNAP;

export const normDeg = (deg: number) =>
  ((deg % 360) + 360) % 360;