import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartLine = {
  itemId: string;
  quantity: number;
};

type CartState = {
  items: CartLine[];
  addItem: (itemId: string) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, qty: number) => void;
  clearCart: () => void;
  getTotalQuantity: () => number;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (itemId) =>
        set((state) => {
          const existing = state.items.find((line) => line.itemId === itemId);
          if (existing) {
            return {
              items: state.items.map((line) =>
                line.itemId === itemId
                  ? { ...line, quantity: line.quantity + 1 }
                  : line,
              ),
            };
          }
          return { items: [...state.items, { itemId, quantity: 1 }] };
        }),
      removeItem: (itemId) =>
        set((state) => ({
          items: state.items.filter((line) => line.itemId !== itemId),
        })),
      updateQuantity: (itemId, qty) =>
        set((state) => {
          if (qty <= 0) {
            return {
              items: state.items.filter((line) => line.itemId !== itemId),
            };
          }
          return {
            items: state.items.map((line) =>
              line.itemId === itemId ? { ...line, quantity: qty } : line,
            ),
          };
        }),
      clearCart: () => set({ items: [] }),
      getTotalQuantity: () =>
        get().items.reduce((total, line) => total + line.quantity, 0),
    }),
    {
      name: "polish-me-up-cart",
    },
  ),
);
