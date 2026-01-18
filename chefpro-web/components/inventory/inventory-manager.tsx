"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  Loader2,
  Image as ImageIcon,
  Link2,
} from "lucide-react";
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
  itemId: string | null;
  quantity: number;
  unit: string;
  deletedItemName?: string | null;
};

type StandardPreparationComponent = {
  name: string;
  quantity: number;
  unit: string;
};

type StandardPreparation = {
  components: StandardPreparationComponent[];
};

type PreparationStep = {
  id: string;
  text: string;
  duration?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
};

type NutritionTotals = {
  energyKcal: number;
  fat: number;
  saturatedFat: number;
  carbs: number;
  sugar: number;
  protein: number;
  salt: number;
};

type RecipeCalculation = {
  totalCost: number;
  costPerPortion: number | null;
  marginPerPortion: number | null;
  goodsSharePercent: number | null;
  hasMissingPrices: boolean;
};

type RecipeNutritionSummary = {
  perRecipe: NutritionTotals | null;
  perPortion: NutritionTotals | null;
  hasMissingData: boolean;
};

type InventoryItem = {
  id: string;
  internalId?: number | null;
  name: string;
  type: InventoryType;
  unit: string;
  purchasePrice: number;
  targetPortions?: number | null;
  targetSalesPrice?: number | null;
  category?: string | null;
  portionUnit?: string | null;
  nutritionTags?: string[];
  manufacturerArticleNumber?: string | null;
  ean?: string | null;
  allergens?: string[];
  ingredients?: string | null;
  dosageInstructions?: string | null;
  yieldInfo?: string | null;
  preparationSteps?: string | PreparationStep[] | null;
  nutritionPerUnit?: NutritionTotals | null;
  standardPreparation?: StandardPreparation | null;
  components?: InventoryComponent[];
  isBio?: boolean;
  isDeklarationsfrei?: boolean;
  isAllergenfrei?: boolean;
  isCookChill?: boolean;
  isFreezeThawStable?: boolean;
  isPalmOilFree?: boolean;
  isYeastFree?: boolean;
  isLactoseFree?: boolean;
  isGlutenFree?: boolean;
  hasGhostComponents?: boolean;
  imageUrl?: string | null;
};

type ParsedAiItem = {
  name: string;
  unit: string;
  quantity: number;
  purchasePrice: number;
  calculatedPricePerUnit: number;
  standardPreparation?: StandardPreparation | null;
  preparationText?: string | null;
};

type ParsedDocumentItem = {
  name: string;
  unit: string;
  purchasePrice: number;
  allergens: string[];
  fileUrl: string;
  ingredients?: string | null;
  dosageInstructions?: string | null;
  yieldInfo?: string | null;
  preparationText?: string | null;
  isBio?: boolean;
  isDeklarationsfrei?: boolean;
  isAllergenfrei?: boolean;
  isCookChill?: boolean;
  isFreezeThawStable?: boolean;
  isPalmOilFree?: boolean;
  isYeastFree?: boolean;
  isLactoseFree?: boolean;
  isGlutenFree?: boolean;
};

const recipeCategories = ["Vorspeise", "Hauptgang", "Dessert"];

const nutritionOptions = ["Vegan", "Vegetarisch", "Halal", "Glutenfrei"];

const initialItems: InventoryItem[] = [
  {
    id: "zukauf-tomatendose",
    name: "Tomaten, gehackt 2,5 kg Dose",
    type: "zukauf",
    unit: "Dose",
    purchasePrice: 4.2,
    allergens: ["Sellerie"],
  },
  {
    id: "zukauf-zwiebeln",
    name: "Zwiebeln, frisch 10 kg Sack",
    type: "zukauf",
    unit: "kg",
    purchasePrice: 0.9,
    allergens: [],
  },
  {
    id: "zukauf-olivenoel",
    name: "Olivenöl, extra vergine 5 L Kanister",
    type: "zukauf",
    unit: "L",
    purchasePrice: 6.5,
    allergens: [],
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

type RecipeViewMode = "list" | "grid" | "detailed";

function createPreparationStepId() {
  if (
    typeof crypto !== "undefined" &&
    typeof (crypto as Crypto & { randomUUID?: () => string }).randomUUID ===
      "function"
  ) {
    return (crypto as Crypto & { randomUUID?: () => string }).randomUUID();
  }
  return `step-${Math.random().toString(36).slice(2, 10)}`;
}

function renderTaggedText(
  text: string,
  options: { id: string; name: string }[]
): ReactNode {
  if (!text) {
    return null;
  }
  const names = options
    .map((option) => option.name)
    .filter((name) => name.trim().length > 0);
  if (names.length === 0) {
    return <span className="whitespace-pre-line">{text}</span>;
  }
  const escaped = names
    .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const regex = new RegExp(`\\b(${escaped})\\b`, "gi");
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={`t-${key++}`}>{text.slice(lastIndex, match.index)}</span>
      );
    }
    parts.push(
      <span key={`h-${key++}`} className="font-semibold text-primary">
        {match[0]}
      </span>
    );
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(<span key={`t-${key++}`}>{text.slice(lastIndex)}</span>);
  }
  return <span className="whitespace-pre-line">{parts}</span>;
}

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function levenshteinDistance(a: string, b: string) {
  if (a === b) {
    return 0;
  }
  if (!a.length) {
    return b.length;
  }
  if (!b.length) {
    return a.length;
  }
  const previous = new Array(b.length + 1);
  const current = new Array(b.length + 1);
  for (let index = 0; index <= b.length; index += 1) {
    previous[index] = index;
  }
  for (let indexA = 0; indexA < a.length; indexA += 1) {
    current[0] = indexA + 1;
    for (let indexB = 0; indexB < b.length; indexB += 1) {
      const cost = a[indexA] === b[indexB] ? 0 : 1;
      current[indexB + 1] = Math.min(
        current[indexB] + 1,
        previous[indexB + 1] + 1,
        previous[indexB] + cost
      );
    }
    for (let index = 0; index <= b.length; index += 1) {
      previous[index] = current[index];
    }
  }
  return previous[b.length];
}

function computeNameSimilarity(a: string, b: string) {
  const first = normalizeName(a);
  const second = normalizeName(b);
  if (!first && !second) {
    return 1;
  }
  if (!first || !second) {
    return 0;
  }
  const distance = levenshteinDistance(first, second);
  const length = Math.max(first.length, second.length);
  if (!length) {
    return 0;
  }
  return 1 - distance / length;
}

function findBestInventoryMatchByName(
  targetName: string,
  items: Iterable<InventoryItem>
) {
  const scores: { item: InventoryItem; score: number }[] = [];
  for (const item of items) {
    const score = computeNameSimilarity(targetName, item.name);
    if (score > 0) {
      scores.push({ item, score });
    }
  }
  if (scores.length === 0) {
    return null;
  }
  scores.sort((first, second) => second.score - first.score);
  const best = scores[0];
  if (best.score < 0.7) {
    return null;
  }
  return best.item;
}

function findExactRecipeMatchByName(
  targetName: string,
  items: Iterable<InventoryItem>
) {
  const normalized = targetName.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  for (const item of items) {
    if (item.type !== "eigenproduktion") {
      continue;
    }
    if (item.name.trim().toLowerCase() === normalized) {
      return item;
    }
  }
  return null;
}

