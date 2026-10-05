"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics/client";

export function CategoryView({ slug }: { slug: string }) {
  useEffect(() => {
    track("category_view", { category: slug });
  }, [slug]);
  return null;
}

export function ProductView({ productId, category, name }: { productId: string; category: string; name: string }) {
  useEffect(() => {
    track("product_view", { productId, category, label: name });
  }, [productId, category, name]);
  return null;
}
