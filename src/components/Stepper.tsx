"use client";

/** Brand numeric stepper: [−] value [+], replaces the browser's native number spinner. */
export function Stepper({ value, onChange, min = 0, max = Number.MAX_SAFE_INTEGER, step = 1, ariaLabel }: { value: number; onChange(v: number): void; min?: number; max?: number; step?: number; ariaLabel?: string }) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  return (
    <div className="stepper">
      <button type="button" aria-label="decrease" disabled={value <= min} onClick={() => onChange(clamp(value - step))}>−</button>
      <input type="number" inputMode="numeric" aria-label={ariaLabel} value={value} min={min} max={max} onChange={(e) => { const n = Number(e.target.value); if (!Number.isNaN(n)) onChange(clamp(n)); }} />
      <button type="button" aria-label="increase" disabled={value >= max} onClick={() => onChange(clamp(value + step))}>+</button>
    </div>
  );
}
