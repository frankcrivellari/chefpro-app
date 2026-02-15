"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Trash2,
  GripVertical,
  Plus,
  Calculator,
  Zap,
  Leaf,
  Check,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// Types based on what we saw in inventory-manager.tsx
export type InventoryComponent = {
  itemId: string | null;
  quantity: number;
  unit: string;
  deletedItemName?: string | null;
  customName?: string | null;
  // Temporary ID for list management if itemId is null
  tempId?: string;
  // Flag indicating if this item has sub-ingredients (is a sub-recipe)
  hasSubIngredients?: boolean;
  purchasePrice?: number;
  nutritionPerUnit?: Record<string, number | null> | null | any;
};

// We need a subset of InventoryItem for the dropdown and calculations
export type AvailableItem = {
  id: string;
  name: string;
  unit: string;
  type?: string; // Added type
  purchasePrice: number;
  nutritionPerUnit?: Record<string, number | null> | null | any;
  isBio?: boolean;
  isVegan?: boolean;
};

interface SmartIngredientMatrixProps {
  components: InventoryComponent[];
  availableItems: AvailableItem[];
  onUpdate: (components: InventoryComponent[]) => void;
  onQuickImport: (name: string) => void;
  onExpandSubRecipe?: (index: number, recipeId: string) => void;
  onImportSubRecipeSteps?: (recipeId: string) => void;
  readOnly?: boolean;
  debugStatus?: string;
}

interface SortableRowProps {
  component: InventoryComponent;
  index: number;
  availableItems: AvailableItem[];
  onChange: (index: number, field: keyof InventoryComponent, value: any) => void;
  onRemove: (index: number) => void;
  onQuickImport: (name: string) => void;
  onExpandSubRecipe?: (index: number, recipeId: string) => void;
  onImportSubRecipeSteps?: (recipeId: string) => void;
  readOnly?: boolean;
}

// Helper to format labels
const formatLabel = (key: string) => {
  const labels: Record<string, string> = {
    energyKcal: "Kalorien (kcal)",
    protein: "Protein",
    fat: "Fett",
    carbs: "Kohlenhydrate",
    sugar: "Zucker",
    salt: "Salz",
    co2: "CO2",
  };
  return labels[key] || key.charAt(0).toUpperCase() + key.slice(1);
};

