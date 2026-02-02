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
  GripVertical,
  Plus,
  Trash2,
  Zap,
  Calculator,
  AlertCircle,
  Leaf,
  Droplets,
  Search,
  Check,
  X,
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
};

// We need a subset of InventoryItem for the dropdown and calculations
export type AvailableItem = {
  id: string;
  name: string;
  unit: string;
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
  readOnly?: boolean;
}

interface SortableRowProps {
  component: InventoryComponent;
  index: number;
  availableItems: AvailableItem[];
  onChange: (index: number, field: keyof InventoryComponent, value: any) => void;
  onRemove: (index: number) => void;
  onQuickImport: (name: string) => void;
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
    (component.itemId ? availableItems.find(i => i.id === component.itemId)?.name : "") || 
    ""
  );
  const wrapperRef = useRef<HTMLDivElement>(null);

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

  const handleSelect = (item: AvailableItem) => {
    onChange(index, "itemId", item.id);
    onChange(index, "customName", null);
    onChange(index, "unit", item.unit); // Auto-fill unit
    setSearchTerm(item.name);
    setSearchOpen(false);
  };

  const handleTextChange = (text: string) => {
    setSearchTerm(text);
    setSearchOpen(true);
    // If text doesn't match the currently selected item, switch to custom mode
    const currentItem = component.itemId ? availableItems.find(i => i.id === component.itemId) : null;
    if (currentItem && currentItem.name !== text) {
      onChange(index, "itemId", null);
      onChange(index, "customName", text);
    } else if (!currentItem) {
        onChange(index, "customName", text);
    }
  };

  // Helper to calculate cost for a row (inlined or we can use the helper if defined)
  const rowCost = component.itemId && availableItems.find(i => i.id === component.itemId)
    ? (availableItems.find(i => i.id === component.itemId)!.purchasePrice * component.quantity)
    : 0;

  const isLinked = !!component.itemId;
  const hasCustomName = !!component.customName && !isLinked;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-2 rounded-md border bg-white p-2 shadow-sm transition-all hover:shadow-md",
        isDragging && "opacity-50"
      )}
    >
      {/* Drag Handle */}
      {!readOnly && (
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab text-gray-400 hover:text-gray-600 active:cursor-grabbing"
        >
          <GripVertical size={20} />
        </div>
      )}

      {/* Quantity */}
      <div className="w-20">
        <Input
          type="number"
          value={component.quantity || ""}
          onChange={(e) => onChange(index, "quantity", parseFloat(e.target.value) || 0)}
          placeholder="Menge"
          className="h-8 text-right"
          readOnly={readOnly}
        />
      </div>

      {/* Unit */}
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

      {/* Ingredient Name (Hybrid Input) */}
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

        {/* Dropdown */}
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

      {/* Cost Preview */}
      <div className="flex w-24 flex-col items-end justify-center text-xs text-gray-600">
        <span className="font-medium">
            {isLinked ? `${rowCost.toFixed(2)} €` : "-"}
        </span>
        {isLinked && (
           <span className="text-[10px] text-gray-400">
             {(availableItems.find(i => i.id === component.itemId)?.purchasePrice || 0).toFixed(2)} € / Eh.
           </span>
        )}
      </div>

      {/* Actions */}
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
  );
};

export function SmartIngredientMatrix({
  components,
  availableItems,
  onUpdate,
  onQuickImport,
  readOnly = false,
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
      {/* ... (Header and DndContext remain same) */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">Zutaten & Ressourcen</h3>
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
