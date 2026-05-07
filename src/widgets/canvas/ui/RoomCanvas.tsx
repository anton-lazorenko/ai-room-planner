"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Block, BlockType, DragState, PanState, Viewport } from "@/entities/block/model/types";
import { Field } from "@/shared/ui/field/Field";

import {
  snap,
  uid,
  pxToM,
  mToPx,
  fmt,
  fmtRot,
  clamp,
  snapRot,
  normDeg,
  pxToCm,
  cmToPx,
  fmtCm,
} from "@/entities/block/lib/helpers";

import {
  GRID,
  PX_PER_M,
  MIN_M,
  MIN_PX,
  SCALE_MIN,
  SCALE_MAX,
  SCALE_STEP,
  ROT_SNAP
} from "@/entities/block/config/constants";

const CATALOG: { type: BlockType; label: string; color: string; w: number; h: number }[] = [
  { type: "room", label: "Room", color: "#e8f4fd", w: 200, h: 160 },
  { type: "wall", label: "Wall", color: "#d1d5db", w: 160, h: 20 },
  { type: "door", label: "Door", color: "#fef3c7", w: 40, h: 20 },
  { type: "window", label: "Window", color: "#bfdbfe", w: 60, h: 12 },
  { type: "sofa", label: "Sofa", color: "#ede9fe", w: 120, h: 60 },
  { type: "bed", label: "Bed", color: "#fce7f3", w: 80, h: 100 },
  { type: "table", label: "Table", color: "#d1fae5", w: 80, h: 80 },
  { type: "bath", label: "Bath", color: "#e0f2fe", w: 70, h: 120 },
];

const BLOCK_ICONS: Record<BlockType, string> = {
  room: "⬜", wall: "▬", door: "🚪", window: "🪟",
  sofa: "🛋", bed: "🛏", table: "⬛", bath: "🛁",
};

const COLOR_PRESETS = [
  "#e8f4fd", "#fce7f3", "#d1fae5", "#fef3c7",
  "#ede9fe", "#fee2e2", "#e0f2fe", "#f3f4f6",
];

