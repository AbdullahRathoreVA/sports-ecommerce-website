"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { priceLine, type PriceTier } from "@/lib/pricing";
import { track } from "@/lib/analytics/client";

/**
 * Client cart, persisted to localStorage. It only ever holds references and
 * display snapshots: the server re-reads every product and re-prices every
 * line at checkout, so a tampered cart cannot change what is charged.
 */

export type CartLine = {
  key: string;
  productId: string;
  slug: string;
  name: string;
  sku: string;
  image: string | null;
  size: string | null;
  isSample: boolean;
  quantity: number;
  tiers: PriceTier[];
  samplePriceCents: number | null;
  moq: number;
  currency: string;
};

type CartContextValue = {
  lines: CartLine[];
  count: number;
  subtotalCents: number;
  ready: boolean;
  add: (line: Omit<CartLine, "key">) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "gl_cart_v1";

export function lineKey(productId: string, size: string | null, isSample: boolean) {
  return `${productId}:${size ?? "-"}:${isSample ? "s" : "b"}`;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartLine[];
        if (Array.isArray(parsed)) setLines(parsed.filter((l) => l && typeof l.productId === "string"));
      }
    } catch {
      /* corrupted or blocked storage — start empty */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* ignore */
    }
  }, [lines, ready]);

  const add = useCallback((line: Omit<CartLine, "key">) => {
    const key = lineKey(line.productId, line.size, line.isSample);
    setLines((prev) => {
      const existing = prev.find((l) => l.key === key);
      if (existing) {
        return prev.map((l) => (l.key === key ? { ...l, quantity: line.isSample ? 1 : l.quantity + line.quantity } : l));
      }
      return [...prev, { ...line, key }];
    });
    track("add_to_cart", { productId: line.productId, label: line.name, value: line.quantity });
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    setLines((prev) => prev.map((l) => (l.key === key && !l.isSample ? { ...l, quantity: Math.max(1, Math.min(100_000, Math.round(quantity))) } : l)));
  }, []);

  const remove = useCallback((key: string) => {
    setLines((prev) => {
      const line = prev.find((l) => l.key === key);
      if (line) track("remove_from_cart", { productId: line.productId, label: line.name });
      return prev.filter((l) => l.key !== key);
    });
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartContextValue>(() => {
    const subtotalCents = lines.reduce((sum, l) => sum + (priceLine(l)?.totalCents ?? 0), 0);
    return { lines, count: lines.reduce((n, l) => n + l.quantity, 0), subtotalCents, ready, add, setQuantity, remove, clear };
  }, [lines, ready, add, setQuantity, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
