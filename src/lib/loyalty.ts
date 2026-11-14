export function cardToken(text: string): string | null {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuid.test(text.trim())) return text.trim();
  try {
    const url = new URL(text.trim());
    const token = url.pathname.match(/^\/card\/([^/]+)\/?$/)?.[1];
    return token && uuid.test(token) ? token : null;
  } catch { return null; }
}

export function rewardDescription(kind: "gift" | "discount", value: string): string | null {
  if (kind === "gift") return value.trim() && value.length <= 500 ? value.trim() : null;
  const amount = Number(value);
  return value.trim() && Number.isFinite(amount) && amount >= 1 && amount <= 100
    ? `Sconto del ${amount}%` : null;
}

export function validStampResult(value: unknown): value is { customer_name: string; stamps: number; stamps_required: number } {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return typeof row['customer_name'] === "string"
    && typeof row['stamps'] === "number" && Number.isInteger(row['stamps'])
    && typeof row['stamps_required'] === "number" && Number.isInteger(row['stamps_required'])
    && row['stamps_required'] > 0 && row['stamps'] >= 0 && row['stamps'] <= row['stamps_required'];
}