export function RoomCanvas() {
  const wrapRef = useRef<HTMLDivElement>(null);

  // ── Multi-select ───────────────────────────────────────────────────────────
  const [multiSelected, setMultiSelected] = useState<string[]>([]);
  const multiSelectedRef = useRef<string[]>([]);
  // Keep ref always in sync
  const setMultiSelectedSync = useCallback((val: string[] | ((prev: string[]) => string[])) => {
    setMultiSelected(prev => {
      const next = typeof val === "function" ? val(prev) : val;
      multiSelectedRef.current = next;
      return next;
    });
  }, []);

  // Box selection
  const boxStartRef = useRef<{ x: number; y: number } | null>(null);
  const selectingRef = useRef(false);
  const [boxRect, setBoxRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // ── Blocks ─────────────────────────────────────────────────────────────────
  const [blocks, setBlocks] = useState<Block[]>([
    { id: uid(), type: "room", label: "Living Room", x: 80, y: 80, w: 280, h: 220, rotation: 0, color: "#e8f4fd" },
    { id: uid(), type: "bed", label: "Bed", x: 420, y: 100, w: 80, h: 100, rotation: 0, color: "#fce7f3" },
  ]);
  const blocksRef = useRef<Block[]>(blocks);
  useEffect(() => { blocksRef.current = blocks; }, [blocks]);

  // ── Selection ──────────────────────────────────────────────────────────────
  const [selected, setSelected] = useState<string | null>(null);
  const selectedRef = useRef<string | null>(null);
  useEffect(() => { selectedRef.current = selected; }, [selected]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const editingIdRef = useRef<string | null>(null);
  useEffect(() => { editingIdRef.current = editingId; }, [editingId]);

  const [editLabel, setEditLabel] = useState("");
  const [vp, setVp] = useState<Viewport>({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);

  const dragRef = useRef<DragState | null>(null);
  const panRef = useRef<PanState | null>(null);
  const spaceRef = useRef(false);
  const vpRef = useRef(vp);
  useEffect(() => { vpRef.current = vp; }, [vp]);

  const selectedBlock = blocks.find(b => b.id === selected) ?? null;

  // ── Inspector local state ──────────────────────────────────────────────────
  const [iw, setIw] = useState("");
  const [ih, setIh] = useState("");
  const [ix, setIx] = useState("");
  const [iy, setIy] = useState("");
  const [irot, setIrot] = useState("");
  const editingInspector = useRef(false);

  useEffect(() => {
    if (selectedBlock) {
      setIw(fmtCm(selectedBlock.w));
      setIh(fmtCm(selectedBlock.h));
      setIx(fmtCm(selectedBlock.x));
      setIy(fmtCm(selectedBlock.y));
      setIrot(fmtRot(selectedBlock.rotation));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  useEffect(() => {
    if (editingInspector.current || !selectedBlock) return;
    setIw(fmtCm(selectedBlock.w));
    setIh(fmtCm(selectedBlock.h));
    setIx(fmtCm(selectedBlock.x));
    setIy(fmtCm(selectedBlock.y));
    setIrot(fmtRot(selectedBlock.rotation));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBlock?.w, selectedBlock?.h, selectedBlock?.x, selectedBlock?.y, selectedBlock?.rotation]);

  // ── Inspector commit ───────────────────────────────────────────────────────
  const commitInspector = useCallback((field: "w" | "h" | "x" | "y" | "rotation", raw: string) => {
    const parsed = parseFloat(raw);
    if (isNaN(parsed)) return;
    const currentSelected = selectedRef.current;
    if (!currentSelected) return;

    let px: number;
    if (field === "rotation") {
      px = normDeg(parsed);
    } else {
      px = (field === "w" || field === "h") ? Math.max(MIN_PX, cmToPx(parsed)) : cmToPx(parsed);
    }

    const setStr: Record<string, (v: string) => void> = {
      w: setIw, h: setIh, x: setIx, y: setIy, rotation: setIrot,
    };

    setBlocks(prev => {
      const updated = prev.map(bl => bl.id === currentSelected ? { ...bl, [field]: px } : bl);
      const committed = updated.find(bl => bl.id === currentSelected);
      if (committed) {
        setStr[field](field === "rotation" ? fmtRot(committed.rotation) : fmt(committed[field as "w"]));
      }
      return updated;
    });
  }, []);

  // ── Add block ──────────────────────────────────────────────────────────────
  const addBlock = useCallback((cat: typeof CATALOG[0]) => {
    const { x: vx, y: vy, scale } = vpRef.current;
    const cw = wrapRef.current?.clientWidth ?? 800;
    const ch = wrapRef.current?.clientHeight ?? 600;
    const cx = (cw / 2 - vx) / scale;
    const cy = (ch / 2 - vy) / scale;
    const nb: Block = {
      id: uid(), type: cat.type, label: cat.label,
      x: snap(cx - cat.w / 2 + (Math.random() - 0.5) * 60),
      y: snap(cy - cat.h / 2 + (Math.random() - 0.5) * 60),
      w: cat.w, h: cat.h, rotation: 0, color: cat.color,
    };
    setBlocks(b => [...b, nb]);
    setSelected(nb.id);
    setMultiSelectedSync([nb.id]);
  }, [setMultiSelectedSync]);

  // ── Delete ─────────────────────────────────────────────────────────────────
  // Always read from refs so this is never stale
  const deleteSelected = useCallback(() => {
    const ms = multiSelectedRef.current;
    if (ms.length > 0) {
      setBlocks(b => b.filter(bl => !ms.includes(bl.id)));
      setMultiSelectedSync([]);
      setSelected(null);
      return;
    }
    const sel = selectedRef.current;
    if (!sel) return;
    setBlocks(b => b.filter(bl => bl.id !== sel));
    setSelected(null);
  }, [setMultiSelectedSync]);

  // ── Keyboard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const dn = (e: KeyboardEvent) => {
      if (e.code === "Space" && !editingIdRef.current) {
        spaceRef.current = true;
        setIsPanning(true);
        e.preventDefault();
      }
      if ((e.key === "Delete" || e.key === "Backspace") && !editingIdRef.current && !editingInspector.current) {
        const ms = multiSelectedRef.current;
        if (ms.length > 0) {
          setBlocks(b => b.filter(bl => !ms.includes(bl.id)));
          setMultiSelectedSync([]);
          setSelected(null);
        } else {
          const sel = selectedRef.current;
          if (sel) {
            setBlocks(b => b.filter(bl => bl.id !== sel));
            setSelected(null);
          }
        }
      }
      if (e.key === "Escape") {
        setSelected(null);
        setMultiSelectedSync([]);
        setEditingId(null);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") { spaceRef.current = false; setIsPanning(false); }
    };
    window.addEventListener("keydown", dn);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", dn);
      window.removeEventListener("keyup", up);
    };
  }, [setMultiSelectedSync]);

  // ── Wheel zoom ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      setVp(prev => {
        const ns = clamp(+(prev.scale + (e.deltaY > 0 ? -SCALE_STEP : SCALE_STEP)).toFixed(2), SCALE_MIN, SCALE_MAX);
        const r = ns / prev.scale;
        return { scale: ns, x: mx - r * (mx - prev.x), y: my - r * (my - prev.y) };
      });
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  // ── Global mouse move / up ─────────────────────────────────────────────────
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      // Box selection
      if (selectingRef.current && boxStartRef.current && wrapRef.current) {
        const rect = wrapRef.current.getBoundingClientRect();
        const sx = boxStartRef.current.x;
        const sy = boxStartRef.current.y;
        const cx = e.clientX;
        const cy = e.clientY;
        const left = Math.min(sx, cx) - rect.left;
        const top = Math.min(sy, cy) - rect.top;
        const w = Math.abs(cx - sx);
        const h = Math.abs(cy - sy);
        setBoxRect({ x: left, y: top, w, h });

        const scale = vpRef.current.scale;
        const worldLeft = (Math.min(sx, cx) - rect.left - vpRef.current.x) / scale;
        const worldTop = (Math.min(sy, cy) - rect.top - vpRef.current.y) / scale;
        const worldRight = (Math.max(sx, cx) - rect.left - vpRef.current.x) / scale;
        const worldBottom = (Math.max(sy, cy) - rect.top - vpRef.current.y) / scale;

        const hits = blocksRef.current.filter(bl => {
          return !(bl.x + bl.w < worldLeft || bl.x > worldRight || bl.y + bl.h < worldTop || bl.y > worldBottom);
        }).map(b => b.id);

        multiSelectedRef.current = hits;
        setMultiSelected(hits);
        return;
      }

      // Pan
      if (panRef.current) {
        const { mouseX0, mouseY0, vpX0, vpY0 } = panRef.current;
        setVp(p => ({ ...p, x: vpX0 + (e.clientX - mouseX0), y: vpY0 + (e.clientY - mouseY0) }));
        return;
      }

      const d = dragRef.current;
      if (!d) return;

      const { scale } = vpRef.current;

      // Rotate
      if (d.mode === "rotate") {
        setBlocks(prev => prev.map(bl => {
          if (bl.id !== d.blockId) return bl;
          const { x: vpx, y: vpy } = vpRef.current;
          const cx = (bl.x + bl.w / 2) * scale + vpx;
          const cy = (bl.y + bl.h / 2) * scale + vpy;
          const angleNow = Math.atan2(e.clientY - cy, e.clientX - cx);
          let deg = normDeg((angleNow - d.angleOffset) * (180 / Math.PI));
          if (!e.shiftKey) deg = snapRot(deg);
          return { ...bl, rotation: deg };
        }));
        return;
      }

      const dx = (e.clientX - d.mouseX0) / scale;
      const dy = (e.clientY - d.mouseY0) / scale;

      // Group drag
      // @ts-ignore
      if (d.selectedIds && d.origPositions) {
        const ids = d.selectedIds as string[];
        const orig = d.origPositions as Record<string, { x: number; y: number }>;
        setBlocks(prev => prev.map(bl => {
          if (!ids.includes(bl.id)) return bl;
          const o = orig[bl.id];
          if (!o) return bl;
          return { ...bl, x: snap(o.x + dx), y: snap(o.y + dy) };
        }));
        return;
      }

      // Single block
      setBlocks(prev => prev.map(bl => {
        if (bl.id !== d.blockId) return bl;
        switch (d.mode) {
          case "move": return { ...bl, x: snap(d.blockX0 + dx), y: snap(d.blockY0 + dy) };
          case "resize-r": return { ...bl, w: Math.max(MIN_PX, snap(d.blockW0 + dx)) };
          case "resize-b": return { ...bl, h: Math.max(MIN_PX, snap(d.blockH0 + dy)) };
          case "resize-br": return { ...bl, w: Math.max(MIN_PX, snap(d.blockW0 + dx)), h: Math.max(MIN_PX, snap(d.blockH0 + dy)) };
          default: return bl;
        }
      }));
    };

    const onGlobalUp = () => {
      if (selectingRef.current) {
        selectingRef.current = false;
        boxStartRef.current = null;
        setBoxRect(null);
        return;
      }
      dragRef.current = null;
      panRef.current = null;
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onGlobalUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onGlobalUp);
    };
  }, []);

  // ── Canvas mousedown ───────────────────────────────────────────────────────
  const onCanvasDown = (e: React.MouseEvent) => {
    if (e.button === 1 || spaceRef.current) {
      e.preventDefault();
      panRef.current = {
        mouseX0: e.clientX, mouseY0: e.clientY,
        vpX0: vpRef.current.x, vpY0: vpRef.current.y,
      };
      return;
    }
    // Click on empty canvas — start box selection
    if (e.target === e.currentTarget) {
      const rect = wrapRef.current?.getBoundingClientRect();
      if (!rect) return;
      boxStartRef.current = { x: e.clientX, y: e.clientY };
      selectingRef.current = true;
      setSelected(null);
      selectedRef.current = null;
      setMultiSelectedSync([]);
      setBoxRect({ x: e.clientX - rect.left, y: e.clientY - rect.top, w: 0, h: 0 });
    }
  };

  // ── Block mousedown ────────────────────────────────────────────────────────
  const onBlockDown = (e: React.MouseEvent, bl: Block, mode: DragState["mode"]) => {
    if (spaceRef.current) return;
    e.stopPropagation();
    e.preventDefault();

    // Always read the current multi-selection from ref (never stale)
    const currentMulti = multiSelectedRef.current;
    const wasInMulti = currentMulti.includes(bl.id);

    let activeSelection: string[] = [];

    if (e.shiftKey || e.ctrlKey) {
      // Toggle this block in/out of selection
      const next = wasInMulti
        ? currentMulti.filter(id => id !== bl.id)
        : [...currentMulti, bl.id];
      activeSelection = next;
      setMultiSelectedSync(next);
      if (next.length === 1) setSelected(next[0]);
      else if (next.length === 0) setSelected(null);
    } else {
      if (wasInMulti && currentMulti.length > 1) {
        // Clicked a block that's already part of a multi-selection — keep the group
        activeSelection = currentMulti.slice();
      } else {
        // Single select
        activeSelection = [bl.id];
        setMultiSelectedSync([bl.id]);
        setSelected(bl.id);
        selectedRef.current = bl.id;
      }
    }

    // Compute angle offset for rotation
    let angleOffset = 0;
    if (mode === "rotate") {
      const { x: vpx, y: vpy, scale } = vpRef.current;
      const cx = (bl.x + bl.w / 2) * scale + vpx;
      const cy = (bl.y + bl.h / 2) * scale + vpy;
      const mouseAngle = Math.atan2(e.clientY - cy, e.clientX - cx);
      angleOffset = mouseAngle - bl.rotation * (Math.PI / 180);
    }

    // Group drag if multiple selected
    if (activeSelection.length > 1 && activeSelection.includes(bl.id)) {
      const orig: Record<string, { x: number; y: number }> = {};
      for (const id of activeSelection) {
        const b = blocksRef.current.find(bb => bb.id === id);
        if (b) orig[id] = { x: b.x, y: b.y };
      }
      dragRef.current = {
        blockId: bl.id, mode: "move",
        mouseX0: e.clientX, mouseY0: e.clientY,
        blockX0: bl.x, blockY0: bl.y,
        blockW0: bl.w, blockH0: bl.h,
        rotation0: bl.rotation, angleOffset,
        selectedIds: activeSelection,
        origPositions: orig,
      }
      return;
    }

    // Single drag
    dragRef.current = {
      blockId: bl.id, mode,
      mouseX0: e.clientX, mouseY0: e.clientY,
      blockX0: bl.x, blockY0: bl.y,
      blockW0: bl.w, blockH0: bl.h,
      rotation0: bl.rotation, angleOffset,
    };
  };

  // ── Label edit ─────────────────────────────────────────────────────────────
  const startEdit = (bl: Block, e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    setEditingId(bl.id);
    editingIdRef.current = bl.id;
    setEditLabel(bl.label);
  };
  const commitEdit = () => {
    if (!editingId) return;
    setBlocks(b => b.map(bl => bl.id === editingId ? { ...bl, label: editLabel } : bl));
    setEditingId(null);
    editingIdRef.current = null;
  };

  // ── Zoom helpers ───────────────────────────────────────────────────────────
  const zoomBy = (delta: number) => {
    const cw = wrapRef.current?.clientWidth ?? 800;
    const ch = wrapRef.current?.clientHeight ?? 600;
    setVp(p => {
      const ns = clamp(+(p.scale + delta).toFixed(2), SCALE_MIN, SCALE_MAX);
      const r = ns / p.scale;
      return { scale: ns, x: cw / 2 - r * (cw / 2 - p.x), y: ch / 2 - r * (ch / 2 - p.y) };
    });
  };

  const gridPx = GRID * vp.scale;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", fontFamily: "system-ui,sans-serif", overflow: "hidden" }}>

      {/* ── LEFT panel ── */}
      <aside style={S.panel}>
        <span style={S.label}>Elements</span>
        {CATALOG.map(cat => (
          <button key={cat.type} onClick={() => addBlock(cat)} style={S.catBtn}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = cat.color; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; }}
          >
            <span style={{ fontSize: 14 }}>{BLOCK_ICONS[cat.type]}</span>
            {cat.label}
          </button>
        ))}
        <div style={{ marginTop: "auto", borderTop: "1px solid #e5e7eb", paddingTop: 12 }}>
          <span style={S.label}>Scale</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
            <div style={{ width: 40, height: 4, background: "#6b7280", borderRadius: 2 }} />
            <span style={{ fontSize: 11, color: "#6b7280" }}>= 100 cm</span>
          </div>
        </div>
      </aside>

      {/* ── CANVAS ── */}
      <div
        ref={wrapRef}
        onMouseDown={onCanvasDown}
        style={{
          flex: 1, position: "relative", overflow: "hidden",
          cursor: isPanning ? "grab" : "default",
          backgroundImage: `
            linear-gradient(to right,  #e5e7eb 1px, transparent 1px),
            linear-gradient(to bottom, #e5e7eb 1px, transparent 1px),
            linear-gradient(to right,  #f3f4f6 1px, transparent 1px),
            linear-gradient(to bottom, #f3f4f6 1px, transparent 1px)
          `,
          backgroundSize: `${gridPx * 10}px ${gridPx * 10}px,${gridPx * 10}px ${gridPx * 10}px,${gridPx}px ${gridPx}px,${gridPx}px ${gridPx}px`,
          backgroundPosition: `${vp.x}px ${vp.y}px,${vp.x}px ${vp.y}px,${vp.x}px ${vp.y}px,${vp.x}px ${vp.y}px`,
        }}
      >
        <button onClick={() => setVp({ x: 0, y: 0, scale: 1 })} style={S.zoomBadge} title="Reset view">
          {Math.round(vp.scale * 100)}%
        </button>
        <div style={S.zoomBtns}>
          <button style={S.zoomBtn} onClick={() => zoomBy(+SCALE_STEP)}>+</button>
          <button style={S.zoomBtn} onClick={() => zoomBy(-SCALE_STEP)}>−</button>
        </div>

        {/* world */}
        <div style={{ position: "absolute", top: 0, left: 0, transformOrigin: "0 0", transform: `translate(${vp.x}px,${vp.y}px) scale(${vp.scale})` }}>
          {blocks.map(bl => {
            const isSingleSelected = bl.id === selected;
            const isMultiSelected = multiSelected.includes(bl.id);
            const sel = isSingleSelected || isMultiSelected;
            return (
              <div
                key={bl.id}
                onMouseDown={e => onBlockDown(e, bl, "move")}
                onClick={e => {
                  e.stopPropagation();
                  if (!e.shiftKey && !e.ctrlKey) {
                    setSelected(bl.id);
                    selectedRef.current = bl.id;
                  }
                }}
                className={`absolute box-border rounded cursor-move select-none flex flex-col items-center justify-center gap-0.5 overflow-visible`}
                style={{
                  left: bl.x,
                  top: bl.y,
                  width: bl.w,
                  height: bl.h,
                  transform: `rotate(${bl.rotation}deg)`,
                  transformOrigin: "center",
                  background: bl.color,
                  border: sel
                    ? isMultiSelected && !isSingleSelected
                      ? "2px dashed #2563eb"   // in group but not "primary" selected
                      : "2px solid #2563eb"    // primary selected
                    : "1.5px solid #9ca3af",
                  boxShadow: sel ? "0 0 0 3px rgba(37,99,235,0.15)" : undefined,
                  zIndex: sel ? 2 : 1,
                }}
              >
                <span style={{ fontSize: Math.min(20, bl.h * 0.28, bl.w * 0.28), pointerEvents: "none" }}>
                  {BLOCK_ICONS[bl.type]}
                </span>

                {editingId === bl.id ? (
                  <input autoFocus value={editLabel}
                    onChange={e => setEditLabel(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={e => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditingId(null); }}
                    onClick={e => e.stopPropagation()}
                    style={{ fontSize: 11, textAlign: "center", border: "1px solid #2563eb", borderRadius: 4, padding: "1px 4px", width: "80%", background: "#fff", outline: "none" }}
                  />
                ) : (
                  <span onDoubleClick={e => startEdit(bl, e)} style={{ fontSize: 11, fontWeight: 500, color: "#374151", maxWidth: "90%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {bl.label}
                  </span>
                )}

                {bl.w > 6 && bl.h > 3.6 && (
                  <span style={{ fontSize: 9, color: "#6b7280", pointerEvents: "none" }}>
                    {fmtCm(bl.w)} × {fmtCm(bl.h)} cm
                  </span>
                )}

                {/* Handles only on primary selected (single) */}
                {isSingleSelected && <>
                  <div onMouseDown={e => onBlockDown(e, bl, "resize-r")} style={S.hR} />
                  <div onMouseDown={e => onBlockDown(e, bl, "resize-b")} style={S.hB} />
                  <div onMouseDown={e => onBlockDown(e, bl, "resize-br")} style={S.hBR} />
                  <div style={S.rotateLine} />
                  <div
                    onMouseDown={e => onBlockDown(e, bl, "rotate")}
                    title="Drag to rotate · Shift = free angle"
                    style={S.hRot}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ pointerEvents: "none" }}>
                      <path d="M2 6a4 4 0 1 1 4 4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
                      <polyline points="2,3.5 2,6 4.5,6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </>}
              </div>
            );
          })}
        </div>

        {/* Box selection rectangle */}
        {boxRect && (
          <div style={{
            position: "absolute",
            left: boxRect.x, top: boxRect.y,
            width: boxRect.w, height: boxRect.h,
            border: "1px dashed rgba(37,99,235,0.8)",
            background: "rgba(37,99,235,0.06)",
            pointerEvents: "none",
            zIndex: 15,
          }} />
        )}
      </div>

      {/* ── RIGHT inspector ── */}
      <aside style={{ ...S.panel, borderLeft: "1px solid #e5e7eb", borderRight: "none" }}>
        {selectedBlock ? (
          <>
            <span style={S.label}>{BLOCK_ICONS[selectedBlock.type]} {selectedBlock.type}</span>

            <Field label="Width (cm)" value={iw} onChange={v => setIw(v)} onFocus={() => { editingInspector.current = true; }} onBlur={v => { editingInspector.current = false; commitInspector("w", v); }} />
            <Field label="Height (cm)" value={ih} onChange={v => setIh(v)} onFocus={() => { editingInspector.current = true; }} onBlur={v => { editingInspector.current = false; commitInspector("h", v); }} />
            <Field label="X pos (cm)" value={ix} onChange={v => setIx(v)} onFocus={() => { editingInspector.current = true; }} onBlur={v => { editingInspector.current = false; commitInspector("x", v); }} />
            <Field label="Y pos (cm)" value={iy} onChange={v => setIy(v)} onFocus={() => { editingInspector.current = true; }} onBlur={v => { editingInspector.current = false; commitInspector("y", v); }} />
            <Field label="Rotation (°)" value={irot} onChange={v => setIrot(v)} onFocus={() => { editingInspector.current = true; }} onBlur={v => { editingInspector.current = false; commitInspector("rotation", v); }} step={15} />

            {/* Quick-rotate buttons */}
            <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
              {([-90, -45, 45, 90] as const).map(d => (
                <button key={d}
                  onClick={() => setBlocks(prev => prev.map(bl =>
                    bl.id === selected ? { ...bl, rotation: normDeg(bl.rotation + d) } : bl
                  ))}
                  title={`${d > 0 ? "+" : ""}${d}°`}
                  style={S.rotBtn}
                >
                  {d === -90 ? "↺" : d === -45 ? "⟲" : d === 45 ? "⟳" : "↻"}
                </button>
              ))}
            </div>

            {selectedBlock.rotation !== 0 && (
              <button
                onClick={() => setBlocks(b => b.map(bl => bl.id === selected ? { ...bl, rotation: 0 } : bl))}
                style={{ ...S.rotBtn, width: "100%", marginBottom: 8, fontSize: 11, padding: "5px 8px" }}
              >
                Reset rotation
              </button>
            )}

            {/* Color */}
            <div style={{ marginTop: 6 }}>
              <span style={{ ...S.label, display: "block", marginBottom: 8 }}>Fill</span>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {COLOR_PRESETS.map(c => (
                  <button key={c}
                    onClick={() => setBlocks(b => b.map(bl => bl.id === selected ? { ...bl, color: c } : bl))}
                    style={{
                      width: 22, height: 22, borderRadius: "50%", background: c, padding: 0, cursor: "pointer",
                      border: selectedBlock.color === c ? "2.5px solid #2563eb" : "1.5px solid #d1d5db",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Area */}
            <div style={{ background: "#f3f4f6", borderRadius: 8, padding: "10px 12px", marginTop: 12 }}>
              <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>Area</p>
              <p style={{ fontSize: 20, fontWeight: 600, color: "#111827", margin: "2px 0 0" }}>
                {(pxToCm(selectedBlock.w) * pxToCm(selectedBlock.h)).toFixed(0)} cm²
              </p>
            </div>

            <button onClick={deleteSelected} style={S.delBtn}>🗑 Delete</button>
            <p style={{ fontSize: 10, color: "#d1d5db", textAlign: "center", margin: 0 }}>
              Del · Esc · Dbl-click rename
            </p>
          </>
        ) : multiSelected.length > 0 ? (
          <div>
            <span style={S.label}>Selection</span>
            <p style={{ fontWeight: 600, color: "#374151", marginTop: 4, fontSize: 14 }}>
              {multiSelected.length} objects
            </p>
            <p style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.6 }}>
              Drag any selected object to move the group.
            </p>
            <p style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.6 }}>
              Shift/Ctrl+click to add or remove.
            </p>
            <button onClick={deleteSelected} style={{ ...S.delBtn, marginTop: 16 }}>🗑 Delete selected</button>
          </div>
        ) : (
          <div style={{ color: "#9ca3af", fontSize: 12, lineHeight: 1.7 }}>
            <p style={{ fontWeight: 600, color: "#6b7280", marginTop: 0 }}>No selection</p>
            <p>Click a block to inspect.</p>
            <p style={{ marginTop: 12, fontWeight: 500, color: "#6b7280" }}>Multi-select</p>
            <ul style={{ paddingLeft: 16, margin: 0, lineHeight: 2 }}>
              <li>Drag canvas — box select</li>
              <li>Shift/Ctrl+click — toggle</li>
              <li>Drag any selected — move group</li>
              <li>Del — delete all selected</li>
            </ul>
            <p style={{ marginTop: 12, fontWeight: 500, color: "#6b7280" }}>Navigation</p>
            <ul style={{ paddingLeft: 16, margin: 0, lineHeight: 2 }}>
              <li>Scroll — zoom</li>
              <li>Space + drag — pan</li>
              <li>Middle btn — pan</li>
              <li>Click % — reset view</li>
            </ul>
            <p style={{ marginTop: 12, fontWeight: 500, color: "#6b7280" }}>Rotation</p>
            <ul style={{ paddingLeft: 16, margin: 0, lineHeight: 2 }}>
              <li>Drag ↺ handle</li>
              <li>+Shift = free angle</li>
              <li>Default snap = 15°</li>
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = {
  panel: {
    width: 168, background: "#f9fafb", borderRight: "1px solid #e5e7eb",
    padding: "12px 10px", display: "flex" as const, flexDirection: "column" as const,
    gap: 4, zIndex: 20, flexShrink: 0, overflowY: "auto" as const,
  },
  label: {
    fontSize: 10, fontWeight: 600 as const, color: "#9ca3af",
    letterSpacing: "0.08em", textTransform: "uppercase" as const,
    display: "block" as const, marginBottom: 6,
  },
  catBtn: {
    display: "flex", alignItems: "center", gap: 8, padding: "7px 10px",
    border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff",
    cursor: "pointer", fontSize: 12, color: "#374151",
    textAlign: "left" as const, width: "100%",
  },
  zoomBadge: {
    position: "absolute" as const, bottom: 90, right: 12,
    background: "rgba(255,255,255,0.92)", border: "1px solid #e5e7eb",
    borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 500 as const,
    color: "#374151", cursor: "pointer", zIndex: 10, userSelect: "none" as const,
  },
  zoomBtns: {
    position: "absolute" as const, bottom: 12, right: 12,
    display: "flex", flexDirection: "column" as const, gap: 4, zIndex: 10,
  },
  zoomBtn: {
    width: 32, height: 32, background: "rgba(255,255,255,0.92)",
    border: "1px solid #e5e7eb", borderRadius: 8, cursor: "pointer",
    fontSize: 18, color: "#374151",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  hR: { position: "absolute" as const, right: -4, top: "20%", width: 8, height: "60%", cursor: "ew-resize", background: "#2563eb", borderRadius: 4, opacity: 0.75 },
  hB: { position: "absolute" as const, bottom: -4, left: "20%", height: 8, width: "60%", cursor: "ns-resize", background: "#2563eb", borderRadius: 4, opacity: 0.75 },
  hBR: { position: "absolute" as const, right: -5, bottom: -5, width: 10, height: 10, cursor: "nwse-resize", background: "#2563eb", borderRadius: 2 },
  rotateLine: {
    position: "absolute" as const,
    top: -28, left: "50%", transform: "translateX(-50%)",
    width: 1, height: 24,
    background: "#2563eb", opacity: 0.5, pointerEvents: "none" as const,
  },
  hRot: {
    position: "absolute" as const,
    top: -44, left: "50%", transform: "translateX(-50%)",
    width: 22, height: 22,
    background: "#2563eb", borderRadius: "50%",
    cursor: "grab",
    display: "flex" as const, alignItems: "center", justifyContent: "center",
    boxShadow: "0 1px 4px rgba(37,99,235,0.35)",
  },
  rotBtn: {
    flex: 1, padding: "5px 0",
    background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6,
    cursor: "pointer", fontSize: 14, color: "#374151",
  },
  delBtn: {
    marginTop: "auto", padding: "8px 12px", background: "#fff",
    border: "1px solid #fca5a5", borderRadius: 8, color: "#ef4444",
    cursor: "pointer", fontSize: 13, fontWeight: 500 as const, width: "100%",
  },
};