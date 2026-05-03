export type BlockType =
  | "room"
  | "wall"
  | "door"
  | "window"
  | "sofa"
  | "bed"
  | "table"
  | "bath";

export interface Block {
  id: string;
  type: BlockType;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  color: string;
}

export interface Viewport {
  x: number;
  y: number;
  scale: number;
}

export interface DragState {
  blockId: string;
  mode: "move" | "resize-r" | "resize-b" | "resize-br" | "rotate";
  mouseX0: number;
  mouseY0: number;
  blockX0: number;
  blockY0: number;
  blockW0: number;
  blockH0: number;
  rotation0: number;
  angleOffset: number;
  selectedIds?: string[];
  origPositions?: Record<string, { x: number; y: number }>;
}

export interface PanState {
  mouseX0: number;
  mouseY0: number;
  vpX0: number;
  vpY0: number;
}