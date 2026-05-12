export type CartLineForPricing = {
  item: { id: string; price: number };
  quantity: number;
};

export type DiscountInput = {
  lines: CartLineForPricing[];
  isStudent: boolean;
  loyaltyTier?: "none" | "tier1";
};

export type DiscountType = "student" | "loyalty" | "none";

export type DiscountResult = {
  subtotal: number;
  discountAmount: number;
  discountType: DiscountType;
  total: number;
};

const STUDENT_DISCOUNT_PCT = 0.1;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Pure pricing function used identically on the client (live preview) and
 * server (insert payload). Student discount currently wins over loyalty;
 * loyalty is reserved for v1.1 and is always treated as "none" today.
 *
 * @example
 * // No discount
 * calculateDiscount({
 *   lines: [{ item: { id: "a", price: 100 }, quantity: 2 }],
 *   isStudent: false,
 * });
 * // => { subtotal: 200, discountAmount: 0, discountType: "none", total: 200 }
 *
 * @example
 * // Student discount (10%)
 * calculateDiscount({
 *   lines: [{ item: { id: "a", price: 100 }, quantity: 1 }],
 *   isStudent: true,
 * });
 * // => { subtotal: 100, discountAmount: 10, discountType: "student", total: 90 }
 *
 * @example
 * // Multiple lines, mixed prices
 * calculateDiscount({
 *   lines: [
 *     { item: { id: "a", price: 79.9 }, quantity: 1 },
 *     { item: { id: "b", price: 15 }, quantity: 2 },
 *   ],
 *   isStudent: false,
 * });
 * // => { subtotal: 109.9, discountAmount: 0, discountType: "none", total: 109.9 }
 */
export function calculateDiscount(input: DiscountInput): DiscountResult {
  const subtotalRaw = input.lines.reduce(
    (sum, line) => sum + line.item.price * line.quantity,
    0,
  );
  const subtotal = round2(subtotalRaw);

  if (input.isStudent) {
    const discountAmount = round2(subtotal * STUDENT_DISCOUNT_PCT);
    return {
      subtotal,
      discountAmount,
      discountType: "student",
      total: round2(subtotal - discountAmount),
    };
  }

  return {
    subtotal,
    discountAmount: 0,
    discountType: "none",
    total: subtotal,
  };
}