export function InventoryManager() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [activeSection, setActiveSection] = useState<
    "dashboard" | "zutaten" | "rezepte"
  >("zutaten");
  const [isDetailView, setIsDetailView] = useState(false);
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
  const [componentQuantityInput, setComponentQuantityInput] = useState("1");
  const [componentUnitInput, setComponentUnitInput] = useState("");
  const [standardPreparationComponents, setStandardPreparationComponents] =
    useState<StandardPreparationComponent[]>([]);
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
  const [proAllergensInput, setProAllergensInput] = useState("");
  const [specItem, setSpecItem] = useState<InventoryItem | null>(null);
  const [proIngredientsInput, setProIngredientsInput] = useState("");
  const [proDosageInput, setProDosageInput] = useState("");
  const [proYieldInput, setProYieldInput] = useState("");
  const [proPreparationInput, setProPreparationInput] = useState("");
  const [manufacturerInput, setManufacturerInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [categoryInput, setCategoryInput] = useState("");
  const [portionUnitInput, setPortionUnitInput] = useState("");
  const [nutritionTagsInput, setNutritionTagsInput] = useState<string[]>([]);
  const [targetPortionsInput, setTargetPortionsInput] = useState("");
  const [targetSalesPriceInput, setTargetSalesPriceInput] = useState("");
  const [isBioInput, setIsBioInput] = useState(false);
  const [isDeklarationsfreiInput, setIsDeklarationsfreiInput] =
    useState(false);
  const [isAllergenfreiInput, setIsAllergenfreiInput] = useState(false);
  const [isCookChillInput, setIsCookChillInput] = useState(false);
  const [isFreezeThawStableInput, setIsFreezeThawStableInput] =
    useState(false);
  const [isPalmOilFreeInput, setIsPalmOilFreeInput] = useState(false);
  const [isYeastFreeInput, setIsYeastFreeInput] = useState(false);
  const [isLactoseFreeInput, setIsLactoseFreeInput] = useState(false);
  const [isGlutenFreeInput, setIsGlutenFreeInput] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSwapMode, setIsSwapMode] = useState(false);
  const [swapGhostName, setSwapGhostName] = useState<string>("");
  const [adHocQuantity, setAdHocQuantity] = useState("");
  const [adHocName, setAdHocName] = useState("");
  const [adHocUnit, setAdHocUnit] = useState("");
  const [adHocPrice, setAdHocPrice] = useState("");
  const [adHocSelectedItemId, setAdHocSelectedItemId] = useState<string | null>(
    null
  );
  const [preparationStepsInput, setPreparationStepsInput] = useState<
    PreparationStep[]
  >([]);
  const [draggedPreparationStepId, setDraggedPreparationStepId] = useState<
    string | null
  >(null);
  const [activeTagStepId, setActiveTagStepId] = useState<string | null>(null);
  const [tagSearch, setTagSearch] = useState("");
  const [isGeneratingImageStepId, setIsGeneratingImageStepId] = useState<
    string | null
  >(null);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [imageViewer, setImageViewer] = useState<{
    stepId: string;
    imageUrl: string;
  } | null>(null);
  const [recipeViewMode, setRecipeViewMode] =
    useState<RecipeViewMode>("list");
  const [isRecipeSidebarOpen, setIsRecipeSidebarOpen] = useState(true);
  const [recipeCategoryFilter, setRecipeCategoryFilter] = useState<string | null>(
    null
  );
  const [recipeProFilter, setRecipeProFilter] = useState<
    | "bio"
    | "deklarationsfrei"
    | "allergenfrei"
    | "glutenfrei"
    | "laktosefrei"
    | "hefefrei"
    | "palmoelfrei"
    | null
  >(null);
  const [isRecipePresentationMode, setIsRecipePresentationMode] =
    useState(false);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [imageIsUploading, setImageIsUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [isImageDropActive, setIsImageDropActive] = useState(false);

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
      const query = search.trim().toLowerCase();
      if (!query) {
        if (activeSection === "rezepte") {
          if (
            recipeCategoryFilter &&
            (item.category ?? "").toLowerCase() !==
              recipeCategoryFilter.toLowerCase()
          ) {
            return false;
          }
          if (recipeProFilter === "bio" && !item.isBio) {
            return false;
          }
          if (recipeProFilter === "deklarationsfrei" && !item.isDeklarationsfrei) {
            return false;
          }
          if (recipeProFilter === "allergenfrei" && !item.isAllergenfrei) {
            return false;
          }
          if (recipeProFilter === "glutenfrei" && !item.isGlutenFree) {
            return false;
          }
          if (recipeProFilter === "laktosefrei" && !item.isLactoseFree) {
            return false;
          }
          if (recipeProFilter === "hefefrei" && !item.isYeastFree) {
            return false;
          }
          if (recipeProFilter === "palmoelfrei" && !item.isPalmOilFree) {
            return false;
          }
        }
        return true;
      }
      const manufacturer =
        item.manufacturerArticleNumber?.toLowerCase() ?? "";
      const ean = item.ean?.toLowerCase() ?? "";
      const category = item.category?.toLowerCase() ?? "";
      const portionUnit = item.portionUnit?.toLowerCase() ?? "";
      const nutrition =
        (item.nutritionTags ?? []).join(" ").toLowerCase();
      const allergens =
        (item.allergens ?? []).join(" ").toLowerCase();
      const ingredients =
        item.ingredients?.toLowerCase() ?? "";
      const internalId =
        item.internalId != null ? String(item.internalId) : "";
      return (
        item.name.toLowerCase().includes(query) ||
        item.unit.toLowerCase().includes(query) ||
        manufacturer.includes(query) ||
        ean.includes(query) ||
        category.includes(query) ||
        portionUnit.includes(query) ||
        nutrition.includes(query) ||
        allergens.includes(query) ||
        ingredients.includes(query) ||
        internalId.includes(query)
      );
    });
  }, [
    activeSection,
    effectiveItems,
    filterType,
    recipeCategoryFilter,
    recipeProFilter,
    search,
  ]);

  const docMatch = useMemo(() => {
    if (!docParsed) {
      return null;
    }
    return findBestInventoryMatchByName(
      docParsed.name,
      effectiveItems
    );
  }, [docParsed, effectiveItems]);

  const recentRecipes = useMemo(() => {
    const recipes = effectiveItems.filter(
      (item) => item.type === "eigenproduktion"
    );
    if (recipes.length === 0) {
      return [];
    }
    const sorted = [...recipes].sort((first, second) => {
      const firstInternal = first.internalId ?? 0;
      const secondInternal = second.internalId ?? 0;
      if (firstInternal !== secondInternal) {
        return secondInternal - firstInternal;
      }
      return second.name.localeCompare(first.name);
    });
    return sorted.slice(0, 5);
  }, [effectiveItems]);

  useEffect(() => {
    if (!selectedItemId && filteredItems[0]) {
      setSelectedItemId(filteredItems[0].id);
    }
  }, [filteredItems, selectedItemId]);

  useEffect(() => {
    if (activeSection === "zutaten") {
      setFilterType("zukauf");
    } else if (activeSection === "rezepte") {
      setFilterType("eigenproduktion");
    } else {
      setFilterType("all");
    }
    setIsDetailView(false);
  }, [activeSection]);

  const selectedItem =
    filteredItems.find((item) => item.id === selectedItemId) ??
    filteredItems[0] ??
    null;

  useEffect(() => {
    if (selectedItem && selectedItem.type === "eigenproduktion") {
      setImageUrlInput(selectedItem.imageUrl ?? "");
    } else {
      setImageUrlInput("");
    }
    setImageUploadError(null);
    setIsImageDropActive(false);
  }, [selectedItem]);

  const inheritedAllergens = useMemo(() => {
    if (!selectedItem || selectedItem.type !== "eigenproduktion") {
      return [];
    }
    const rootItem: InventoryItem = {
      ...selectedItem,
      components: isEditingComponents
        ? editingComponents
        : selectedItem.components,
    };
    const visited = new Set<string>();
    const allergensSet = new Set<string>();

    function visit(item: InventoryItem) {
      if (visited.has(item.id)) {
        return;
      }
      visited.add(item.id);
      const components = item.components ?? [];
      for (const component of components) {
        if (!component.itemId) {
          continue;
        }
        const child = itemsById.get(component.itemId);
        if (!child) {
          continue;
        }
        for (const value of child.allergens ?? []) {
          const trimmed = value.trim();
          if (trimmed.length > 0) {
            allergensSet.add(trimmed);
          }
        }
        if (child.components && child.components.length > 0) {
          visit(child);
        }
      }
    }

    visit(rootItem);

    return Array.from(allergensSet).sort((a, b) =>
      a.localeCompare(b, "de")
    );
  }, [editingComponents, isEditingComponents, itemsById, selectedItem]);

  const recipeCalculation = useMemo<RecipeCalculation | null>(() => {
    if (!selectedItem || selectedItem.type !== "eigenproduktion") {
      return null;
    }
    const rootItem: InventoryItem = {
      ...selectedItem,
      components: isEditingComponents
        ? editingComponents
        : selectedItem.components,
    };
    if (!rootItem.components || rootItem.components.length === 0) {
      return {
        totalCost: 0,
        costPerPortion: null as number | null,
        marginPerPortion: null as number | null,
        goodsSharePercent: null as number | null,
        hasMissingPrices: true,
      };
    }

    const visited = new Set<string>();

    function computeItemCost(
      item: InventoryItem
    ): { cost: number; missing: boolean } {
      if (visited.has(item.id)) {
        return { cost: 0, missing: true };
      }
      visited.add(item.id);

      if (!item.components || item.components.length === 0) {
        const price = Number(item.purchasePrice);
        if (!Number.isFinite(price) || price <= 0) {
          return { cost: 0, missing: true };
        }
        return { cost: price, missing: false };
      }

      let total = 0;
      let missing = false;

      for (const component of item.components ?? []) {
        if (!component.itemId) {
          missing = true;
          continue;
        }
        const componentItem = itemsById.get(component.itemId);
        if (!componentItem) {
          missing = true;
          continue;
        }
        const quantity = Number(
          String(component.quantity).toString().replace(",", ".")
        );
        if (!Number.isFinite(quantity) || quantity <= 0) {
          missing = true;
          continue;
        }
        const child = computeItemCost(componentItem);
        if (child.missing) {
          missing = true;
        }
        total += child.cost * quantity;
      }

      return { cost: total, missing };
    }

    const { cost: totalCost, missing } = computeItemCost(rootItem);

    const portions = selectedItem.targetPortions ?? null;
    const validPortions =
      portions != null && Number.isFinite(portions) && portions > 0
        ? portions
        : null;

    const costPerPortion =
      validPortions != null ? totalCost / validPortions : null;

    const sales = selectedItem.targetSalesPrice ?? null;
    const validSales =
      sales != null && Number.isFinite(sales) && sales > 0 ? sales : null;

    const marginPerPortion =
      costPerPortion != null && validSales != null
        ? validSales - costPerPortion
        : null;

    const goodsSharePercent =
      costPerPortion != null && validSales != null && validSales > 0
        ? (costPerPortion / validSales) * 100
        : null;

    return {
      totalCost,
      costPerPortion,
      marginPerPortion,
      goodsSharePercent,
      hasMissingPrices: missing,
    };
  }, [editingComponents, isEditingComponents, itemsById, selectedItem]);

  const nutritionSummary = useMemo<RecipeNutritionSummary | null>(() => {
    if (!selectedItem || selectedItem.type !== "eigenproduktion") {
      return null;
    }

    const rootItem: InventoryItem = {
      ...selectedItem,
      components: isEditingComponents
        ? editingComponents
        : selectedItem.components,
    };

    if (!rootItem.components || rootItem.components.length === 0) {
      return {
        perRecipe: null as NutritionTotals | null,
        perPortion: null as NutritionTotals | null,
        hasMissingData: true,
      };
    }

    const visited = new Set<string>();

    function computeItemNutrition(
      item: InventoryItem
    ): { totals: NutritionTotals | null; missing: boolean } {
      if (visited.has(item.id)) {
        return { totals: null, missing: true };
      }
      visited.add(item.id);

      if (!item.components || item.components.length === 0) {
        const base = item.nutritionPerUnit;
        if (!base) {
          return { totals: null, missing: true };
        }
        const normalized: NutritionTotals = {
          energyKcal: base.energyKcal ?? 0,
          fat: base.fat ?? 0,
          saturatedFat: base.saturatedFat ?? 0,
          carbs: base.carbs ?? 0,
          sugar: base.sugar ?? 0,
          protein: base.protein ?? 0,
          salt: base.salt ?? 0,
        };
        return { totals: normalized, missing: false };
      }

      const totals: NutritionTotals = {
        energyKcal: 0,
        fat: 0,
        saturatedFat: 0,
        carbs: 0,
        sugar: 0,
        protein: 0,
        salt: 0,
      };
      let missing = false;

      for (const component of item.components ?? []) {
        if (!component.itemId) {
          missing = true;
          continue;
        }
        const componentItem = itemsById.get(component.itemId);
        if (!componentItem) {
          missing = true;
          continue;
        }
        const quantity = Number(
          String(component.quantity).toString().replace(",", ".")
        );
        if (!Number.isFinite(quantity) || quantity <= 0) {
          missing = true;
          continue;
        }
        const child = computeItemNutrition(componentItem);
        if (!child.totals) {
          missing = true;
          continue;
        }
        totals.energyKcal += child.totals.energyKcal * quantity;
        totals.fat += child.totals.fat * quantity;
        totals.saturatedFat += child.totals.saturatedFat * quantity;
        totals.carbs += child.totals.carbs * quantity;
        totals.sugar += child.totals.sugar * quantity;
        totals.protein += child.totals.protein * quantity;
        totals.salt += child.totals.salt * quantity;
      }

      return { totals, missing };
    }

    const { totals, missing } = computeItemNutrition(rootItem);

    if (!totals) {
      return {
        perRecipe: null as NutritionTotals | null,
        perPortion: null as NutritionTotals | null,
        hasMissingData: true,
      };
    }

    const portions = selectedItem.targetPortions ?? null;
    const validPortions =
      portions != null && Number.isFinite(portions) && portions > 0
        ? portions
        : null;

    const perRecipe = totals;
    const perPortion =
      validPortions != null
        ? {
            energyKcal: totals.energyKcal / validPortions,
            fat: totals.fat / validPortions,
            saturatedFat: totals.saturatedFat / validPortions,
            carbs: totals.carbs / validPortions,
            sugar: totals.sugar / validPortions,
            protein: totals.protein / validPortions,
            salt: totals.salt / validPortions,
          }
        : null;

    return {
      perRecipe,
      perPortion,
      hasMissingData: missing,
    };
  }, [editingComponents, isEditingComponents, itemsById, selectedItem]);

  useEffect(() => {
    setSpecItem(null);
    setIsRecipePresentationMode(false);
    if (!selectedItem) {
      setManufacturerInput("");
      setProAllergensInput("");
      setProIngredientsInput("");
      setProDosageInput("");
      setProYieldInput("");
      setProPreparationInput("");
      setNameInput("");
      setCategoryInput("");
      setPortionUnitInput("");
      setNutritionTagsInput([]);
      setStandardPreparationComponents([]);
      setTargetPortionsInput("");
      setTargetSalesPriceInput("");
      setIsBioInput(false);
      setIsDeklarationsfreiInput(false);
      setIsAllergenfreiInput(false);
      setIsCookChillInput(false);
      setIsFreezeThawStableInput(false);
      setIsPalmOilFreeInput(false);
      setIsYeastFreeInput(false);
      setIsLactoseFreeInput(false);
      setIsGlutenFreeInput(false);
      setPreparationStepsInput([]);
      setDraggedPreparationStepId(null);
      setActiveTagStepId(null);
      setTagSearch("");
      setIsGeneratingImageStepId(null);
      setEditingStepId(null);
      return;
    }
    setNameInput(selectedItem.name);
    setCategoryInput(selectedItem.category ?? "");
    setPortionUnitInput(selectedItem.portionUnit ?? "");
    setNutritionTagsInput(selectedItem.nutritionTags ?? []);
    setManufacturerInput(selectedItem.manufacturerArticleNumber ?? "");
    setIsBioInput(selectedItem.isBio ?? false);
    setIsDeklarationsfreiInput(selectedItem.isDeklarationsfrei ?? false);
    setIsAllergenfreiInput(selectedItem.isAllergenfrei ?? false);
    setIsCookChillInput(selectedItem.isCookChill ?? false);
    setIsFreezeThawStableInput(
      selectedItem.isFreezeThawStable ?? false
    );
    setIsPalmOilFreeInput(selectedItem.isPalmOilFree ?? false);
    setIsYeastFreeInput(selectedItem.isYeastFree ?? false);
    setIsLactoseFreeInput(selectedItem.isLactoseFree ?? false);
    setIsGlutenFreeInput(selectedItem.isGlutenFree ?? false);
    const allergensText = (selectedItem.allergens ?? []).join(", ");
    setProAllergensInput(allergensText);
    setProIngredientsInput(selectedItem.ingredients ?? "");
    setProDosageInput(selectedItem.dosageInstructions ?? "");
    setProYieldInput(selectedItem.yieldInfo ?? "");
    if (selectedItem.type === "eigenproduktion") {
      const raw = selectedItem.preparationSteps;
      let source: unknown = raw;
      if (typeof raw === "string") {
        const trimmed = raw.trim();
        if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
          try {
            source = JSON.parse(trimmed) as PreparationStep[];
          } catch {
            source = trimmed;
          }
        } else {
          source = trimmed;
        }
      }
      if (Array.isArray(source)) {
        const steps = source
          .map((step, index) => ({
            id:
              typeof step.id === "string" && step.id.trim().length > 0
                ? step.id
                : `step-${index}-${createPreparationStepId()}`,
            text: typeof step.text === "string" ? step.text : "",
            duration:
              typeof step.duration === "string" &&
              step.duration.trim().length > 0
                ? step.duration.trim()
                : null,
            imageUrl:
              typeof step.imageUrl === "string" &&
              step.imageUrl.trim().length > 0
                ? step.imageUrl.trim()
                : null,
            videoUrl:
              typeof step.videoUrl === "string" &&
              step.videoUrl.trim().length > 0
                ? step.videoUrl.trim()
                : null,
          }))
          .filter((step) => step.text.trim().length > 0);
        setPreparationStepsInput(steps);
        setEditingStepId(null);
      } else if (typeof source === "string" && source.length > 0) {
        setPreparationStepsInput([
          {
            id: createPreparationStepId(),
            text: source,
            duration: null,
            imageUrl: null,
            videoUrl: null,
          },
        ]);
        setEditingStepId(null);
      } else {
        setPreparationStepsInput([]);
        setEditingStepId(null);
      }
      setProPreparationInput("");
    } else {
      const raw = selectedItem.preparationSteps;
      if (typeof raw === "string" && raw.trim().length > 0) {
        setProPreparationInput(raw);
      } else if (Array.isArray(raw) && raw.length > 0) {
        const combined = raw
          .map((step) => step.text)
          .filter(
            (value) => typeof value === "string" && value.trim().length > 0
          )
          .join("\n\n");
        setProPreparationInput(combined);
      } else {
        setProPreparationInput("");
      }
      setPreparationStepsInput([]);
      setEditingStepId(null);
    }
    const stdPrep = selectedItem.standardPreparation;
    if (stdPrep && Array.isArray(stdPrep.components)) {
      setStandardPreparationComponents(
        stdPrep.components
          .map((component) => ({
            name: String(component.name),
            quantity: Number(component.quantity),
            unit: String(component.unit),
          }))
          .filter(
            (component) =>
              component.name.trim().length > 0 &&
              Number.isFinite(component.quantity) &&
              component.quantity > 0 &&
              component.unit.trim().length > 0
          )
      );
    } else {
      setStandardPreparationComponents([]);
    }
    setTargetPortionsInput(
      selectedItem.targetPortions != null
        ? String(selectedItem.targetPortions)
        : ""
    );
    setTargetSalesPriceInput(
      selectedItem.targetSalesPrice != null
        ? String(selectedItem.targetSalesPrice)
        : ""
    );
  }, [selectedItem]);

  const componentSearchResults = useMemo(() => {
    if (!componentSearch.trim() || !selectedItem) {
      return [];
    }
    const term = componentSearch.toLowerCase();
    return effectiveItems.filter((item) => {
      if (item.id === selectedItem.id) {
        return false;
      }
      if (item.type !== "zukauf") {
        return false;
      }
      if (
        editingComponents.some(
          (component) => component.itemId === item.id
        )
      ) {
        return false;
      }
      return (
        item.name.toLowerCase().includes(term) ||
        item.unit.toLowerCase().includes(term)
      );
    });
  }, [componentSearch, effectiveItems, editingComponents, selectedItem]);

  const adHocSuggestions = useMemo(() => {
    const term = adHocName.trim().toLowerCase();
    if (!term) {
      return [];
    }
    return effectiveItems
      .filter((item) => {
        if (item.type !== "zukauf") {
          return false;
        }
        const nameMatch = item.name.toLowerCase().includes(term);
        const internalId = item.internalId;
        const internalIdString =
          internalId != null ? String(internalId) : "";
        const formattedInternalId =
          internalId != null ? `int-${internalId}`.toLowerCase() : "";
        const internalMatch =
          internalIdString.includes(term) ||
          formattedInternalId.includes(term);
        return nameMatch || internalMatch;
      })
      .slice(0, 5);
  }, [adHocName, effectiveItems]);

  const adHocExactMatchItem = useMemo(() => {
    const value = adHocName.trim().toLowerCase();
    if (!value) {
      return null;
    }
    for (const item of effectiveItems) {
      if (item.name.trim().toLowerCase() === value) {
        return item;
      }
    }
    return null;
  }, [adHocName, effectiveItems]);

  const ingredientTagOptions = useMemo(() => {
    if (!selectedItem || selectedItem.type !== "eigenproduktion") {
      return [];
    }
    const rootItem: InventoryItem = {
      ...selectedItem,
      components: isEditingComponents
        ? editingComponents
        : selectedItem.components,
    };
    const visited = new Set<string>();
    const items = new Map<string, { id: string; name: string }>();

    function visit(item: InventoryItem) {
      if (visited.has(item.id)) {
        return;
      }
      visited.add(item.id);
      const components = item.components ?? [];
      for (const component of components) {
        if (!component.itemId) {
          continue;
        }
        const child = itemsById.get(component.itemId);
        if (!child) {
          continue;
        }
        if (!items.has(child.id)) {
          items.set(child.id, { id: child.id, name: child.name });
        }
        if (child.components && child.components.length > 0) {
          visit(child);
        }
      }
    }

    visit(rootItem);

    return Array.from(items.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "de")
    );
  }, [
    editingComponents,
    isEditingComponents,
    itemsById,
    selectedItem,
  ]);

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

  function handleAddPreparationStep() {
    const id = createPreparationStepId();
    setPreparationStepsInput((steps) => [
      ...steps,
      {
        id,
        text: "",
        duration: null,
        imageUrl: null,
        videoUrl: null,
      },
    ]);
    setEditingStepId(id);
  }

  function handlePreparationStepTextChange(
    stepId: string,
    event: ChangeEvent<HTMLTextAreaElement>
  ) {
    const value = event.target.value;
    setPreparationStepsInput((steps) =>
      steps.map((step) =>
        step.id === stepId ? { ...step, text: value } : step
      )
    );
    const match = value.match(/@([^@\n]*)$/);
    if (match) {
      setActiveTagStepId(stepId);
      setTagSearch(match[1].trim().toLowerCase());
    } else if (activeTagStepId === stepId) {
      setActiveTagStepId(null);
      setTagSearch("");
    }
  }

  function handlePreparationStepDurationChange(
    stepId: string,
    event: ChangeEvent<HTMLInputElement>
  ) {
    const value = event.target.value;
    setPreparationStepsInput((steps) =>
      steps.map((step) =>
        step.id === stepId
          ? {
              ...step,
              duration: value.trim().length > 0 ? value : null,
            }
          : step
      )
    );
  }

  function handlePreparationStepImageUrlChange(
    stepId: string,
    event: ChangeEvent<HTMLInputElement>
  ) {
    const value = event.target.value;
    setPreparationStepsInput((steps) =>
      steps.map((step) =>
        step.id === stepId
          ? {
              ...step,
              imageUrl: value.trim().length > 0 ? value : null,
            }
          : step
      )
    );
  }

  function handlePreparationStepVideoUrlChange(
    stepId: string,
    event: ChangeEvent<HTMLInputElement>
  ) {
    const value = event.target.value;
    setPreparationStepsInput((steps) =>
      steps.map((step) =>
        step.id === stepId
          ? {
              ...step,
              videoUrl: value.trim().length > 0 ? value : null,
            }
          : step
      )
    );
  }

  function handleRemovePreparationStep(stepId: string) {
    setPreparationStepsInput((steps) => {
      const index = steps.findIndex((step) => step.id === stepId);
      const next = steps.filter((step) => step.id !== stepId);
      if (editingStepId === stepId) {
        const fallback =
          index > 0 ? next[index - 1]?.id ?? null : next[0]?.id ?? null;
        setEditingStepId(fallback ?? null);
      }
      return next;
    });
    if (activeTagStepId === stepId) {
      setActiveTagStepId(null);
      setTagSearch("");
    }
  }

  function handleInsertIngredientTag(stepId: string, ingredientName: string) {
    setPreparationStepsInput((steps) =>
      steps.map((step) => {
        if (step.id !== stepId) {
          return step;
        }
        const text = step.text ?? "";
        const newText = text.replace(/@([^@\n]*)$/, ingredientName);
        return {
          ...step,
          text: newText,
        };
      })
    );
    setActiveTagStepId(null);
    setTagSearch("");
  }

  async function handleGenerateStepImage(stepId: string) {
    const step = preparationStepsInput.find(
      (value) => value.id === stepId
    );
    if (!step || !step.text.trim()) {
      return;
    }
    try {
      setIsGeneratingImageStepId(stepId);
      setError(null);
      const response = await fetch("/api/step-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: step.text,
        }),
      });
      if (!response.ok) {
        let message = "Fehler bei der KI-Bildgenerierung.";
        try {
          const payload = (await response.json()) as {
            error?: unknown;
          };
          if (payload && typeof payload.error === "string") {
            message = payload.error;
          }
        } catch {
        }
        throw new Error(message);
      }
      const payload = (await response.json()) as {
        imageUrl?: string;
      };
      if (!payload.imageUrl) {
        throw new Error("Antwort enthielt keine Bild-URL.");
      }
      setPreparationStepsInput((steps) =>
        steps.map((value) =>
          value.id === stepId
            ? {
                ...value,
                imageUrl: payload.imageUrl ?? null,
              }
            : value
        )
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Fehler bei der KI-Bildgenerierung.";
      setError(message);
    } finally {
      setIsGeneratingImageStepId(null);
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

  async function handleAddAdHocComponent() {
    const trimmedName = adHocName.trim();
    if (!trimmedName) {
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const rawQuantity = adHocQuantity.trim();
      let quantityValue = 1;
      if (rawQuantity) {
        const parsedQuantity = Number(rawQuantity.replace(",", "."));
        if (Number.isFinite(parsedQuantity) && parsedQuantity > 0) {
          quantityValue = parsedQuantity;
        }
      }

      if (adHocSelectedItemId) {
        const selectedItemForAdHoc = itemsById.get(adHocSelectedItemId);
        const unit =
          selectedItemForAdHoc && selectedItemForAdHoc.unit
            ? selectedItemForAdHoc.unit
            : adHocUnit.trim();
        if (!unit) {
          setIsSaving(false);
          return;
        }
        setEditingComponents((previous) => [
          ...previous,
          {
            itemId: adHocSelectedItemId,
            quantity: quantityValue,
            unit,
          },
        ]);
        setAdHocQuantity("");
        setAdHocName("");
        setAdHocUnit("");
        setAdHocPrice("");
        setAdHocSelectedItemId(null);
        return;
      }

      const trimmedUnit = adHocUnit.trim();
      const trimmedPrice = adHocPrice.trim();

      if (!trimmedUnit || !trimmedPrice) {
        setError(
          "Bitte Einheit und EK-Preis für die neue Zutat ausfüllen."
        );
        setIsSaving(false);
        return;
      }

      const parsedPrice = Number(trimmedPrice.replace(",", "."));
      if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
        setError("EK-Preis muss eine positive Zahl sein.");
        setIsSaving(false);
        return;
      }

      const createResponse = await fetch("/api/inventory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          type: "zukauf" as InventoryType,
          unit: trimmedUnit,
          purchasePrice: parsedPrice,
          components: [],
        }),
      });

      if (!createResponse.ok) {
        let message = "Fehler beim Anlegen der Ad-hoc-Zutat.";
        try {
          const payload = (await createResponse.json()) as {
            error?: unknown;
          };
          if (payload && typeof payload.error === "string") {
            message = payload.error;
          }
        } catch {
        }
        throw new Error(message);
      }

      const createdAdHoc = (await createResponse.json()) as InventoryItem;

      setItems((previous) => [...previous, createdAdHoc]);

      setEditingComponents((previous) => [
        ...previous,
        {
          itemId: createdAdHoc.id,
          quantity: quantityValue,
          unit: createdAdHoc.unit,
        },
      ]);

      setAdHocQuantity("");
      setAdHocName("");
      setAdHocUnit("");
      setAdHocPrice("");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Fehler beim Hinzufügen der Ad-hoc-Zutat.";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveProfiData() {
    if (!selectedItem) {
      return;
    }
    try {
      setIsSaving(true);
      setError(null);
      const allergensArray = proAllergensInput
        .split(",")
        .map((value) => value.trim())
        .filter((value) => value.length > 0);
      const parsedTargetPortions = Number(
        targetPortionsInput.replace(",", ".")
      );
      const targetPortions =
        Number.isFinite(parsedTargetPortions) &&
        parsedTargetPortions > 0
          ? parsedTargetPortions
          : null;
      const parsedTargetSalesPrice = Number(
        targetSalesPriceInput.replace(",", ".")
      );
      const targetSalesPrice =
        Number.isFinite(parsedTargetSalesPrice) &&
        parsedTargetSalesPrice > 0
          ? parsedTargetSalesPrice
          : null;
      const nameValue =
        selectedItem.type === "eigenproduktion"
          ? nameInput.trim()
          : undefined;
      const categoryValue =
        selectedItem.type === "eigenproduktion"
          ? categoryInput.trim()
          : undefined;
      const portionUnitValue =
        selectedItem.type === "eigenproduktion"
          ? portionUnitInput.trim()
          : undefined;
      const nutritionTagsValue =
        selectedItem.type === "eigenproduktion"
          ? nutritionTagsInput
          : undefined;
      const imageUrlValue =
        selectedItem.type === "eigenproduktion"
          ? imageUrlInput.trim()
          : undefined;
      let parsedStandardPreparation: StandardPreparation | null =
        null;
      if (selectedItem.type === "zukauf") {
        const cleanedComponents = standardPreparationComponents
          .map((component) => ({
            name: String(component.name),
            quantity: Number(
              String(component.quantity).toString().replace(
                ",",
                "."
              )
            ),
            unit: String(component.unit),
          }))
          .filter(
            (component) =>
              component.name.trim().length > 0 &&
              Number.isFinite(component.quantity) &&
              component.quantity > 0 &&
              component.unit.trim().length > 0
          );
        if (cleanedComponents.length > 0) {
          parsedStandardPreparation = {
            components: cleanedComponents,
          };
        } else {
          parsedStandardPreparation = null;
        }
      }

      let preparationStepsValue: string | undefined;
      if (selectedItem.type === "eigenproduktion") {
        const cleanedSteps = preparationStepsInput
          .map((step) => {
            const text = step.text.trim();
            const duration =
              step.duration && step.duration.trim().length > 0
                ? step.duration.trim()
                : null;
            const imageUrl =
              step.imageUrl && step.imageUrl.trim().length > 0
                ? step.imageUrl.trim()
                : null;
            const videoUrl =
              step.videoUrl && step.videoUrl.trim().length > 0
                ? step.videoUrl.trim()
                : null;
            return {
              id: step.id,
              text,
              duration,
              imageUrl,
              videoUrl,
            };
          })
          .filter((step) => step.text.length > 0);
        preparationStepsValue =
          cleanedSteps.length > 0 ? JSON.stringify(cleanedSteps) : "";
      } else {
        preparationStepsValue = proPreparationInput.trim();
      }

      const response = await fetch("/api/item-details", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selectedItem.id,
          name: nameValue,
          manufacturerArticleNumber: manufacturerInput.trim(),
          allergens: allergensArray,
          ingredients: proIngredientsInput.trim(),
          dosageInstructions: proDosageInput.trim(),
          yieldInfo: proYieldInput.trim(),
          preparationSteps: preparationStepsValue,
          targetPortions,
          targetSalesPrice,
          category: categoryValue,
          portionUnit: portionUnitValue,
          nutritionTags: nutritionTagsValue,
          standardPreparation:
            selectedItem.type === "zukauf"
              ? parsedStandardPreparation
              : undefined,
          isBio: isBioInput,
          isDeklarationsfrei: isDeklarationsfreiInput,
          isAllergenfrei: isAllergenfreiInput,
          isCookChill: isCookChillInput,
          isFreezeThawStable: isFreezeThawStableInput,
          isPalmOilFree: isPalmOilFreeInput,
          isYeastFree: isYeastFreeInput,
          isLactoseFree: isLactoseFreeInput,
          isGlutenFree: isGlutenFreeInput,
          imageUrl: imageUrlValue,
        }),
      });
      const payload = (await response.json()) as {
        error?: unknown;
        item?: InventoryItem;
      };
      if (!response.ok) {
        let message = "Fehler beim Speichern der Profi-Daten.";
        if (payload && typeof payload.error === "string") {
          message = payload.error;
        }
        throw new Error(message);
      }
      if (payload.item) {
        const updated = payload.item;
        setItems((previous) =>
          previous.map((item) => {
            if (item.id !== updated.id) {
              return item;
            }
            const merged: InventoryItem = {
              ...item,
              ...updated,
            };
            if (!updated.components && item.components) {
              merged.components = item.components;
            }
            if (
              updated.hasGhostComponents === undefined &&
              (item as InventoryItem & {
                hasGhostComponents?: boolean;
              }).hasGhostComponents
            ) {
              merged.hasGhostComponents = (
                item as InventoryItem & {
                  hasGhostComponents?: boolean;
                }
              ).hasGhostComponents;
            }
            return merged;
          })
        );
      }
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : "Fehler beim Speichern der Profi-Daten.";
      setError(message);
    } finally {
      setIsSaving(false);
      setEditingStepId(null);
    }
  }

  async function handleRecipeImageUpload(file: File) {
    if (!selectedItem || selectedItem.type !== "eigenproduktion") {
      return;
    }
    try {
      setImageIsUploading(true);
      setImageUploadError(null);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("itemId", selectedItem.id);
      const response = await fetch("/api/recipe-image-upload", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as {
        error?: unknown;
        imageUrl?: string;
        code?: string;
      };
      if (!response.ok) {
        let message = "Fehler beim Hochladen des Rezeptbilds.";
        if (payload && payload.code === "BUCKET_NOT_FOUND") {
          message =
            'Admin-Aktion erforderlich: Bitte in Supabase den Storage-Bucket "recipe-images" anlegen.';
        } else if (payload && typeof payload.error === "string") {
          message = payload.error;
        }
        throw new Error(message);
      }
      if (payload.imageUrl) {
        setImageUrlInput(payload.imageUrl);
        setItems((previous) =>
          previous.map((item) =>
            item.id === selectedItem.id
              ? {
                  ...item,
                  imageUrl: payload.imageUrl ?? null,
                }
              : item
          )
        );
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Fehler beim Hochladen des Rezeptbilds.";
      setImageUploadError(message);
    } finally {
      setImageIsUploading(false);
    }
  }

  async function handleRecipeImageUrlSave() {
    if (!selectedItem || selectedItem.type !== "eigenproduktion") {
      return;
    }
    const trimmed = imageUrlInput.trim();
    try {
      setImageIsUploading(true);
      setImageUploadError(null);
      const response = await fetch("/api/item-details", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selectedItem.id,
          imageUrl: trimmed,
        }),
      });
      const payload = (await response.json()) as {
        error?: unknown;
        item?: InventoryItem;
      };
      if (!response.ok) {
        let message = "Fehler beim Speichern des Bild-Links.";
        if (payload && typeof payload.error === "string") {
          message = payload.error;
        }
        throw new Error(message);
      }
      if (payload.item) {
        const updated = payload.item;
        setItems((previous) =>
          previous.map((item) =>
            item.id === updated.id ? { ...item, ...updated } : item
          )
        );
      } else {
        setItems((previous) =>
          previous.map((item) =>
            item.id === selectedItem.id
              ? {
                  ...item,
                  imageUrl: trimmed.length > 0 ? trimmed : null,
                }
              : item
          )
        );
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Fehler beim Speichern des Bild-Links.";
      setImageUploadError(message);
    } finally {
      setImageIsUploading(false);
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
        standardPreparation?: StandardPreparation | null;
        preparationText?: string | null;
      };
      setAiParsed({
        name: data.name,
        unit: data.unit,
        quantity: data.quantity,
        purchasePrice: data.purchase_price,
        calculatedPricePerUnit: data.calculated_price_per_unit,
        standardPreparation: data.standardPreparation ?? null,
        preparationText: data.preparationText ?? null,
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
          standardPreparation: aiParsed.standardPreparation ?? null,
          preparationSteps: aiParsed.preparationText ?? null,
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

  async function handleCreateRecipe() {
    try {
      setIsSaving(true);
      setError(null);
      const response = await fetch("/api/inventory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Neues Rezept",
          type: "eigenproduktion" as InventoryType,
          unit: "Portion",
          purchasePrice: 0,
          components: [],
        }),
      });
      if (!response.ok) {
        let message = "Fehler beim Anlegen des Rezepts.";
        try {
          const payload = (await response.json()) as {
            error?: unknown;
          };
          if (payload && typeof payload.error === "string") {
            message = payload.error;
          }
        } catch {
        }
        throw new Error(message);
      }
      const created = (await response.json()) as InventoryItem;
      setItems((previous) => [...previous, created]);
      setActiveSection("rezepte");
      setSelectedItemId(created.id);
      setIsDetailView(true);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Fehler beim Anlegen des Rezepts.";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }

  function formatInternalId(value?: number | null) {
    if (!value || Number.isNaN(value)) {
      return "—";
    }
    return `INT-${value}`;
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-background to-muted px-4 py-6 text-foreground md:px-8 md:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Inventory Manager
            </h1>
            <p className="text-sm text-muted-foreground md:text-base">
              Verwalte Zukaufartikel und Eigenproduktionen mit verschachtelten
              Komponenten.
            </p>
          </div>
          <div className="flex flex-col gap-2 md:w-[28rem]">
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-md border bg-card p-1 text-[11px]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveSection("dashboard")}
                  className={cn(
                    "h-7 rounded-md px-2",
                    activeSection === "dashboard" &&
                      "bg-primary text-primary-foreground"
                  )}
                >
                  Dashboard
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveSection("zutaten")}
                  className={cn(
                    "h-7 rounded-md px-2",
                    activeSection === "zutaten" &&
                      "bg-primary text-primary-foreground"
                  )}
                >
                  Zutaten & Lager
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveSection("rezepte")}
                  className={cn(
                    "h-7 rounded-md px-2",
                    activeSection === "rezepte" &&
                      "bg-primary text-primary-foreground"
                  )}
                >
                  Rezepte & Produktion
                </Button>
              </div>
              <Button
                type="button"
                size="sm"
                className="bg-primary text-primary-foreground"
                disabled={isSaving}
                onClick={handleCreateRecipe}
              >
                {isSaving ? "Erstelle..." : "Neues Rezept erstellen"}
              </Button>
            </div>
            <Input
              placeholder="Global nach Artikeln und Rezepten suchen"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-9 text-sm"
            />
          </div>
        </header>

        <main
          className={cn(
            "grid gap-4",
            !isDetailView &&
              "md:grid-cols-[minmax(0,1.4fr)_minmax(0,1.8fr)]"
          )}
        >
          {activeSection === "dashboard" && !isDetailView && (
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle>Dashboard</CardTitle>
                <CardDescription>
                  Überblick über zuletzt bearbeitete Rezepte.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {recentRecipes.length === 0 && (
                  <div className="rounded-md border border-dashed bg-muted/40 px-3 py-6 text-center text-xs text-muted-foreground">
                    Es wurden noch keine Rezepte angelegt.
                  </div>
                )}
                {recentRecipes.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">
                      Letzte 5 Rezepte
                    </div>
                    <div className="space-y-1">
                      {recentRecipes.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setSelectedItemId(item.id);
                            setIsDetailView(true);
                          }}
                          className={cn(
                            "flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-xs transition-colors hover:bg-accent hover:text-accent-foreground",
                            selectedItem?.id === item.id &&
                              "border-primary bg-primary/5"
                          )}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {item.name}
                              </span>
                              <TypeBadge type={item.type} />
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              Einheit: {item.unit}
                            </div>
                          </div>
                          <div className="text-right text-[11px] text-muted-foreground">
                            <div>
                              Intern: {formatInternalId(item.internalId ?? null)}
                            </div>
                            <div>
                              EK: {item.purchasePrice.toFixed(2)} €
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          {activeSection !== "dashboard" && !isDetailView && (
            <Card className="flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle>Artikelübersicht</CardTitle>
                  <CardDescription>
                    Filtere nach Typ und wähle einen Artikel aus.
                  </CardDescription>
                </div>
                {activeSection === "rezepte" && (
                  <div className="inline-flex rounded-md border bg-muted/40 p-1 text-[11px]">
                    <Button
                      type="button"
                      variant={recipeViewMode === "list" ? "default" : "outline"}
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => setRecipeViewMode("list")}
                    >
                      List View
                    </Button>
                    <Button
                      type="button"
                      variant={recipeViewMode === "grid" ? "default" : "outline"}
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => setRecipeViewMode("grid")}
                    >
                      Grid View
                    </Button>
                    <Button
                      type="button"
                      variant={
                        recipeViewMode === "detailed" ? "default" : "outline"
                      }
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => setRecipeViewMode("detailed")}
                    >
                      Detailed List
                    </Button>
                  </div>
                )}
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
                            ingredients?: string | null;
                            dosage_instructions?: string | null;
                            yield_info?: string | null;
                            preparation_steps?: string | null;
                            is_bio?: boolean;
                            is_deklarationsfrei?: boolean;
                            is_allergenfrei?: boolean;
                            is_cook_chill?: boolean;
                            is_freeze_thaw_stable?: boolean;
                            is_palm_oil_free?: boolean;
                            is_yeast_free?: boolean;
                            is_lactose_free?: boolean;
                            is_gluten_free?: boolean;
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
                          const created = payload.item as InventoryItem;
                          const enriched: InventoryItem = {
                            ...created,
                            allergens:
                              (payload.extracted &&
                                Array.isArray(
                                  payload.extracted.allergens
                                ) &&
                                payload.extracted.allergens.length > 0
                                ? payload.extracted.allergens
                                : created.allergens) ?? [],
                            ingredients:
                              (payload.extracted &&
                                typeof payload.extracted.ingredients ===
                                  "string"
                                ? payload.extracted.ingredients
                                : created.ingredients) ?? null,
                            dosageInstructions:
                              (payload.extracted &&
                                typeof payload.extracted
                                  .dosage_instructions === "string"
                                ? payload.extracted.dosage_instructions
                                : created.dosageInstructions) ?? null,
                            yieldInfo:
                              (payload.extracted &&
                                typeof payload.extracted.yield_info ===
                                  "string"
                                ? payload.extracted.yield_info
                                : created.yieldInfo) ?? null,
                            preparationSteps:
                              (payload.extracted &&
                                typeof payload.extracted
                                  .preparation_steps === "string"
                                ? payload.extracted.preparation_steps
                                : created.preparationSteps) ?? null,
                          };
                          setItems((previous) => [
                            ...previous,
                            enriched,
                          ]);
                          setSelectedItemId(enriched.id);
                        }
                        if (payload.extracted && payload.fileUrl) {
                          setDocParsed({
                            name: payload.extracted.name,
                            unit: payload.extracted.unit,
                            purchasePrice:
                              payload.extracted.purchase_price,
                            allergens: payload.extracted.allergens,
                            fileUrl: payload.fileUrl,
                            ingredients:
                              typeof payload.extracted.ingredients === "string"
                                ? payload.extracted.ingredients
                                : null,
                            dosageInstructions:
                              typeof payload.extracted
                                .dosage_instructions === "string"
                                ? payload.extracted.dosage_instructions
                                : null,
                            yieldInfo:
                              typeof payload.extracted.yield_info === "string"
                                ? payload.extracted.yield_info
                                : null,
                            preparationText:
                              typeof payload.extracted.preparation_steps ===
                              "string"
                                ? payload.extracted.preparation_steps
                                : null,
                            isBio: payload.extracted.is_bio ?? false,
                            isDeklarationsfrei:
                              payload.extracted.is_deklarationsfrei ?? false,
                            isAllergenfrei:
                              payload.extracted.is_allergenfrei ?? false,
                            isCookChill:
                              payload.extracted.is_cook_chill ?? false,
                            isFreezeThawStable:
                              payload.extracted.is_freeze_thaw_stable ?? false,
                            isPalmOilFree:
                              payload.extracted.is_palm_oil_free ?? false,
                            isYeastFree:
                              payload.extracted.is_yeast_free ?? false,
                            isLactoseFree:
                              payload.extracted.is_lactose_free ?? false,
                            isGlutenFree:
                              payload.extracted.is_gluten_free ?? false,
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
                    <div className="space-y-2 rounded-md border bg-background px-3 py-2 text-[11px]">
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
                      {(docParsed.isBio ||
                        docParsed.isDeklarationsfrei ||
                        docParsed.isAllergenfrei ||
                        docParsed.isCookChill ||
                        docParsed.isFreezeThawStable ||
                        docParsed.isPalmOilFree ||
                        docParsed.isYeastFree ||
                        docParsed.isLactoseFree ||
                        docParsed.isGlutenFree) && (
                        <div className="space-y-1">
                          <div className="text-muted-foreground">
                            Eigenschaften
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {docParsed.isBio && (
                              <Badge className="bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-emerald-50">
                                BIO
                              </Badge>
                            )}
                            {docParsed.isDeklarationsfrei && (
                              <Badge className="px-2 py-0.5 text-[10px]">
                                deklarationsfrei
                              </Badge>
                            )}
                            {docParsed.isAllergenfrei && (
                              <Badge className="px-2 py-0.5 text-[10px]">
                                allergenfrei
                              </Badge>
                            )}
                            {docParsed.isCookChill && (
                              <Badge className="px-2 py-0.5 text-[10px]">
                                cook &amp; chill
                              </Badge>
                            )}
                            {docParsed.isFreezeThawStable && (
                              <Badge className="px-2 py-0.5 text-[10px]">
                                freeze/thaw-stable
                              </Badge>
                            )}
                            {docParsed.isPalmOilFree && (
                              <Badge className="px-2 py-0.5 text-[10px]">
                                palmöl-frei
                              </Badge>
                            )}
                            {docParsed.isYeastFree && (
                              <Badge className="px-2 py-0.5 text-[10px]">
                                hefefrei
                              </Badge>
                            )}
                            {docParsed.isLactoseFree && (
                              <Badge className="px-2 py-0.5 text-[10px]">
                                laktosefrei
                              </Badge>
                            )}
                            {docParsed.isGlutenFree && (
                              <Badge className="px-2 py-0.5 text-[10px]">
                                glutenfrei
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
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
                      {docMatch && (
                        <div className="mt-2 rounded-md border bg-muted/40 px-2 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="space-y-0.5">
                              <div className="text-[11px] font-semibold">
                                Möglicher bestehender Artikel
                              </div>
                              <div className="text-[11px]">
                                {docMatch.name}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                Einheit: {docMatch.unit} · EK:{" "}
                                {docMatch.purchasePrice.toFixed(2)} €
                              </div>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-[11px]"
                              onClick={() => {
                                setSelectedItemId(docMatch.id);
                                setIsDetailView(true);
                              }}
                            >
                              Artikel öffnen
                            </Button>
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
                      disabled={
                        isSaving || !newItemName.trim() || !newItemUnit.trim()
                      }
                    >
                      {isSaving ? "Speichern..." : "Anlegen"}
                    </Button>
                  </div>
                </form>
                <div className="flex gap-3">
                  {activeSection === "rezepte" && (
                    <div
                      className={cn(
                        "w-52 shrink-0 rounded-md border bg-card/80 p-3 text-[11px] transition-all",
                        !isRecipeSidebarOpen && "w-10 px-2"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "font-semibold",
                            !isRecipeSidebarOpen && "truncate"
                          )}
                        >
                          Filter
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-[10px]"
                          onClick={() =>
                            setIsRecipeSidebarOpen((current) => !current)
                          }
                        >
                          {isRecipeSidebarOpen ? "–" : "+"}
                        </Button>
                      </div>
                      {isRecipeSidebarOpen && (
                        <div className="mt-2 space-y-3">
                          <div className="space-y-1">
                            <div className="text-[10px] text-muted-foreground">
                              Kategorien
                            </div>
                            <div className="flex flex-wrap gap-1">
                              <button
                                type="button"
                                onClick={() => setRecipeCategoryFilter(null)}
                                className={cn(
                                  "rounded-full border px-2 py-0.5 text-[10px]",
                                  !recipeCategoryFilter
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-muted-foreground/40 text-muted-foreground"
                                )}
                              >
                                Alle
                              </button>
                              {recipeCategories.map((category) => (
                                <button
                                  key={category}
                                  type="button"
                                  onClick={() =>
                                    setRecipeCategoryFilter(category)
                                  }
                                  className={cn(
                                    "rounded-full border px-2 py-0.5 text-[10px]",
                                    recipeCategoryFilter === category
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-muted-foreground/40 text-muted-foreground"
                                  )}
                                >
                                  {category}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-[10px] text-muted-foreground">
                              Profi-Eigenschaften
                            </div>
                            <div className="flex flex-wrap gap-1">
                              <button
                                type="button"
                                onClick={() => setRecipeProFilter(null)}
                                className={cn(
                                  "rounded-full border px-2 py-0.5 text-[10px]",
                                  !recipeProFilter
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-muted-foreground/40 text-muted-foreground"
                                )}
                              >
                                Alle
                              </button>
                              <button
                                type="button"
                                onClick={() => setRecipeProFilter("bio")}
                                className={cn(
                                  "rounded-full border px-2 py-0.5 text-[10px]",
                                  recipeProFilter === "bio"
                                    ? "border-emerald-600 bg-emerald-600 text-emerald-50"
                                    : "border-muted-foreground/40 text-muted-foreground"
                                )}
                              >
                                BIO
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setRecipeProFilter("deklarationsfrei")
                                }
                                className={cn(
                                  "rounded-full border px-2 py-0.5 text-[10px]",
                                  recipeProFilter === "deklarationsfrei"
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-muted-foreground/40 text-muted-foreground"
                                )}
                              >
                                deklarationsfrei
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setRecipeProFilter("allergenfrei")
                                }
                                className={cn(
                                  "rounded-full border px-2 py-0.5 text-[10px]",
                                  recipeProFilter === "allergenfrei"
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-muted-foreground/40 text-muted-foreground"
                                )}
                              >
                                allergenfrei
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setRecipeProFilter("glutenfrei")
                                }
                                className={cn(
                                  "rounded-full border px-2 py-0.5 text-[10px]",
                                  recipeProFilter === "glutenfrei"
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-muted-foreground/40 text-muted-foreground"
                                )}
                              >
                                glutenfrei
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setRecipeProFilter("laktosefrei")
                                }
                                className={cn(
                                  "rounded-full border px-2 py-0.5 text-[10px]",
                                  recipeProFilter === "laktosefrei"
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-muted-foreground/40 text-muted-foreground"
                                )}
                              >
                                laktosefrei
                              </button>
                              <button
                                type="button"
                                onClick={() => setRecipeProFilter("hefefrei")}
                                className={cn(
                                  "rounded-full border px-2 py-0.5 text-[10px]",
                                  recipeProFilter === "hefefrei"
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-muted-foreground/40 text-muted-foreground"
                                )}
                              >
                                hefefrei
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setRecipeProFilter("palmoelfrei")
                                }
                                className={cn(
                                  "rounded-full border px-2 py-0.5 text-[10px]",
                                  recipeProFilter === "palmoelfrei"
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-muted-foreground/40 text-muted-foreground"
                                )}
                              >
                                palmöl-frei
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="max-h-[480px] flex-1 space-y-1 overflow-y-auto pr-1">
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
                    {activeSection === "rezepte" &&
                      recipeViewMode === "grid" && (
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {filteredItems.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                setSelectedItemId(item.id);
                                setIsDetailView(true);
                              }}
                              className={cn(
                                "group relative overflow-hidden rounded-md border bg-background text-left text-xs shadow-sm transition-colors hover:border-primary",
                                selectedItem?.id === item.id &&
                                  "border-primary ring-1 ring-primary"
                              )}
                            >
                              <div className="relative aspect-[4/3] w-full overflow-hidden">
                                {item.imageUrl ? (
                                  <img
                                    src={item.imageUrl}
                                    alt={item.name}
                                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                                  />
                                ) : (
                                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-muted/60 text-[11px] text-muted-foreground">
                                    <ImageIcon className="h-5 w-5" />
                                    <span>Kein Bild hinterlegt</span>
                                  </div>
                                )}
                                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/40 to-transparent px-2 pb-2 pt-6">
                                  <div className="flex items-end justify-between gap-2">
                                    <div className="space-y-0.5">
                                      <div className="line-clamp-2 text-xs font-semibold text-white sm:text-sm">
                                        {item.name}
                                      </div>
                                      {item.category && (
                                        <div className="text-[10px] text-white/80">
                                          {item.category}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                      <TypeBadge type={item.type} />
                                      {item.isBio && (
                                        <Badge className="bg-emerald-600 px-2 py-0.5 text-[9px] font-semibold text-emerald-50">
                                          BIO
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    {!(activeSection === "rezepte" && recipeViewMode === "grid") &&
                      filteredItems.map((item) => {
                        const isRecipeDetailed =
                          activeSection === "rezepte" &&
                          recipeViewMode === "detailed";
                        if (isRecipeDetailed && item.type === "eigenproduktion") {
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                setSelectedItemId(item.id);
                                setIsDetailView(true);
                              }}
                              className={cn(
                                "flex w-full items-stretch gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                                selectedItem?.id === item.id &&
                                  "border-primary bg-primary/5"
                              )}
                            >
                              <div className="flex-1 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-medium">
                                    {item.name}
                                  </span>
                                  <TypeBadge type={item.type} />
                                  {item.isBio && (
                                    <Badge className="bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-emerald-50">
                                      BIO
                                    </Badge>
                                  )}
                                  {item.hasGhostComponents && (
                                    <AlertTriangle className="h-3 w-3 text-red-500" />
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                                  <div>
                                    Intern:{" "}
                                    <span className="font-medium">
                                      {formatInternalId(item.internalId ?? null)}
                                    </span>
                                  </div>
                                  {item.category && (
                                    <div>Kategorie: {item.category}</div>
                                  )}
                                  <div>Einheit: {item.unit}</div>
                                  {item.components && (
                                    <div>
                                      {item.components.length} Komponenten
                                    </div>
                                  )}
                                </div>
                                <div className="space-y-0.5 text-[11px] text-muted-foreground">
                                  <div>
                                    Hersteller-Art.-Nr.:{" "}
                                    {item.manufacturerArticleNumber &&
                                    item.manufacturerArticleNumber
                                      .trim()
                                      .length > 0
                                      ? item.manufacturerArticleNumber
                                      : "—"}
                                  </div>
                                  <div>
                                    EAN:{" "}
                                    {item.ean && item.ean.trim().length > 0
                                      ? item.ean
                                      : "—"}
                                  </div>
                                </div>
                                {item.allergens &&
                                  item.allergens.length > 0 && (
                                    <div className="flex flex-wrap gap-1 text-[10px]">
                                      {item.allergens.map((allergen) => (
                                        <span
                                          key={`${item.id}-${allergen}`}
                                          className="rounded-md bg-amber-100 px-2 py-0.5 text-amber-900"
                                        >
                                          {allergen}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                              </div>
                            </button>
                          );
                        }
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setSelectedItemId(item.id);
                              setIsDetailView(true);
                            }}
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
                                {item.type === "eigenproduktion" &&
                                  item.hasGhostComponents && (
                                    <AlertTriangle className="h-3 w-3 text-red-500" />
                                  )}
                              </div>
                              <div className="space-y-0.5 text-[11px] text-muted-foreground">
                                <div>
                                  Intern:{" "}
                                  {formatInternalId(item.internalId ?? null)}
                                </div>
                                <div>
                                  Hersteller-Art.-Nr.:{" "}
                                  {item.manufacturerArticleNumber &&
                                  item.manufacturerArticleNumber
                                    .trim()
                                    .length > 0
                                    ? item.manufacturerArticleNumber
                                    : "—"}
                                </div>
                                <div>
                                  EAN:{" "}
                                  {item.ean && item.ean.trim().length > 0
                                    ? item.ean
                                    : "—"}
                                </div>
                              </div>
                              {item.allergens && item.allergens.length > 0 && (
                                <div className="flex flex-wrap gap-1 text-[10px]">
                                  {item.allergens.map((allergen) => (
                                    <span
                                      key={`${item.id}-${allergen}`}
                                      className="rounded-md bg-amber-100 px-2 py-0.5 text-amber-900"
                                    >
                                      {allergen}
                                    </span>
                                  ))}
                                </div>
                              )}
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
                        );
                      })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {isDetailView && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsDetailView(false);
                    }}
                  >
                    Zurück zur Übersicht
                  </Button>
                )}
                <div>
                  <CardTitle>Artikeldetails</CardTitle>
                  <CardDescription>
                    Sieh dir Struktur und Komponenten der ausgewählten Position an.
                  </CardDescription>
                </div>
              </div>
              {selectedItem && selectedItem.type === "eigenproduktion" && (
                <div className="flex items-center gap-2">
                  <div className="inline-flex rounded-md border bg-muted/40 p-1 text-[11px]">
                    <Button
                      type="button"
                      variant={
                        isRecipePresentationMode ? "outline" : "default"
                      }
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => setIsRecipePresentationMode(false)}
                    >
                      Bearbeiten
                    </Button>
                    <Button
                      type="button"
                      variant={
                        isRecipePresentationMode ? "default" : "outline"
                      }
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => setIsRecipePresentationMode(true)}
                    >
                      Präsentation
                    </Button>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="bg-emerald-600 px-3 py-1 text-[11px] font-medium text-emerald-50 hover:bg-emerald-700"
                    disabled={isSaving}
                    onClick={async () => {
                      await handleSaveProfiData();
                      if (isEditingComponents) {
                        await handleSaveComponents();
                      }
                    }}
                  >
                    {isSaving ? "Speichere..." : "Rezept fertigstellen"}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4">
              {!selectedItem && (
                <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                  Wähle links einen Artikel aus, um Details zu sehen.
                </div>
              )}
              {selectedItem &&
                selectedItem.type === "eigenproduktion" &&
                isRecipePresentationMode && (
                    <div className="space-y-6 text-xs">
                    <div className="flex flex-col gap-6 lg:flex-row">
                      <div className="w-full max-w-md lg:max-w-sm">
                        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-black/5">
                          {selectedItem.imageUrl ? (
                            <img
                              src={selectedItem.imageUrl}
                              alt={selectedItem.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-muted/40 text-[11px] text-muted-foreground">
                              <ImageIcon className="h-6 w-6" />
                              <span>Kein Rezeptbild hinterlegt</span>
                              <span className="text-[10px]">
                                Bild im Bearbeiten-Modus oben links hinzufügen.
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 space-y-4">
                        <div className="sticky top-0 z-20 bg-background/95 pb-2 backdrop-blur">
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap items-center gap-3">
                              <h2 className="text-xl font-semibold tracking-tight">
                                {selectedItem.name}
                              </h2>
                              <TypeBadge type={selectedItem.type} />
                              {selectedItem.isBio && (
                                <Badge className="bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-50">
                                  BIO
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
                              {selectedItem.category && (
                                <div className="uppercase tracking-wide">
                                  {selectedItem.category}
                                </div>
                              )}
                              {selectedItem.targetPortions != null &&
                                Number.isFinite(selectedItem.targetPortions) &&
                                selectedItem.targetPortions > 0 &&
                                selectedItem.portionUnit && (
                                  <div>
                                    {selectedItem.targetPortions}{" "}
                                    {selectedItem.portionUnit}
                                  </div>
                                )}
                              <div>
                                Intern:{" "}
                                <span className="font-medium">
                                  {formatInternalId(
                                    selectedItem.internalId ?? null
                                  )}
                                </span>
                              </div>
                            </div>
                            {(selectedItem.isDeklarationsfrei ||
                              selectedItem.isAllergenfrei ||
                              selectedItem.isCookChill ||
                              selectedItem.isFreezeThawStable ||
                              selectedItem.isPalmOilFree ||
                              selectedItem.isYeastFree ||
                              selectedItem.isLactoseFree ||
                              selectedItem.isGlutenFree) && (
                              <div className="flex flex-wrap gap-1 text-[10px]">
                                {selectedItem.isDeklarationsfrei && (
                                  <Badge className="px-2 py-0.5">
                                    deklarationsfrei
                                  </Badge>
                                )}
                                {selectedItem.isAllergenfrei && (
                                  <Badge className="px-2 py-0.5">
                                    allergenfrei
                                  </Badge>
                                )}
                                {selectedItem.isCookChill && (
                                  <Badge className="px-2 py-0.5">
                                    cook &amp; chill
                                  </Badge>
                                )}
                                {selectedItem.isFreezeThawStable && (
                                  <Badge className="px-2 py-0.5">
                                    freeze/thaw-stable
                                  </Badge>
                                )}
                                {selectedItem.isPalmOilFree && (
                                  <Badge className="px-2 py-0.5">
                                    palmöl-frei
                                  </Badge>
                                )}
                                {selectedItem.isYeastFree && (
                                  <Badge className="px-2 py-0.5">
                                    hefefrei
                                  </Badge>
                                )}
                                {selectedItem.isLactoseFree && (
                                  <Badge className="px-2 py-0.5">
                                    laktosefrei
                                  </Badge>
                                )}
                                {selectedItem.isGlutenFree && (
                                  <Badge className="px-2 py-0.5">
                                    glutenfrei
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        {recipeCalculation && (
                          <div className="grid gap-2 text-[11px] text-muted-foreground">
                            <div className="flex justify-between gap-2">
                              <span>Gesamtkosten Rezept</span>
                              <span className="font-medium text-foreground">
                                {recipeCalculation.totalCost.toFixed(2)} €
                              </span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span>Kosten pro Portion</span>
                              <span className="font-medium text-foreground">
                                {recipeCalculation.costPerPortion != null
                                  ? `${recipeCalculation.costPerPortion.toFixed(
                                      2
                                    )} €`
                                  : "—"}
                              </span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span>Marge pro Portion</span>
                              <span className="font-medium text-foreground">
                                {recipeCalculation.marginPerPortion != null
                                  ? `${recipeCalculation.marginPerPortion.toFixed(
                                      2
                                    )} €`
                                  : "—"}
                              </span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span>Wareneinsatz</span>
                              <span className="font-medium text-foreground">
                                {recipeCalculation.goodsSharePercent != null
                                  ? `${recipeCalculation.goodsSharePercent.toFixed(
                                      1
                                    )} %`
                                  : "—"}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    {selectedItem.components &&
                      selectedItem.components.length > 0 && (
                        <div className="space-y-2">
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Zutatenstruktur
                          </h3>
                          <ComponentTree
                            rootItem={selectedItem}
                            itemsById={itemsById}
                            onSelectItem={setSpecItem}
                          />
                        </div>
                      )}
                    {preparationStepsInput.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Zubereitung
                        </h3>
                        <div className="space-y-1">
                          {preparationStepsInput.map((step, index) => (
                            <div
                              key={step.id}
                              className="flex gap-2"
                            >
                              <span className="mt-[1px] text-[10px] font-semibold text-muted-foreground">
                                {index + 1}.
                              </span>
                              <div className="space-y-1">
                                <div className="text-[1.1rem] leading-[1.6]">
                                  {renderTaggedText(
                                    step.text,
                                    ingredientTagOptions
                                  )}
                                </div>
                                {step.duration && (
                                  <div className="text-[10px] text-muted-foreground">
                                    Dauer: {step.duration}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {nutritionSummary && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Nährwerte
                          </h3>
                          {nutritionSummary.hasMissingData && (
                            <span className="text-[11px] text-muted-foreground">
                              unvollständige Daten
                            </span>
                          )}
                        </div>
                        {nutritionSummary.perRecipe ? (
                          <div className="grid gap-1 text-[11px] md:grid-cols-2">
                            <div className="flex justify-between gap-2">
                              <span className="text-muted-foreground">
                                Energie gesamt (Rezept)
                              </span>
                              <span className="font-medium">
                                {nutritionSummary.perRecipe.energyKcal.toFixed(
                                  0
                                )}{" "}
                                kcal
                              </span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-muted-foreground">
                                Fett gesamt (Rezept)
                              </span>
                              <span className="font-medium">
                                {nutritionSummary.perRecipe.fat.toFixed(1)} g
                              </span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-muted-foreground">
                                Kohlenhydrate gesamt (Rezept)
                              </span>
                              <span className="font-medium">
                                {nutritionSummary.perRecipe.carbs.toFixed(1)} g
                              </span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-muted-foreground">
                                Eiweiß gesamt (Rezept)
                              </span>
                              <span className="font-medium">
                                {nutritionSummary.perRecipe.protein.toFixed(1)}{" "}
                                g
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-[11px] text-muted-foreground">
                            Noch keine Nährwertdaten für die Zutaten hinterlegt.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              {selectedItem &&
                !(selectedItem.type === "eigenproduktion" &&
                  isRecipePresentationMode) && (
                  <>
                    {selectedItem.type === "eigenproduktion" && (
                      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start">
                        <div className="w-full max-w-xs sm:max-w-sm">
                          <div
                            className={cn(
                              "relative flex h-[300px] w-full items-center justify-center overflow-hidden rounded-md border border-dashed bg-muted/40 text-[11px] transition-colors",
                              isImageDropActive &&
                                "border-primary bg-primary/5",
                              imageIsUploading && "opacity-80"
                            )}
                            onDragOver={(event) => {
                              event.preventDefault();
                              setIsImageDropActive(true);
                            }}
                            onDragLeave={(event) => {
                              event.preventDefault();
                              setIsImageDropActive(false);
                            }}
                            onDrop={(event) => {
                              event.preventDefault();
                              setIsImageDropActive(false);
                              const file =
                                event.dataTransfer.files &&
                                event.dataTransfer.files[0]
                                  ? event.dataTransfer.files[0]
                                  : null;
                              if (!file) {
                                return;
                              }
                              if (!file.type.startsWith("image/")) {
                                setImageUploadError(
                                  "Bitte nur Bilddateien (JPG, PNG, GIF) verwenden."
                                );
                                return;
                              }
                              void handleRecipeImageUpload(file);
                            }}
                            onClick={() => {
                              if (imageIsUploading) {
                                return;
                              }
                              const input = document.getElementById(
                                "recipe-image-file-input"
                              ) as HTMLInputElement | null;
                              if (input) {
                                input.click();
                              }
                            }}
                          >
                            {(imageUrlInput || selectedItem.imageUrl) && (
                              <img
                                src={imageUrlInput || selectedItem.imageUrl || ""}
                                alt={selectedItem.name}
                                className="absolute inset-0 h-full w-full object-cover"
                              />
                            )}
                            {(!imageUrlInput && !selectedItem.imageUrl) ||
                            imageIsUploading ? (
                              <div className="relative z-10 flex flex-col items-center justify-center gap-2 rounded-md bg-background/70 px-3 py-3 text-center">
                                {imageIsUploading ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Bild wird hochgeladen ...</span>
                                  </>
                                ) : (
                                  <>
                                    <ImageIcon className="h-5 w-5" />
                                    <span>
                                      Bild hierher ziehen oder klicken, um ein Bild
                                      auszuwählen
                                    </span>
                                  </>
                                )}
                              </div>
                            ) : null}
                          </div>
                          <input
                            id="recipe-image-file-input"
                            type="file"
                            accept="image/*"
                            className="mt-2 block w-full text-[11px] text-foreground file:mr-2 file:rounded-md file:border file:border-input file:bg-background file:px-2 file:py-1 file:text-[11px] file:font-medium file:text-foreground hover:file:bg-accent"
                            onChange={(event) => {
                              const file =
                                event.target.files &&
                                event.target.files[0]
                                  ? event.target.files[0]
                                  : null;
                              if (!file) {
                                return;
                              }
                              if (!file.type.startsWith("image/")) {
                                setImageUploadError(
                                  "Bitte nur Bilddateien (JPG, PNG, GIF) verwenden."
                                );
                                return;
                              }
                              void handleRecipeImageUpload(file);
                            }}
                          />
                        </div>
                        {selectedItem.type === "eigenproduktion" &&
                          !selectedItem.imageUrl &&
                          imageUrlInput.trim().length === 0 && (
                            <div className="flex-1 space-y-1 sm:pl-3">
                              <div className="flex items-center gap-2">
                                <Input
                                  placeholder="Bild-URL einfügen"
                                  value={imageUrlInput}
                                  onChange={(event) =>
                                    setImageUrlInput(event.target.value)
                                  }
                                  className="h-8 px-2 py-1 text-[11px]"
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={
                                    imageIsUploading ||
                                    imageUrlInput.trim().length === 0
                                  }
                                  onClick={() => {
                                    void handleRecipeImageUrlSave();
                                  }}
                                >
                                  Übernehmen
                                </Button>
                              </div>
                              {imageUploadError && (
                                <div className="text-[10px] text-destructive">
                                  {imageUploadError}
                                </div>
                              )}
                            </div>
                          )}
                      </div>
                    )}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        {selectedItem.type === "eigenproduktion" ? (
                          <>
                            <Input
                              value={nameInput}
                              onChange={(event) =>
                                setNameInput(event.target.value)
                              }
                              className="h-8 w-64 px-2 py-1 text-sm font-semibold"
                            />
                            <TypeBadge type={selectedItem.type} />
                          </>
                        ) : (
                          <>
                            <h2 className="text-lg font-semibold">
                              {selectedItem.name}
                            </h2>
                            <TypeBadge type={selectedItem.type} />
                          </>
                        )}
                        {isBioInput && (
                          <Badge className="bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-emerald-50">
                            BIO
                          </Badge>
                        )}
                      </div>
                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
                      <div>
                        Intern:{" "}
                        <span className="font-medium">
                          {formatInternalId(selectedItem.internalId ?? null)}
                        </span>
                      </div>
                      {selectedItem.type === "eigenproduktion" && (
                        <>
                          <div className="flex items-center gap-1">
                            <span>Kategorie:</span>
                            <select
                              value={categoryInput}
                              onChange={(event) =>
                                setCategoryInput(event.target.value)
                              }
                              className="h-7 rounded-md border border-input bg-background px-2 text-[11px] text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                            >
                              <option value="">Keine</option>
                              {recipeCategories.map((category) => (
                                <option key={category} value={category}>
                                  {category}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex items-center gap-1">
                            <span>Portionseinheit:</span>
                            <Input
                              value={portionUnitInput}
                              onChange={(event) =>
                                setPortionUnitInput(event.target.value)
                              }
                              className="h-7 w-28 px-2 py-1 text-[11px]"
                            />
                          </div>
                        </>
                      )}
                      <div className="flex items-center gap-1">
                        <span>Hersteller-Art.-Nr.:</span>
                        <Input
                          value={manufacturerInput}
                          onChange={(event) =>
                            setManufacturerInput(event.target.value)
                          }
                          className="h-7 w-40 px-2 py-1 text-[11px]"
                        />
                      </div>
                      <div>
                        EAN:{" "}
                        <span className="font-medium">
                          {selectedItem.ean && selectedItem.ean.trim().length > 0
                            ? selectedItem.ean
                            : "—"}
                        </span>
                      </div>
                    </div>
                    {selectedItem.type === "eigenproduktion" && (
                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        <span>Ernährungsform:</span>
                        {nutritionOptions.map((option) => {
                          const active = nutritionTagsInput.includes(option);
                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() =>
                                setNutritionTagsInput((current) =>
                                  current.includes(option)
                                    ? current.filter(
                                        (value) => value !== option
                                      )
                                    : [...current, option]
                                )
                              }
                              className={cn(
                                "rounded-full border px-2 py-0.5 text-[10px]",
                                active
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-muted-foreground/40 text-muted-foreground"
                              )}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <span>Eigenschaften:</span>
                      <button
                        type="button"
                        onClick={() => setIsBioInput((current) => !current)}
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[10px]",
                          isBioInput
                            ? "border-emerald-600 bg-emerald-600 text-emerald-50"
                            : "border-muted-foreground/40 text-muted-foreground"
                        )}
                      >
                        BIO
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setIsDeklarationsfreiInput((current) => !current)
                        }
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[10px]",
                          isDeklarationsfreiInput
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/40 text-muted-foreground"
                        )}
                      >
                        deklarationsfrei
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setIsAllergenfreiInput((current) => !current)
                        }
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[10px]",
                          isAllergenfreiInput
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/40 text-muted-foreground"
                        )}
                      >
                        allergenfrei
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setIsCookChillInput((current) => !current)
                        }
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[10px]",
                          isCookChillInput
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/40 text-muted-foreground"
                        )}
                      >
                        cook &amp; chill
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setIsFreezeThawStableInput((current) => !current)
                        }
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[10px]",
                          isFreezeThawStableInput
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/40 text-muted-foreground"
                        )}
                      >
                        freeze/thaw-stable
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setIsPalmOilFreeInput((current) => !current)
                        }
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[10px]",
                          isPalmOilFreeInput
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/40 text-muted-foreground"
                        )}
                      >
                        palmöl-frei
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setIsYeastFreeInput((current) => !current)
                        }
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[10px]",
                          isYeastFreeInput
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/40 text-muted-foreground"
                        )}
                      >
                        hefefrei
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setIsLactoseFreeInput((current) => !current)
                        }
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[10px]",
                          isLactoseFreeInput
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/40 text-muted-foreground"
                        )}
                      >
                        laktosefrei
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setIsGlutenFreeInput((current) => !current)
                        }
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[10px]",
                          isGlutenFreeInput
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/40 text-muted-foreground"
                        )}
                      >
                        glutenfrei
                      </button>
                    </div>
                    {selectedItem.allergens &&
                      selectedItem.allergens.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {selectedItem.allergens.map((allergen) => (
                            <span
                              key={`detail-${selectedItem.id}-${allergen}`}
                              className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] text-amber-900"
                            >
                              {allergen}
                            </span>
                          ))}
                        </div>
                      )}
                    {selectedItem.type === "eigenproduktion" &&
                      inheritedAllergens.length > 0 && (
                        <div className="text-[11px] text-muted-foreground">
                          Allergene (aus Zutaten):{" "}
                          <span className="font-medium">
                            {inheritedAllergens.join(", ")}
                          </span>
                        </div>
                      )}
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
                    <div className="space-y-2 rounded-md border bg-muted/40 px-3 py-3 text-xs text-muted-foreground">
                      <div>
                        Dieser Artikel wird als Zukauf geführt. Du kannst ihn
                        als Komponente in Eigenproduktionen verwenden.
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>Standard-Zubereitung</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setStandardPreparationComponents((components) => [
                                ...components,
                                { name: "", quantity: 0, unit: "" },
                              ])
                            }
                          >
                            Zeile hinzufügen
                          </Button>
                        </div>
                        {standardPreparationComponents.length === 0 && (
                          <div className="rounded-md border border-dashed bg-card px-2 py-2 text-[11px] text-muted-foreground">
                            Noch keine strukturierte Standard-Zubereitung
                            hinterlegt.
                          </div>
                        )}
                        {standardPreparationComponents.map(
                          (component, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-2 rounded-md border bg-card px-2 py-2"
                            >
                              <Input
                                type="number"
                                placeholder="Menge"
                                value={
                                  component.quantity === 0
                                    ? ""
                                    : String(component.quantity)
                                }
                                onChange={(event) => {
                                  const value = Number(
                                    event.target.value.replace(",", ".")
                                  );
                                  setStandardPreparationComponents(
                                    (components) =>
                                      components.map(
                                        (currentComponent, current) =>
                                          current === index
                                            ? {
                                                ...currentComponent,
                                                quantity: Number.isNaN(value)
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
                                placeholder="Einheit"
                                value={component.unit}
                                onChange={(event) =>
                                  setStandardPreparationComponents(
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
                                className="h-8 w-24 text-[11px]"
                              />
                              <Input
                                placeholder="Zutat Name"
                                value={component.name}
                                onChange={(event) =>
                                  setStandardPreparationComponents(
                                    (components) =>
                                      components.map(
                                        (currentComponent, current) =>
                                          current === index
                                            ? {
                                                ...currentComponent,
                                                name: event.target.value,
                                              }
                                            : currentComponent
                                      )
                                  )
                                }
                                className="h-8 flex-1 text-[11px]"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setStandardPreparationComponents(
                                    (components) =>
                                      components.filter(
                                        (_, current) => current !== index
                                      )
                                  )
                                }
                              >
                                Entfernen
                              </Button>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {selectedItem.type === "eigenproduktion" && (
                    <div className="space-y-3">
                      {recipeCalculation && (
                        <div className="space-y-2 rounded-md border bg-muted/40 px-3 py-3 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-xs font-semibold">
                              Kalkulation
                            </h3>
                            <div className="flex gap-2 text-[11px] text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <span>Portionen:</span>
                                <Input
                                  type="text"
                                  value={targetPortionsInput}
                                  onChange={(event) =>
                                    setTargetPortionsInput(event.target.value)
                                  }
                                  className="h-7 w-16 px-2 py-1 text-[11px]"
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                <span>Einheit:</span>
                                <Input
                                  type="text"
                                  value={portionUnitInput}
                                  onChange={(event) =>
                                    setPortionUnitInput(event.target.value)
                                  }
                                  className="h-7 w-20 px-2 py-1 text-[11px]"
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                <span>VK/Portion (€):</span>
                                <Input
                                  type="text"
                                  value={targetSalesPriceInput}
                                  onChange={(event) =>
                                    setTargetSalesPriceInput(event.target.value)
                                  }
                                  className="h-7 w-24 px-2 py-1 text-[11px]"
                                />
                              </div>
                            </div>
                          </div>
                          <div className="grid gap-1 text-[11px] md:grid-cols-2">
                            <div className="flex justify-between gap-2">
                              <span className="text-muted-foreground">
                                Gesamtkosten Rezept
                              </span>
                              <span className="font-medium">
                                {recipeCalculation.totalCost.toFixed(2)} €
                              </span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-muted-foreground">
                                Kosten pro Portion
                              </span>
                              <span className="font-medium">
                                {recipeCalculation.costPerPortion != null
                                  ? `${recipeCalculation.costPerPortion.toFixed(
                                      2
                                    )} €`
                                  : "—"}
                              </span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-muted-foreground">
                                Marge pro Portion
                              </span>
                              <span className="font-medium">
                                {recipeCalculation.marginPerPortion != null
                                  ? `${recipeCalculation.marginPerPortion.toFixed(
                                      2
                                    )} €`
                                  : "—"}
                              </span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-muted-foreground">
                                Wareneinsatz
                              </span>
                              <span className="font-medium">
                                {recipeCalculation.goodsSharePercent != null
                                  ? `${recipeCalculation.goodsSharePercent.toFixed(
                                      1
                                    )} %`
                                  : "—"}
                              </span>
                            </div>
                          </div>
                          {recipeCalculation.hasMissingPrices && (
                            <div className="mt-1 flex items-center gap-1 text-[11px] text-red-600">
                              <AlertTriangle className="h-3 w-3" />
                              <span>
                                Achtung: Mindestens eine Komponente hat keinen
                                EK-Preis. Die Kalkulation ist unvollständig.
                              </span>
                            </div>
                          )}
                          <div className="mt-3 grid gap-2 md:grid-cols-2">
                            <div className="space-y-1">
                              <div className="text-[11px] text-muted-foreground">
                                Allergene (kommagetrennt)
                              </div>
                              <textarea
                                rows={2}
                                value={proAllergensInput}
                                onChange={(event) =>
                                  setProAllergensInput(event.target.value)
                                }
                                className="w-full rounded-md border border-input bg-background px-2 py-1 text-[11px] text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                              />
                            </div>
                            <div className="space-y-1">
                              <div className="text-[11px] text-muted-foreground">
                                Ausbeute / Yield
                              </div>
                              <textarea
                                rows={2}
                                value={proYieldInput}
                                onChange={(event) =>
                                  setProYieldInput(event.target.value)
                                }
                                className="w-full rounded-md border border-input bg-background px-2 py-1 text-[11px] text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold">Zutaten</h3>
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
                            : "Zutaten bearbeiten"}
                        </Button>
                      </div>
                      {selectedItem.components &&
                      selectedItem.components.length > 0 ? (
                        <ComponentTree
                          rootItem={selectedItem}
                          itemsById={itemsById}
                          onSelectItem={setSpecItem}
                        />
                      ) : isSaving ? (
                        <div className="rounded-md border bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
                          Komponenten werden aktualisiert...
                        </div>
                      ) : (
                        <div className="rounded-md border border-dashed bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
                          Für diese Eigenproduktion sind noch keine Komponenten
                          hinterlegt.
                        </div>
                      )}
                      {isEditingComponents && (
                        <div className="space-y-3 rounded-md border bg-muted/40 p-3 text-xs">
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <div className="grid gap-2 md:grid-cols-[80px_100px_minmax(0,1fr)]">
                                <Input
                                  type="number"
                                  placeholder="Menge"
                                  value={componentQuantityInput}
                                  onChange={(event) =>
                                    setComponentQuantityInput(event.target.value)
                                  }
                                />
                                <Input
                                  placeholder="Einheit"
                                  value={componentUnitInput}
                                  onChange={(event) =>
                                    setComponentUnitInput(event.target.value)
                                  }
                                />
                                <Input
                                  placeholder={
                                    isSwapMode && swapGhostName
                                      ? `Ersatz für "${swapGhostName}" suchen`
                                      : "Artikelsuche"
                                  }
                                  value={componentSearch}
                                  onChange={(event) =>
                                    setComponentSearch(event.target.value)
                                  }
                                />
                              </div>
                              {componentSearchResults.length > 0 && (
                                <div className="max-h-40 space-y-1 overflow-y-auto">
                                  {componentSearchResults.map((item) => (
                                    <button
                                      key={item.id}
                                      type="button"
                                      className="flex w-full items-center justify-between gap-2 rounded-md border bg-card px-2 py-1 text-left hover:bg-accent hover:text-accent-foreground"
                                      onClick={async () => {
                                        if (isSwapMode && selectedItem) {
                                          if (!swapGhostName) {
                                            return;
                                          }
                                          const confirmed = window.confirm(
                                            `Möchtest du "${swapGhostName}" in ALLEN Rezepten durch "${item.name}" ersetzen?`
                                          );
                                          if (!confirmed) {
                                            return;
                                          }
                                          try {
                                            setIsSaving(true);
                                            setError(null);
                                            const response = await fetch(
                                              "/api/recipe-structure",
                                              {
                                                method: "PATCH",
                                                headers: {
                                                  "Content-Type":
                                                    "application/json",
                                                },
                                                body: JSON.stringify({
                                                  deletedItemName: swapGhostName,
                                                  newItemId: item.id,
                                                }),
                                              }
                                            );
                                            const payload =
                                              (await response.json()) as {
                                                error?: unknown;
                                                replacedCount?: number;
                                              };
                                            if (!response.ok) {
                                              let message =
                                                "Fehler beim globalen Ersetzen der Zutat.";
                                              if (
                                                payload &&
                                                typeof payload.error === "string"
                                              ) {
                                                message = payload.error;
                                              }
                                              throw new Error(message);
                                            }
                                            const inventoryResponse =
                                              await fetch("/api/inventory");
                                            if (inventoryResponse.ok) {
                                              const inventoryPayload =
                                                (await inventoryResponse.json()) as InventoryItem[];
                                              setItems(
                                                inventoryPayload.length > 0
                                                  ? inventoryPayload
                                                  : initialItems
                                              );
                                            }
                                          } catch (swapError) {
                                            const message =
                                              swapError instanceof Error
                                                ? swapError.message
                                                : "Fehler beim globalen Ersetzen der Zutat.";
                                            setError(message);
                                          } finally {
                                            setIsSaving(false);
                                            setIsSwapMode(false);
                                            setSwapGhostName("");
                                            setComponentSearch("");
                                          }
                                          return;
                                        }
                                        setEditingComponents((components) => {
                                          const rawQuantity =
                                            componentQuantityInput.trim();
                                          let quantityValue = 1;
                                          if (rawQuantity) {
                                            const parsedQuantity = Number(
                                              rawQuantity.replace(",", ".")
                                            );
                                            if (
                                              Number.isFinite(parsedQuantity) &&
                                              parsedQuantity > 0
                                            ) {
                                              quantityValue = parsedQuantity;
                                            }
                                          }
                                          const unitValue =
                                            componentUnitInput.trim() ||
                                            item.unit;
                                          return [
                                            ...components,
                                            {
                                              itemId: item.id,
                                              quantity: quantityValue,
                                              unit: unitValue,
                                            },
                                          ];
                                        });
                                        setComponentSearch("");
                                      }}
                                      >
                                        <div className="flex flex-1 flex-col">
                                          <div className="flex items-center gap-2">
                                            <span className="truncate text-[11px] font-medium">
                                              {item.name}
                                            </span>
                                            <TypeBadge type={item.type} />
                                          </div>
                                          <div className="text-[10px] text-muted-foreground">
                                            EK: {item.purchasePrice.toFixed(2)} € /{" "}
                                            {item.unit}
                                          </div>
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                )}
                            </div>
                            {selectedItem.type === "eigenproduktion" && (
                              <div className="space-y-2 rounded-md border border-sky-300 bg-sky-50 px-3 py-3 text-[11px]">
                                <div className="text-[11px] font-semibold text-sky-900">
                                  Nicht gefunden? Neue Zutat direkt hier anlegen
                                </div>
                                <div className="grid gap-2 md:grid-cols-[80px_80px_minmax(0,2fr)_1fr]">
                                  <Input
                                    type="number"
                                    placeholder="Menge"
                                    value={adHocQuantity}
                                    onChange={(event) => {
                                      setAdHocSelectedItemId(null);
                                      setAdHocQuantity(event.target.value);
                                    }}
                                  />
                                  <Input
                                    placeholder="Einheit"
                                    value={adHocUnit}
                                    onChange={(event) => {
                                      setAdHocSelectedItemId(null);
                                      setAdHocUnit(event.target.value);
                                    }}
                                  />
                                  <Input
                                    placeholder="Name der neuen Zutat"
                                    value={adHocName}
                                    onChange={(event) => {
                                      setAdHocSelectedItemId(null);
                                      setAdHocName(event.target.value);
                                    }}
                                  />
                                  <Input
                                    placeholder="EK-Preis"
                                    value={adHocPrice}
                                    onChange={(event) => {
                                      setAdHocSelectedItemId(null);
                                      setAdHocPrice(event.target.value);
                                    }}
                                  />
                                </div>
                                {adHocSuggestions.length > 0 && (
                                  <div className="max-h-32 space-y-1 overflow-y-auto">
                                    {adHocSuggestions.map((item) => (
                                      <button
                                        key={item.id}
                                        type="button"
                                        className="flex w-full items-center justify-between gap-2 rounded-md border bg-background px-2 py-1 text-left hover:bg-accent hover:text-accent-foreground"
                                        onClick={() => {
                                          setAdHocSelectedItemId(item.id);
                                          setAdHocName(item.name);
                                          setAdHocUnit(item.unit);
                                          setAdHocPrice(
                                            item.purchasePrice.toFixed(2)
                                          );
                                        }}
                                      >
                                        <div className="flex flex-1 flex-col">
                                          <div className="flex items-center gap-1">
                                            <span className="truncate text-[11px] font-medium">
                                              {item.name}
                                            </span>
                                            <TypeBadge type={item.type} />
                                          </div>
                                          <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                                            <span>
                                              EK: {item.purchasePrice.toFixed(2)}{" "}
                                              € / {item.unit}
                                            </span>
                                            {item.internalId != null && (
                                              <span>
                                                Intern: INT-{item.internalId}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                )}
                                {adHocExactMatchItem &&
                                  (!adHocSelectedItemId ||
                                    adHocSelectedItemId !==
                                      adHocExactMatchItem.id) && (
                                    <div className="text-[10px] text-amber-700">
                                      Artikel bereits vorhanden. Vorhandenen
                                      Artikel nutzen?
                                    </div>
                                  )}
                                <div className="flex justify-end">
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={isSaving}
                                    onClick={handleAddAdHocComponent}
                                  >
                                    Zutat zum Rezept hinzufügen
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="text-xs font-semibold">
                                Zutaten im Rezept
                              </h4>
                            </div>
                            {editingComponents.length === 0 && (
                              <div className="rounded-md border border-dashed bg-card px-2 py-2 text-[11px] text-muted-foreground">
                                Noch keine Komponenten hinzugefügt.
                              </div>
                            )}
                            {editingComponents.map((component, index) => {
                              const item = component.itemId
                                ? itemsById.get(component.itemId)
                                : undefined;
                              if (!item && !component.deletedItemName) {
                                return null;
                              }
                              return (
                                <div
                                  key={
                                    component.itemId ??
                                    component.deletedItemName ??
                                    index
                                  }
                                  className="flex items-center gap-2 rounded-md border bg-card px-2 py-2"
                                >
                                  <div className="flex min-w-0 flex-1 flex-col">
                                    {item && (
                                      <>
                                        <div className="flex items-center gap-2">
                                          <button
                                            type="button"
                                            className="truncate bg-transparent p-0 text-left text-[11px] font-medium underline-offset-2 hover:underline"
                                            onClick={() => setSpecItem(item)}
                                          >
                                            {item.name}
                                          </button>
                                          <TypeBadge type={item.type} />
                                        </div>
                                        <div className="mt-1 flex gap-2">
                                          <Input
                                            type="number"
                                            value={String(
                                              component.quantity
                                            )}
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
                                                    (
                                                      currentComponent,
                                                      current
                                                    ) =>
                                                      current === index
                                                        ? {
                                                            ...currentComponent,
                                                            quantity:
                                                              Number.isNaN(
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
                                                    (
                                                      currentComponent,
                                                      current
                                                    ) =>
                                                      current === index
                                                        ? {
                                                            ...currentComponent,
                                                            unit: event.target
                                                              .value,
                                                          }
                                                        : currentComponent
                                                  )
                                              )
                                            }
                                            className="h-8 w-20 text-[11px]"
                                          />
                                        </div>
                                      </>
                                    )}
                                    {!item && component.deletedItemName && (
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-1 text-[11px] text-red-600">
                                          <AlertTriangle className="h-3 w-3" />
                                          <span>
                                            ACHTUNG: Zutat{" "}
                                            {component.deletedItemName} wurde
                                            entfernt – bitte Ersatz wählen.
                                          </span>
                                        </div>
                                        <div className="flex gap-2 text-[11px] text-muted-foreground">
                                          <span>
                                            {component.quantity} {component.unit}
                                          </span>
                                          <button
                                            type="button"
                                            className="underline"
                                            onClick={() => {
                                              setIsSwapMode(true);
                                              setSwapGhostName(
                                                component.deletedItemName ??
                                                  ""
                                              );
                                              setComponentSearch("");
                                            }}
                                          >
                                            Ersatz auswählen
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  {item && (
                                    <div className="flex flex-col items-end gap-1">
                                      <ManufacturerSuggestionButton
                                        baseItem={item}
                                        itemsById={itemsById}
                                        editingComponents={editingComponents}
                                        setEditingComponents={
                                          setEditingComponents
                                        }
                                      />
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          setEditingComponents(
                                            (components) =>
                                              components.filter(
                                                (_, current) =>
                                                  current !== index
                                              )
                                          )
                                        }
                                      >
                                        Entfernen
                                      </Button>
                                    </div>
                                  )}
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
                      <div className="space-y-2 rounded-md border bg-muted/40 px-3 py-3 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-xs font-semibold">Zubereitung</h3>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={handleAddPreparationStep}
                          >
                            Schritt hinzufügen
                          </Button>
                        </div>
                        {preparationStepsInput.length === 0 ? (
                          <div className="rounded-md border border-dashed bg-background/60 px-3 py-2 text-[11px] text-muted-foreground">
                            Lege die Zubereitung als Schritte an. Nutze @, um
                            Zutaten aus dem Rezept zu verlinken.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {preparationStepsInput.map((step, index) => {
                              const isDragging =
                                draggedPreparationStepId === step.id;
                              const isEditing = editingStepId === step.id;
                              const showTagDropdown =
                                isEditing &&
                                activeTagStepId === step.id &&
                                ingredientTagOptions.length > 0;
                              const filteredTags =
                                tagSearch.trim().length > 0
                                  ? ingredientTagOptions.filter((option) =>
                                      option.name
                                        .toLowerCase()
                                        .includes(tagSearch)
                                    )
                                  : ingredientTagOptions;
                              return (
                                <div
                                  key={step.id}
                                  draggable
                                  onDragStart={() =>
                                    setDraggedPreparationStepId(step.id)
                                  }
                                  onDragOver={(event) => {
                                    event.preventDefault();
                                  }}
                                  onDrop={() => {
                                    if (
                                      !draggedPreparationStepId ||
                                      draggedPreparationStepId === step.id
                                    ) {
                                      return;
                                    }
                                    setPreparationStepsInput((steps) => {
                                      const currentIndex = steps.findIndex(
                                        (candidate) => candidate.id === step.id
                                      );
                                      const sourceIndex = steps.findIndex(
                                        (candidate) =>
                                          candidate.id ===
                                          draggedPreparationStepId
                                      );
                                      if (
                                        currentIndex === -1 ||
                                        sourceIndex === -1 ||
                                        currentIndex === sourceIndex
                                      ) {
                                        return steps;
                                      }
                                      const next = [...steps];
                                      const [moved] = next.splice(
                                        sourceIndex,
                                        1
                                      );
                                      next.splice(currentIndex, 0, moved);
                                      return next;
                                    });
                                    setDraggedPreparationStepId(null);
                                  }}
                                  onDragEnd={() => {
                                    setDraggedPreparationStepId(null);
                                  }}
                                  className={cn(
                                    "space-y-2 rounded-md border bg-background/60 px-3 py-2",
                                    isDragging &&
                                      "border-primary/60 bg-primary/5"
                                  )}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <button
                                      type="button"
                                      className="flex items-center gap-2 text-[11px] text-muted-foreground"
                                      onClick={() => setEditingStepId(step.id)}
                                    >
                                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-medium">
                                        {index + 1}
                                      </span>
                                      <span>
                                        Schritt{" "}
                                        {isEditing ? "(Bearbeitung)" : ""}
                                      </span>
                                    </button>
                                    <div className="flex items-center gap-2">
                                      {step.duration && !isEditing && (
                                        <span className="text-[11px] text-muted-foreground">
                                          Dauer: {step.duration}
                                        </span>
                                      )}
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-[10px]"
                                        onClick={() =>
                                          handleRemovePreparationStep(step.id)
                                        }
                                      >
                                        ×
                                      </Button>
                                    </div>
                                  </div>
                                  {isEditing ? (
                                    <div className="space-y-2">
                                      <textarea
                                        rows={3}
                                        value={step.text}
                                        onChange={(event) =>
                                          handlePreparationStepTextChange(
                                            step.id,
                                            event
                                          )
                                        }
                                        className="w-full rounded-md border border-input bg-background px-2 py-1 text-[11px] text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                        placeholder="Beschreibe diesen Schritt. Tippe @, um Zutaten aus dem Rezept zu verlinken."
                                      />
                                      {showTagDropdown &&
                                        filteredTags.length > 0 && (
                                          <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border bg-popover p-2 text-[11px] shadow-sm">
                                            {filteredTags.map((option) => (
                                              <button
                                                key={option.id}
                                                type="button"
                                                className="flex w-full items-center justify-between rounded-md px-2 py-1 text-left hover:bg-accent hover:text-accent-foreground"
                                                onClick={() =>
                                                  handleInsertIngredientTag(
                                                    step.id,
                                                    option.name
                                                  )
                                                }
                                              >
                                                <span>{option.name}</span>
                                              </button>
                                            ))}
                                          </div>
                                        )}
                                      <div className="space-y-1 rounded-md bg-muted/40 px-2 py-1">
                                        <div className="text-[10px] text-muted-foreground">
                                          Vorschau mit markierten Zutaten
                                        </div>
                                        <div className="text-[11px]">
                                          {renderTaggedText(
                                            step.text,
                                            ingredientTagOptions
                                          )}
                                        </div>
                                      </div>
                                      <div className="grid gap-2 md:grid-cols-3">
                                        <div className="space-y-1">
                                          <div className="text-[11px] text-muted-foreground">
                                            Dauer (optional)
                                          </div>
                                          <Input
                                            type="text"
                                            value={step.duration ?? ""}
                                            onChange={(
                                              event: ChangeEvent<HTMLInputElement>
                                            ) =>
                                              handlePreparationStepDurationChange(
                                                step.id,
                                                event
                                              )
                                            }
                                            className="h-7 px-2 py-1 text-[11px]"
                                            placeholder="z. B. 10 Minuten"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <div className="flex items-center justify-between gap-2">
                                            <span className="text-[11px] text-muted-foreground">
                                              Bild-URL (optional)
                                            </span>
                                            <Button
                                              type="button"
                                              size="sm"
                                              className="h-6 px-2 text-[10px]"
                                              disabled={
                                                isGeneratingImageStepId ===
                                                  step.id ||
                                                !step.text.trim()
                                              }
                                              onClick={() =>
                                                handleGenerateStepImage(
                                                  step.id
                                                )
                                              }
                                            >
                                              {isGeneratingImageStepId ===
                                              step.id ? (
                                                <>
                                                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                                  Generiere...
                                                </>
                                              ) : (
                                                "KI-Bild generieren"
                                              )}
                                            </Button>
                                          </div>
                                          <Input
                                            type="text"
                                            value={step.imageUrl ?? ""}
                                            onChange={(
                                              event: ChangeEvent<HTMLInputElement>
                                            ) =>
                                              handlePreparationStepImageUrlChange(
                                                step.id,
                                                event
                                              )
                                            }
                                            className="h-7 px-2 py-1 text-[11px]"
                                            placeholder="https://..."
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <div className="text-[11px] text-muted-foreground">
                                            Video-URL (optional)
                                          </div>
                                          <Input
                                            type="text"
                                            value={step.videoUrl ?? ""}
                                            onChange={(
                                              event: ChangeEvent<HTMLInputElement>
                                            ) =>
                                              handlePreparationStepVideoUrlChange(
                                                step.id,
                                                event
                                              )
                                            }
                                            className="h-7 px-2 py-1 text-[11px]"
                                            placeholder="https://..."
                                          />
                                        </div>
                                      </div>
                                      {step.imageUrl && (
                                        <div className="mt-1">
                                          <div className="text-[10px] text-muted-foreground">
                                            Vorschau
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setImageViewer({
                                                stepId: step.id,
                                                imageUrl: step.imageUrl as string,
                                              })
                                            }
                                          >
                                            <img
                                              src={step.imageUrl}
                                              alt={`Schritt ${index + 1}`}
                                              className="mt-1 max-h-40 w-full rounded-md object-cover"
                                            />
                                          </button>
                                        </div>
                                      )}
                                      <div className="flex justify-end">
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          className="h-6 px-2 text-[10px]"
                                          onClick={() => setEditingStepId(null)}
                                        >
                                          Fertig
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-[11px]">
                                      <div className="flex items-center gap-3">
                                        <div className="flex-1">
                                          {renderTaggedText(
                                            step.text,
                                            ingredientTagOptions
                                          )}
                                        </div>
                                        {step.duration && (
                                          <span className="text-[11px] text-muted-foreground">
                                            Dauer: {step.duration}
                                          </span>
                                        )}
                                        <div className="flex h-[60px] w-[60px] items-center justify-center rounded-md border bg-muted">
                                          {step.imageUrl ? (
                                            <button
                                              type="button"
                                              className="h-full w-full"
                                              onClick={() =>
                                                setImageViewer({
                                                  stepId: step.id,
                                                  imageUrl:
                                                    step.imageUrl as string,
                                                })
                                              }
                                            >
                                              <img
                                                src={step.imageUrl}
                                                alt={`Schritt ${index + 1}`}
                                                className="h-full w-full rounded-md object-cover"
                                              />
                                            </button>
                                          ) : (
                                            <span className="text-muted-foreground">
                                              <ImageIcon className="h-4 w-4" />
                                            </span>
                                          )}
                                        </div>
                                        {step.videoUrl && (
                                          <a
                                            href={step.videoUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-[10px] text-sky-700 underline"
                                          >
                                            Video öffnen
                                          </a>
                                        )}
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          className="h-6 px-2 text-[10px]"
                                          onClick={() =>
                                            setEditingStepId(step.id)
                                          }
                                        >
                                          Bearbeiten
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      {nutritionSummary && (
                        <div className="space-y-2 rounded-md border bg-muted/40 px-3 py-3 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-xs font-semibold">
                              Nährwerte &amp; Bilanz
                            </h3>
                            {nutritionSummary.hasMissingData && (
                              <span className="text-[11px] text-muted-foreground">
                                Nährwerte unvollständig – fehlende Daten werden
                                teilweise geschätzt.
                              </span>
                            )}
                          </div>
                          {nutritionSummary.perRecipe ? (
                            <>
                              <div className="grid gap-1 text-[11px] md:grid-cols-2">
                                <div className="flex justify-between gap-2">
                                  <span className="text-muted-foreground">
                                    Energie gesamt (Rezept)
                                  </span>
                                  <span className="font-medium">
                                    {nutritionSummary.perRecipe.energyKcal.toFixed(
                                      0
                                    )}{" "}
                                    kcal
                                  </span>
                                </div>
                                <div className="flex justify-between gap-2">
                                  <span className="text-muted-foreground">
                                    Fett gesamt (Rezept)
                                  </span>
                                  <span className="font-medium">
                                    {nutritionSummary.perRecipe.fat.toFixed(
                                      1
                                    )}{" "}
                                    g
                                  </span>
                                </div>
                                <div className="flex justify-between gap-2">
                                  <span className="text-muted-foreground">
                                    davon gesättigte Fettsäuren gesamt (Rezept)
                                  </span>
                                  <span className="font-medium">
                                    {nutritionSummary.perRecipe.saturatedFat.toFixed(
                                      1
                                    )}{" "}
                                    g
                                  </span>
                                </div>
                                <div className="flex justify-between gap-2">
                                  <span className="text-muted-foreground">
                                    Kohlenhydrate gesamt (Rezept)
                                  </span>
                                  <span className="font-medium">
                                    {nutritionSummary.perRecipe.carbs.toFixed(
                                      1
                                    )}{" "}
                                    g
                                  </span>
                                </div>
                                <div className="flex justify-between gap-2">
                                  <span className="text-muted-foreground">
                                    davon Zucker gesamt (Rezept)
                                  </span>
                                  <span className="font-medium">
                                    {nutritionSummary.perRecipe.sugar.toFixed(
                                      1
                                    )}{" "}
                                    g
                                  </span>
                                </div>
                                <div className="flex justify-between gap-2">
                                  <span className="text-muted-foreground">
                                    Eiweiß gesamt (Rezept)
                                  </span>
                                  <span className="font-medium">
                                    {nutritionSummary.perRecipe.protein.toFixed(
                                      1
                                    )}{" "}
                                    g
                                  </span>
                                </div>
                                <div className="flex justify-between gap-2">
                                  <span className="text-muted-foreground">
                                    Salz gesamt (Rezept)
                                  </span>
                                  <span className="font-medium">
                                    {nutritionSummary.perRecipe.salt.toFixed(
                                      2
                                    )}{" "}
                                    g
                                  </span>
                                </div>
                              </div>
                              {nutritionSummary.perPortion && (
                                <>
                                  <div className="mt-2 text-[11px] font-semibold">
                                    pro Portion
                                  </div>
                                  <div className="grid gap-1 text-[11px] md:grid-cols-2">
                                    <div className="flex justify-between gap-2">
                                      <span className="text-muted-foreground">
                                        Energie
                                      </span>
                                      <span className="font-medium">
                                        {nutritionSummary.perPortion.energyKcal.toFixed(
                                          0
                                        )}{" "}
                                        kcal
                                      </span>
                                    </div>
                                    <div className="flex justify-between gap-2">
                                      <span className="text-muted-foreground">
                                        Fett
                                      </span>
                                      <span className="font-medium">
                                        {nutritionSummary.perPortion.fat.toFixed(
                                          1
                                        )}{" "}
                                        g
                                      </span>
                                    </div>
                                    <div className="flex justify-between gap-2">
                                      <span className="text-muted-foreground">
                                        davon gesättigte Fettsäuren
                                      </span>
                                      <span className="font-medium">
                                        {nutritionSummary.perPortion.saturatedFat.toFixed(
                                          1
                                        )}{" "}
                                        g
                                      </span>
                                    </div>
                                    <div className="flex justify-between gap-2">
                                      <span className="text-muted-foreground">
                                        Kohlenhydrate
                                      </span>
                                      <span className="font-medium">
                                        {nutritionSummary.perPortion.carbs.toFixed(
                                          1
                                        )}{" "}
                                        g
                                      </span>
                                    </div>
                                    <div className="flex justify-between gap-2">
                                      <span className="text-muted-foreground">
                                        davon Zucker
                                      </span>
                                      <span className="font-medium">
                                        {nutritionSummary.perPortion.sugar.toFixed(
                                          1
                                        )}{" "}
                                        g
                                      </span>
                                    </div>
                                    <div className="flex justify-between gap-2">
                                      <span className="text-muted-foreground">
                                        Eiweiß
                                      </span>
                                      <span className="font-medium">
                                        {nutritionSummary.perPortion.protein.toFixed(
                                          1
                                        )}{" "}
                                        g
                                      </span>
                                    </div>
                                    <div className="flex justify-between gap-2">
                                      <span className="text-muted-foreground">
                                        Salz
                                      </span>
                                      <span className="font-medium">
                                        {nutritionSummary.perPortion.salt.toFixed(
                                          2
                                        )}{" "}
                                        g
                                      </span>
                                    </div>
                                  </div>
                                </>
                              )}
                            </>
                          ) : (
                            <div className="text-[11px] text-muted-foreground">
                              Noch keine Nährwertdaten für die Zutaten
                              hinterlegt.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs text-muted-foreground">
                      Diese Ansicht zeigt alle IDs und Profi-Daten für den Artikel.
                    </div>
                    {selectedItem.type !== "eigenproduktion" && (
                      <Button
                        type="button"
                        size="sm"
                        className="border border-red-500 bg-red-500/10 px-3 py-1 text-[11px] font-medium text-red-700 hover:bg-red-500/20"
                        onClick={async () => {
                          if (!selectedItem) {
                            return;
                          }
                          const confirmed = window.confirm(
                            "Möchtest du diesen Artikel wirklich löschen?"
                          );
                          if (!confirmed) {
                            return;
                          }
                          try {
                            setIsDeleting(true);
                            setError(null);
                            const response = await fetch("/api/inventory", {
                              method: "DELETE",
                              headers: {
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({ id: selectedItem.id }),
                            });
                            const payload = (await response.json()) as {
                              error?: unknown;
                              success?: boolean;
                            };
                            if (!response.ok || !payload.success) {
                              let message =
                                "Fehler beim Löschen des Artikels.";
                              if (
                                payload &&
                                typeof payload.error === "string"
                              ) {
                                message = payload.error;
                              }
                              throw new Error(message);
                            }
                            setItems((previous) =>
                              previous.filter(
                                (item) => item.id !== selectedItem.id
                              )
                            );
                            setSelectedItemId(null);
                          } catch (deleteError) {
                            const message =
                              deleteError instanceof Error
                                ? deleteError.message
                                : "Fehler beim Löschen des Artikels.";
                            setError(message);
                          } finally {
                            setIsDeleting(false);
                          }
                        }}
                        disabled={isDeleting || isSaving}
                      >
                        {isDeleting ? "Lösche..." : "Artikel löschen"}
                      </Button>
                    )}
                  </div>
                  {selectedItem.type !== "eigenproduktion" && (
                    <div className="space-y-2 rounded-md border bg-muted/40 p-3 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-xs font-semibold">
                          Profi-Daten
                        </h3>
                        <Button
                          type="button"
                          size="sm"
                          disabled={isSaving}
                          onClick={handleSaveProfiData}
                        >
                          {isSaving
                            ? "Speichern..."
                            : "Profi-Daten speichern"}
                        </Button>
                      </div>
                      <div className="grid gap-2 md:grid-cols-2">
                        <div className="space-y-1">
                          <div className="text-[11px] text-muted-foreground">
                            Allergene (kommagetrennt)
                          </div>
                          <textarea
                            rows={2}
                            value={proAllergensInput}
                            onChange={(event) =>
                              setProAllergensInput(event.target.value)
                            }
                            className="w-full rounded-md border border-input bg-background px-2 py-1 text-[11px] text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="text-[11px] text-muted-foreground">
                            Ausbeute / Yield
                          </div>
                          <textarea
                            rows={2}
                            value={proYieldInput}
                            onChange={(event) =>
                              setProYieldInput(event.target.value)
                            }
                            className="w-full rounded-md border border-input bg-background px-2 py-1 text-[11px] text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="space-y-1">
                          <div className="text-[11px] text-muted-foreground">
                            Zutaten
                          </div>
                          <textarea
                            rows={2}
                            value={proIngredientsInput}
                            onChange={(event) =>
                              setProIngredientsInput(event.target.value)
                            }
                            className="w-full rounded-md border border-input bg-background px-2 py-1 text-[11px] text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="text-[11px] text-muted-foreground">
                            Dosierung
                          </div>
                          <textarea
                            rows={2}
                            value={proDosageInput}
                            onChange={(event) =>
                              setProDosageInput(event.target.value)
                            }
                            className="w-full rounded-md border border-input bg-background px-2 py-1 text-[11px] text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="text-[11px] text-muted-foreground">
                            Zubereitung
                          </div>
                          <textarea
                            rows={3}
                            value={proPreparationInput}
                            onChange={(event) =>
                              setProPreparationInput(event.target.value)
                            }
                            className="w-full rounded-md border border-input bg-background px-2 py-1 text-[11px] text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  {selectedItem.type === "eigenproduktion" && (
                    <div className="mt-4 space-y-2 rounded-md border border-red-500/40 bg-red-500/5 p-3 text-xs">
                      <div className="font-semibold text-red-700">
                        Gefahrenzone
                      </div>
                      <div className="text-red-700">
                        Dieses Rezept wird unwiderruflich gelöscht, inklusive aller
                        zugehörigen Komponentenbeziehungen.
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        className="border border-red-500 bg-red-500/10 px-3 py-1 text-[11px] font-medium text-red-700 hover:bg-red-500/20"
                        onClick={async () => {
                          if (!selectedItem) {
                            return;
                          }
                          const confirmed = window.confirm(
                            "Bist du sicher, dass du dieses Rezept unwiderruflich löschen möchtest?"
                          );
                          if (!confirmed) {
                            return;
                          }
                          try {
                            setIsDeleting(true);
                            setError(null);
                            const response = await fetch("/api/inventory", {
                              method: "DELETE",
                              headers: {
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({ id: selectedItem.id }),
                            });
                            const payload = (await response.json()) as {
                              error?: unknown;
                              success?: boolean;
                            };
                            if (!response.ok || !payload.success) {
                              let message =
                                "Fehler beim Löschen des Rezepts.";
                              if (
                                payload &&
                                typeof payload.error === "string"
                              ) {
                                message = payload.error;
                              }
                              throw new Error(message);
                            }
                            setItems((previous) =>
                              previous.filter(
                                (item) => item.id !== selectedItem.id
                              )
                            );
                            setSelectedItemId(null);
                          } catch (deleteError) {
                            const message =
                              deleteError instanceof Error
                                ? deleteError.message
                                : "Fehler beim Löschen des Rezepts.";
                            setError(message);
                          } finally {
                            setIsDeleting(false);
                          }
                        }}
                        disabled={isDeleting || isSaving}
                      >
                        {isDeleting
                          ? "Lösche..."
                          : "Rezept unwiderruflich löschen"}
                      </Button>
                    </div>
                  )}
                  {specItem && (
                    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/40">
                      <div className="flex h-full w-full max-w-md flex-col bg-background shadow-lg">
                        <div className="flex items-center justify-between border-b px-4 py-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="truncate text-sm font-semibold">
                              {specItem.name}
                            </span>
                            <TypeBadge type={specItem.type} />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setSpecItem(null)}
                          >
                            Schließen
                          </Button>
                        </div>
                        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-xs">
                          {specItem.type === "eigenproduktion" ? (
                            <div className="space-y-4">
                              <div className="space-y-3">
                                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-black/5">
                                  {specItem.imageUrl ? (
                                    <img
                                      src={specItem.imageUrl}
                                      alt={specItem.name}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-muted/40 text-[11px] text-muted-foreground">
                                      <ImageIcon className="h-6 w-6" />
                                      <span>Kein Rezeptbild hinterlegt</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-3">
                                  <h2 className="text-sm font-semibold tracking-tight">
                                    {specItem.name}
                                  </h2>
                                  <TypeBadge type={specItem.type} />
                                  {specItem.isBio && (
                                    <Badge className="bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-50">
                                      BIO
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                                  {specItem.category && (
                                    <div className="uppercase tracking-wide">
                                      {specItem.category}
                                    </div>
                                  )}
                                  {specItem.targetPortions != null &&
                                    Number.isFinite(specItem.targetPortions) &&
                                    specItem.targetPortions > 0 &&
                                    specItem.portionUnit && (
                                      <div>
                                        {specItem.targetPortions}{" "}
                                        {specItem.portionUnit}
                                      </div>
                                    )}
                                  <div>
                                    Intern:{" "}
                                    <span className="font-medium">
                                      {formatInternalId(
                                        specItem.internalId ?? null
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              {specItem.components &&
                                specItem.components.length > 0 && (
                                  <div className="space-y-2">
                                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                      Zutatenstruktur
                                    </h3>
                                    <ComponentTree
                                      rootItem={specItem}
                                      itemsById={itemsById}
                                      onSelectItem={setSpecItem}
                                    />
                                  </div>
                                )}
                              {specItem.preparationSteps && (
                                <div className="space-y-2">
                                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Zubereitung
                                  </h3>
                                  {Array.isArray(specItem.preparationSteps) ? (
                                    <div className="space-y-1">
                                      {specItem.preparationSteps.map(
                                        (step, index) => (
                                          <div
                                            key={
                                              typeof step.id === "string" &&
                                              step.id.trim().length > 0
                                                ? step.id
                                                : `spec-step-${index}`
                                            }
                                            className="flex gap-2"
                                          >
                                            <span className="mt-[1px] text-[10px] font-semibold text-muted-foreground">
                                              {index + 1}.
                                            </span>
                                            <div className="space-y-1">
                                              <div className="text-[1.1rem] leading-[1.6]">
                                                {renderTaggedText(
                                                  typeof step.text === "string"
                                                    ? step.text
                                                    : "",
                                                  ingredientTagOptions
                                                )}
                                              </div>
                                              {step.duration && (
                                                <div className="text-[10px] text-muted-foreground">
                                                  Dauer: {step.duration}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  ) : (
                                    <div className="text-[1.1rem] leading-[1.6]">
                                      {renderTaggedText(
                                        typeof specItem.preparationSteps ===
                                          "string"
                                          ? specItem.preparationSteps
                                          : "",
                                        ingredientTagOptions
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div>
                                <div className="text-[11px] text-muted-foreground">
                                  Hersteller-Art.-Nr.
                                </div>
                                <div className="font-medium">
                                  {specItem.manufacturerArticleNumber &&
                                  specItem.manufacturerArticleNumber.trim().length >
                                    0
                                    ? specItem.manufacturerArticleNumber
                                    : "—"}
                                </div>
                              </div>
                              <div>
                                <div className="text-[11px] text-muted-foreground">
                                  EAN
                                </div>
                                <div className="font-medium">
                                  {specItem.ean &&
                                  specItem.ean.trim().length > 0
                                    ? specItem.ean
                                    : "—"}
                                </div>
                              </div>
                              {specItem.allergens &&
                                specItem.allergens.length > 0 && (
                                  <div>
                                    <div className="text-[11px] text-muted-foreground">
                                      Allergene
                                    </div>
                                    <div className="mt-1 flex flex-wrap gap-1">
                                      {specItem.allergens.map((allergen) => (
                                        <span
                                          key={`${specItem.id}-spec-${allergen}`}
                                          className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] text-amber-900"
                                        >
                                          {allergen}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              {specItem.ingredients && (
                                <div>
                                  <div className="text-[11px] text-muted-foreground">
                                    Zutaten (Hersteller)
                                  </div>
                                  <div className="mt-1 whitespace-pre-line text-[11px]">
                                    {specItem.ingredients}
                                  </div>
                                </div>
                              )}
                              {specItem.dosageInstructions && (
                                <div>
                                  <div className="text-[11px] text-muted-foreground">
                                    Dosierungsempfehlung
                                  </div>
                                  <div className="mt-1 whitespace-pre-line text-[11px]">
                                    {specItem.dosageInstructions}
                                  </div>
                                </div>
                              )}
                              {specItem.yieldInfo && (
                                <div>
                                  <div className="text-[11px] text-muted-foreground">
                                    Ausbeute / Yield
                                  </div>
                                  <div className="mt-1 whitespace-pre-line text-[11px]">
                                    {specItem.yieldInfo}
                                  </div>
                                </div>
                              )}
                              {specItem.preparationSteps && (
                                <div>
                                  <div className="text-[11px] text-muted-foreground">
                                    Zubereitung
                                  </div>
                                  {Array.isArray(specItem.preparationSteps) ? (
                                    <div className="mt-1 space-y-1 text-[11px]">
                                      {specItem.preparationSteps.map(
                                        (step, index) => (
                                          <div
                                            key={
                                              typeof step.id === "string" &&
                                              step.id.trim().length > 0
                                                ? step.id
                                                : `spec-step-${index}`
                                            }
                                            className="flex gap-2"
                                          >
                                            <span className="mt-[1px] text-[10px] text-muted-foreground">
                                              {index + 1}.
                                            </span>
                                            <div className="space-y-0.5">
                                              <div>
                                                {renderTaggedText(
                                                  typeof step.text === "string"
                                                    ? step.text
                                                    : "",
                                                  ingredientTagOptions
                                                )}
                                              </div>
                                              {step.duration && (
                                                <div className="text-[10px] text-muted-foreground">
                                                  Dauer: {step.duration}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  ) : (
                                    <div className="mt-1 text-[11px]">
                                      {renderTaggedText(
                                        typeof specItem.preparationSteps ===
                                          "string"
                                          ? specItem.preparationSteps
                                          : "",
                                        ingredientTagOptions
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
      {imageViewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <button
            type="button"
            className="absolute inset-0 h-full w-full cursor-zoom-out"
            onClick={() => setImageViewer(null)}
          />
          <div className="relative z-10 max-h-[90vh] max-w-[90vw]">
            <button
              type="button"
              className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-xs text-white"
              onClick={() => setImageViewer(null)}
            >
              Schließen
            </button>
            <img
              src={imageViewer.imageUrl}
              alt="Zubereitungsschritt"
              className="max-h-[90vh] max-w-[90vw] rounded-md object-contain"
            />
          </div>
        </div>
      )}
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
  onSelectItem?: (item: InventoryItem) => void;
};

type ManufacturerSuggestionButtonProps = {
  baseItem: InventoryItem;
  itemsById: Map<string, InventoryItem>;
  editingComponents: InventoryComponent[];
  setEditingComponents: (
    updater:
      | InventoryComponent[]
      | ((
          previous: InventoryComponent[]
        ) => InventoryComponent[])
  ) => void;
};

function ManufacturerSuggestionButton({
  baseItem,
  itemsById,
  editingComponents,
  setEditingComponents,
}: ManufacturerSuggestionButtonProps) {
  if (!baseItem.standardPreparation) {
    return null;
  }

  const suggestions: InventoryComponent[] = [];

  for (const suggestion of baseItem.standardPreparation.components) {
    const matchedItem = findBestInventoryMatchByName(
      suggestion.name,
      itemsById.values()
    );
    if (!matchedItem) {
      continue;
    }
    const alreadyExists = editingComponents.some(
      (existing) => existing.itemId === matchedItem.id
    );
    if (alreadyExists) {
      continue;
    }
    suggestions.push({
      itemId: matchedItem.id,
      quantity: suggestion.quantity,
      unit: suggestion.unit,
    });
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={() => {
        setEditingComponents((previous) => [
          ...previous,
          ...suggestions,
        ]);
      }}
    >
      Hersteller-Empfehlung laden
    </Button>
  );
}

function ComponentTree({ rootItem, itemsById, onSelectItem }: ComponentTreeProps) {
  if (!rootItem.components || rootItem.components.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1 rounded-md border bg-card/60 p-3 text-sm">
      {rootItem.components.map((component, index) => {
        let item = component.itemId ? itemsById.get(component.itemId) : undefined;

        const nameFallback =
          (item && item.name) ||
          (component.deletedItemName && component.deletedItemName) ||
          "";

        const linkedRecipe =
          (item && item.type === "eigenproduktion" ? item : null) ||
          (nameFallback
            ? findExactRecipeMatchByName(nameFallback, itemsById.values())
            : null);

        if (!item && linkedRecipe) {
          item = linkedRecipe;
        }

        const displayName =
          item?.name ??
          component.deletedItemName ??
          "Unbekannte Zutat";

        const nestedComponentsLength =
          item && item.components ? item.components.length : 0;

        const childRoot =
          item && nestedComponentsLength > 0 ? item : null;

        return (
          <div
            key={component.itemId ?? `${rootItem.id}-${index}`}
            className="space-y-1"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-1 items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex min-w-[3rem] justify-end rounded bg-muted px-1 py-0.5 font-mono tabular-nums">
                    {component.quantity}
                  </span>
                  <span className="inline-flex rounded bg-muted px-1 py-0.5">
                    {component.unit}
                  </span>
                  <button
                    type="button"
                    className="font-medium underline-offset-2 hover:underline"
                    onClick={() => item && onSelectItem && onSelectItem(item)}
                    disabled={!item || !onSelectItem}
                  >
                    {displayName}
                  </button>
                  {item && <TypeBadge type={item.type} />}
                  {linkedRecipe && onSelectItem && (
                    <button
                      type="button"
                      className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-primary/70 bg-primary/10 text-primary hover:bg-primary/20"
                      onClick={() => onSelectItem(linkedRecipe)}
                    >
                      <Link2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
              {childRoot && nestedComponentsLength > 0 && (
                <span className="text-xs text-muted-foreground">
                  {nestedComponentsLength} untergeordnete Komponenten
                </span>
              )}
            </div>
            {childRoot && nestedComponentsLength > 0 && (
              <div className="border-l pl-4">
                <ComponentTree
                  rootItem={childRoot}
                  itemsById={itemsById}
                  onSelectItem={onSelectItem}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
