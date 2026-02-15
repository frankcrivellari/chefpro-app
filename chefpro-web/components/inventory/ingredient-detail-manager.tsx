"use client";

import { ReactNode } from "react";

interface IngredientDetailManagerProps {
  header?: ReactNode;
  children?: ReactNode;
}

export function IngredientDetailManager({
  header,
  children,
}: IngredientDetailManagerProps) {
  return (
    <div className="space-y-3">
      {header && <div className="text-sm font-semibold text-foreground">{header}</div>}
      <div className="rounded-lg border bg-white p-4 shadow-sm">{children}</div>
    </div>
  );
}

