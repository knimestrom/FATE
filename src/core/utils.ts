export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function round(value: number, precision = 4) {
  const scale = 10 ** precision;
  return Math.round(value * scale) / scale;
}

export function stableId(prefix: string, input: string) {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `${prefix}_${(hash >>> 0).toString(36)}`;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 96);
}

export function assertPositiveAmount(amount: number, label = "amount") {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`${label} must be a positive finite number.`);
  }
}

export function nowIso() {
  return new Date().toISOString();
}
