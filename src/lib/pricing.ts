// All customer-facing prices = wholesale cost × MARKUP.
// Change this ONE value to reprice the entire store.
export const MARKUP = 1.5;

export function applyMarkup(wholesale: number | null): number | null {
  if (wholesale == null) return null;
  return Math.round(wholesale * MARKUP * 100) / 100;
}

// Decoration fee added per piece, by print location (customer price, not marked up again).
export const PRINT_PRICES = { Front: 15, Back: 5, "Left Sleeve": 3, "Right Sleeve": 3 } as const;
export type PrintLocation = keyof typeof PRINT_PRICES;

export function formatPrice(price: number | null): string {
  if (price == null) return "—";
  return `$${price.toFixed(2)}`;
}
