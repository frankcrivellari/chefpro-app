"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type InventoryType = "zukauf" | "eigenproduktion";

type InventoryComponent = {
  itemId: string;
  quantity: number;
  unit: string;
};

type InventoryItem = {
  id: string;
  name: string;
  type: InventoryType;
  unit: string;
  purchasePrice: number;
  components?: InventoryComponent[];
};

const initialItems: InventoryItem[] = [
  {
    id: "zukauf-tomatendose",
    name: "Tomaten, gehackt 2,5 kg Dose",
    type: "zukauf",
    unit: "Dose",
    purchasePrice: 4.2,
  },
  {
    id: "zukauf-zwiebeln",
    name: "Zwiebeln, frisch 10 kg Sack",
    type: "zukauf",
    unit: "kg",
    purchasePrice: 0.9,
  },
  {
    id: "zukauf-olivenoel",
    name: "Olivenöl, extra vergine 5 L Kanister",
    type: "zukauf",
    unit: "L",
    purchasePrice: 6.5,
  },
  {
    id: "eigenp-tomatensauce-basis",
    name: "Tomatensauce Basis",
    type: "eigenproduktion",
    unit: "kg",
    purchasePrice: 0,
    components: [
      {
        itemId: "zukauf-tomatendose",
        quantity: 1,
        unit: "Dose",
      },
      {
        itemId: "zukauf-zwiebeln",
        quantity: 0.5,
        unit: "kg",
      },
      {
        itemId: "zukauf-olivenoel",
        quantity: 0.1,
        unit: "L",
      },
    ],
  },
  {
    id: "eigenp-pasta-mit-sauce",
    name: "Pasta mit Tomatensauce",
    type: "eigenproduktion",
    unit: "Portion",
    purchasePrice: 0,
    components: [
      {
        itemId: "eigenp-tomatensauce-basis",
        quantity: 0.2,
        unit: "kg",
      },
      {
        itemId: "zukauf-olivenoel",
        quantity: 0.02,
        unit: "L",
      },
    ],
  },
];

type FilterType = "all" | InventoryType;

export function InventoryManager() {
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(
    initialItems[0]?.id ?? null
  );

  const itemsById = useMemo(() => {
    const map = new Map<string, InventoryItem>();
    for (const item of initialItems) {
      map.set(item.id, item);
    }
    return map;
  }, []);

  const filteredItems = useMemo(() => {
    return initialItems.filter((item) => {
      if (filterType !== "all" && item.type !== filterType) {
        return false;
      }
      if (!search.trim()) {
        return true;
      }
      const value = search.toLowerCase();
      return (
        item.name.toLowerCase().includes(value) ||
        item.unit.toLowerCase().includes(value)
      );
    });
  }, [filterType, search]);

  const selectedItem =
    filteredItems.find((item) => item.id === selectedItemId) ??
    filteredItems[0] ??
    null;

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-background to-muted px-4 py-6 text-foreground md:px-8 md:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Inventory Manager
            </h1>
            <p className="text-sm text-muted-foreground md:text-base">
              Verwalte Zukaufartikel und Eigenproduktionen mit verschachtelten
              Komponenten.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilterType("all")}
              className={cn(
                filterType === "all" && "bg-primary text-primary-foreground"
              )}
            >
              Alle
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilterType("zukauf")}
              className={cn(
                filterType === "zukauf" &&
                  "bg-primary text-primary-foreground"
              )}
            >
              Zukauf
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilterType("eigenproduktion")}
              className={cn(
                filterType === "eigenproduktion" &&
                  "bg-primary text-primary-foreground"
              )}
            >
              Eigenproduktion
            </Button>
          </div>
        </header>

        <main className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1.8fr)]">
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Artikelübersicht</CardTitle>
              <CardDescription>
                Filtere nach Typ und wähle einen Artikel aus.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Input
                placeholder="Suchen nach Name oder Einheit"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <div className="max-h-[480px] space-y-1 overflow-y-auto pr-1">
                {filteredItems.length === 0 && (
                  <div className="rounded-md border border-dashed bg-muted/60 px-3 py-8 text-center text-sm text-muted-foreground">
                    Keine Artikel für die aktuelle Auswahl gefunden.
                  </div>
                )}
                {filteredItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedItemId(item.id)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                      selectedItem?.id === item.id &&
                        "border-primary bg-primary/5"
                    )}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.name}</span>
                        <TypeBadge type={item.type} />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Einheit: {item.unit}
                      </div>
                    </div>
                    {item.components && (
                      <div className="text-xs text-muted-foreground">
                        {item.components.length} Komponenten
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Artikeldetails</CardTitle>
              <CardDescription>
                Sieh dir Struktur und Komponenten der ausgewählten Position an.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4">
              {!selectedItem && (
                <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                  Wähle links einen Artikel aus, um Details zu sehen.
                </div>
              )}
              {selectedItem && (
                <>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold">
                        {selectedItem.name}
                      </h2>
                      <TypeBadge type={selectedItem.type} />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Einheit: {selectedItem.unit}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {selectedItem.type === "zukauf"
                        ? "Direkter Zukaufartikel ohne Komponenten."
                        : "Eigenproduktion mit strukturierter Komponentenliste."}
                    </div>
                  </div>

                  {selectedItem.type === "zukauf" && (
                    <div className="rounded-md border bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
                      Dieser Artikel wird als Zukauf geführt. Du kannst ihn als
                      Komponente in Eigenproduktionen verwenden.
                    </div>
                  )}

                  {selectedItem.type === "eigenproduktion" && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold">
                        Komponentenstruktur
                      </h3>
                      {selectedItem.components &&
                      selectedItem.components.length > 0 ? (
                        <ComponentTree
                          rootItem={selectedItem}
                          itemsById={itemsById}
                        />
                      ) : (
                        <div className="rounded-md border border-dashed bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
                          Für diese Eigenproduktion sind noch keine Komponenten
                          hinterlegt.
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}

type TypeBadgeProps = {
  type: InventoryType;
};

function TypeBadge({ type }: TypeBadgeProps) {
  if (type === "zukauf") {
    return (
      <Badge variant="outline" className="border-emerald-500/40 text-emerald-600">
        Zukauf
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-sky-500/40 text-sky-600">
      Eigenproduktion
    </Badge>
  );
}

type ComponentTreeProps = {
  rootItem: InventoryItem;
  itemsById: Map<string, InventoryItem>;
};

function ComponentTree({ rootItem, itemsById }: ComponentTreeProps) {
  if (!rootItem.components || rootItem.components.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1 rounded-md border bg-card/60 p-3 text-sm">
      {rootItem.components.map((component) => {
        const item = itemsById.get(component.itemId);
        if (!item) {
          return null;
        }

        return (
          <div key={component.itemId} className="space-y-1">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-1 items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{item.name}</span>
                    <TypeBadge type={item.type} />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Menge: {component.quantity} {component.unit}
                  </div>
                </div>
              </div>
              {item.components && item.components.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {item.components.length} untergeordnete Komponenten
                </span>
              )}
            </div>
            {item.components && item.components.length > 0 && (
              <div className="border-l pl-4">
                <ComponentTree rootItem={item} itemsById={itemsById} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
