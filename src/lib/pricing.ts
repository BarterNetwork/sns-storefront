// All customer-facing prices = wholesale cost × MARKUP.
// Change this ONE value to reprice the entire store.
export const MARKUP = 1.5;

export function applyMarkup(wholesale: number | null): number | null {
  if (wholesale == null) return null;
  return Math.round(wholesale * MARKUP * 100) / 100;
}

export function formatPrice(price: number | null): string {
  if (price == null) return "—";
  return `$${price.toFixed(2)}`;
}