const SortableRow = ({
  component,
  index,
  availableItems,
  onChange,
  onRemove,
  onQuickImport,
  onExpandSubRecipe,
  onImportSubRecipeSteps,
  readOnly,
}: SortableRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: component.tempId || component.itemId || `row-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    position: "relative" as const,
  };

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(
    component.customName ||
      (component.itemId
        ? availableItems.find(
            (i) => String(i.id) === String(component.itemId)
          )?.name
        : "") ||
      ""
  );
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewItems, setPreviewItems] = useState<
    { name: string; quantity: number; unit: string }[]
  >([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Sync search term with component data if it changes externally
  useEffect(() => {
    if (component.customName) {
      setSearchTerm(component.customName);
    } else if (component.itemId) {
      const item = availableItems.find(i => i.id === component.itemId);
      if (item) setSearchTerm(item.name);
    }
  }, [component.customName, component.itemId, availableItems]);

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredItems = useMemo(() => {
    if (!searchTerm) return availableItems.slice(0, 10);
    const lower = searchTerm.toLowerCase();
    return availableItems
      .filter((item) => item.name.toLowerCase().includes(lower))
      .slice(0, 10);
  }, [availableItems, searchTerm]);

  const handleSelect = async (item: AvailableItem) => {
    alert("Auswahl erkannt: " + item.id);
    console.log("Selected Item Raw Data:", item);
    onChange(index, "itemId", String(item.id));
    onChange(index, "customName", null);
    onChange(index, "unit", item.unit);
    onChange(index, "purchasePrice", item.purchasePrice);
    onChange(index, "nutritionPerUnit", item.nutritionPerUnit ?? null);
    setSearchTerm(item.name);
    setSearchOpen(false);
    try {
      const res = await fetch(`/api/recipe-structure?parentItemId=${item.id}`);
      if (res.ok) {
        const arr = await res.json();
        onChange(index, "hasSubIngredients", Array.isArray(arr) && arr.length > 0);
      } else {
        onChange(index, "hasSubIngredients", false);
      }
    } catch {
      onChange(index, "hasSubIngredients", false);
    }
  };

  const handleTogglePreview = async () => {
    if (!component.itemId) return;
    if (previewOpen) {
      setPreviewOpen(false);
      return;
    }
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const res = await fetch(`/api/recipe-structure?parentItemId=${component.itemId}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        const mapped = data.map((row: any) => {
          const child = availableItems.find(
            (i) => String(i.id) === String(row.itemId)
          );
          const qty =
            typeof row.quantity === "number"
              ? row.quantity
              : typeof row.amount === "number"
              ? row.amount
              : 0;
          return {
            name: child?.name ?? "Unbenannter Artikel",
            quantity: qty,
            unit: row.unit || child?.unit || "",
          };
        });
        setPreviewItems(mapped);
      } else {
        setPreviewItems([]);
      }
      setPreviewOpen(true);
    } catch (error) {
      console.error("Fehler beim Laden der Unterrezept-Komponenten:", error);
      setPreviewError("Fehler beim Laden der Unterrezept-Komponenten");
      setPreviewOpen(true);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleTextChange = (text: string) => {
    setSearchTerm(text);
    setSearchOpen(true);
    // If text doesn't match the currently selected item, switch to custom mode
    const currentItem = component.itemId
      ? availableItems.find(
          (i) => String(i.id) === String(component.itemId)
        )
      : null;
    if (currentItem && currentItem.name !== text) {
      onChange(index, "itemId", null);
      onChange(index, "customName", text);
    } else if (!currentItem) {
        onChange(index, "customName", text);
    }
  };

  // Helper to calculate cost for a row (inlined or we can use the helper if defined)
  const rowCost =
    component.itemId &&
    availableItems.find(
      (i) => String(i.id) === String(component.itemId)
    )
      ? availableItems.find(
          (i) => String(i.id) === String(component.itemId)
        )!.purchasePrice * component.quantity
    : 0;

  const isLinked = !!component.itemId;
  const hasCustomName = !!component.customName && !isLinked;
  const isSubRecipe = !!component.hasSubIngredients;

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={cn(
          "group flex items-center gap-2 rounded-md border bg-white p-2 shadow-sm transition-all hover:shadow-md",
          isDragging && "opacity-50",
          isSubRecipe && "border-l-4 border-l-blue-400"
        )}
      >
        {!readOnly && (
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab text-gray-400 hover:text-gray-600 active:cursor-grabbing"
          >
            <GripVertical size={20} />
          </div>
        )}

        <div className="w-20">
          <Input
            type="number"
            value={component.quantity || ""}
            onChange={(e) =>
              onChange(index, "quantity", parseFloat(e.target.value) || 0)
            }
            placeholder="Menge"
            className="h-8 text-right"
            readOnly={readOnly}
          />
        </div>

        <div className="w-20">
          <Input
            type="text"
            value={component.unit || ""}
            onChange={(e) => onChange(index, "unit", e.target.value)}
            placeholder="Einheit"
            className="h-8"
            readOnly={readOnly}
          />
        </div>

        <div className="relative flex-1" ref={wrapperRef}>
          <div className="relative">
            <Input
              value={searchTerm}
              onChange={(e) => handleTextChange(e.target.value)}
              onFocus={() => setSearchOpen(true)}
              placeholder="Zutat suchen oder eingeben..."
              className={cn(
                "h-8 pr-8",
                isLinked ? "border-green-200 bg-green-50 text-green-900" : ""
              )}
              readOnly={readOnly}
            />
            {isLinked && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 text-green-600">
                <Check size={14} />
              </div>
            )}
          </div>

          {searchOpen && !readOnly && (
            <div className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-md border bg-white shadow-lg">
              {filteredItems.length > 0 ? (
                <ul className="max-h-60 overflow-y-auto py-1">
                  {filteredItems.map((item) => (
                    <li
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm hover:bg-gray-100"
                    >
                      <span>{item.name}</span>
                      <span className="text-xs text-gray-400">{item.unit}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-3 text-center text-xs text-gray-500">
                  Drücke Enter für Freitext "{searchTerm}"
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex w-24 flex-col items-end justify-center text-xs text-gray-600">
          <span className="font-medium">
            {isLinked ? `${rowCost.toFixed(2)} €` : "-"}
          </span>
          {isLinked && (
            <span className="text-[10px] text-gray-400">
              {(
                availableItems.find(
                  (i) => String(i.id) === String(component.itemId)
                )
                  ?.purchasePrice || 0
              ).toFixed(2)}{" "}
              € / Eh.
            </span>
          )}
        </div>

        {!readOnly && (
          <div className="flex items-center gap-1">
            {hasCustomName && searchTerm.trim().length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-yellow-500 hover:bg-yellow-50 hover:text-yellow-600"
                title="Als neuen Stammdaten-Artikel anlegen (Quick Import)"
                onClick={() => onQuickImport(searchTerm)}
              >
                <Zap size={16} />
              </Button>
            )}
            {component.hasSubIngredients && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 text-blue-500 hover:bg-blue-50 hover:text-blue-600",
                  previewOpen && "bg-blue-50"
                )}
                title="Unterrezept anzeigen"
                onClick={handleTogglePreview}
              >
                <Layers size={16} />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-400 hover:bg-red-50 hover:text-red-500"
              onClick={() => onRemove(index)}
            >
              <Trash2 size={16} />
            </Button>
          </div>
        )}
      </div>
      {previewOpen && component.itemId && (
        <div className="ml-10 mt-2 rounded-md border bg-white/80 p-2 text-xs text-gray-700">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="font-semibold text-[11px]">Unterrezept</span>
            {onImportSubRecipeSteps && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-6 px-2 text-[10px]"
                onClick={() => onImportSubRecipeSteps(component.itemId!)}
              >
                Zubereitung übernehmen
              </Button>
            )}
          </div>
          {previewLoading && (
            <div className="text-[11px] text-gray-500">
              Lade Unterrezept-Zutaten...
            </div>
          )}
          {!previewLoading && previewError && (
            <div className="text-[11px] text-red-500">{previewError}</div>
          )}
          {!previewLoading && !previewError && previewItems.length === 0 && (
            <div className="text-[11px] text-gray-400">
              Keine Unter-Zutaten gefunden.
            </div>
          )}
          {!previewLoading && !previewError && previewItems.length > 0 && (
            <ul className="ml-2 space-y-0.5">
              {previewItems.map((item, idx) => (
                <li key={`${item.name}-${idx}`} className="flex gap-2">
                  <span className="w-16 text-right">
                    {item.quantity.toFixed(2)} {item.unit}
                  </span>
                  <span className="flex-1 truncate">{item.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export function SmartIngredientMatrix({
  components,
  availableItems,
  onUpdate,
  onQuickImport,
  onExpandSubRecipe,
  onImportSubRecipeSteps,
  readOnly = false,
  debugStatus,
}: SmartIngredientMatrixProps) {
  // ... (sensors, itemsWithIds, handleDragEnd, handleChange, handleRemove, handleAddRow remain same)
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const itemsWithIds = useMemo(() => {
    return components.map((c, i) => ({
      ...c,
      tempId: c.tempId || c.itemId || `row-${i}-${Date.now()}`,
    }));
  }, [components]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = itemsWithIds.findIndex((i) => i.tempId === active.id);
      const newIndex = itemsWithIds.findIndex((i) => i.tempId === over.id);
      onUpdate(arrayMove(components, oldIndex, newIndex));
    }
  };

  const handleChange = (index: number, field: keyof InventoryComponent, value: any) => {
    const newComponents = [...components];
    newComponents[index] = { ...newComponents[index], [field]: value };
    onUpdate(newComponents);
  };

  const handleRemove = (index: number) => {
    const newComponents = [...components];
    newComponents.splice(index, 1);
    onUpdate(newComponents);
  };

  const handleAddRow = () => {
    onUpdate([
      ...components,
      {
        itemId: null,
        quantity: 0,
        unit: "kg", // Default unit
        customName: "",
        tempId: `new-${Date.now()}`,
      },
    ]);
  };

  // Dynamic Totals Calculation
  console.log("SmartIngredientMatrix availableItems length:", availableItems.length, availableItems);

  const totals = useMemo(() => {
    const result: Record<string, number> = { cost: 0 };
    
    // Initialize keys based on available items to ensure we have all fields
    // (Optional: could just discover them during reduction)
    
    components.forEach((comp) => {
      const item = availableItems.find((i) => i.id === comp.itemId);
      if (item) {
        // Cost
        result.cost += item.purchasePrice * comp.quantity;

        // Dynamic Nutrition/Other fields
        if (item.nutritionPerUnit) {
          Object.entries(item.nutritionPerUnit).forEach(([key, value]) => {
            if (value !== null && typeof value === 'number') {
              result[key] = (result[key] || 0) + value * comp.quantity;
            }
          });
        }
      }
    });
    
    return result;
  }, [components, availableItems]);

  return (
    <div className="space-y-4">
      {debugStatus && (
        <div className="rounded-md border border-dashed bg-white/70 px-3 py-1 text-[11px] text-gray-700">
          {debugStatus} | availableItems: {availableItems.length} | components: {components.length}
        </div>
      )}
      <div className="flex items-center justify-between">
        {!readOnly && (
            <Button onClick={handleAddRow} size="sm" variant="outline" className="h-8 gap-2">
            <Plus size={14} /> Zeile hinzufügen
            </Button>
        )}
      </div>

      <div className="rounded-lg border bg-gray-50/50 p-4">
        {/* Header Row */}
        <div className="mb-2 flex gap-2 px-2 text-xs font-medium text-gray-500">
          <div className="w-5"></div>
          <div className="w-20 text-right">Menge</div>
          <div className="w-20">Einheit</div>
          <div className="flex-1">Zutat / Ressource</div>
          <div className="w-24 text-right">Kosten</div>
          <div className="w-20"></div>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={itemsWithIds.map((i) => i.tempId || "")}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {components.map((component, index) => (
                <SortableRow
                  key={component.tempId || component.itemId || index}
                  component={component}
                  index={index}
                  availableItems={availableItems}
                  onChange={handleChange}
                  onRemove={handleRemove}
                  onQuickImport={onQuickImport}
                  onExpandSubRecipe={onExpandSubRecipe}
                  onImportSubRecipeSteps={onImportSubRecipeSteps}
                  readOnly={readOnly}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {components.length === 0 && (
          <div className="flex h-24 flex-col items-center justify-center gap-2 rounded-md border border-dashed bg-white text-gray-400">
            <Leaf size={24} />
            <span className="text-sm">Keine Zutaten vorhanden</span>
            {!readOnly && (
                 <Button variant="ghost" size="sm" onClick={handleAddRow}>
                Erste Zutat hinzufügen
                </Button>
            )}
          </div>
        )}
      </div>

      {/* Dynamic Summary Footer */}
      <div className="grid grid-cols-1 gap-4 rounded-lg border bg-white p-4 shadow-sm md:grid-cols-4">
        {/* Always show Cost */}
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">Gesamtkosten (Wareneinsatz)</span>
          <div className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <Calculator size={18} className="text-gray-400" />
            {totals.cost.toFixed(2)} €
          </div>
        </div>
        
        {/* Render other fields dynamically */}
        {Object.entries(totals)
          .filter(([key]) => key !== "cost" && totals[key] > 0)
          .map(([key, value]) => (
            <div key={key} className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">{formatLabel(key)}</span>
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Zap size={16} className="text-gray-400" />
                {value.toFixed(1)}
              </div>
            </div>
        ))}
      </div>
    </div>
  );
}
