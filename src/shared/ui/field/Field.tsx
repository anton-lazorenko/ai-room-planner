export function Field({
  label,
  value,
  onChange,
  onFocus,
  onBlur,
  step = 0.25,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onFocus: () => void;
  onBlur: (v: string) => void;
  step?: number;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{
        display: "block",
        fontSize: 11,
        color: "#6b7280",
        marginBottom: 3
      }}>
        {label}
      </label>

      <input
        type="number"
        step={step}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={e => onBlur(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter") {
            (e.target as HTMLInputElement).blur();
          }
        }}
        style={{
          display: "block",
          width: "100%",
          padding: "6px 10px",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          fontSize: 13,
          background: "#fff",
          outline: "none",
          boxSizing: "border-box",
          color: "#111827",
        }}
      />
    </div>
  );
}