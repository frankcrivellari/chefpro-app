"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
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

type ParsedAiItem = {
  name: string;
  unit: string;
  quantity: number;
  purchasePrice: number;
  calculatedPricePerUnit: number;
};

type ParsedDocumentItem = {
  name: string;
  unit: string;
  purchasePrice: number;
  allergens: string[];
  fileUrl: string;
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
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [newItemType, setNewItemType] = useState<InventoryType>("zukauf");
  const [newItemUnit, setNewItemUnit] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingComponents, setIsEditingComponents] = useState(false);
  const [componentSearch, setComponentSearch] = useState("");
  const [editingComponents, setEditingComponents] = useState<
    InventoryComponent[]
  >([]);
  const [aiText, setAiText] = useState("");
  const [aiIsParsing, setAiIsParsing] = useState(false);
  const [aiParsed, setAiParsed] = useState<ParsedAiItem | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiIsSaving, setAiIsSaving] = useState(false);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docIsUploading, setDocIsUploading] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);
  const [docParsed, setDocParsed] =
    useState<ParsedDocumentItem | null>(null);

  const effectiveItems = items.length > 0 ? items : initialItems;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch("/api/inventory");
        let payload: unknown = null;
        try {
          payload = await response.json();
        } catch {
          payload = null;
        }
        if (!response.ok) {
          let message = "Fehler beim Laden der Artikel.";
          const data = payload as { error?: unknown } | null;
          if (data && typeof data.error === "string") {
            message = data.error;
          }
          throw new Error(message);
        }
        const data =
          (payload as InventoryItem[] | null) ?? [];
        if (!cancelled) {
          if (data.length > 0) {
            setItems(data);
          } else {
            setItems(initialItems);
          }
        }
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error
              ? error.message
              : "Fehler beim Laden der Artikel.";
          setError(
            `${message} Es werden Demo-Daten angezeigt.`
          );
          setItems(initialItems);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedItemId && effectiveItems[0]) {
      setSelectedItemId(effectiveItems[0].id);
    }
  }, [effectiveItems, selectedItemId]);

  const itemsById = useMemo(() => {
    const map = new Map<string, InventoryItem>();
    for (const item of effectiveItems) {
      map.set(item.id, item);
    }
    return map;
  }, [effectiveItems]);

  const filteredItems = useMemo(() => {
    return effectiveItems.filter((item) => {
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
  }, [effectiveItems, filterType, search]);

  const selectedItem =
    filteredItems.find((item) => item.id === selectedItemId) ??
    filteredItems[0] ??
    null;

  const componentSearchResults = useMemo(() => {
    if (!componentSearch.trim() || !selectedItem) {
      return [];
    }
    const term = componentSearch.toLowerCase();
    return effectiveItems.filter((item) => {
      if (item.id === selectedItem.id) {
        return false;
      }
      if (
        editingComponents.some((component) => component.itemId === item.id)
      ) {
        return false;
      }
      return (
        item.name.toLowerCase().includes(term) ||
        item.unit.toLowerCase().includes(term)
      );
    });
  }, [componentSearch, effectiveItems, editingComponents, selectedItem]);

  async function handleCreateItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newItemName.trim() || !newItemUnit.trim()) {
      return;
    }

    const parsedPrice = Number(
      newItemPrice.replace(",", ".").trim() || "0"
    );

    try {
      setIsSaving(true);
      setError(null);

      const response = await fetch("/api/inventory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newItemName.trim(),
          type: newItemType,
          unit: newItemUnit.trim(),
          purchasePrice: parsedPrice,
          components: [],
        }),
      });

      if (!response.ok) {
        let message = "Fehler beim Speichern des Artikels.";
        try {
          const payload = (await response.json()) as {
            error?: unknown;
          };
          if (
            payload &&
            typeof payload.error === "string"
          ) {
            message = payload.error;
          }
        } catch {
        }
        throw new Error(message);
      }

      const created = (await response.json()) as InventoryItem;
      setItems((prev) => [...prev, created]);
      setSelectedItemId(created.id);
      setNewItemName("");
      setNewItemUnit("");
      setNewItemPrice("");
      setNewItemType("zukauf");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Fehler beim Speichern des Artikels.";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveComponents() {
    if (!selectedItem || selectedItem.type !== "eigenproduktion") {
      return;
    }

    const cleanedComponents = editingComponents
      .map((component) => ({
        itemId: component.itemId,
        quantity: Number(
          String(component.quantity).toString().replace(",", ".")
        ),
        unit: component.unit.trim(),
      }))
      .filter(
        (component) =>
          component.itemId &&
          component.unit &&
          !Number.isNaN(component.quantity) &&
          component.quantity > 0
      );

    try {
      setIsSaving(true);
      setError(null);

      const response = await fetch("/api/recipe-structure", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          parentItemId: selectedItem.id,
          components: cleanedComponents,
        }),
      });

      if (!response.ok) {
        let message = "Fehler beim Speichern der Komponenten.";
        try {
          const payload = (await response.json()) as {
            error?: unknown;
          };
          if (
            payload &&
            typeof payload.error === "string"
          ) {
            message = payload.error;
          }
        } catch {
        }
        throw new Error(message);
      }

      const updatedComponents = (await response.json()) as InventoryComponent[];

      setItems((previousItems) =>
        previousItems.map((item) =>
          item.id === selectedItem.id
            ? {
                ...item,
                components: updatedComponents,
              }
            : item
        )
      );

      setEditingComponents(updatedComponents);
      setIsEditingComponents(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Fehler beim Speichern der Komponenten.";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAiParse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!aiText.trim()) {
      return;
    }
    try {
      setAiIsParsing(true);
      setAiError(null);
      setAiParsed(null);
      const response = await fetch("/api/ai-parse-item", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: aiText }),
      });
      if (!response.ok) {
        let message = "Fehler bei der KI-Auswertung.";
        try {
          const payload = (await response.json()) as {
            error?: unknown;
          };
          if (
            payload &&
            typeof payload.error === "string"
          ) {
            message = payload.error;
          }
        } catch {
        }
        throw new Error(message);
      }
      const data = (await response.json()) as {
        name: string;
        unit: string;
        quantity: number;
        purchase_price: number;
        calculated_price_per_unit: number;
      };
      setAiParsed({
        name: data.name,
        unit: data.unit,
        quantity: data.quantity,
        purchasePrice: data.purchase_price,
        calculatedPricePerUnit: data.calculated_price_per_unit,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Die KI konnte den Text nicht auswerten.";
      setAiError(message);
    } finally {
      setAiIsParsing(false);
    }
  }

  async function handleAiSave() {
    if (!aiParsed) {
      return;
    }
    try {
      setAiIsSaving(true);
      setAiError(null);
      const response = await fetch("/api/inventory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: aiParsed.name,
          type: "zukauf" as InventoryType,
          unit: aiParsed.unit,
          purchasePrice: aiParsed.purchasePrice,
          components: [],
        }),
      });
      if (!response.ok) {
        let message = "Fehler beim Speichern des KI-Artikels.";
        try {
          const payload = (await response.json()) as {
            error?: unknown;
          };
          if (
            payload &&
            typeof payload.error === "string"
          ) {
            message = payload.error;
          }
        } catch {
        }
        throw new Error(message);
      }
      const created = (await response.json()) as InventoryItem;
      setItems((previous) => [...previous, created]);
      setSelectedItemId(created.id);
      setAiText("");
      setAiParsed(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Fehler beim Speichern des KI-Artikels.";
      setAiError(message);
    } finally {
      setAiIsSaving(false);
    }
  }

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
              {error && (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-2 rounded-md border bg-card/60 p-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold">
                    Dokumenten-Upload
                  </div>
                  {docError && (
                    <span className="text-[11px] text-destructive">
                      {docError}
                    </span>
                  )}
                </div>
                <form
                  className="space-y-2"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    if (!docFile) {
                      return;
                    }
                    try {
                      setDocIsUploading(true);
                      setDocError(null);
                      setDocParsed(null);
                      const formData = new FormData();
                      formData.append("file", docFile);
                      formData.append("filename", docFile.name);
                      const response = await fetch(
                        "/api/document-vision-upload",
                        {
                          method: "POST",
                          body: formData,
                        }
                      );
                      const payload = (await response.json()) as {
                        error?: unknown;
                        item?: InventoryItem;
                        extracted?: {
                          name: string;
                          unit: string;
                          purchase_price: number;
                          allergens: string[];
                        };
                        fileUrl?: string;
                      };
                      if (!response.ok) {
                        let message =
                          "Fehler bei der Dokumenten-Auswertung.";
                        if (
                          payload &&
                          typeof payload.error === "string"
                        ) {
                          message = payload.error;
                        }
                        throw new Error(message);
                      }
                      if (payload.item) {
                        const created = payload.item;
                        setItems((previous) => [
                          ...previous,
                          created,
                        ]);
                        setSelectedItemId(created.id);
                      }
                      if (payload.extracted && payload.fileUrl) {
                        setDocParsed({
                          name: payload.extracted.name,
                          unit: payload.extracted.unit,
                          purchasePrice:
                            payload.extracted.purchase_price,
                          allergens: payload.extracted.allergens,
                          fileUrl: payload.fileUrl,
                        });
                      }
                      setDocFile(null);
                    } catch (uploadError) {
                      const message =
                        uploadError instanceof Error
                          ? uploadError.message
                          : "Fehler beim Dokumenten-Upload.";
                      setDocError(message);
                    } finally {
                      setDocIsUploading(false);
                    }
                  }}
                >
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(event) => {
                      const file =
                        event.target.files &&
                        event.target.files[0]
                          ? event.target.files[0]
                          : null;
                      setDocFile(file);
                      setDocParsed(null);
                      setDocError(null);
                    }}
                    className="block w-full text-[11px] text-foreground file:mr-2 file:rounded-md file:border file:border-input file:bg-background file:px-2 file:py-1 file:text-[11px] file:font-medium file:text-foreground hover:file:bg-accent"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={docIsUploading || !docFile}
                    >
                      {docIsUploading
                        ? "Lade hoch..."
                        : "Dokument auswerten"}
                    </Button>
                  </div>
                </form>
                {docParsed && (
                  <div className="space-y-1 rounded-md border bg-background px-3 py-2 text-[11px]">
                    <div className="font-semibold">
                      Erkanntes Produkt
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">
                        Name
                      </span>
                      <span>{docParsed.name}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">
                        Einheit
                      </span>
                      <span>{docParsed.unit}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">
                        EK-Gesamt
                      </span>
                      <span>
                        {docParsed.purchasePrice.toFixed(2)} €
                      </span>
                    </div>
                    {docParsed.allergens.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-muted-foreground">
                          Allergene
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {docParsed.allergens.map((allergen) => (
                            <span
                              key={allergen}
                              className="rounded-md bg-muted px-2 py-0.5 text-[10px]"
                            >
                              {allergen}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-2 rounded-md border bg-card/60 p-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold">
                    KI-Schnellimport
                  </div>
                  {aiError && (
                    <span className="text-[11px] text-destructive">
                      {aiError}
                    </span>
                  )}
                </div>
                <form
                  className="space-y-2"
                  onSubmit={handleAiParse}
                >
                  <textarea
                    value={aiText}
                    onChange={(event) => setAiText(event.target.value)}
                    rows={2}
                    className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    placeholder='Beispiel: 3kg Sack Mehl Type 405 für 4,50€ bei Metro'
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={aiIsParsing || !aiText.trim()}
                    >
                      {aiIsParsing ? "Analysiere..." : "Analysieren"}
                    </Button>
                  </div>
                </form>
                {aiParsed && (
                  <div className="space-y-1 rounded-md border bg-background px-3 py-2 text-[11px]">
                    <div className="font-semibold">
                      Vorschau
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">
                        Name
                      </span>
                      <span>{aiParsed.name}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">
                        Menge
                      </span>
                      <span>
                        {aiParsed.quantity} {aiParsed.unit}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">
                        EK-Gesamt
                      </span>
                      <span>
                        {aiParsed.purchasePrice.toFixed(2)} €
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">
                        EK pro Einheit
                      </span>
                      <span>
                        {aiParsed.calculatedPricePerUnit.toFixed(4)} € /{" "}
                        {aiParsed.unit}
                      </span>
                    </div>
                    <div className="mt-2 flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        disabled={aiIsSaving}
                        onClick={handleAiSave}
                      >
                        {aiIsSaving ? "Speichere..." : "Als Zukaufartikel speichern"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <form
                className="grid gap-2 rounded-md border bg-card/60 p-3 text-xs md:grid-cols-[2fr_1fr_1fr_auto]"
                onSubmit={handleCreateItem}
              >
                <Input
                  placeholder="Neuer Artikelname"
                  value={newItemName}
                  onChange={(event) => setNewItemName(event.target.value)}
                />
                <Input
                  placeholder="Einheit"
                  value={newItemUnit}
                  onChange={(event) => setNewItemUnit(event.target.value)}
                />
                <Input
                  placeholder="EK-Preis"
                  value={newItemPrice}
                  onChange={(event) => setNewItemPrice(event.target.value)}
                />
                <div className="flex items-center gap-2">
                  <select
                    value={newItemType}
                    onChange={(event) =>
                      setNewItemType(event.target.value as InventoryType)
                    }
                    className="h-9 rounded-md border border-input bg-background px-2 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <option value="zukauf">Zukauf</option>
                    <option value="eigenproduktion">Eigenproduktion</option>
                  </select>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSaving || !newItemName.trim() || !newItemUnit.trim()}
                  >
                    {isSaving ? "Speichern..." : "Anlegen"}
                  </Button>
                </div>
              </form>
              <Input
                placeholder="Suchen nach Name oder Einheit"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <div className="max-h-[480px] space-y-1 overflow-y-auto pr-1">
                {isLoading && (
                  <div className="rounded-md border border-dashed bg-muted/60 px-3 py-3 text-center text-xs text-muted-foreground">
                    Lade Artikel aus der Datenbank ...
                  </div>
                )}
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
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold">
                          Komponentenstruktur
                        </h3>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsEditingComponents((value) => !value);
                            setComponentSearch("");
                            setEditingComponents(
                              selectedItem.components ?? []
                            );
                          }}
                        >
                          {isEditingComponents
                            ? "Bearbeitung schließen"
                            : "Komponenten bearbeiten"}
                        </Button>
                      </div>
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
                      {isEditingComponents && (
                        <div className="space-y-3 rounded-md border bg-muted/40 p-3 text-xs">
                          <div className="space-y-2">
                            <Input
                              placeholder="Komponenten suchen"
                              value={componentSearch}
                              onChange={(event) =>
                                setComponentSearch(event.target.value)
                              }
                            />
                            {componentSearchResults.length > 0 && (
                              <div className="max-h-40 space-y-1 overflow-y-auto">
                                {componentSearchResults.map((item) => (
                                  <button
                                    key={item.id}
                                    type="button"
                                    className="flex w-full items-center justify-between gap-2 rounded-md border bg-card px-2 py-1 text-left hover:bg-accent hover:text-accent-foreground"
                                    onClick={() =>
                                      setEditingComponents((components) => [
                                        ...components,
                                        {
                                          itemId: item.id,
                                          quantity: 1,
                                          unit: item.unit,
                                        },
                                      ])
                                    }
                                  >
                                    <span className="truncate text-[11px] font-medium">
                                      {item.name}
                                    </span>
                                    <TypeBadge type={item.type} />
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            {editingComponents.length === 0 && (
                              <div className="rounded-md border border-dashed bg-card px-2 py-2 text-[11px] text-muted-foreground">
                                Noch keine Komponenten hinzugefügt.
                              </div>
                            )}
                            {editingComponents.map((component, index) => {
                              const item = itemsById.get(component.itemId);
                              if (!item) {
                                return null;
                              }
                              return (
                                <div
                                  key={component.itemId}
                                  className="flex items-center gap-2 rounded-md border bg-card px-2 py-2"
                                >
                                  <div className="flex min-w-0 flex-1 flex-col">
                                    <div className="flex items-center gap-2">
                                      <span className="truncate text-[11px] font-medium">
                                        {item.name}
                                      </span>
                                      <TypeBadge type={item.type} />
                                    </div>
                                    <div className="mt-1 flex gap-2">
                                      <Input
                                        type="number"
                                        value={String(component.quantity)}
                                        onChange={(event) => {
                                          const value = Number(
                                            event.target.value.replace(
                                              ",",
                                              "."
                                            )
                                          );
                                          setEditingComponents(
                                            (components) =>
                                              components.map(
                                                (currentComponent, current) =>
                                                  current === index
                                                    ? {
                                                        ...currentComponent,
                                                        quantity: Number.isNaN(
                                                          value
                                                        )
                                                          ? 0
                                                          : value,
                                                      }
                                                    : currentComponent
                                              )
                                          );
                                        }}
                                        className="h-8 w-20 text-[11px]"
                                      />
                                      <Input
                                        value={component.unit}
                                        onChange={(event) =>
                                          setEditingComponents(
                                            (components) =>
                                              components.map(
                                                (currentComponent, current) =>
                                                  current === index
                                                    ? {
                                                        ...currentComponent,
                                                        unit: event.target.value,
                                                      }
                                                    : currentComponent
                                              )
                                          )
                                        }
                                        className="h-8 w-20 text-[11px]"
                                      />
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      setEditingComponents((components) =>
                                        components.filter(
                                          (_, current) => current !== index
                                        )
                                      )
                                    }
                                  >
                                    Entfernen
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setIsEditingComponents(false);
                                setComponentSearch("");
                                setEditingComponents(
                                  selectedItem.components ?? []
                                );
                              }}
                            >
                              Abbrechen
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              disabled={isSaving}
                              onClick={handleSaveComponents}
                            >
                              {isSaving ? "Speichern..." : "Komponenten speichern"}
                            </Button>
                          </div>
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
