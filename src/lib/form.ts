export function readString(formData: FormData, key: string, max = 500) {
  const value = String(formData.get(key) ?? "").trim();
  if (value.length > max) return { ok: false as const, value: "" };
  return { ok: true as const, value };
}

export function readNumber(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return { ok: true as const, value: null as number | null };
  const value = Number(raw);
  if (!Number.isFinite(value)) return { ok: false as const, value: null as number | null };
  return { ok: true as const, value };
}

export function readChecked(formData: FormData, key: string) {
  const value = formData.get(key);
  return value === "on" || value === "true" || value === "1";
}

export function validUrl(value: string) {
  if (!value) return true;
  return /^https?:\/\/\S+$/i.test(value);
}
