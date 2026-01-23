"use client";

import {
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import ReactCrop, { Crop, PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  AlertTriangle,
  Loader2,
  Image as ImageIcon,
  Link2,
  Search,
  Plus,
  Minus,
  ZoomIn,
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
import { Textarea } from "@/components/ui/textarea";
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
  text?: string | null;
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

type PdfJsViewport = { width: number; height: number };
type PdfJsPage = {
  getViewport: (opts: { scale: number }) => PdfJsViewport;
  render: (cfg: {
    canvasContext: CanvasRenderingContext2D;
    viewport: PdfJsViewport;
  }) => { promise: Promise<void> };
};
type PdfJsDocument = { getPage: (n: number) => Promise<PdfJsPage> };
type PdfJsLoadingTask = { promise: Promise<PdfJsDocument> };
type PdfJsModule = {
  GlobalWorkerOptions?: { workerSrc: string };
  version?: string;
  getDocument: (params: { data: ArrayBuffer }) => PdfJsLoadingTask;
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
  fileUrl?: string | null;
  packshotX?: number | null;
  packshotY?: number | null;
  packshotZoom?: number | null;
};

type ParsedAiItem = {
  name: string;
  unit: string;
  quantity: number;
  purchasePrice: number;
  calculatedPricePerUnit: number;
  standardPreparation?: StandardPreparation | null;
  preparationText?: string | null;
  nutritionPerUnit?: NutritionTotals | null;
  dosageInstructions?: string | null;
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
  manufacturerArticleNumber?: string | null;
  yieldVolume?: string | null;
  imageUrl?: string | null;
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

const STAPLE_ITEMS = [
  {"name": "Speisesalz (fein)", "item_type": "zukauf", "unit": "kg", "purchase_price": 0.85, "is_staple": true, "imageUrl": "/images/categories/spices.svg", "nutrition_per_unit": {"kcal": 0, "fat": 0, "carbs": 0, "protein": 0}},
  {"name": "Kristallzucker", "item_type": "zukauf", "unit": "kg", "purchase_price": 1.30, "is_staple": true, "imageUrl": "/images/categories/dry-goods.svg", "nutrition_per_unit": {"kcal": 400, "fat": 0, "carbs": 100, "protein": 0}},
  {"name": "Pflanzenöl (Raps)", "item_type": "zukauf", "unit": "l", "purchase_price": 1.95, "is_staple": true, "imageUrl": "/images/categories/oil.svg", "nutrition_per_unit": {"kcal": 828, "fat": 92, "carbs": 0, "protein": 0}},
  {"name": "Butter", "item_type": "zukauf", "unit": "kg", "purchase_price": 7.50, "is_staple": true, "imageUrl": "/images/categories/dairy.svg", "nutrition_per_unit": {"kcal": 717, "fat": 81, "carbs": 0.7, "protein": 0.8}},
  {"name": "Vollmilch 3,5%", "item_type": "zukauf", "unit": "l", "purchase_price": 1.15, "is_staple": true, "imageUrl": "/images/categories/dairy.svg", "nutrition_per_unit": {"kcal": 64, "fat": 3.5, "carbs": 4.8, "protein": 3.4}},
  {"name": "Schlagsahne 30%", "item_type": "zukauf", "unit": "l", "purchase_price": 4.20, "is_staple": true, "imageUrl": "/images/categories/dairy.svg", "nutrition_per_unit": {"kcal": 292, "fat": 30, "carbs": 3.2, "protein": 2.4}},
  {"name": "Weizenmehl 405", "item_type": "zukauf", "unit": "kg", "purchase_price": 0.90, "is_staple": true, "imageUrl": "/images/categories/dry-goods.svg", "nutrition_per_unit": {"kcal": 348, "fat": 1, "carbs": 72, "protein": 10}},
  {"name": "Zwiebeln gelb", "item_type": "zukauf", "unit": "kg", "purchase_price": 0.95, "is_staple": true, "imageUrl": "/images/categories/produce.svg", "nutrition_per_unit": {"kcal": 40, "fat": 0.1, "carbs": 9, "protein": 1.1}},
  {"name": "Knoblauch", "item_type": "zukauf", "unit": "kg", "purchase_price": 6.50, "is_staple": true, "imageUrl": "/images/categories/produce.svg", "nutrition_per_unit": {"kcal": 149, "fat": 0.5, "carbs": 33, "protein": 6.4}},
  {"name": "Eier (M)", "item_type": "zukauf", "unit": "stk", "purchase_price": 0.18, "is_staple": true, "imageUrl": "/images/categories/dairy.svg", "nutrition_per_unit": {"kcal": 80, "fat": 5.5, "carbs": 0.5, "protein": 7}},
  {"name": "Zitronen", "item_type": "zukauf", "unit": "kg", "purchase_price": 2.50, "is_staple": true, "imageUrl": "/images/categories/produce.svg", "nutrition_per_unit": {"kcal": 29, "fat": 0.3, "carbs": 9, "protein": 1.1}},
  {"name": "Karotten", "item_type": "zukauf", "unit": "kg", "purchase_price": 1.20, "is_staple": true, "imageUrl": "/images/categories/produce.svg", "nutrition_per_unit": {"kcal": 41, "fat": 0.2, "carbs": 10, "protein": 0.9}},
  {"name": "Kartoffeln (festkochend)", "item_type": "zukauf", "unit": "kg", "purchase_price": 1.50, "is_staple": true, "imageUrl": "/images/categories/produce.svg", "nutrition_per_unit": {"kcal": 77, "fat": 0.1, "carbs": 17, "protein": 2}},
  {"name": "Pfeffer schwarz (gemahlen)", "item_type": "zukauf", "unit": "kg", "purchase_price": 25.00, "is_staple": true, "imageUrl": "/images/categories/spices.svg", "nutrition_per_unit": {"kcal": 251, "fat": 3.3, "carbs": 64, "protein": 10}},
  {"name": "Honig", "item_type": "zukauf", "unit": "kg", "purchase_price": 12.00, "is_staple": true, "imageUrl": "/images/categories/dry-goods.svg", "nutrition_per_unit": {"kcal": 304, "fat": 0, "carbs": 82, "protein": 0.3}}
];

  // initialItems removed


function parseStandardPreparationLine(
  line: string
): StandardPreparationComponent {
  const trimmed = line.trim();
  const match = trimmed.match(
    /^\s*(\d+(?:[.,]\d+)?(?:\s*-\s*\d+(?:[.,]\d+)?)?)\s*([a-zA-ZäöüÄÖÜß\.%]+)?\s+(.+)\s*$/
  );
  if (match) {
    const rawQty = match[1];
    const dashIndex = rawQty.indexOf("-");
    const primaryQty =
      dashIndex !== -1 ? rawQty.slice(0, dashIndex).trim() : rawQty;
    const quantity = Number(primaryQty.replace(",", "."));
    const unit = match[2] ?? "";
    const name = match[3].trim();
    return {
      name,
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 0,
      unit,
    };
  }
  return { name: trimmed, quantity: 0, unit: "" };
}

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
  const pathname = usePathname();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [activeSection, setActiveSection] = useState<
    "dashboard" | "zutaten" | "rezepte" | "lager"
  >(
    pathname && pathname.startsWith("/lager")
      ? "lager"
      : pathname && pathname.startsWith("/rezepte")
      ? "rezepte"
      : "zutaten"
  );
  // effectiveFilterType removed
  const [isDetailView, setIsDetailView] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const lastGenRef = useRef<string>("");
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
  const [standardPreparationText, setStandardPreparationText] = useState("");
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
  const [docDosageSteps, setDocDosageSteps] = useState<
    { id: string; quantity: string; line: string }[]
  >([]);
  const [docPreviewIsGenerating, setDocPreviewIsGenerating] = useState(false);
  const [docPreviewError, setDocPreviewError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [proAllergensInput, setProAllergensInput] = useState("");
  const [specItem, setSpecItem] = useState<InventoryItem | null>(null);
  const [proIngredientsInput, setProIngredientsInput] = useState("");
  const [proDosageInput, setProDosageInput] = useState("");
  const [proYieldWeightInput, setProYieldWeightInput] = useState("");
  const [proYieldVolumeInput, setProYieldVolumeInput] = useState("");
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
  const [proEnergyKcalInput, setProEnergyKcalInput] = useState("");
  const [proFatInput, setProFatInput] = useState("");
  const [proSaturatedFatInput, setProSaturatedFatInput] = useState("");
  const [proCarbsInput, setProCarbsInput] = useState("");
  const [proSugarInput, setProSugarInput] = useState("");
  const [proProteinInput, setProProteinInput] = useState("");
  const [proSaltInput, setProSaltInput] = useState("");
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
  const [ingredientCategoryFilter, setIngredientCategoryFilter] =
    useState<string | null>(null);
  const [isRecipePresentationMode, setIsRecipePresentationMode] =
    useState(false);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [packshotUrl, setPackshotUrl] = useState("");
  const [imageIsUploading, setImageIsUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [isImageDropActive, setIsImageDropActive] = useState(false);
  
  // Crop State
  const [crop, setCrop] = useState<Crop>();
  const packshotImgRef = useRef<HTMLImageElement>(null);
  const [packshotTranslate, setPackshotTranslate] = useState({ x: 0, y: 0 }); // Kept for build compatibility but unused in crop logic

  // Packshot Focus State
  const [packshotPan, setPackshotPan] = useState({ x: 0, y: 0 });
  const [packshotZoom, setPackshotZoom] = useState(2.0);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const handlePanMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsPanning(true);
    setPanStart({ x: e.clientX - packshotPan.x, y: e.clientY - packshotPan.y });
  };

  const handlePanMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    e.preventDefault();
    setPackshotPan({
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y
    });
  };

  const handlePanMouseUp = () => {
    setIsPanning(false);
  };
  
  const handleZoomIn = () => {
    setPackshotZoom((prev) => Math.min(prev + 0.2, 5.0));
  };
  
  const handleZoomOut = () => {
    setPackshotZoom((prev) => Math.max(prev - 0.2, 0.5));
  };

  useEffect(() => {
    if (!pathname) {
      return;
    }
    const next = pathname.startsWith("/lager")
      ? "lager"
      : pathname.startsWith("/rezepte")
      ? "rezepte"
      : "zutaten";
    if (next !== activeSection) {
      setActiveSection(next);
    }
  }, [pathname, activeSection]);

  useEffect(() => {
    setSelectedItemId(null);
    setIsDetailView(false);
    setSearch("");
    setRecipeCategoryFilter(null);
    setRecipeProFilter(null);
    setIngredientCategoryFilter(null);
    if (activeSection === "zutaten") {
      setFilterType("zukauf");
    } else if (activeSection === "rezepte") {
      setFilterType("eigenproduktion");
    } else {
      setFilterType("all");
    }
  }, [activeSection]);

  const effectiveItems = isLoading ? [] : items;


  const generateAndUploadPdfPreview = useCallback(async (fileUrl: string, itemId: string) => {
    try {
      setDocPreviewIsGenerating(true);
      setDocPreviewError(null);
      if (typeof window === "undefined") {
        throw new Error("Nur im Browser ausführbar");
      }
      const cdnVersion = "3.11.174";
      const globalObj = window as unknown as { pdfjsLib?: PdfJsModule };
      if (!globalObj.pdfjsLib) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${cdnVersion}/pdf.min.js`;
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("pdf.js konnte nicht geladen werden"));
          document.head.appendChild(script);
        });
      }
      const pdfjsLib = (window as unknown as { pdfjsLib: PdfJsModule }).pdfjsLib;
      if (pdfjsLib.GlobalWorkerOptions) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${cdnVersion}/pdf.worker.min.js`;
      }
      const res = await fetch(fileUrl);
      const buf = await res.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: buf });
      const pdf = await loadingTask.promise;
      const maxPages = Math.min(3, (pdf as unknown as { numPages?: number }).numPages ?? 1);
      let chosenBlob: Blob | null = null;
      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) {
          continue;
        }
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: context, viewport }).promise;
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        setPreviewImage(dataUrl);
        let crop = { x: 0, y: 0, w: canvas.width, h: canvas.height };
        let confidence = 0;
        let hadDetection = false;
        try {
          const detectResponse = await fetch("/api/pdf-packshot-extract", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              dataUrl,
              width: canvas.width,
              height: canvas.height,
            }),
          });
          const detectPayload = (await detectResponse.json()) as {
            error?: unknown;
            bbox?: { x: number; y: number; w: number; h: number };
            confidence?: number;
          };
          if (detectResponse.ok && detectPayload.bbox) {
            const { x, y, w, h } = detectPayload.bbox;
            // No bias applied for automatic detection
            const biasedY = y;
            
            const safe = {
              x: Math.max(0, Math.min(canvas.width - 1, Math.floor(x))),
              y: Math.max(0, Math.min(canvas.height - 1, Math.floor(biasedY))),
              w: Math.max(1, Math.min(canvas.width, Math.floor(w))),
              h: Math.max(1, Math.min(canvas.height, Math.floor(h))),
            };
            crop = safe;
            confidence = Number(detectPayload.confidence ?? 0.5);
            hadDetection = true;
            const areaRatio = (safe.w * safe.h) / (canvas.width * canvas.height);
            if (areaRatio > 0.85 || areaRatio < 0.05 || confidence < 0.5) {
              const strictResponse = await fetch("/api/pdf-packshot-extract", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  dataUrl,
                  width: canvas.width,
                  height: canvas.height,
                  strict: true,
                }),
              });
              const strictPayload = (await strictResponse.json()) as {
                error?: unknown;
                bbox?: { x: number; y: number; w: number; h: number };
                confidence?: number;
              };
              if (strictResponse.ok && strictPayload.bbox) {
                const { x: sx, y: sy, w: sw, h: sh } = strictPayload.bbox;
                const safe2 = {
                  x: Math.max(0, Math.min(canvas.width - 1, Math.floor(sx))),
                  y: Math.max(0, Math.min(canvas.height - 1, Math.floor(sy))),
                  w: Math.max(1, Math.min(canvas.width, Math.floor(sw))),
                  h: Math.max(1, Math.min(canvas.height, Math.floor(sh))),
                };
                const areaRatio2 = (safe2.w * safe2.h) / (canvas.width * canvas.height);
                const conf2 = Number(strictPayload.confidence ?? confidence);
                if (areaRatio2 <= 0.85 && areaRatio2 >= 0.05 && conf2 >= 0.5) {
                  crop = safe2;
                  confidence = conf2;
                  hadDetection = true;
                }
              }
            }
          }
        } catch {
        }
        if (crop.w === canvas.width && crop.h === canvas.height) {
          const side = Math.floor(Math.min(canvas.width, canvas.height) * 0.6);
          const cx = Math.floor((canvas.width - side) / 2);
          const cy = Math.floor((canvas.height - side) / 2);
          // Ensure crop stays within bounds
          const safeY = Math.max(0, Math.min(canvas.height - side, cy));
          crop = { x: cx, y: safeY, w: side, h: side };
        }
        const cropCanvas = document.createElement("canvas");
        cropCanvas.width = crop.w;
        cropCanvas.height = crop.h;
        const cropCtx = cropCanvas.getContext("2d");
        if (!cropCtx) {
          continue;
        }
        cropCtx.drawImage(
          canvas,
          crop.x,
          crop.y,
          crop.w,
          crop.h,
          0,
          0,
          crop.w,
          crop.h
        );
        function tightenByWhitespace(source: HTMLCanvasElement) {
          const ctx = source.getContext("2d");
          if (!ctx) {
            return { x: 0, y: 0, w: source.width, h: source.height };
          }
          const w = source.width;
          const h = source.height;
          const data = ctx.getImageData(0, 0, w, h).data;
          function isRowWhite(y: number) {
            let white = 0;
            for (let x = 0; x < w; x++) {
              const idx = (y * w + x) * 4;
              const r = data[idx],
                g = data[idx + 1],
                b = data[idx + 2];
              const gray = 0.299 * r + 0.587 * g + 0.114 * b;
              if (gray > 240) white++;
            }
            return white / w > 0.9;
          }
          function isColWhite(x: number) {
            let white = 0;
            for (let y = 0; y < h; y++) {
              const idx = (y * w + x) * 4;
              const r = data[idx],
                g = data[idx + 1],
                b = data[idx + 2];
              const gray = 0.299 * r + 0.587 * g + 0.114 * b;
              if (gray > 240) white++;
            }
            return white / h > 0.9;
          }
          let top = 0;
          while (top < h - 1 && isRowWhite(top)) top++;
          let bottom = h - 1;
          while (bottom > top + 1 && isRowWhite(bottom)) bottom--;
          let left = 0;
          while (left < w - 1 && isColWhite(left)) left++;
          let right = w - 1;
          while (right > left + 1 && isColWhite(right)) right--;
          const newW = Math.max(32, right - left + 1);
          const newH = Math.max(32, bottom - top + 1);
          return { x: left, y: top, w: newW, h: newH };
        }
        const refined = tightenByWhitespace(cropCanvas);
        const refinedArea = refined.w * refined.h;
        const originalArea = crop.w * crop.h;
        const finalRegion =
          refinedArea < originalArea * 0.1
            ? { x: 0, y: 0, w: crop.w, h: crop.h }
            : refined;
        function computeEdgeCentroid(
          ctx: CanvasRenderingContext2D,
          sx: number,
          sy: number,
          sw: number,
          sh: number
        ) {
          const img = ctx.getImageData(sx, sy, sw, sh).data;
          let sum = 0;
          let cxSum = 0;
          let cySum = 0;
          const step = 2;
          for (let y = 1; y < sh - 1; y += step) {
            for (let x = 1; x < sw - 1; x += step) {
              const idxL = (y * sw + (x - 1)) * 4;
              const idxR = (y * sw + (x + 1)) * 4;
              const idxT = ((y - 1) * sw + x) * 4;
              const idxB = ((y + 1) * sw + x) * 4;
              const gL = 0.299 * img[idxL] + 0.587 * img[idxL + 1] + 0.114 * img[idxL + 2];
              const gR = 0.299 * img[idxR] + 0.587 * img[idxR + 1] + 0.114 * img[idxR + 2];
              const gT = 0.299 * img[idxT] + 0.587 * img[idxT + 1] + 0.114 * img[idxT + 2];
              const gB = 0.299 * img[idxB] + 0.587 * img[idxB + 1] + 0.114 * img[idxB + 2];
              const mag = Math.abs(gR - gL) + Math.abs(gB - gT);
              sum += mag;
              cxSum += mag * x;
              cySum += mag * y;
            }
          }
          if (sum <= 0) {
            return { cx: Math.floor(sw / 2), cy: Math.floor(sh / 2) };
          }
          return { cx: Math.floor(cxSum / sum), cy: Math.floor(cySum / sum) };
        }
        const centroid = hadDetection
          ? { cx: Math.floor(finalRegion.w / 2), cy: Math.floor(finalRegion.h / 2) }
          : cropCtx
          ? computeEdgeCentroid(cropCtx, finalRegion.x, finalRegion.y, finalRegion.w, finalRegion.h)
          : { cx: Math.floor(finalRegion.w / 2), cy: Math.floor(finalRegion.h / 2) };
        const side = Math.floor(Math.min(finalRegion.w, finalRegion.h) * 0.95);
        const localX = Math.max(
          0,
          Math.min(
            finalRegion.w - side,
            Math.floor(centroid.cx - side / 2 + packshotTranslate.x)
          )
        );
        const localY = Math.max(
          0,
          Math.min(
            finalRegion.h - side,
            Math.floor(centroid.cy - side / 2 + packshotTranslate.y)
          )
        );
        const finalCanvas = document.createElement("canvas");
        finalCanvas.width = side;
        finalCanvas.height = side;
        const finalCtx = finalCanvas.getContext("2d");
        if (!finalCtx) {
          continue;
        }
        finalCtx.drawImage(
          cropCanvas,
          finalRegion.x + localX,
          finalRegion.y + localY,
          side,
          side,
          0,
          0,
          side,
          side
        );
        const blob: Blob | null = await new Promise((resolve) => {
          finalCanvas.toBlob((b) => resolve(b), "image/jpeg", 0.9);
        });
        if (blob) {
          chosenBlob = blob;
          break;
        }
      }
      if (!chosenBlob) {
        throw new Error("Packshot konnte nicht erzeugt werden");
      }
      const file = new File([chosenBlob], "pdf-packshot.jpg", { type: "image/jpeg" });
      const form = new FormData();
      form.append("file", file);
      form.append("itemId", itemId);
      form.append("filename", "pdf-preview.jpg");
      const response = await fetch("/api/recipe-image-upload", {
        method: "POST",
        body: form,
      });
      const payload = (await response.json()) as { error?: unknown; imageUrl?: string };
      if (!response.ok) {
        let message = "Fehler beim Upload des PDF-Vorschaubilds.";
        if (payload && typeof payload.error === "string") {
          message = payload.error;
        }
        throw new Error(message);
      }
      if (payload.imageUrl) {
        const freshUrl = `${payload.imageUrl}?t=${Date.now()}`;
        setDocParsed((prev) => (prev ? { ...prev, imageUrl: freshUrl } : prev));
        setItems((previous) =>
          previous.map((item) =>
            item.id === itemId ? { ...item, imageUrl: freshUrl } : item
          )
        );
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Fehler bei der PDF-Bild-Erzeugung.";
      setDocPreviewError(message);
    } finally {
      setDocPreviewIsGenerating(false);
    }
  }, [packshotTranslate]);

  // Automatic PDF preview generation and Image preview setting
  useEffect(() => {
    const timer = setTimeout(() => {
      // Determine the active file URL
      const url = (docParsed && docParsed.fileUrl) || 
                  (selectedItemId && effectiveItems.find((i) => i.id === selectedItemId)?.fileUrl);
      
      if (!url) {
          setPreviewImage(null);
          return;
      }

      const isPdf = url.toLowerCase().endsWith(".pdf");

      if (isPdf) {
         if (selectedItemId) {
            const key = `${selectedItemId}-${url}`;
            if (lastGenRef.current !== key) {
               lastGenRef.current = key;
               void generateAndUploadPdfPreview(url, selectedItemId);
            }
         }
      } else {
         // It's an image, set it as preview directly
         setPreviewImage(url);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [docParsed?.fileUrl, selectedItemId, effectiveItems, generateAndUploadPdfPreview]);

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

        // Create a map of staples for quick lookup
        const stapleMap = new Map(STAPLE_ITEMS.map(s => [s.name.toLowerCase(), s]));

        // Patch loaded items with staple images if they are missing
        const patchedData = data.map(item => {
          const staple = stapleMap.get(item.name.toLowerCase());
          // @ts-ignore
          if (staple && staple.imageUrl && !item.imageUrl) {
             // @ts-ignore
             return { ...item, imageUrl: staple.imageUrl };
          }
          return item;
        });

        // Ensure STAPLE_ITEMS are present (virtual import)
        const existingNames = new Set(patchedData.map((i) => i.name.toLowerCase()));
        const missingStaples = STAPLE_ITEMS.filter(
          (s) => !existingNames.has(s.name.toLowerCase())
        ).map((s, index) => ({
          id: `staple-${index}`,
          name: s.name,
          type: s.item_type as InventoryType,
          unit: s.unit,
          purchasePrice: s.purchase_price,
          // @ts-ignore
          imageUrl: s.imageUrl,
          nutritionPerUnit: {
            energyKcal: s.nutrition_per_unit.kcal,
            fat: s.nutrition_per_unit.fat,
            saturatedFat: 0,
            carbs: s.nutrition_per_unit.carbs,
            sugar: 0,
            protein: s.nutrition_per_unit.protein,
            salt: 0,
          },
          isBio: false,
        } as InventoryItem));

        const finalData = [...patchedData, ...missingStaples];

        if (!cancelled) {
          setItems(finalData);
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
          // setItems(initialItems);
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
      if (activeSection === "zutaten") {
         // Strict filter for Zutaten section: NO Recipes (Eigenproduktion)
         // Only "zukauf" (which includes Staple Items)
         if (item.type === "eigenproduktion") {
           return false;
         }
      }
      if (filterType !== "all" && item.type !== filterType && activeSection !== "zutaten") {
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

  // docMatch removed (unused)

  useEffect(() => {
    if (!docParsed || !docParsed.dosageInstructions) {
      setDocDosageSteps([]);
      return;
    }
    const lines = docParsed.dosageInstructions
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    const steps = lines.map((line, index) => {
      const match = line.match(/(\d+([.,]\d+)?)/);
      const quantity = match ? match[1].replace(",", ".") : "";
      return {
        id: `doc-dose-${index}-${Math.random().toString(36).slice(2)}`,
        quantity,
        line,
      };
    });
    setDocDosageSteps(steps);
  }, [docParsed]);

  useEffect(() => {
    if (!docParsed || !docParsed.dosageInstructions) {
      return;
    }
    const lines = docParsed.dosageInstructions
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    const parsedComponents: StandardPreparationComponent[] = lines.map(
      (line) => parseStandardPreparationLine(line)
    );
    setStandardPreparationComponents(parsedComponents);
  }, [docParsed]);

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
    setIsDetailView(false);
  }, [activeSection]);

  const selectedItem =
    filteredItems.find((item) => item.id === selectedItemId) ??
    filteredItems[0] ??
    null;


  const packshotPreview = previewImage || packshotUrl || selectedItem?.imageUrl || (docParsed && docParsed.imageUrl) || "";

  useEffect(() => {
    if (selectedItem) {
      setImageUrlInput(selectedItem.imageUrl ?? "");
      if (selectedItem.packshotX !== undefined && selectedItem.packshotX !== null &&
          selectedItem.packshotY !== undefined && selectedItem.packshotY !== null) {
          setPackshotPan({ x: selectedItem.packshotX, y: selectedItem.packshotY });
      } else {
          setPackshotPan({ x: 0, y: 0 });
      }
      if (selectedItem.packshotZoom !== undefined && selectedItem.packshotZoom !== null) {
          setPackshotZoom(selectedItem.packshotZoom);
      } else {
          setPackshotZoom(2.0);
      }
    } else {
      setImageUrlInput("");
      setPackshotPan({ x: 0, y: 0 });
      setPackshotZoom(2.0);
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

    function getUnitConversion(
      unit: string | null | undefined
    ): { kind: "mass" | "volume"; toBase: number } | null {
      if (!unit) {
        return null;
      }
      const normalized = unit.trim().toLowerCase();
      if (!normalized) {
        return null;
      }
      if (
        normalized === "g" ||
        normalized === "gramm" ||
        normalized === "gram" ||
        normalized === "gr"
      ) {
        return { kind: "mass", toBase: 1 };
      }
      if (normalized === "kg" || normalized === "kilogramm") {
        return { kind: "mass", toBase: 1000 };
      }
      if (normalized === "mg") {
        return { kind: "mass", toBase: 0.001 };
      }
      if (normalized === "ml") {
        return { kind: "volume", toBase: 1 };
      }
      if (
        normalized === "l" ||
        normalized === "lt" ||
        normalized === "liter"
      ) {
        return { kind: "volume", toBase: 1000 };
      }
      return null;
    }

    function parseYieldWeightToGrams(input: string): number | null {
      const trimmed = input.trim();
      if (!trimmed) {
        return null;
      }
      const firstLine = trimmed.split("\n")[0];
      const match = firstLine.match(/^([\d.,]+)\s*([a-zA-Z]*)/);
      if (!match) {
        return null;
      }
      const rawValue = match[1].replace(",", ".");
      const value = Number(rawValue);
      if (!Number.isFinite(value) || value <= 0) {
        return null;
      }
      const unitRaw = match[2]?.toLowerCase() ?? "";
      if (
        unitRaw === "" ||
        unitRaw === "g" ||
        unitRaw === "gramm" ||
        unitRaw === "gram" ||
        unitRaw === "gr"
      ) {
        return value;
      }
      if (unitRaw === "kg" || unitRaw === "kilogramm") {
        return value * 1000;
      }
      if (unitRaw === "mg") {
        return value * 0.001;
      }
      return value;
    }

    function computeItemProfile(
      item: InventoryItem
    ): {
      perGram: NutritionTotals | null;
      mass: number | null;
      missing: boolean;
    } {
      if (visited.has(item.id)) {
        return { perGram: null, mass: null, missing: true };
      }
      visited.add(item.id);

      if (!item.components || item.components.length === 0) {
        const base = item.nutritionPerUnit;
        if (!base) {
          return { perGram: null, mass: null, missing: true };
        }
        const perGram: NutritionTotals = {
          energyKcal: (base.energyKcal ?? 0) / 100,
          fat: (base.fat ?? 0) / 100,
          saturatedFat: (base.saturatedFat ?? 0) / 100,
          carbs: (base.carbs ?? 0) / 100,
          sugar: (base.sugar ?? 0) / 100,
          protein: (base.protein ?? 0) / 100,
          salt: (base.salt ?? 0) / 100,
        };
        return { perGram, mass: 100, missing: false };
      }

      let totalMass = 0;
      const batchTotals: NutritionTotals = {
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
        const child = computeItemProfile(componentItem);
        if (!child.perGram) {
          missing = true;
          continue;
        }
        const unitInfo =
          getUnitConversion(component.unit) ??
          getUnitConversion(componentItem.unit);
        if (!unitInfo) {
          missing = true;
          continue;
        }
        const mass = quantity * unitInfo.toBase;
        if (!Number.isFinite(mass) || mass <= 0) {
          missing = true;
          continue;
        }
        totalMass += mass;
        batchTotals.energyKcal += child.perGram.energyKcal * mass;
        batchTotals.fat += child.perGram.fat * mass;
        batchTotals.saturatedFat += child.perGram.saturatedFat * mass;
        batchTotals.carbs += child.perGram.carbs * mass;
        batchTotals.sugar += child.perGram.sugar * mass;
        batchTotals.protein += child.perGram.protein * mass;
        batchTotals.salt += child.perGram.salt * mass;
      }

      if (!Number.isFinite(totalMass) || totalMass <= 0) {
        return { perGram: null, mass: null, missing: true };
      }

      const perGram: NutritionTotals = {
        energyKcal: batchTotals.energyKcal / totalMass,
        fat: batchTotals.fat / totalMass,
        saturatedFat: batchTotals.saturatedFat / totalMass,
        carbs: batchTotals.carbs / totalMass,
        sugar: batchTotals.sugar / totalMass,
        protein: batchTotals.protein / totalMass,
        salt: batchTotals.salt / totalMass,
      };

      return { perGram, mass: totalMass, missing };
    }

    const { perGram, mass, missing } = computeItemProfile(rootItem);

    if (!perGram || !mass || !Number.isFinite(mass) || mass <= 0) {
      return {
        perRecipe: null as NutritionTotals | null,
        perPortion: null as NutritionTotals | null,
        hasMissingData: true,
      };
    }

    const yieldWeightGrams = parseYieldWeightToGrams(proYieldWeightInput);
    const recipeMass =
      yieldWeightGrams && yieldWeightGrams > 0 ? yieldWeightGrams : mass;

    const perRecipe: NutritionTotals = {
      energyKcal: perGram.energyKcal * recipeMass,
      fat: perGram.fat * recipeMass,
      saturatedFat: perGram.saturatedFat * recipeMass,
      carbs: perGram.carbs * recipeMass,
      sugar: perGram.sugar * recipeMass,
      protein: perGram.protein * recipeMass,
      salt: perGram.salt * recipeMass,
    };

    const portions = selectedItem.targetPortions ?? null;
    const validPortions =
      portions != null && Number.isFinite(portions) && portions > 0
        ? portions
        : null;

    const perPortion =
      validPortions != null
        ? {
            energyKcal: perRecipe.energyKcal / validPortions,
            fat: perRecipe.fat / validPortions,
            saturatedFat: perRecipe.saturatedFat / validPortions,
            carbs: perRecipe.carbs / validPortions,
            sugar: perRecipe.sugar / validPortions,
            protein: perRecipe.protein / validPortions,
            salt: perRecipe.salt / validPortions,
          }
        : null;

    return {
      perRecipe,
      perPortion,
      hasMissingData: missing,
    };
  }, [
    editingComponents,
    isEditingComponents,
    itemsById,
    proYieldWeightInput,
    selectedItem,
  ]);

  useEffect(() => {
    setSpecItem(null);
    setIsRecipePresentationMode(false);
    if (!selectedItem) {
      setManufacturerInput("");
      setProAllergensInput("");
      setProIngredientsInput("");
      setProDosageInput("");
      setProYieldWeightInput("");
      setProYieldVolumeInput("");
      setProPreparationInput("");
      setNameInput("");
      setCategoryInput("");
      setPortionUnitInput("");
      setNutritionTagsInput([]);
      setStandardPreparationComponents([]);
      setStandardPreparationText("");
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
    const stdPrep = selectedItem.standardPreparation;
    setStandardPreparationComponents(stdPrep?.components ?? []);
    setStandardPreparationText(
      stdPrep?.text ??
        (selectedItem.type === "zukauf" &&
        typeof selectedItem.preparationSteps === "string"
          ? selectedItem.preparationSteps
          : "")
    );
    setNameInput(selectedItem.name);
    setImageUrlInput(selectedItem.imageUrl ?? "");
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
    setProAllergensInput(
      allergensText.length > 0
        ? allergensText
        : "keine rezeptorisch enthaltenen Allergene"
    );
    if (selectedItem.nutritionPerUnit) {
      setProEnergyKcalInput(
        String(selectedItem.nutritionPerUnit.energyKcal ?? "")
      );
      setProFatInput(String(selectedItem.nutritionPerUnit.fat ?? ""));
      setProSaturatedFatInput(
        String(selectedItem.nutritionPerUnit.saturatedFat ?? "")
      );
      setProCarbsInput(String(selectedItem.nutritionPerUnit.carbs ?? ""));
      setProSugarInput(String(selectedItem.nutritionPerUnit.sugar ?? ""));
      setProProteinInput(
        String(selectedItem.nutritionPerUnit.protein ?? "")
      );
      setProSaltInput(String(selectedItem.nutritionPerUnit.salt ?? ""));
    } else {
      setProEnergyKcalInput("");
      setProFatInput("");
      setProSaturatedFatInput("");
      setProCarbsInput("");
      setProSugarInput("");
      setProProteinInput("");
      setProSaltInput("");
    }
    setProIngredientsInput(selectedItem.ingredients ?? "");
    setProDosageInput(selectedItem.dosageInstructions ?? "");
    const yieldText = selectedItem.yieldInfo ?? "";
    if (yieldText.includes("|")) {
      const [weightRaw, volumeRaw] = yieldText.split("|");
      setProYieldWeightInput(weightRaw.trim());
      setProYieldVolumeInput((volumeRaw ?? "").trim());
    } else if (yieldText.includes("\n")) {
      const [line1, line2] = yieldText.split("\n");
      setProYieldWeightInput(line1.trim());
      setProYieldVolumeInput((line2 ?? "").trim());
    } else {
      setProYieldWeightInput(yieldText);
      setProYieldVolumeInput("");
    }
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
          if (trimmed.length > 0) {
            setProPreparationInput(trimmed);
          } else {
            setProPreparationInput("");
          }
        }
      } else {
        setProPreparationInput("");
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
    } else if (selectedItem.type === "zukauf") {
      const text =
        typeof selectedItem.dosageInstructions === "string"
          ? selectedItem.dosageInstructions
          : "";
      const lines = text
        .split(/\r?\n/)
        .map((value) => value.trim())
        .filter((value) => value.length > 0);
      const parsedComponents: StandardPreparationComponent[] = lines.map(
        (line) => parseStandardPreparationLine(line)
      );
      setStandardPreparationComponents(parsedComponents);
    } else {
      setStandardPreparationComponents([]);
    }

    // Standard Preparation Text Loading with Fallbacks
    if (stdPrep?.text) {
      setStandardPreparationText(stdPrep.text);
    } else {
      let text = "";
      // Prioritize preparationSteps over dosageInstructions for better AI result mapping
      if (typeof selectedItem.preparationSteps === "string" && selectedItem.preparationSteps.trim().length > 0) {
        text = selectedItem.preparationSteps;
      } else if (
        Array.isArray(selectedItem.preparationSteps) &&
        selectedItem.preparationSteps.length > 0
      ) {
        text = selectedItem.preparationSteps
          .map((s) => s.text)
          .join("\n");
      } else if (
        selectedItem.type === "zukauf" &&
        typeof selectedItem.dosageInstructions === "string" &&
        selectedItem.dosageInstructions
      ) {
        text = selectedItem.dosageInstructions;
      }
      setStandardPreparationText(text);
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

  async function handleDocumentUpload(file: File) {
    try {
      setDocIsUploading(true);
      setDocError(null);
      setDocParsed(null);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("filename", file.name);
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
          nutrition_per_100g?: {
            energy_kcal?: number;
            fat?: number;
            saturated_fat?: number;
            carbohydrates?: number;
            sugar?: number;
            protein?: number;
            salt?: number;
          };
          allergens: string[];
          ingredients?: string | null;
          dosage_instructions?: string | null;
          standard_preparation?: {
            components: {
              name: string;
              quantity: number;
              unit: string;
            }[];
          } | null;
          yield_info?: string | null;
          yield_volume?: string | null;
          preparation_steps?: string | null;
          manufacturer_article_number?: string | null;
          is_bio?: boolean;
          is_deklarationsfrei?: boolean;
          is_allergenfrei?: boolean;
          is_cook_chill?: boolean;
          is_freeze_thaw_stable?: boolean;
          is_palm_oil_free?: boolean;
          is_yeast_free?: boolean;
          is_lactose_free?: boolean;
          is_gluten_free?: boolean;
          image_url?: string | null;
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
          standardPreparation:
            (payload.extracted &&
            payload.extracted.standard_preparation
              ? payload.extracted.standard_preparation
              : created.standardPreparation) ?? null,
        };
        setItems((previous) => [
          ...previous,
          enriched,
        ]);
        setSelectedItemId(enriched.id);
      }
      if (payload.extracted) {
        const extractedAllergens = Array.isArray(
          payload.extracted.allergens
        )
          ? payload.extracted.allergens
          : [];
        const allergensText = extractedAllergens.join(", ");
        setProAllergensInput(
          allergensText.length > 0
            ? allergensText
            : "keine rezeptorisch enthaltenen Allergene"
        );
        setProIngredientsInput(
          typeof payload.extracted.ingredients === "string"
            ? payload.extracted.ingredients
            : ""
        );
        setProDosageInput(
          typeof payload.extracted.dosage_instructions ===
            "string"
            ? payload.extracted.dosage_instructions
            : ""
        );
        if (
          payload.extracted.standard_preparation &&
          Array.isArray(payload.extracted.standard_preparation.components)
        ) {
          setStandardPreparationComponents(
            payload.extracted.standard_preparation.components
          );
        }
        let yieldWeight = "";
        let yieldVolume = "";
        const extractedYieldInfo =
          typeof payload.extracted.yield_info === "string"
            ? payload.extracted.yield_info
            : "";
        if (extractedYieldInfo.includes("|")) {
          const [weightRaw, volumeRaw] =
            extractedYieldInfo.split("|");
          yieldWeight = weightRaw.trim();
          yieldVolume = (volumeRaw ?? "").trim();
        } else if (extractedYieldInfo.includes("\n")) {
          const [line1, line2] =
            extractedYieldInfo.split("\n");
          yieldWeight = line1.trim();
          yieldVolume = (line2 ?? "").trim();
        } else {
          yieldWeight = extractedYieldInfo.trim();
        }
        if (
          typeof payload.extracted.yield_volume ===
            "string" &&
          payload.extracted.yield_volume.trim().length > 0
        ) {
          yieldVolume = payload.extracted.yield_volume.trim();
        }
        setProYieldWeightInput(yieldWeight);
        setProYieldVolumeInput(yieldVolume);
        if (
          typeof payload.extracted
            .manufacturer_article_number === "string"
        ) {
          setManufacturerInput(
            payload.extracted.manufacturer_article_number
          );
        }
        setProPreparationInput(
          typeof payload.extracted.preparation_steps ===
            "string"
            ? payload.extracted.preparation_steps
            : ""
        );
        setIsBioInput(!!payload.extracted.is_bio);
        setIsDeklarationsfreiInput(
          !!payload.extracted.is_deklarationsfrei
        );
        setIsAllergenfreiInput(
          !!payload.extracted.is_allergenfrei
        );
        setIsCookChillInput(
          !!payload.extracted.is_cook_chill
        );
        setIsFreezeThawStableInput(
          !!payload.extracted.is_freeze_thaw_stable
        );
        setIsPalmOilFreeInput(
          !!payload.extracted.is_palm_oil_free
        );
        setIsYeastFreeInput(
          !!payload.extracted.is_yeast_free
        );
        setIsLactoseFreeInput(
          !!payload.extracted.is_lactose_free
        );
        setIsGlutenFreeInput(
          !!payload.extracted.is_gluten_free
        );
      }
      if (payload.extracted && payload.fileUrl) {
        if (
          typeof payload.extracted.image_url === "string" &&
          payload.extracted.image_url.length > 0
        ) {
          setImageUrlInput(payload.extracted.image_url);
        }
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
          manufacturerArticleNumber:
            typeof payload.extracted
              .manufacturer_article_number === "string"
              ? payload.extracted.manufacturer_article_number
              : null,
          yieldVolume:
            typeof payload.extracted.yield_volume ===
              "string"
              ? payload.extracted.yield_volume
              : null,
          preparationText:
            typeof payload.extracted.preparation_steps ===
            "string"
              ? payload.extracted.preparation_steps
              : null,
          imageUrl:
            typeof payload.extracted.image_url === "string"
              ? payload.extracted.image_url
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
  }

  async function handleSaveProfiData(
    overrideDosageInstructions?: string | null
  ) {
    if (!selectedItem) {
      return;
    }
    try {
      setIsSaving(true);
      setError(null);
      const allergensArray = proAllergensInput
        .split(",")
        .map((value) => value.trim())
        .filter(
          (value) =>
            value.length > 0 &&
            value !== "keine rezeptorisch enthaltenen Allergene"
        );
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
      const imageUrlValue = imageUrlInput.trim() || undefined;
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
        const text = standardPreparationText.trim();
        if (cleanedComponents.length > 0 || text.length > 0) {
          parsedStandardPreparation = {
            components: cleanedComponents,
            text: text.length > 0 ? text : null,
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

      const nutritionPerUnitValue: NutritionTotals | null =
        proEnergyKcalInput ||
        proFatInput ||
        proSaturatedFatInput ||
        proCarbsInput ||
        proSugarInput ||
        proProteinInput ||
        proSaltInput
          ? {
              energyKcal: Number(proEnergyKcalInput.replace(",", ".")) || 0,
              fat: Number(proFatInput.replace(",", ".")) || 0,
              saturatedFat: Number(proSaturatedFatInput.replace(",", ".")) || 0,
              carbs: Number(proCarbsInput.replace(",", ".")) || 0,
              sugar: Number(proSugarInput.replace(",", ".")) || 0,
              protein: Number(proProteinInput.replace(",", ".")) || 0,
              salt: Number(proSaltInput.replace(",", ".")) || 0,
            }
          : null;

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
          dosageInstructions:
            overrideDosageInstructions ?? proDosageInput.trim(),
          yieldInfo: [proYieldWeightInput.trim(), proYieldVolumeInput.trim()]
            .filter((value) => value.length > 0)
            .join(" | "),
          preparationSteps: preparationStepsValue,
          targetPortions,
          targetSalesPrice,
          category: categoryValue,
          portionUnit: portionUnitValue,
          nutritionTags: nutritionTagsValue,
          nutritionPerUnit: nutritionPerUnitValue,
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
          packshotX: packshotPan.x,
          packshotY: packshotPan.y,
          packshotZoom: packshotZoom,
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

  async function handleDelete() {
    if (!selectedItem) return;

    if (
      !window.confirm(
        `Möchten Sie den Artikel "${selectedItem.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`
      )
    ) {
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch("/api/inventory", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedItem.id }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Fehler beim Löschen");
      }

      setItems((prev) => prev.filter((i) => i.id !== selectedItem.id));
      setSelectedItemId(null);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Fehler beim Löschen");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRecipeImageUpload(file: File) {
    if (!selectedItem) {
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
        setPackshotUrl(payload.imageUrl);
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

  // removed unused dosage helpers (merged into handleSaveAll)

  async function handleSaveAll() {
    if (!selectedItem) {
      return;
    }
    let dosageText = proDosageInput.trim();
    if (docDosageSteps.length > 0) {
      const lines = docDosageSteps.map((step) => {
        const original = step.line;
        if (!step.quantity) {
          return original;
        }
        const match = original.match(/(\d+([.,]\d+)?)/);
        if (!match || match.index === undefined) {
          return `${step.quantity} ${original}`;
        }
        const start = match.index;
        const end = start + match[0].length;
        const before = original.slice(0, start);
        const after = original.slice(end);
        return `${before}${step.quantity}${after}`;
      });
      dosageText = lines.join("\n");
    }
    await handleSaveProfiData(dosageText);
    if (isEditingComponents) {
      await handleSaveComponents();
    }
  }

  async function handleRecipeImageUrlSave() {
    if (!selectedItem) {
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
        if (updated.imageUrl) setPackshotUrl(updated.imageUrl);
        setItems((previous) =>
          previous.map((item) =>
            item.id === updated.id ? { ...item, ...updated } : item
          )
        );
      } else {
        if (trimmed.length > 0) setPackshotUrl(trimmed);
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
        nutritionPerUnit?: NutritionTotals | null;
        dosageInstructions?: string | null;
      };
      setAiParsed({
        name: data.name,
        unit: data.unit,
        quantity: data.quantity,
        purchasePrice: data.purchase_price,
        calculatedPricePerUnit: data.calculated_price_per_unit,
        standardPreparation: data.standardPreparation ?? null,
        preparationText: data.preparationText ?? null,
        nutritionPerUnit: data.nutritionPerUnit ?? null,
        dosageInstructions: data.dosageInstructions ?? null,
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
          nutritionPerUnit: aiParsed.nutritionPerUnit ?? null,
          dosageInstructions: aiParsed.dosageInstructions ?? null,
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

  // removed unused handleCreateRecipe (creation handled in header action)

  function formatInternalId(value?: number | null) {
    if (!value || Number.isNaN(value)) {
      return "—";
    }
    return `INT-${value}`;
  }

  const handleSaveCrop = async () => {
    if (!crop || !packshotImgRef.current || !selectedItem) return;

    const image = packshotImgRef.current;
    const canvas = document.createElement("canvas");
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    // Use the crop width/height for the canvas
    const pixelCrop = {
      x: crop.x * scaleX,
      y: crop.y * scaleY,
      width: crop.width * scaleX,
      height: crop.height * scaleY,
    };

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      try {
        setImageIsUploading(true);
        setImageUploadError(null);
        
        // Use a new file name
        const file = new File([blob], "packshot-crop.jpg", { type: "image/jpeg" });
        const formData = new FormData();
        formData.append("file", file);
        formData.append("itemId", selectedItem.id);

        const response = await fetch("/api/recipe-image-upload", {
          method: "POST",
          body: formData,
        });

        const payload = (await response.json());
        if (!response.ok) {
           throw new Error(payload.error || "Fehler beim Hochladen des Ausschnitts");
        }

        if (payload.imageUrl) {
          const freshUrl = `${payload.imageUrl}?t=${Date.now()}`;
          setPackshotUrl(freshUrl);
          setItems((prev) =>
            prev.map((item) =>
              item.id === selectedItem.id ? { ...item, imageUrl: freshUrl } : item
            )
          );
          // Reset crop
          setCrop(undefined);
        }
      } catch (err) {
        setImageUploadError(err instanceof Error ? err.message : "Upload fehlgeschlagen");
      } finally {
        setImageIsUploading(false);
      }
    }, "image/jpeg", 0.95);
  };

  return (
    <div className="flex flex-1 overflow-hidden bg-[#F6F7F5] text-[#1F2326]">
      {activeSection === "zutaten" && (
        <aside className="flex w-[280px] shrink-0 flex-col border-r border-[#6B7176] bg-[#1F2326]">
          <div className="flex flex-col gap-3 border-b border-[#6B7176] p-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-[#6B7176]" />
              <Input
                placeholder="Suchen..."
                className="h-9 border-[#6B7176] bg-[#2A2E33] pl-8 text-xs text-white placeholder:text-[#6B7176]"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-1">
              <Badge
                variant="outline"
                className="h-5 cursor-pointer border-[#6B7176] px-2 text-[10px] text-white hover:bg-white/10"
              >
                Trockenlager
              </Badge>
              <Badge
                variant="outline"
                className="h-5 cursor-pointer border-[#6B7176] px-2 text-[10px] text-white hover:bg-white/10"
              >
                Kühlung
              </Badge>
              <Badge
                variant="outline"
                className="h-5 cursor-pointer border-[#6B7176] px-2 text-[10px] text-white hover:bg-white/10"
              >
                Obst/Gemüse
              </Badge>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col">
              {filteredItems.length === 0 && (
                <div className="py-4 text-center text-xs text-[#6B7176]">
                  Keine Artikel gefunden.
                </div>
              )}
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedItemId(item.id);
                    setIsDetailView(true);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-xs transition-colors hover:bg-white/5",
                    selectedItem?.id === item.id && "bg-white/10 text-white font-medium",
                    selectedItem?.id !== item.id && "text-[#9CA3AF]"
                  )}
                >
                  <span className="truncate">{item.name}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>
      )}

      <main className="flex flex-1 flex-col min-w-0 overflow-hidden bg-[#F6F7F5]">
        <header className="flex items-center justify-between border-b border-[#6B7176] bg-[#1F2326] px-6 py-3 text-white">
          <div>
            <h1 className="text-lg font-semibold">
              {activeSection === "zutaten"
                ? "Zutaten Manager"
                : activeSection === "rezepte"
                ? "Rezept Manager"
                : "Lager Manager"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-6">
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
                            "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-xs transition-colors hover:bg-accent hover:text-accent-foreground",
                            selectedItem?.id === item.id &&
                              "bg-primary/10 text-primary font-medium"
                          )}
                        >
                          <span className="truncate">{item.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            )}
          {activeSection === "lager" && (
            <Card className="col-span-full flex flex-col" key="lager-placeholder">
              <CardHeader>
                <CardTitle>Platzhalter</CardTitle>
                <CardDescription>Mehr Funktionen folgen.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
                  Lagerverwaltung wird hier bereitgestellt.
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === "zutaten" ? (
            <div className="flex h-full flex-col gap-4 overflow-y-auto bg-[#F6F7F5] p-6">
              <div className="grid min-h-[600px] grid-cols-[1fr_3fr] gap-4">
                <Card className="flex flex-col overflow-hidden border-none bg-white shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 border-b border-[#E5E7EB] px-4 py-3">
                    <CardTitle className="text-base text-[#1F2326]">Artikel-Import</CardTitle>

                  </CardHeader>
                  <CardContent className="flex-1 overflow-y-auto p-0">
                    <div className="flex justify-center p-4 border-b border-[#E5E7EB]">
                      <Button
                        type="button"
                        size="sm"
                        className="w-fit px-6 bg-[#4F8F4E] text-white hover:bg-[#3d7a3c]"
                        disabled={isSaving}
                        onClick={async () => {
                          try {
                            setIsSaving(true);
                            setError(null);
                            const isRecipe = false;
                            const response = await fetch("/api/inventory", {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({
                                name: "Neuer Artikel",
                                type: "zukauf",
                                unit: "Stück",
                                purchasePrice: 0,
                                components: [],
                              }),
                            });
                            if (!response.ok) {
                              let message = "Fehler beim Anlegen.";
                              try {
                                const payload = (await response.json()) as { error?: unknown };
                                if (payload && typeof payload.error === "string") {
                                  message = payload.error;
                                }
                              } catch {}
                              throw new Error(message);
                            }
                            const created = (await response.json()) as InventoryItem;
                            setItems((previous) => [...previous, created]);
                            setSelectedItemId(created.id);
                            setIsDetailView(true);
                          } catch (error) {
                            const message =
                              error instanceof Error ? error.message : "Fehler beim Anlegen.";
                            setError(message);
                          } finally {
                            setIsSaving(false);
                          }
                        }}
                      >
                        {isSaving ? "Erstelle..." : "Neuen Artikel anlegen"}
                      </Button>
                    </div>
                    <div className="space-y-2 rounded-md border border-[#E5E7EB] bg-[#F6F7F5]/50 p-3 text-xs">
                       <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold text-[#1F2326]">Dokumenten-Upload</div>
                        {docError && <span className="text-[11px] text-destructive">{docError}</span>}
                      </div>
                      <form
                        className="space-y-2"
                        onSubmit={async (event) => {
                          event.preventDefault();
                          if (!docFile) return;
                          await handleDocumentUpload(docFile);
                        }}
                      >
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={(event) => {
                            const file = event.target.files && event.target.files[0] ? event.target.files[0] : null;
                            setDocFile(file);
                            setDocParsed(null);
                            setDocError(null);
                          }}
                          className="block w-full text-[11px] text-[#6B7176] file:mr-2 file:rounded-md file:border file:border-[#E5E7EB] file:bg-white file:px-2 file:py-1 file:text-[11px] file:font-medium file:text-[#1F2326] hover:file:bg-[#F6F7F5]"
                        />
                        <div className="flex justify-end gap-2">
                          <Button type="submit" size="sm" className="bg-[#4F8F4E] text-white hover:bg-[#3d7a3c]" disabled={docIsUploading || !docFile}>
                            {docIsUploading ? "Lade hoch..." : "Dokument auswerten"}
                          </Button>
                        </div>
                      </form>
                    </div>
                    
                    <div className="space-y-2 rounded-md border border-[#E5E7EB] bg-[#F6F7F5]/50 p-3 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold text-[#1F2326]">KI-Schnellimport</div>
                        {aiError && <span className="text-[11px] text-destructive">{aiError}</span>}
                      </div>
                      <form className="space-y-2" onSubmit={handleAiParse}>
                        <textarea
                          value={aiText}
                          onChange={(event) => setAiText(event.target.value)}
                          rows={2}
                          className="w-full rounded-md border border-[#E5E7EB] bg-white px-2 py-1 text-xs text-[#1F2326] placeholder:text-[#6B7176] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F8F4E] focus-visible:ring-offset-2"
                          placeholder='Beispiel: 3kg Sack Mehl Type 405 für 4,50€ bei Metro'
                        />
                        <div className="flex justify-end gap-2">
                          <Button type="submit" size="sm" className="bg-[#4F8F4E] text-white hover:bg-[#3d7a3c]" disabled={aiIsParsing || !aiText.trim()}>
                            {aiIsParsing ? "Analysiere..." : "Analysieren"}
                          </Button>
                        </div>
                      </form>
                    </div>


                  </CardContent>
                </Card>

                <Card className="flex flex-col overflow-hidden border-none bg-white shadow-sm">
                   <CardHeader className="flex flex-row items-center justify-between gap-2 border-b border-[#E5E7EB] px-4 py-3">
                      <div className="flex items-center gap-2">
                         <CardTitle className="text-base text-[#1F2326]">Stammdaten</CardTitle>
                         {selectedItem && (
                            <Button
                              size="sm"
                              className="h-6 border border-destructive/20 bg-destructive/5 px-2 text-destructive hover:bg-destructive/10"
                              onClick={handleDelete}
                            >
                              Artikel löschen
                            </Button>
                         )}
                         <Button 
                           size="sm" 
                           className="h-6 bg-[#4F8F4E] px-2 text-white hover:bg-[#3d7a3c]"
                           onClick={async () => {
                              try {
                                 setIsSaving(true);
                                 await handleSaveProfiData();
                              } catch (e) {
                                 setError(e instanceof Error ? e.message : "Fehler beim Speichern");
                              } finally {
                                 setIsSaving(false);
                              }
                           }}
                         >
                           Speichern
                         </Button>
                      </div>
                      <div className="flex gap-1">
                         <Badge variant="outline" className="border-[#E5E7EB] text-[10px] font-normal text-[#6B7176] hover:bg-[#F6F7F5]">Trockenlager</Badge>
                         <Badge variant="outline" className="border-[#E5E7EB] text-[10px] font-normal text-[#6B7176] hover:bg-[#F6F7F5]">Kühlung</Badge>
                         <Badge variant="outline" className="border-[#E5E7EB] text-[10px] font-normal text-[#6B7176] hover:bg-[#F6F7F5]">Obst/Gemüse</Badge>
                      </div>
                   </CardHeader>
                   <CardContent className="flex-1 overflow-y-auto p-4">
                      {selectedItem ? (
                         <div className="space-y-4">
                            {packshotPreview && (
                                <div className="flex flex-col items-center mb-4">
                                    <div className="text-[10px] font-medium text-[#6B7176] mb-1 w-full text-left">Packshot-Fokus</div>
                                    <div 
                                        className="relative h-40 w-40 overflow-hidden rounded-md border border-gray-200 bg-white cursor-move touch-none"
                                        onMouseDown={handlePanMouseDown}
                                        onMouseMove={handlePanMouseMove}
                                        onMouseUp={handlePanMouseUp}
                                        onMouseLeave={handlePanMouseUp}
                                    >
                                        <img 
                                            src={packshotPreview} 
                                            alt="Packshot Focus" 
                                            className="max-w-none absolute origin-top-left pointer-events-none select-none"
                                            style={{ 
                                                transform: `translate(${packshotPan.x}px, ${packshotPan.y}px)`,
                                                width: `${packshotZoom * 100}%`, 
                                                height: 'auto'
                                            }}
                                            draggable={false}
                                        />
                                    </div>
                                    <div className="text-[9px] text-[#6B7176] mt-1">
                                        Ausschnitt verschieben
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <div className="flex items-center rounded-md border border-[#E5E7EB] bg-white p-0.5 shadow-sm">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-5 w-5 p-0 text-[#6B7176] hover:bg-[#F6F7F5]"
                                                onClick={handleZoomOut}
                                            >
                                                <Minus className="h-3 w-3" />
                                            </Button>
                                            <div className="flex h-5 w-5 items-center justify-center border-l border-r border-[#E5E7EB] text-[#6B7176]">
                                                <ZoomIn className="h-3 w-3" />
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-5 w-5 p-0 text-[#6B7176] hover:bg-[#F6F7F5]"
                                                onClick={handleZoomIn}
                                            >
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <Button
                                            size="sm"
                                            className="h-6 bg-[#F28C28] px-2 text-[10px] text-white hover:bg-[#d67b23]"
                                            onClick={async (e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                if (selectedItem) {
                                                    setItems((prev) => prev.map((item) => {
                                                        if (item.id === selectedItem.id) {
                                                            return {
                                                                ...item,
                                                                packshotX: packshotPan.x,
                                                                packshotY: packshotPan.y,
                                                                packshotZoom: packshotZoom,
                                                            };
                                                        }
                                                        return item;
                                                    }));
                                                    try {
                                                       setIsSaving(true);
                                                       await handleSaveProfiData();
                                                    } catch (e) {
                                                       setError(e instanceof Error ? e.message : "Fehler beim Speichern");
                                                    } finally {
                                                       setIsSaving(false);
                                                    }
                                                }
                                            }}
                                        >
                                            Fokus fixieren
                                        </Button>
                                    </div>
                                </div>
                            )}
                            <div className="grid gap-4">
                               <div className="grid gap-2">
                                  <label className="text-xs font-medium text-[#1F2326]">Artikelname</label>
                                  <Input 
                                    value={selectedItem.name} 
                                    className="border-[#E5E7EB] bg-white text-[#1F2326]"
                                    onChange={(e) => {
                                       const val = e.target.value;
                                       setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, name: val } : i));
                                    }}
                                  />
                               </div>
                               <div className="grid grid-cols-2 gap-4">
                                  <div className="grid gap-2">
                                    <label className="text-xs font-medium text-[#1F2326]">Einheit</label>
                                    <Input value={selectedItem.unit} 
                                      className="border-[#E5E7EB] bg-white text-[#1F2326]"
                                      onChange={(e) => {
                                       const val = e.target.value;
                                       setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, unit: val } : i));
                                    }} />
                                  </div>
                                  <div className="grid gap-2">
                                    <label className="text-xs font-medium text-[#1F2326]">EK-Preis</label>
                                    <Input 
                                      type="number" 
                                      value={selectedItem.purchasePrice} 
                                      className="border-[#E5E7EB] bg-white text-[#1F2326]"
                                      onChange={(e) => {
                                         const val = parseFloat(e.target.value);
                                         setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, purchasePrice: val } : i));
                                      }} 
                                    />
                                  </div>
                               </div>

                               <div className="grid gap-2">
                                 <div className="flex items-center justify-between">
                                   <label className="text-xs font-medium text-[#1F2326]">Dosierungsangaben</label>
                                   <Button
                                     type="button"
                                     variant="ghost"
                                     size="sm"
                                     className="h-6 w-6 p-0"
                                     onClick={() => {
                                       const currentPrep = selectedItem.standardPreparation || { components: [], text: "" };
                                       const newComponents = [...(currentPrep.components || []), { name: "", quantity: 0, unit: "" }];
                                       setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, standardPreparation: { ...currentPrep, components: newComponents } } : i));
                                     }}
                                   >
                                     <Plus className="h-3 w-3" />
                                   </Button>
                                 </div>
                                 <div className="space-y-2">
                                   {(selectedItem.standardPreparation?.components || []).map((comp, idx) => (
                                     <div key={idx} className="flex gap-2">
                                        <Input
                                          placeholder="Zutat"
                                          value={comp.name}
                                          className="h-7 text-xs border-[#E5E7EB] bg-white text-[#1F2326]"
                                          onChange={(e) => {
                                             const val = e.target.value;
                                             const currentPrep = selectedItem.standardPreparation!;
                                             const newComponents = [...currentPrep.components];
                                             newComponents[idx] = { ...newComponents[idx], name: val };
                                             setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, standardPreparation: { ...currentPrep, components: newComponents } } : i));
                                          }}
                                        />
                                        <Input
                                          type="number"
                                          placeholder="Menge"
                                          value={comp.quantity}
                                          className="h-7 w-16 text-xs border-[#E5E7EB] bg-white text-[#1F2326]"
                                          onChange={(e) => {
                                             const val = parseFloat(e.target.value) || 0;
                                             const currentPrep = selectedItem.standardPreparation!;
                                             const newComponents = [...currentPrep.components];
                                             newComponents[idx] = { ...newComponents[idx], quantity: val };
                                             setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, standardPreparation: { ...currentPrep, components: newComponents } } : i));
                                          }}
                                        />
                                        <Input
                                          placeholder="Einheit"
                                          value={comp.unit}
                                          className="h-7 w-16 text-xs border-[#E5E7EB] bg-white text-[#1F2326]"
                                          onChange={(e) => {
                                             const val = e.target.value;
                                             const currentPrep = selectedItem.standardPreparation!;
                                             const newComponents = [...currentPrep.components];
                                             newComponents[idx] = { ...newComponents[idx], unit: val };
                                             setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, standardPreparation: { ...currentPrep, components: newComponents } } : i));
                                          }}
                                        />
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                                          onClick={() => {
                                             const currentPrep = selectedItem.standardPreparation!;
                                             const newComponents = currentPrep.components.filter((_, i) => i !== idx);
                                             setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, standardPreparation: { ...currentPrep, components: newComponents } } : i));
                                          }}
                                        >
                                          <Minus className="h-3 w-3" />
                                        </Button>
                                     </div>
                                   ))}
                                   {(!selectedItem.standardPreparation?.components || selectedItem.standardPreparation.components.length === 0) && (
                                      <div className="text-[10px] text-muted-foreground italic">Keine Dosierung hinterlegt.</div>
                                   )}
                                 </div>
                               </div>

                               <div className="grid gap-2">
                                 <label className="text-xs font-medium text-[#1F2326]">Zubereitungsempfehlung</label>
                                 <Textarea
                                   value={typeof selectedItem.preparationSteps === 'string' ? selectedItem.preparationSteps : ''}
                                   className="min-h-[80px] text-xs border-[#E5E7EB] bg-white text-[#1F2326]"
                                   placeholder="Zubereitungsschritte hier eingeben..."
                                   onChange={(e) => {
                                      const val = e.target.value;
                                      setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, preparationSteps: val } : i));
                                   }}
                                 />
                               </div>

                               <div className="flex justify-between items-center">
                                  {/* Buttons moved to header */}
                               </div>
                            </div>
                         </div>
                      ) : (
                         <div className="flex h-full flex-col items-center justify-center text-[#6B7176] text-xs">
                            <p>Wähle einen Artikel aus der Liste.</p>
                         </div>
                      )}
                   </CardContent>
                </Card>
              </div>


            </div>
          ) : (
            <>
              <Card className="flex flex-col" key={activeSection}>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <div>
                    <CardTitle>Artikel-Import</CardTitle>
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
                      if (!docFile) return;
                      await handleDocumentUpload(docFile);
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
                  {(docParsed?.fileUrl || selectedItem?.fileUrl) && (
                    <div className="space-y-2">

                      <div className="text-[11px] font-medium">
                        Dokumentenvorschau
                      </div>
                      {docPreviewError && (
                        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-[11px] text-destructive">
                          {docPreviewError}
                        </div>
                      )}
                      {docPreviewIsGenerating && (
                        <div className="rounded-md border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
                          Packshot wird erzeugt...
                        </div>
                      )}
                      
                      <div className="rounded-md border bg-background w-full max-w-full overflow-hidden flex flex-col items-center min-h-[400px]">
                        {previewImage ? (
                            <img
                                src={previewImage}
                                alt="Original Source Document"
                                className="w-full h-auto object-contain"
                            />
                        ) : (
                           (() => {
                                const url = (docParsed && docParsed.fileUrl) || (selectedItem && selectedItem.fileUrl) || "";
                                const isPdf = url.toLowerCase().endsWith(".pdf");
                                return isPdf ? (
                                    <object
                                        data={url}
                                        type="application/pdf"
                                        className="h-[600px] w-full"
                                    >
                                        <a href={url} target="_blank" rel="noreferrer" className="block p-2 text-[11px]">
                                            PDF öffnen
                                        </a>
                                    </object>
                                ) : (
                                    <div className="p-4 text-xs text-muted-foreground">
                                        Keine Vorschau verfügbar.
                                    </div>
                                );
                           })()
                        )}
                      </div>


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
                    {filteredItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSelectedItemId(item.id);
                          setIsDetailView(true);
                        }}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                          selectedItem?.id === item.id &&
                            "bg-primary/10 text-primary font-medium"
                        )}
                      >
                        <span className="truncate">{item.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

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
                </div>
              </div>
              {selectedItem && selectedItem.type === "eigenproduktion" && (
                <div className="inline-flex rounded-md border bg-muted/40 p-1 text-[11px]">
                  <Button
                    type="button"
                    variant={isRecipePresentationMode ? "outline" : "default"}
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => setIsRecipePresentationMode(false)}
                  >
                    Bearbeiten
                  </Button>
                  <Button
                    type="button"
                    variant={isRecipePresentationMode ? "default" : "outline"}
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => setIsRecipePresentationMode(true)}
                  >
                    Präsentation
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
                            <Image
                              unoptimized
                              src={selectedItem.imageUrl}
                              alt={selectedItem.name}
                              fill
                              className="object-cover"
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
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start">
                    <div className="w-full max-w-xs sm:max-w-sm">
                      <div
                        className={cn(
                          "relative flex h-[300px] w-full items-center justify-center overflow-hidden rounded-md border border-dashed bg-muted/40 text-[11px] transition-colors",
                          isImageDropActive && "border-primary bg-primary/5",
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
                          <Image
                            unoptimized
                            src={imageUrlInput || selectedItem.imageUrl || ""}
                            alt={selectedItem.name}
                            fill
                            className="object-cover"
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
                            event.target.files && event.target.files[0]
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
                      <div className="mt-2 flex items-center gap-2">
                      </div>
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
                      {selectedItem.type !== "eigenproduktion" && (
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
                      )}
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
                      <div className="space-y-2 rounded-md border bg-muted/40 px-3 py-3 text-xs">
                        <div className="space-y-1">
                          <div className="text-[11px] text-muted-foreground">
                            Dosierung / Mischverhältnis (Text)
                          </div>
                          <textarea
                            rows={2}
                            value={proDosageInput}
                            onChange={(event) =>
                              setProDosageInput(event.target.value)
                            }
                            className="w-full rounded-md border border-input px-2 py-1 text-[11px] text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                            style={{ backgroundColor: "#F6F7F5" }}
                            placeholder="Mischverhältnisse und Basismengen (z.B. 100g auf 1l)"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="text-[11px] text-muted-foreground">
                              Dosierung (Strukturiert)
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 px-2 text-[10px]"
                              onClick={() => {
                                setStandardPreparationComponents([
                                  ...standardPreparationComponents,
                                  { name: "", quantity: 0, unit: "" },
                                ]);
                              }}
                            >
                              <Plus className="mr-1 h-3 w-3" />
                              Zeile
                            </Button>
                          </div>
                          <div className="space-y-1 rounded-md border border-dashed p-2">
                            {standardPreparationComponents.map((comp, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2"
                              >
                                <Input
                                  type="number"
                                  className="h-7 w-20 px-2 py-1 text-[11px]"
                                  placeholder="Menge"
                                  value={comp.quantity || ""}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    const newComps = [
                                      ...standardPreparationComponents,
                                    ];
                                    newComps[idx] = {
                                      ...newComps[idx],
                                      quantity: isNaN(val) ? 0 : val,
                                    };
                                    setStandardPreparationComponents(newComps);
                                  }}
                                />
                                <Input
                                  className="h-7 w-20 px-2 py-1 text-[11px]"
                                  placeholder="Einheit"
                                  value={comp.unit}
                                  onChange={(e) => {
                                    const newComps = [
                                      ...standardPreparationComponents,
                                    ];
                                    newComps[idx] = {
                                      ...newComps[idx],
                                      unit: e.target.value,
                                    };
                                    setStandardPreparationComponents(newComps);
                                  }}
                                />
                                <Input
                                  className="h-7 flex-1 px-2 py-1 text-[11px]"
                                  placeholder="Komponente"
                                  value={comp.name}
                                  onChange={(e) => {
                                    const newComps = [
                                      ...standardPreparationComponents,
                                    ];
                                    newComps[idx] = {
                                      ...newComps[idx],
                                      name: e.target.value,
                                    };
                                    setStandardPreparationComponents(newComps);
                                  }}
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                  onClick={() => {
                                    const newComps =
                                      standardPreparationComponents.filter(
                                        (_, i) => i !== idx
                                      );
                                    setStandardPreparationComponents(newComps);
                                  }}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                            {standardPreparationComponents.length === 0 && (
                              <div className="text-[10px] italic text-muted-foreground">
                                Keine strukturierten Daten.
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[11px] text-muted-foreground">
                            Zubereitungsanweisung
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

                        <div className="space-y-1">
                          <div className="text-[11px] text-muted-foreground">
                            Zutatenliste (Deklaration)
                          </div>
                          <textarea
                            rows={3}
                            value={proIngredientsInput}
                            onChange={(event) =>
                              setProIngredientsInput(event.target.value)
                            }
                            className="w-full rounded-md border border-input bg-background px-2 py-1 text-[11px] text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <div className="text-[11px] text-muted-foreground">
                              Fertig-Gewicht (g/kg)
                            </div>
                            <Input
                              type="text"
                              value={proYieldWeightInput}
                              onChange={(event) =>
                                setProYieldWeightInput(event.target.value)
                              }
                              className="h-7 w-full px-2 py-1 text-[11px]"
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="text-[11px] text-muted-foreground">
                              End-Volumen (ml/l)
                            </div>
                            <Input
                              type="text"
                              value={proYieldVolumeInput}
                              onChange={(event) =>
                                setProYieldVolumeInput(event.target.value)
                              }
                              className="h-7 w-full px-2 py-1 text-[11px]"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="text-[11px] text-muted-foreground">
                            Hersteller-Artikelnummer
                          </div>
                          <Input
                            type="text"
                            value={manufacturerInput}
                            onChange={(event) =>
                              setManufacturerInput(event.target.value)
                            }
                            className="h-7 w-full px-2 py-1 text-[11px]"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2 rounded-md border p-2 text-[10px] md:grid-cols-3">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={isBioInput}
                              onChange={(e) => setIsBioInput(e.target.checked)}
                              id="check-bio"
                              className="h-3 w-3 rounded border-gray-300"
                            />
                            <label htmlFor="check-bio">Bio</label>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={isDeklarationsfreiInput}
                              onChange={(e) =>
                                setIsDeklarationsfreiInput(e.target.checked)
                              }
                              id="check-dekla"
                              className="h-3 w-3 rounded border-gray-300"
                            />
                            <label htmlFor="check-dekla">
                              Deklarationsfrei
                            </label>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={isAllergenfreiInput}
                              onChange={(e) =>
                                setIsAllergenfreiInput(e.target.checked)
                              }
                              id="check-allergen"
                              className="h-3 w-3 rounded border-gray-300"
                            />
                            <label htmlFor="check-allergen">Allergenfrei</label>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={isCookChillInput}
                              onChange={(e) =>
                                setIsCookChillInput(e.target.checked)
                              }
                              id="check-cookchill"
                              className="h-3 w-3 rounded border-gray-300"
                            />
                            <label htmlFor="check-cookchill">Cook & Chill</label>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={isFreezeThawStableInput}
                              onChange={(e) =>
                                setIsFreezeThawStableInput(e.target.checked)
                              }
                              id="check-freeze"
                              className="h-3 w-3 rounded border-gray-300"
                            />
                            <label htmlFor="check-freeze">TK-stabil</label>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={isPalmOilFreeInput}
                              onChange={(e) =>
                                setIsPalmOilFreeInput(e.target.checked)
                              }
                              id="check-palm"
                              className="h-3 w-3 rounded border-gray-300"
                            />
                            <label htmlFor="check-palm">Palmölfrei</label>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={isYeastFreeInput}
                              onChange={(e) =>
                                setIsYeastFreeInput(e.target.checked)
                              }
                              id="check-yeast"
                              className="h-3 w-3 rounded border-gray-300"
                            />
                            <label htmlFor="check-yeast">Hefefrei</label>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={isLactoseFreeInput}
                              onChange={(e) =>
                                setIsLactoseFreeInput(e.target.checked)
                              }
                              id="check-lactose"
                              className="h-3 w-3 rounded border-gray-300"
                            />
                            <label htmlFor="check-lactose">Laktosefrei</label>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={isGlutenFreeInput}
                              onChange={(e) =>
                                setIsGlutenFreeInput(e.target.checked)
                              }
                              id="check-gluten"
                              className="h-3 w-3 rounded border-gray-300"
                            />
                            <label htmlFor="check-gluten">Glutenfrei</label>
                          </div>
                        </div>

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
                        <div className="space-y-1 pt-2">
                          <div className="text-[11px] font-medium text-muted-foreground">
                            Nährwerte (pro 100g/ml)
                          </div>
                          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                            <div className="space-y-0.5">
                              <label className="text-[10px] text-muted-foreground">
                                Energie (kcal)
                              </label>
                              <Input
                                type="number"
                                value={proEnergyKcalInput}
                                onChange={(e) =>
                                  setProEnergyKcalInput(e.target.value)
                                }
                                className="h-7 px-2 py-1 text-[11px]"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <label className="text-[10px] text-muted-foreground">
                                Fett
                              </label>
                              <Input
                                type="number"
                                value={proFatInput}
                                onChange={(e) => setProFatInput(e.target.value)}
                                className="h-7 px-2 py-1 text-[11px]"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <label className="text-[10px] text-muted-foreground">
                                ges. Fettsäuren
                              </label>
                              <Input
                                type="number"
                                value={proSaturatedFatInput}
                                onChange={(e) =>
                                  setProSaturatedFatInput(e.target.value)
                                }
                                className="h-7 px-2 py-1 text-[11px]"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <label className="text-[10px] text-muted-foreground">
                                Kohlenhydrate
                              </label>
                              <Input
                                type="number"
                                value={proCarbsInput}
                                onChange={(e) =>
                                  setProCarbsInput(e.target.value)
                                }
                                className="h-7 px-2 py-1 text-[11px]"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <label className="text-[10px] text-muted-foreground">
                                Zucker
                              </label>
                              <Input
                                type="number"
                                value={proSugarInput}
                                onChange={(e) => setProSugarInput(e.target.value)}
                                className="h-7 px-2 py-1 text-[11px]"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <label className="text-[10px] text-muted-foreground">
                                Eiweiß
                              </label>
                              <Input
                                type="number"
                                value={proProteinInput}
                                onChange={(e) =>
                                  setProProteinInput(e.target.value)
                                }
                                className="h-7 px-2 py-1 text-[11px]"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <label className="text-[10px] text-muted-foreground">
                                Salz
                              </label>
                              <Input
                                type="number"
                                value={proSaltInput}
                                onChange={(e) => setProSaltInput(e.target.value)}
                                className="h-7 px-2 py-1 text-[11px]"
                              />
                            </div>
                          </div>
                        </div>
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
                                Fertig-Gewicht (g/kg)
                              </div>
                              <textarea
                                rows={2}
                                value={proYieldWeightInput}
                                onChange={(event) =>
                                  setProYieldWeightInput(event.target.value)
                                }
                                className="w-full rounded-md border border-input bg-background px-2 py-1 text-[11px] text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                              />
                            </div>
                            <div className="space-y-1">
                              <div className="text-[11px] text-muted-foreground">
                                End-Volumen (ml/l)
                              </div>
                              <textarea
                                rows={2}
                                value={proYieldVolumeInput}
                                onChange={(event) =>
                                  setProYieldVolumeInput(event.target.value)
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
                                                  : []
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
                                        className={cn(
                                          "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-xs transition-colors hover:bg-accent hover:text-accent-foreground",
                                          adHocSelectedItemId === item.id &&
                                            "bg-primary/10 text-primary font-medium"
                                        )}
                                        onClick={() => {
                                          setAdHocSelectedItemId(item.id);
                                          setAdHocName(item.name);
                                          setAdHocUnit(item.unit);
                                          setAdHocPrice(
                                            item.purchasePrice.toFixed(2)
                                          );
                                        }}
                                      >
                                        <span className="truncate">{item.name}</span>
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
                        <div className="space-y-1">
                          <div className="text-[11px] text-muted-foreground">
                            Dosierung / Mischverhältnis
                          </div>
                          <textarea
                            rows={2}
                            value={proDosageInput}
                            onChange={(event) =>
                              setProDosageInput(event.target.value)
                            }
                            className="w-full rounded-md border border-input px-2 py-1 text-[11px] text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                            style={{ backgroundColor: "#F6F7F5" }}
                            placeholder="Mischverhältnisse und Basismengen (z.B. 100g auf 1l)"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="text-[11px] text-muted-foreground">
                            Zubereitungsanweisung
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
                      </div>
                      <div className="space-y-2 rounded-md border bg-muted/40 px-3 py-3 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-xs font-semibold">Schritte (Erweitert)</h3>
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
                                            <Image
                                              unoptimized
                                              src={step.imageUrl}
                                              alt={`Schritt ${index + 1}`}
                                              width={800}
                                              height={600}
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
                                              <Image
                                                unoptimized
                                                src={step.imageUrl}
                                                alt={`Schritt ${index + 1}`}
                                                width={800}
                                                height={600}
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
                      {selectedItem.type === "eigenproduktion" && nutritionSummary && (
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
                  <div className="text-xs text-muted-foreground">
                    Diese Ansicht zeigt alle IDs und Produktspezifikationen für den Artikel.
                  </div>
                  {selectedItem.type !== "eigenproduktion" && (
                    <div className="space-y-2 rounded-md border bg-muted/40 p-3 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-xs font-semibold">
                          Produktspezifikationen
                        </h3>
                      </div>
                      {selectedItem.fileUrl && (
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              window.open(
                                selectedItem.fileUrl as string,
                                "_blank",
                                "noopener,noreferrer"
                              );
                            }}
                          >
                            Öffnen
                          </Button>
                          <div className="text-[11px] text-muted-foreground ml-1">
                            Original-Datenblatt
                          </div>
                        </div>
                      )}
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
                            Fertig-Gewicht (g/kg)
                          </div>
                          <textarea
                            rows={2}
                            value={proYieldWeightInput}
                            onChange={(event) =>
                              setProYieldWeightInput(event.target.value)
                            }
                            className="w-full rounded-md border border-input bg-background px-2 py-1 text-[11px] text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="text-[11px] text-muted-foreground">
                            End-Volumen (ml/l)
                          </div>
                          <textarea
                            rows={2}
                            value={proYieldVolumeInput}
                            onChange={(event) =>
                              setProYieldVolumeInput(event.target.value)
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
                            className="w-full rounded-md border border-input px-2 py-1 text-[11px] text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                            style={{ backgroundColor: "#F6F7F5" }}
                            placeholder="Mischverhältnisse und Basismengen (z.B. 100g auf 1l)"
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
                                    <Image
                                      unoptimized
                                      src={specItem.imageUrl}
                                      alt={specItem.name}
                                      fill
                                      className="object-cover"
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
                                  specItem.manufacturerArticleNumber.trim()
                                    .length > 0
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
            {selectedItem && (
              <div className="flex justify-end gap-2 px-6 pb-6">
                <Button
                  type="button"
                  size="sm"
                  className="bg-emerald-600 px-3 py-1 text-[11px] font-medium text-emerald-50 hover:bg-emerald-700"
                  disabled={isSaving}
                  onClick={() => {
                    void handleSaveAll();
                  }}
                >
                  {isSaving ? "Speichere..." : "Artikel speichern"}
                </Button>
                {selectedItem.type !== "eigenproduktion" && (
                  <Button
                    type="button"
                    size="sm"
                    className="border border-red-500 bg-red-500/10 px-3 py-1 text-[11px] font-medium text-red-700 hover:bg-red-500/20"
                    onClick={async () => {
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
                          let message = "Fehler beim Löschen des Artikels.";
                          if (payload && typeof payload.error === "string") {
                            message = payload.error;
                          }
                          throw new Error(message);
                        }
                        setItems((previous) =>
                          previous.filter((item) => item.id !== selectedItem.id)
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
            )}
          </Card>
            </>
          )}
        </div>
      </main>
      {imageViewer ? (
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
            <Image
              unoptimized
              src={imageViewer?.imageUrl}
              alt="Zubereitungsschritt"
              width={1600}
              height={1200}
              className="max-h-[90vh] max-w-[90vw] rounded-md object-contain"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}


type TypeBadgeProps = {
  type: InventoryType;
};

function TypeBadge({ type }: TypeBadgeProps) {
  if (type === "zukauf") {
    return null;
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
