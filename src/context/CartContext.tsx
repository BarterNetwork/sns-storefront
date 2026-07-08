"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { CartItem, loadCart, saveCart, cartCount } from "@/lib/cart";

interface CartCtx {
  items: CartItem[];
  count: number;
  addItem: (item: CartItem) => void;
  updateQty: (sku: string, qty: number) => void;
  removeItem: (sku: string) => void;
  clearCart: () => void;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
}

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setItems(loadCart());
  }, []);

  const sync = (next: CartItem[]) => {
    setItems(next);
    saveCart(next);
  };

  const addItem = useCallback((item: CartItem) => {
    setItems(prev => {
      const existing = prev.find(i => i.sku === item.sku);
      const next = existing
        ? prev.map(i => i.sku === item.sku ? { ...i, qty: i.qty + item.qty } : i)
        : [...prev, item];
      saveCart(next);
      return next;
    });
    setIsOpen(true);
  }, []);

  const updateQty = useCallback((sku: string, qty: number) => {
    setItems(prev => {
      const next = qty <= 0
        ? prev.filter(i => i.sku !== sku)
        : prev.map(i => i.sku === sku ? { ...i, qty } : i);
      saveCart(next);
      return next;
    });
  }, []);

  const removeItem = useCallback((sku: string) => {
    setItems(prev => {
      const next = prev.filter(i => i.sku !== sku);
      saveCart(next);
      return next;
    });
  }, []);

  const clearCart = useCallback(() => sync([]), []);

  return (
    <Ctx.Provider value={{
      items,
      count: cartCount(items),
      addItem,
      updateQty,
      removeItem,
      clearCart,
      isOpen,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
