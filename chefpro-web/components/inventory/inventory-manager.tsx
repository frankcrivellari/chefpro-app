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
import * as pdfjsLib from "pdfjs-dist";
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
  Copy,
  Check,
  Clipboard,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Maximize2,
  X,
  Trash2,
} from "lucide-react";
import { SmartIngredientMatrix, type InventoryComponent as SmartInventoryComponent } from "@/components/inventory/smart-ingredient-matrix";
import { Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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

if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

async function convertPdfToImage(file: File): Promise<Blob | null> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return null;
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    await page.render({ canvasContext: context, viewport }).promise;
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.95);
    });
  } catch (error) {
    console.error("PDF to Image conversion failed", error);
    return null;
  }
}

type InventoryType = "zukauf" | "eigenproduktion";

type InventoryComponent = {
  itemId: string | null;
  quantity: number;
  unit: string;
  deletedItemName?: string | null;
  customName?: string | null;
  tempId?: string;
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

type DeviceSetting = {
  quantity: string;
  device: string;
  settings?: string;
  runtime: string;
  energy: string;
  water?: string;
  outputYield?: string;
  cleaningEffort?: string;
};

type PreparationStep = {
  id: string;
  text: string;
  duration?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
};

type NutritionTotals = {
  energyKcal: number | null;
  fat: number | null;
  saturatedFat: number | null;
  carbs: number | null;
  sugar: number | null;
  protein: number | null;
  salt: number | null;
  fiber: number | null;
  sodium: number | null;
  breadUnits: number | null;
  cholesterol: number | null;
  co2: number | null;
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

type AlternativeItem = {
  internalArticleNumber: string;
  manufacturerArticleNumber: string;
  name: string;
  netWeight: string;
};

type InventoryItem = {
  id: string;
  internalId?: number | null;
  internalArticleNumber?: string | null;
  name: string;
  type: InventoryType;
  unit: string;
  brand?: string | null;
  currency?: string;
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
  yieldVolume?: string | null;
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
  isVegan?: boolean;
  isVegetarian?: boolean;
  isFairtrade?: boolean;
  isPowder?: boolean;
  isGranulate?: boolean;
  isPaste?: boolean;
  isLiquid?: boolean;
  hasGhostComponents?: boolean;
  imageUrl?: string | null;
  fileUrl?: string | null;
  packshotX?: number | null;
  packshotY?: number | null;
  packshotZoom?: number | null;
  storageArea?: string | null;
  warengruppe?: string | null;
  bioControlNumber?: string | null;
  deviceSettings?: DeviceSetting[] | null;
  supplier?: string | null;
  alternativeItems?: AlternativeItem[] | null;
};

type ParsedAiItem = {
  name: string;
  unit: string;
  brand?: string;
  quantity: number;
  purchasePrice: number;
  calculatedPricePerUnit: number;
  standardPreparation?: StandardPreparation | null;
  preparationText?: string | null;
  nutritionPerUnit?: NutritionTotals | null;
  dosageInstructions?: string | null;
  warengruppe?: string | null;
  storageArea?: string | null;
  isBio?: boolean;
  isDeklarationsfrei?: boolean;
  isAllergenfrei?: boolean;
  isCookChill?: boolean;
  isFreezeThawStable?: boolean;
  isPalmOilFree?: boolean;
  isYeastFree?: boolean;
  isLactoseFree?: boolean;
  isGlutenFree?: boolean;
  isVegan?: boolean;
  isVegetarian?: boolean;
  isFairtrade?: boolean;
  isPowder?: boolean;
  isGranulate?: boolean;
  isPaste?: boolean;
  isLiquid?: boolean;
  manufacturerArticleNumber?: string | null;
  ean?: string | null;
  bioControlNumber?: string | null;
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
  ean?: string | null;
  yieldVolume?: string | null;
  imageUrl?: string | null;
  standardPreparation?: StandardPreparation | null;
  isBio?: boolean;
  isDeklarationsfrei?: boolean;
  isAllergenfrei?: boolean;
  isCookChill?: boolean;
  isFreezeThawStable?: boolean;
  isPalmOilFree?: boolean;
  isYeastFree?: boolean;
  isLactoseFree?: boolean;
  isGlutenFree?: boolean;
  warengruppe?: string | null;
  storageArea?: string | null;
};

const recipeCategories = ["Vorspeise", "Hauptgang", "Dessert"];

const nutritionOptions = ["Vegan", "Vegetarisch", "Halal", "Glutenfrei"];

  // STAPLE_ITEMS removed to allow full control over inventory


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

export interface InventoryManagerProps {
  mode?: "ingredients" | "recipes";
}

export function InventoryManager({ mode = "ingredients" }: InventoryManagerProps) {
  const pathname = usePathname();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  type ActiveSection = "dashboard" | "zutaten" | "rezepte" | "lager";
  const [activeSection, setActiveSection] = useState<ActiveSection>(
    mode === "recipes" 
      ? "rezepte" 
      : pathname && pathname.startsWith("/lager")
      ? "lager"
      : pathname && pathname.startsWith("/rezepte")
      ? "rezepte"
      : "zutaten"
  );
  // effectiveFilterType removed
  const [isDetailView, setIsDetailView] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const lastGenRef = useRef<string>("");
  const lastInitializedPackshotId = useRef<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [newItemType, setNewItemType] = useState<InventoryType>("zukauf");
  const [newItemUnit, setNewItemUnit] = useState("");
  const [purchasePriceInput, setPurchasePriceInput] = useState("");
  // Legacy alias for compatibility with existing code
  const newItemPrice = purchasePriceInput;
  const setNewItemPrice = setPurchasePriceInput;

  const [isSaving, setIsSaving] = useState(false);
  const [isEditingComponents, setIsEditingComponents] = useState(false);
  const [componentSearch, setComponentSearch] = useState("");
  const [componentQuantityInput, setComponentQuantityInput] = useState("1");
  const [componentUnitInput, setComponentUnitInput] = useState("");
  const [standardPreparationComponents, setStandardPreparationComponents] =
    useState<StandardPreparationComponent[]>([]);
  const [deviceSettingsInput, setDeviceSettingsInput] = useState<DeviceSetting[]>([]);
  const [showProductionPanel, setShowProductionPanel] = useState(false);
  const [isProductionAccordionOpen, setIsProductionAccordionOpen] = useState(false);
  const [isPredictingProduction, setIsPredictingProduction] = useState(false);
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
  const [docParsedItemId, setDocParsedItemId] = useState<string | null>(null);
  const [docDosageSteps, setDocDosageSteps] = useState<
    { id: string; quantity: string; line: string }[]
  >([]);
  const [docPreviewIsGenerating, setDocPreviewIsGenerating] = useState(false);
  const [docPreviewError, setDocPreviewError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewImageItemId, setPreviewImageItemId] = useState<string | null>(null);
  const [proAllergensInput, setProAllergensInput] = useState("");
  const [specItem, setSpecItem] = useState<InventoryItem | null>(null);
  const [proIngredientsInput, setProIngredientsInput] = useState("");
  const [proDosageInput, setProDosageInput] = useState("");
  const [proYieldWeightInput, setProYieldWeightInput] = useState("");
  const [proYieldVolumeInput, setProYieldVolumeInput] = useState("");
  const [proPreparationInput, setProPreparationInput] = useState("");
  const [manufacturerArticleNumberInput, setManufacturerArticleNumberInput] = useState("");
  // Legacy alias for compatibility with existing code
  const manufacturerInput = manufacturerArticleNumberInput;
  const setManufacturerInput = setManufacturerArticleNumberInput;
  
  const [internalArticleNumberInput, setInternalArticleNumberInput] = useState("");
  const [supplierInput, setSupplierInput] = useState("");
  const [alternativeItemsInput, setAlternativeItemsInput] = useState<AlternativeItem[]>([]);

  const [eanInput, setEanInput] = useState("");
  const [brandInput, setBrandInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [categoryInput, setCategoryInput] = useState("");
  const [storageAreaInput, setStorageAreaInput] = useState("");
  const [warengruppeInput, setWarengruppeInput] = useState("");
  const [openSections, setOpenSections] = useState<string[]>(["Obst & Gemüse", "Molkerei & Eier", "Trockensortiment", "Getränke", "Zusatz- & Hilfsstoffe", "Unkategorisiert"]);
  const [isAlternativeItemsOpen, setIsAlternativeItemsOpen] = useState(false);
  const [portionUnitInput, setPortionUnitInput] = useState("");
  const [nutritionTagsInput, setNutritionTagsInput] = useState<string[]>([]);
  const [targetPortionsInput, setTargetPortionsInput] = useState("");
  const [targetSalesPriceInput, setTargetSalesPriceInput] = useState("");
  const [isBioInput, setIsBioInput] = useState(false);
  const [bioControlNumberInput, setBioControlNumberInput] = useState("");
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
  const [isVeganInput, setIsVeganInput] = useState(false);
  const [isVegetarianInput, setIsVegetarianInput] = useState(false);
  const [isFairtradeInput, setIsFairtradeInput] = useState(false);
  const [isPowderInput, setIsPowderInput] = useState(false);
  const [isGranulateInput, setIsGranulateInput] = useState(false);
  const [isPasteInput, setIsPasteInput] = useState(false);
  const [isLiquidInput, setIsLiquidInput] = useState(false);
  const [proEnergyKcalInput, setProEnergyKcalInput] = useState("");
  const [proFatInput, setProFatInput] = useState("");
  const [proSaturatedFatInput, setProSaturatedFatInput] = useState("");
  const [proCarbsInput, setProCarbsInput] = useState("");
  const [proSugarInput, setProSugarInput] = useState("");
  const [proProteinInput, setProProteinInput] = useState("");
  const [proSaltInput, setProSaltInput] = useState("");
  const [proFiberInput, setProFiberInput] = useState("");
  const [proSodiumInput, setProSodiumInput] = useState("");
  const [proBreadUnitsInput, setProBreadUnitsInput] = useState("");
  const [proCholesterolInput, setProCholesterolInput] = useState("");
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
  const [imageIsUploading, setImageIsUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [isImageDropActive, setIsImageDropActive] = useState(false);
  
  // Crop State
  const packshotImgRef = useRef<HTMLImageElement>(null);

  // Document Viewer State
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerZoom, setViewerZoom] = useState(1);
  const [isReScanning, setIsReScanning] = useState(false);
  const [webScanUrl, setWebScanUrl] = useState("");
  const [isWebScanning, setIsWebScanning] = useState(false);
  const [webScanError, setWebScanError] = useState<string | null>(null);

  const handleReScan = async () => {
    if (!selectedItem?.fileUrl && !selectedItem?.imageUrl) return;
    
    if (!window.confirm("Möchten Sie die bestehenden Daten durch einen neuen Scan überschreiben? Ungespeicherte Änderungen gehen verloren.")) {
      return;
    }

    setIsReScanning(true);

    try {
      const formData = new FormData();
      // Pass the existing URL instead of a file
      const url = selectedItem.imageUrl || selectedItem.fileUrl;
      if (url) {
        formData.append("existing_image_url", url);
      }
      formData.append("analyze_only", "true");

      const response = await fetch("/api/document-vision-upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Fehler beim Re-Scan");
      }

      if (data.extracted) {
        const extracted = data.extracted;
        
        // Update form inputs with extracted data
        setNameInput(extracted.name || "");
        setBrandInput(extracted.brand || "");
        setPurchasePriceInput(extracted.purchase_price?.toString() || "");
        setManufacturerArticleNumberInput(extracted.manufacturer_article_number || "");
        setEanInput(extracted.ean || "");
        
        // Allergens & Ingredients
        setProAllergensInput(Array.isArray(extracted.allergens) ? extracted.allergens.join(", ") : extracted.allergens || "");
        setProIngredientsInput(extracted.ingredients || "");
        
        // Yield Info
        setProYieldWeightInput(extracted.yield_info || "");

        // Boolean Flags
        setIsBioInput(extracted.is_bio || false);
        setIsDeklarationsfreiInput(extracted.is_deklarationsfrei || false);
        setIsAllergenfreiInput(extracted.is_allergenfrei || false);
        setIsCookChillInput(extracted.is_cook_chill || false);
        setIsFreezeThawStableInput(extracted.is_freeze_thaw_stable || false);
        setIsPalmOilFreeInput(extracted.is_palm_oil_free || false);
        setIsYeastFreeInput(extracted.is_yeast_free || false);
        setIsLactoseFreeInput(extracted.is_lactose_free || false);
        setIsGlutenFreeInput(extracted.is_gluten_free || false);
        setIsVeganInput(extracted.is_vegan || false);
        setIsVegetarianInput(extracted.is_vegetarian || false);
        setIsFairtradeInput(extracted.is_fairtrade || false);
        
        // Physical State Flags
        setIsPowderInput(extracted.is_powder || false);
        setIsGranulateInput(extracted.is_granulate || false);
        setIsPasteInput(extracted.is_paste || false);
        setIsLiquidInput(extracted.is_liquid || false);

        // Category & Storage
        setWarengruppeInput(extracted.warengruppe || "Trockensortiment");
        setStorageAreaInput(extracted.storageArea || "Trockenwaren");

        // Nutrition
        if (extracted.nutrition_per_100) {
           setProEnergyKcalInput(extracted.nutrition_per_100.energy_kcal?.toString() || "");
           setProFatInput(extracted.nutrition_per_100.fat?.toString() || "");
           setProSaturatedFatInput(extracted.nutrition_per_100.saturated_fat?.toString() || "");
           setProCarbsInput(extracted.nutrition_per_100.carbs?.toString() || "");
           setProSugarInput(extracted.nutrition_per_100.sugar?.toString() || "");
           setProProteinInput(extracted.nutrition_per_100.protein?.toString() || "");
           setProSaltInput(extracted.nutrition_per_100.salt?.toString() || "");
           setProFiberInput(extracted.nutrition_per_100.fiber?.toString() || "");
           setProSodiumInput(extracted.nutrition_per_100.sodium?.toString() || "");
           setProBreadUnitsInput(extracted.nutrition_per_100.bread_units?.toString() || "");
           setProCholesterolInput(extracted.nutrition_per_100.cholesterol?.toString() || "");
        }

        // Standard Preparation / Dosage
        if (extracted.standard_preparation?.components) {
            const cleanComponents = extracted.standard_preparation.components.map((comp: any) => {
                 // Replace generic "Produkt" with item name + physical state
                 if (comp.name && (comp.name.toLowerCase() === 'produkt' || comp.name.toLowerCase().includes('produkt'))) {
                     const stateSuffix = extracted.is_liquid ? 'Flüssigkeit' : extracted.is_paste ? 'Paste' : extracted.is_granulate ? 'Granulat' : 'Pulver';
                     return { ...comp, name: `${extracted.name || 'Artikel'} ${stateSuffix}` };
                 }
                 return comp;
             });
            extracted.standard_preparation.components = cleanComponents;
            setStandardPreparationComponents(cleanComponents);
        } else if (extracted.dosage_instructions) {
             // Fallback if no structured data
             const lines = extracted.dosage_instructions
                .split(/\r?\n/)
                .map((value: string) => value.trim())
                .filter((value: string) => value.length > 0);
              const parsedComponents: StandardPreparationComponent[] = lines.map(
                (line: string) => parseStandardPreparationLine(line)
              );
              setStandardPreparationComponents(parsedComponents);
        }
        
        // Update selectedItem directly via setItems to ensure UI updates for fields bound to selectedItem
        setItems(prev => prev.map(item => {
          if (item.id !== selectedItem.id) return item;
          return {
            ...item,
            name: extracted.name || item.name,
            brand: extracted.brand || item.brand,
            unit: extracted.unit || item.unit,
            // Update Packshot (imageUrl) if available in extraction (for image scans)
            imageUrl: extracted.image_url || item.imageUrl,
            purchasePrice: typeof extracted.purchase_price === 'number' ? extracted.purchase_price : item.purchasePrice,
            manufacturerArticleNumber: extracted.manufacturer_article_number || item.manufacturerArticleNumber,
            ean: extracted.ean || item.ean,
            ingredients: extracted.ingredients || item.ingredients,
            allergens: Array.isArray(extracted.allergens) ? extracted.allergens : item.allergens,
            warengruppe: extracted.warengruppe || item.warengruppe || "Trockensortiment",
            storageArea: extracted.storageArea || item.storageArea || "Trockenwaren",
            
            // Flags
            isBio: extracted.is_bio ?? item.isBio,
            bioControlNumber: extracted.bio_control_number || item.bioControlNumber,
            isDeklarationsfrei: extracted.is_deklarationsfrei ?? item.isDeklarationsfrei,
            isAllergenfrei: extracted.is_allergenfrei ?? item.isAllergenfrei,
            isCookChill: extracted.is_cook_chill ?? item.isCookChill,
            isFreezeThawStable: extracted.is_freeze_thaw_stable ?? item.isFreezeThawStable,
            isPalmOilFree: extracted.is_palm_oil_free ?? item.isPalmOilFree,
            isYeastFree: extracted.is_yeast_free ?? item.isYeastFree,
            isLactoseFree: extracted.is_lactose_free ?? item.isLactoseFree,
            isGlutenFree: extracted.is_gluten_free ?? item.isGlutenFree,
            isVegan: extracted.is_vegan ?? item.isVegan,
            isVegetarian: extracted.is_vegetarian ?? item.isVegetarian,
            isFairtrade: extracted.is_fairtrade ?? item.isFairtrade,
            isPowder: extracted.is_powder ?? item.isPowder,
            isGranulate: extracted.is_granulate ?? item.isGranulate,
            isPaste: extracted.is_paste ?? item.isPaste,
            isLiquid: extracted.is_liquid ?? item.isLiquid,

            // Nutrition object mapping
            nutritionPerUnit: extracted.nutrition_per_100 ? {
              energyKcal: extracted.nutrition_per_100.energy_kcal,
              fat: extracted.nutrition_per_100.fat,
              saturatedFat: extracted.nutrition_per_100.saturated_fat,
              carbs: extracted.nutrition_per_100.carbs,
              sugar: extracted.nutrition_per_100.sugar,
              protein: extracted.nutrition_per_100.protein,
              salt: extracted.nutrition_per_100.salt,
              fiber: extracted.nutrition_per_100.fiber,
              sodium: extracted.nutrition_per_100.sodium,
              breadUnits: extracted.nutrition_per_100.bread_units,
              cholesterol: extracted.nutrition_per_100.cholesterol,
              co2: extracted.nutrition_per_100.co2 || null,
            } : item.nutritionPerUnit,
            
             standardPreparation: extracted.standard_preparation ? extracted.standard_preparation : item.standardPreparation,
            preparationSteps: extracted.preparation_steps || item.preparationSteps,
          };
        }));

        // Debug Reasoning
        if (extracted.debug_reasoning) {
            console.log("AI Reasoning:", extracted.debug_reasoning);
        }

        alert("Daten wurden erfolgreich aktualisiert. Bitte prüfen und speichern.");
      }
    } catch (error: any) {
      console.error("Re-Scan Error:", error);
      alert(`Fehler beim Re-Scan: ${error.message}`);
    } finally {
      setIsReScanning(false);
    }
  };

  const handleAiForecast = async () => {
    if (!selectedItem) return;
    setIsPredictingProduction(true);
    try {
      const res = await fetch('/api/ai-production-forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedItem.name,
          dosageInstructions: selectedItem.dosageInstructions,
          standardPreparation: selectedItem.standardPreparation
        })
      });
      
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const newSetting: DeviceSetting = {
        quantity: data.quantity || "KI-Vorschlag",
        device: data.device || "",
        settings: data.settings || "",
        runtime: data.time || "",
        energy: data.energy || "",
        water: data.water || "",
        outputYield: data.outputYield || "",
        cleaningEffort: data.cleaningEffort || ""
      };

      const newSettings = [...deviceSettingsInput, newSetting];
      setDeviceSettingsInput(newSettings);
      setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, deviceSettings: newSettings } : i));
      setShowProductionPanel(true);
      setIsProductionAccordionOpen(true);
    } catch (err) {
      console.error(err);
      setError("KI-Prognose fehlgeschlagen.");
    } finally {
      setIsPredictingProduction(false);
    }
  };

  const handleWebScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webScanUrl.trim()) return;

    setIsWebScanning(true);
    setWebScanError(null);

    try {
      // 1. Scan the URL
      const scanResponse = await fetch("/api/ai-web-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webScanUrl }),
      });

      if (!scanResponse.ok) {
        const errorData = await scanResponse.json();
        throw new Error(errorData.error || "Fehler beim Web-Scan");
      }

      const { extracted, fileUrl } = await scanResponse.json();
      const scannedData = extracted || {};

      // Sanitize standard_preparation "Produkt" name
      if (scannedData.standard_preparation?.components) {
          scannedData.standard_preparation.components = scannedData.standard_preparation.components.map((comp: any) => {
              if (comp.name && (comp.name.toLowerCase() === 'produkt' || comp.name.toLowerCase().includes('produkt'))) {
                   const stateSuffix = scannedData.is_liquid ? 'Flüssigkeit' : scannedData.is_paste ? 'Paste' : scannedData.is_granulate ? 'Granulat' : 'Pulver';
                   return { ...comp, name: `${scannedData.name || 'Artikel'} ${stateSuffix}` };
              }
              return comp;
          });
      }

      // 2. Map to InventoryItem structure
      const newItemPayload = {
        name: scannedData.name || "Unbenannter Artikel",
        type: "zukauf",
        unit: scannedData.unit || "Stück",
        purchasePrice: typeof scannedData.purchase_price === "number" ? scannedData.purchase_price : 0,
        brand: scannedData.brand,
        manufacturerArticleNumber: scannedData.manufacturer_article_number,
        ean: scannedData.ean,
        ingredients: scannedData.ingredients,
        allergens: Array.isArray(scannedData.allergens) ? scannedData.allergens : [],
        dosageInstructions: typeof scannedData.dosage_instructions === 'string' 
          ? scannedData.dosage_instructions 
          : (typeof scannedData.standard_preparation === 'string' ? scannedData.standard_preparation : null),
        standardPreparation: typeof scannedData.standard_preparation === 'object' ? scannedData.standard_preparation : null,
        warengruppe: scannedData.warengruppe || "Trockensortiment",
        storageArea: scannedData.storageArea || "Trockenwaren",
        fileUrl: fileUrl || null,
        
        // Boolean Flags
        isBio: scannedData.is_bio,
        bioControlNumber: scannedData.bio_control_number || null,
        isDeklarationsfrei: scannedData.is_deklarationsfrei,
        isAllergenfrei: scannedData.is_allergenfrei,
        isCookChill: scannedData.is_cook_chill,
        isFreezeThawStable: scannedData.is_freeze_thaw_stable,
        isPalmOilFree: scannedData.is_palm_oil_free,
        isYeastFree: scannedData.is_yeast_free,
        isLactoseFree: scannedData.is_lactose_free,
        isGlutenFree: scannedData.is_gluten_free,
        isVegan: scannedData.is_vegan,
        isVegetarian: scannedData.is_vegetarian,
        isFairtrade: scannedData.is_fairtrade,
        isPowder: scannedData.is_powder,
        isGranulate: scannedData.is_granulate,
        isPaste: scannedData.is_paste,
        isLiquid: scannedData.is_liquid,

        // Nutrition
        nutritionPerUnit: scannedData.nutrition_per_100 ? {
          energyKcal: scannedData.nutrition_per_100.energy_kcal,
          fat: scannedData.nutrition_per_100.fat,
          saturatedFat: scannedData.nutrition_per_100.saturated_fat,
          carbs: scannedData.nutrition_per_100.carbs,
          sugar: scannedData.nutrition_per_100.sugar,
          protein: scannedData.nutrition_per_100.protein,
          salt: scannedData.nutrition_per_100.salt,
          fiber: scannedData.nutrition_per_100.fiber,
          sodium: scannedData.nutrition_per_100.sodium,
          breadUnits: scannedData.nutrition_per_100.bread_units,
          cholesterol: scannedData.nutrition_per_100.cholesterol,
        } : null,
      };

      // 3. Create Item in Database
      const createResponse = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItemPayload),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(errorData.error || "Fehler beim Anlegen des Artikels");
      }

      const createdItem = await createResponse.json();

      // 4. Update UI
      setItems((prev) => [...prev, createdItem]);
      setSelectedItemId(createdItem.id);
      setIsDetailView(true);
      setWebScanUrl(""); // Clear input
      
    } catch (error: any) {
      console.error("Web Scan Error:", error);
      setWebScanError(error.message || "Ein unbekannter Fehler ist aufgetreten");
    } finally {
      setIsWebScanning(false);
    }
  };



  // Packshot Focus State
  const [packshotPan, setPackshotPan] = useState({ x: 0, y: 0 });
  const [packshotZoom, setPackshotZoom] = useState(2.0);
  const [isAutoFit, setIsAutoFit] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const handlePanMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsPanning(true);
    setIsAutoFit(false);
    setPanStart({ x: e.clientX - packshotPan.x, y: e.clientY - packshotPan.y });
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isPanning) return;
      e.preventDefault();
      setPackshotPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    };

    const handleGlobalMouseUp = () => {
      if (isPanning) {
        setIsPanning(false);
      }
    };

    if (isPanning) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isPanning, panStart]);

  const handlePanMouseMove = (e: React.MouseEvent) => {
    // Deprecated in favor of global listener, but kept for compatibility
    if (!isPanning) return;
    e.preventDefault();
  };

  const handlePanMouseUp = () => {
     // Deprecated in favor of global listener
     setIsPanning(false);
  };
  
  const handleZoomIn = () => {
    setIsAutoFit(false);
    setPackshotZoom((prev) => Math.min(prev + 0.2, 50.0));
  };
  
  const handleZoomOut = () => {
    setIsAutoFit(false);
    setPackshotZoom((prev) => Math.max(prev - 0.2, 0.01));
  };

  // Packshot Drag & Drop
  const [isPackshotDragOver, setIsPackshotDragOver] = useState(false);
  const packshotFileInputRef = useRef<HTMLInputElement>(null);

  const handlePackshotDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsPackshotDragOver(true);
  };

  const handlePackshotLeave = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsPackshotDragOver(false);
  };

  const handlePackshotDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsPackshotDragOver(false);
    
    if (!selectedItem) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        await handleRecipeImageUpload(file);
      }
    }
  };

  const handlePackshotFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      await handleRecipeImageUpload(file);
    }
    if (packshotFileInputRef.current) {
      packshotFileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    if (!pathname) {
      return;
    }
    const path = pathname.toLowerCase();
    const next = path.startsWith("/lager")
      ? "lager"
      : path.startsWith("/rezepte")
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
      setNewItemType("zukauf");
    } else if (activeSection === "rezepte") {
      setFilterType("eigenproduktion");
      setNewItemType("eigenproduktion");
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
      let finalZoom = 1.0;
      let finalPanX = 0;
      let finalPanY = 0;

      // Container size in frontend (w-64 = 256px)
      const CONTAINER_SIZE = 256;

      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        // High quality render
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) continue;
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        await page.render({ canvasContext: context, viewport }).promise;
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        
        // Default: Show full image
        let crop = { x: 0, y: 0, w: canvas.width, h: canvas.height };
        let hasDetection = false;

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
          const detectPayload = (await detectResponse.json()) as { bbox?: { x: number; y: number; w: number; h: number } };
          if (detectResponse.ok && detectPayload.bbox) {
            const { x, y, w, h } = detectPayload.bbox;
            crop = {
               x: Math.max(0, x),
               y: Math.max(0, y),
               w: Math.min(canvas.width - x, w),
               h: Math.min(canvas.height - y, h)
            };
            hasDetection = true;
          }
        } catch (e) {
          console.error("Packshot detection failed", e);
        }

        if (hasDetection) {
            // Calculate Zoom to fit crop in container
            // Zoom is relative to container width. Rendered Image Width = Zoom * CONTAINER_SIZE
            // We want Rendered Crop Width approx CONTAINER_SIZE * 0.9 (some padding)
            // Rendered Crop Width = crop.w * (Rendered Image Width / canvas.width)
            // RCW = crop.w * (Zoom * CONTAINER_SIZE / canvas.width)
            // CONTAINER_SIZE * 0.9 = crop.w * Zoom * CONTAINER_SIZE / canvas.width
            // 0.9 = crop.w * Zoom / canvas.width
            // Zoom = 0.9 * canvas.width / crop.w
            
            finalZoom = Math.min(50, Math.max(0.1, (0.9 * canvas.width) / Math.max(50, crop.w)));
            
            // Calculate Pan to center crop
            // Rendered Image Dimensions
            const rIW = finalZoom * CONTAINER_SIZE;
            const rIH = (canvas.height / canvas.width) * rIW;
            
            // Crop Center in Original
            const cx = crop.x + crop.w / 2;
            const cy = crop.y + crop.h / 2;
            
            // Crop Center in Rendered
            const rCX = cx * (rIW / canvas.width);
            const rCY = cy * (rIH / canvas.height);
            
            // We want rCX at CONTAINER_SIZE / 2
            // PanX + rCX = CONTAINER_SIZE / 2
            finalPanX = (CONTAINER_SIZE / 2) - rCX;
            finalPanY = (CONTAINER_SIZE / 2) - rCY;
        } else {
            // No detection: Fit full image
            // Zoom = 1.0 means width matches container.
            finalZoom = 1.0;
            finalPanX = 0;
            finalPanY = 0;
        }

        // Convert WHOLE PAGE to blob
        const blob: Blob | null = await new Promise((resolve) => {
          canvas.toBlob((b) => resolve(b), "image/jpeg", 0.9);
        });
        
        if (blob) {
          chosenBlob = blob;
          break;
        }
      }

      if (!chosenBlob) {
        throw new Error("Packshot konnte nicht erzeugt werden");
      }
      
      const file = new File([chosenBlob], "pdf-full-page.jpg", { type: "image/jpeg" });
      const form = new FormData();
      form.append("file", file);
      form.append("itemId", itemId);
      form.append("filename", "pdf-full.jpg");
      
      const response = await fetch("/api/recipe-image-upload", {
        method: "POST",
        body: form,
      });
      const payload = (await response.json()) as { error?: unknown; imageUrl?: string };
      if (!response.ok) {
        let message = "Fehler beim Upload des PDF-Bilds.";
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
            item.id === itemId ? { 
                ...item, 
                imageUrl: freshUrl,
                packshotX: finalPanX,
                packshotY: finalPanY,
                packshotZoom: finalZoom
            } : item
          )
        );

        // Update local state if this item is selected - REMOVED to prevent jumping
        // The user might be zooming/panning manually. We shouldn't overwrite it.
        // The new values are saved in 'items' (above) and will be used on next load/select.
        /* 
        if (selectedItemId === itemId) {
            setPackshotPan({ x: finalPanX, y: finalPanY });
            setPackshotZoom(finalZoom);
            setIsAutoFit(false);
        }
        */
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Fehler bei der PDF-Bild-Erzeugung.";
      setDocPreviewError(message);
    } finally {
      setDocPreviewIsGenerating(false);
    }
  }, [selectedItemId]);

  const activeFileUrl = (docParsed && docParsed.fileUrl) || 
    (selectedItemId && effectiveItems.find((i) => i.id === selectedItemId)?.fileUrl);

  // Automatic PDF preview generation and Image preview setting
  useEffect(() => {
    const timer = setTimeout(() => {
      const url = activeFileUrl;
      
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
         setPreviewImageItemId(selectedItemId);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [activeFileUrl, selectedItemId, generateAndUploadPdfPreview]);

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

        const finalData = data;

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
      if (activeSection === "rezepte") {
         // Strict filter for Rezepte section: ONLY Recipes (Eigenproduktion)
         if (item.type !== "eigenproduktion") {
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
    if (!docParsed) {
      return;
    }

    // Prioritize structured standardPreparation from AI if available
    if (
      docParsed.standardPreparation &&
      docParsed.standardPreparation.components &&
      docParsed.standardPreparation.components.length > 0
    ) {
      setStandardPreparationComponents(docParsed.standardPreparation.components);
      return;
    }

    // Fallback: Parse dosageInstructions string if no structured data
    if (docParsed.dosageInstructions) {
      const lines = docParsed.dosageInstructions
        .split(/\r?\n/)
        .map((value) => value.trim())
        .filter((value) => value.length > 0);
      const parsedComponents: StandardPreparationComponent[] = lines.map(
        (line) => parseStandardPreparationLine(line)
      );
      setStandardPreparationComponents(parsedComponents);
    }
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


  const packshotPreview = (previewImage && previewImageItemId === selectedItem?.id)
    ? previewImage
    : selectedItem?.imageUrl
    ? selectedItem.imageUrl
    : (docParsed && docParsedItemId === selectedItem?.id && docParsed.imageUrl)
    ? docParsed.imageUrl
    : "";

  const handleCopyPackshot = useCallback(async () => {
    if (!packshotPreview) return;
    try {
      await navigator.clipboard.writeText(packshotPreview);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy packshot URL:", err);
    }
  }, [packshotPreview]);

  // Debounced Save of Packshot State
  useEffect(() => {
    if (!selectedItem) return;

    const currentX = packshotPan.x;
    const currentY = packshotPan.y;
    const currentZoom = packshotZoom;

    const savedX = selectedItem.packshotX ?? 0;
    const savedY = selectedItem.packshotY ?? 0;
    const savedZoom = selectedItem.packshotZoom ?? 2.0;

    const isSame = 
        Math.abs(currentX - savedX) < 0.001 &&
        Math.abs(currentY - savedY) < 0.001 &&
        Math.abs(currentZoom - savedZoom) < 0.001;

    if (isSame) return;

    const timer = setTimeout(async () => {
        try {
            // Update local items state first to reflect "saved" status and prevent further triggers
            setItems(prev => prev.map(i => {
                if (i.id === selectedItem.id) {
                    return { ...i, packshotX: currentX, packshotY: currentY, packshotZoom: currentZoom };
                }
                return i;
            }));

            await fetch("/api/item-details", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: selectedItem.id,
                    packshotX: currentX,
                    packshotY: currentY,
                    packshotZoom: currentZoom
                })
            });
        } catch (err) {
            console.error("Failed to save packshot state", err);
        }
    }, 1000);

    return () => clearTimeout(timer);
  }, [packshotPan, packshotZoom, selectedItem]);

  // Sync Image URL Input when it changes in DB/State (e.g. after scan)
  useEffect(() => {
    if (selectedItem) {
      setImageUrlInput(selectedItem.imageUrl ?? "");
    }
  }, [selectedItem?.imageUrl]);

  // Reset/Load state when Item Selection Changes
  useEffect(() => {
    if (selectedItem?.id) {
      // Don't reset imageUrlInput here, it's handled by the other effect
      
      setPreviewImage(null); // Reset manual preview on item change
      setPreviewImageItemId(null);
      setDocParsed(null);    // Reset vision parsed data on item change
      setDocParsedItemId(null);
    } else {
      setImageUrlInput("");
      setPreviewImage(null);
      setDocParsed(null);
    }
    setImageUploadError(null);
    setIsImageDropActive(false);
  }, [selectedItem?.id]);

  // Sync Packshot State from Item - REMOVED to prevent re-render resets
  // The state initialization is now handled by the ID-based effect below




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
          fiber: (base.fiber ?? 0) / 100,
          sodium: (base.sodium ?? 0) / 100,
          breadUnits: (base.breadUnits ?? 0) / 100,
          cholesterol: (base.cholesterol ?? 0) / 100,
          co2: (base.co2 ?? 0) / 100,
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
        fiber: 0,
        sodium: 0,
        breadUnits: 0,
        cholesterol: 0,
        co2: 0,
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
        batchTotals.energyKcal = (batchTotals.energyKcal ?? 0) + (child.perGram.energyKcal ?? 0) * mass;
        batchTotals.fat = (batchTotals.fat ?? 0) + (child.perGram.fat ?? 0) * mass;
        batchTotals.saturatedFat = (batchTotals.saturatedFat ?? 0) + (child.perGram.saturatedFat ?? 0) * mass;
        batchTotals.carbs = (batchTotals.carbs ?? 0) + (child.perGram.carbs ?? 0) * mass;
        batchTotals.sugar = (batchTotals.sugar ?? 0) + (child.perGram.sugar ?? 0) * mass;
        batchTotals.protein = (batchTotals.protein ?? 0) + (child.perGram.protein ?? 0) * mass;
        batchTotals.salt = (batchTotals.salt ?? 0) + (child.perGram.salt ?? 0) * mass;
        batchTotals.fiber = (batchTotals.fiber ?? 0) + (child.perGram.fiber ?? 0) * mass;
        batchTotals.sodium = (batchTotals.sodium ?? 0) + (child.perGram.sodium ?? 0) * mass;
        batchTotals.breadUnits = (batchTotals.breadUnits ?? 0) + (child.perGram.breadUnits ?? 0) * mass;
        batchTotals.cholesterol = (batchTotals.cholesterol ?? 0) + (child.perGram.cholesterol ?? 0) * mass;
        batchTotals.co2 = (batchTotals.co2 ?? 0) + (child.perGram.co2 ?? 0) * mass;
      }

      if (!Number.isFinite(totalMass) || totalMass <= 0) {
        return { perGram: null, mass: null, missing: true };
      }

      const perGram: NutritionTotals = {
        energyKcal: (batchTotals.energyKcal ?? 0) / totalMass,
        fat: (batchTotals.fat ?? 0) / totalMass,
        saturatedFat: (batchTotals.saturatedFat ?? 0) / totalMass,
        carbs: (batchTotals.carbs ?? 0) / totalMass,
        sugar: (batchTotals.sugar ?? 0) / totalMass,
        protein: (batchTotals.protein ?? 0) / totalMass,
        salt: (batchTotals.salt ?? 0) / totalMass,
        fiber: (batchTotals.fiber ?? 0) / totalMass,
        sodium: (batchTotals.sodium ?? 0) / totalMass,
        breadUnits: (batchTotals.breadUnits ?? 0) / totalMass,
        cholesterol: (batchTotals.cholesterol ?? 0) / totalMass,
        co2: (batchTotals.co2 ?? 0) / totalMass,
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
      energyKcal: (perGram.energyKcal ?? 0) * recipeMass,
      fat: (perGram.fat ?? 0) * recipeMass,
      saturatedFat: (perGram.saturatedFat ?? 0) * recipeMass,
      carbs: (perGram.carbs ?? 0) * recipeMass,
      sugar: (perGram.sugar ?? 0) * recipeMass,
      protein: (perGram.protein ?? 0) * recipeMass,
      salt: (perGram.salt ?? 0) * recipeMass,
      fiber: (perGram.fiber ?? 0) * recipeMass,
      sodium: (perGram.sodium ?? 0) * recipeMass,
      breadUnits: (perGram.breadUnits ?? 0) * recipeMass,
      cholesterol: (perGram.cholesterol ?? 0) * recipeMass,
      co2: (perGram.co2 ?? 0) * recipeMass,
    };

    const portions = selectedItem.targetPortions ?? null;
    const validPortions =
      portions != null && Number.isFinite(portions) && portions > 0
        ? portions
        : null;

    const perPortion =
      validPortions != null
        ? {
            energyKcal: (perRecipe.energyKcal ?? 0) / validPortions,
            fat: (perRecipe.fat ?? 0) / validPortions,
            saturatedFat: (perRecipe.saturatedFat ?? 0) / validPortions,
            carbs: (perRecipe.carbs ?? 0) / validPortions,
            sugar: (perRecipe.sugar ?? 0) / validPortions,
            protein: (perRecipe.protein ?? 0) / validPortions,
            salt: (perRecipe.salt ?? 0) / validPortions,
            fiber: (perRecipe.fiber ?? 0) / validPortions,
            sodium: (perRecipe.sodium ?? 0) / validPortions,
            breadUnits: (perRecipe.breadUnits ?? 0) / validPortions,
            cholesterol: (perRecipe.cholesterol ?? 0) / validPortions,
            co2: (perRecipe.co2 ?? 0) / validPortions,
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

  // Initialize Packshot Zoom/Pan only when switching items (ID changes)
  // This prevents resetting the user's view when the item updates in the background (e.g. nutrition sync)
  useEffect(() => {
    // If no item is selected, we don't necessarily want to reset the lock immediately
    // to avoid flickering if the selection is lost momentarily during updates.
    if (!selectedItem) {
      // lastInitializedPackshotId.current = null; // Removed to prevent reset on flicker
      return;
    }

    // Only initialize if we haven't initialized for this item ID yet
    if (selectedItem.id !== lastInitializedPackshotId.current) {
      // Restore Pan
      if (selectedItem.packshotX !== undefined && selectedItem.packshotX !== null &&
          selectedItem.packshotY !== undefined && selectedItem.packshotY !== null) {
          setPackshotPan({ x: selectedItem.packshotX, y: selectedItem.packshotY });
      } else {
          setPackshotPan({ x: 0, y: 0 });
      }

      // Restore Zoom
      if (selectedItem.packshotZoom !== undefined && selectedItem.packshotZoom !== null) {
          setPackshotZoom(selectedItem.packshotZoom);
          setIsAutoFit(false);
      } else {
          setPackshotZoom(2.0); // Default start zoom
          setIsAutoFit(true);
      }
      
      lastInitializedPackshotId.current = selectedItem.id;
    }
  }, [selectedItem]);

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
      setStorageAreaInput("");
      setWarengruppeInput("");
      setPortionUnitInput("");
      setNutritionTagsInput([]);
      setStandardPreparationComponents([]);
      setStandardPreparationText("");
      setTargetPortionsInput("");
      setTargetSalesPriceInput("");
      setInternalArticleNumberInput("");
      setSupplierInput("");
      setAlternativeItemsInput([]);
      setIsBioInput(false);
      setBioControlNumberInput("");
      setIsDeklarationsfreiInput(false);
      setIsAllergenfreiInput(false);
      setIsCookChillInput(false);
      setIsFreezeThawStableInput(false);
      setIsPalmOilFreeInput(false);
      setIsYeastFreeInput(false);
      setIsLactoseFreeInput(false);
      setIsGlutenFreeInput(false);
      setIsVeganInput(false);
      setIsVegetarianInput(false);
      setIsFairtradeInput(false);
      setIsPowderInput(false);
      setIsGranulateInput(false);
      setIsPasteInput(false);
      setIsLiquidInput(false);
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
    setStorageAreaInput(selectedItem.storageArea ?? "");
    setWarengruppeInput(selectedItem.warengruppe ?? "");
    setPortionUnitInput(selectedItem.portionUnit ?? "");
    setNutritionTagsInput(selectedItem.nutritionTags ?? []);
    setManufacturerInput(selectedItem.manufacturerArticleNumber ?? "");
    setEanInput(selectedItem.ean ?? "");
    setBrandInput(selectedItem.brand ?? "");
    setInternalArticleNumberInput(selectedItem.internalArticleNumber ?? "");
    setSupplierInput(selectedItem.supplier ?? "");
    setAlternativeItemsInput(selectedItem.alternativeItems ?? []);
    setDeviceSettingsInput(selectedItem.deviceSettings || []);
    
    const hasDosage = (stdPrep?.components && stdPrep.components.length > 0) || 
                      (typeof selectedItem.dosageInstructions === 'string' && selectedItem.dosageInstructions.length > 0);
    const hasSettings = selectedItem.deviceSettings && selectedItem.deviceSettings.length > 0;
    setShowProductionPanel(hasDosage || hasSettings || false);
    setIsProductionAccordionOpen(hasSettings || false);

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
    setIsVeganInput(selectedItem.isVegan ?? false);
    setIsVegetarianInput(selectedItem.isVegetarian ?? false);
    setIsFairtradeInput(selectedItem.isFairtrade ?? false);
    setIsPowderInput(selectedItem.isPowder ?? false);
    setIsGranulateInput(selectedItem.isGranulate ?? false);
    setIsPasteInput(selectedItem.isPaste ?? false);
    setIsLiquidInput(selectedItem.isLiquid ?? false);
    const allergensText = (selectedItem.allergens ?? []).join(", ");
    setProAllergensInput(
      allergensText.length > 0
        ? allergensText
        : "keine rezeptorisch enthaltenen Allergene"
    );
    if (selectedItem.nutritionPerUnit) {
      // console.log("Syncing nutrition to state:", selectedItem.nutritionPerUnit);
      const fmt = (val: number | null | undefined) =>
        val !== null && val !== undefined ? String(val) : "k.A.";
      
      setProEnergyKcalInput(fmt(selectedItem.nutritionPerUnit.energyKcal));
      setProFatInput(fmt(selectedItem.nutritionPerUnit.fat));
      setProSaturatedFatInput(fmt(selectedItem.nutritionPerUnit.saturatedFat));
      setProCarbsInput(fmt(selectedItem.nutritionPerUnit.carbs));
      setProSugarInput(fmt(selectedItem.nutritionPerUnit.sugar));
      setProProteinInput(fmt(selectedItem.nutritionPerUnit.protein));
      setProSaltInput(fmt(selectedItem.nutritionPerUnit.salt));
      setProFiberInput(fmt(selectedItem.nutritionPerUnit.fiber));
      setProSodiumInput(fmt(selectedItem.nutritionPerUnit.sodium));
      setProBreadUnitsInput(fmt(selectedItem.nutritionPerUnit.breadUnits));
      setProCholesterolInput(fmt(selectedItem.nutritionPerUnit.cholesterol));
    } else {
      // Nutrition state cleared because nutritionPerUnit is missing
      setProEnergyKcalInput("k.A.");
      setProFatInput("k.A.");
      setProSaturatedFatInput("k.A.");
      setProCarbsInput("k.A.");
      setProSugarInput("k.A.");
      setProProteinInput("k.A.");
      setProSaltInput("k.A.");
      setProFiberInput("k.A.");
      setProSodiumInput("k.A.");
      setProBreadUnitsInput("k.A.");
      setProCholesterolInput("k.A.");
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
      // Logic for Zukauf: preparationSteps is usually a string
      const raw = selectedItem.preparationSteps;
      if (typeof raw === "string" && raw.trim().length > 0) {
        setProPreparationInput(raw);
      } else if (Array.isArray(raw) && raw.length > 0) {
        // Fallback if it somehow got saved as array
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
      setNewItemType(activeSection === "rezepte" ? "eigenproduktion" : "zukauf");
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

  async function handleQuickImport(name: string) {
    if (!name.trim()) return;

    try {
      setIsSaving(true);
      // setError(null); // Optional: don't clear global error for inline action

      // Default values for quick import
      const unit = "kg";
      const type = "zukauf";
      const purchasePrice = 0;

      const response = await fetch("/api/inventory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          type,
          unit,
          purchasePrice,
          components: [],
        }),
      });

      if (!response.ok) {
        throw new Error("Fehler beim Quick-Import.");
      }

      const created = (await response.json()) as InventoryItem;
      setItems((prev) => [...prev, created]);
      
      // Update the current editing components to use the new item ID instead of custom name
      setEditingComponents(prev => prev.map(comp => {
        if (comp.customName === name) {
            return {
                ...comp,
                itemId: created.id,
                customName: null,
                unit: created.unit
            };
        }
        return comp;
      }));
      
    } catch (error) {
      console.error(error);
      setError("Fehler beim Quick-Import: " + (error instanceof Error ? error.message : String(error)));
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

  async function handleStepImageUpload(e: React.ChangeEvent<HTMLInputElement>, stepId: string) {
    const file = e.target.files?.[0];
    if (!file || !selectedItem) return;

    try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("itemId", selectedItem.id);
        formData.append("filename", `step-${stepId}.jpg`);

        const response = await fetch("/api/recipe-image-upload", {
            method: "POST",
            body: formData,
        });

        if (!response.ok) throw new Error("Upload failed");
        
        const data = await response.json();
        const imageUrl = data.imageUrl;

        // Update the step with the new image URL
        setPreparationStepsInput((steps) =>
          steps.map((value) =>
            value.id === stepId
              ? {
                  ...value,
                  imageUrl,
                }
              : value
          )
        );
        
    } catch (error) {
        console.error("Error uploading step image:", error);
    }
  }

  async function handleStepImageDelete(stepId: string, imageUrl: string) {
    if (!selectedItem) return;
    try {
        const response = await fetch("/api/recipe-image-upload", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageUrl }),
        });

        if (!response.ok) throw new Error("Delete failed");

        // Update state to remove image URL
        setPreparationStepsInput((steps) =>
          steps.map((value) =>
            value.id === stepId
              ? {
                  ...value,
                  imageUrl: null,
                }
              : value
          )
        );

    } catch (error) {
        console.error("Error deleting step image:", error);
    }
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

      if (activeSection === "rezepte") {
        formData.append("mode", "recipe");
      }

      if (file.type === "application/pdf") {
        try {
          const imageBlob = await convertPdfToImage(file);
          if (imageBlob) {
            formData.append("vision_file", imageBlob, "preview.jpg");
          }
        } catch (err) {
          console.error("Failed to generate vision preview for PDF", err);
        }
      }
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
          brand?: string;
          nutrition_per_100?: {
            energy_kcal?: number;
            fat?: number;
            saturated_fat?: number;
            carbohydrates?: number;
            carbs?: number;
            sugar?: number;
            protein?: number;
            salt?: number;
            fiber?: number;
            sodium?: number;
            bread_units?: number;
            cholesterol?: number;
          } | null;
          nutrition_per_100g?: {
            energy_kcal?: number;
            fat?: number;
            saturated_fat?: number;
            carbohydrates?: number;
            carbs?: number;
            sugar?: number;
            protein?: number;
            salt?: number;
            fiber?: number;
            sodium?: number;
            bread_units?: number;
            cholesterol?: number;
          } | null;
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
          ean?: string | null;
          is_bio?: boolean;
          is_deklarationsfrei?: boolean;
          is_allergenfrei?: boolean;
          is_cook_chill?: boolean;
          is_freeze_thaw_stable?: boolean;
          is_palm_oil_free?: boolean;
          is_yeast_free?: boolean;
          is_lactose_free?: boolean;
          is_gluten_free?: boolean;
          is_vegan?: boolean;
          is_vegetarian?: boolean;
          is_fairtrade?: boolean;
          is_powder?: boolean;
          is_granulate?: boolean;
          is_paste?: boolean;
          is_liquid?: boolean;
          image_url?: string | null;
          debug_reasoning?: string;
          warengruppe?: string | null;
          storageArea?: string | null;
        };
        fileUrl?: string;
      };

      console.log("Vision Payload received:", payload);
      if (payload.extracted?.debug_reasoning) {
        console.log("AI Reasoning (Gedankengänge):", payload.extracted.debug_reasoning);
      }

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
        // payload.item comes from the API response which maps DB columns (snake_case) to camelCase.
        // We must map it properly.
        const rawItem = payload.item as any;
        const created: InventoryItem = {
          id: rawItem.id,
          internalId: rawItem.internalId ?? rawItem.internal_id,
          name: rawItem.name,
          type: rawItem.type ?? rawItem.item_type,
          unit: rawItem.unit,
          brand: rawItem.brand,
          purchasePrice: rawItem.purchasePrice ?? rawItem.purchase_price,
          targetPortions: rawItem.targetPortions ?? rawItem.target_portions,
          targetSalesPrice: rawItem.targetSalesPrice ?? rawItem.target_sales_price,
          category: rawItem.category,
          portionUnit: rawItem.portionUnit ?? rawItem.portion_unit,
          nutritionTags: rawItem.nutritionTags ?? rawItem.nutrition_tags,
          manufacturerArticleNumber: rawItem.manufacturerArticleNumber ?? rawItem.manufacturer_article_number,
          ean: rawItem.ean,
          allergens: rawItem.allergens,
          ingredients: rawItem.ingredients,
          dosageInstructions: rawItem.dosageInstructions ?? rawItem.dosage_instructions,
          yieldInfo: rawItem.yieldInfo ?? rawItem.yield_info,
          preparationSteps: rawItem.preparationSteps ?? rawItem.preparation_steps,
          fileUrl: rawItem.fileUrl ?? rawItem.file_url,
          imageUrl: rawItem.imageUrl ?? rawItem.image_url,
          nutritionPerUnit: rawItem.nutritionPerUnit ?? rawItem.nutrition_per_unit,
          standardPreparation: rawItem.standardPreparation ?? rawItem.standard_preparation,
          isBio: rawItem.isBio ?? rawItem.is_bio,
          isDeklarationsfrei: rawItem.isDeklarationsfrei ?? rawItem.is_deklarationsfrei,
          isAllergenfrei: rawItem.isAllergenfrei ?? rawItem.is_allergenfrei,
          isCookChill: rawItem.isCookChill ?? rawItem.is_cook_chill,
          isFreezeThawStable: rawItem.isFreezeThawStable ?? rawItem.is_freeze_thaw_stable,
          isPalmOilFree: rawItem.isPalmOilFree ?? rawItem.is_palm_oil_free,
          isYeastFree: rawItem.isYeastFree ?? rawItem.is_yeast_free,
          isLactoseFree: rawItem.isLactoseFree ?? rawItem.is_lactose_free,
          isGlutenFree: rawItem.isGlutenFree ?? rawItem.is_gluten_free,
          isVegan: rawItem.isVegan ?? rawItem.is_vegan,
          isVegetarian: rawItem.isVegetarian ?? rawItem.is_vegetarian,
          isFairtrade: rawItem.isFairtrade ?? rawItem.is_fairtrade,
          isPowder: rawItem.isPowder ?? rawItem.is_powder,
          isGranulate: rawItem.isGranulate ?? rawItem.is_granulate,
          isPaste: rawItem.isPaste ?? rawItem.is_paste,
          isLiquid: rawItem.isLiquid ?? rawItem.is_liquid,
          packshotX: rawItem.packshotX ?? rawItem.packshot_x,
          packshotY: rawItem.packshotY ?? rawItem.packshot_y,
          packshotZoom: rawItem.packshotZoom ?? rawItem.packshot_zoom,
        };
        const nutritionRaw = (payload.extracted?.nutrition_per_100 || payload.extracted?.nutrition_per_100g) as any;
        
        // Sanitize standard_preparation "Produkt" name
        if (payload.extracted?.standard_preparation?.components) {
            payload.extracted.standard_preparation.components = payload.extracted.standard_preparation.components.map((comp: any) => {
                if (comp.name && (comp.name.toLowerCase() === 'produkt' || comp.name.toLowerCase().includes('produkt'))) {
                     const stateSuffix = payload.extracted?.is_liquid ? 'Flüssigkeit' : payload.extracted?.is_paste ? 'Paste' : payload.extracted?.is_granulate ? 'Granulat' : 'Pulver';
                     return { ...comp, name: `${payload.extracted?.name || 'Artikel'} ${stateSuffix}` };
                }
                return comp;
            });
        }

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
          nutritionPerUnit: nutritionRaw ? {
            energyKcal: nutritionRaw.energy_kcal || 0,
            fat: nutritionRaw.fat || 0,
            saturatedFat: nutritionRaw.saturated_fat || 0,
            carbs: nutritionRaw.carbohydrates || nutritionRaw.carbs || 0,
            sugar: nutritionRaw.sugar || 0,
            protein: nutritionRaw.protein || 0,
            salt: nutritionRaw.salt || 0,
            fiber: nutritionRaw.fiber || 0,
            sodium: nutritionRaw.sodium || 0,
            breadUnits: nutritionRaw.bread_units || 0,
            cholesterol: nutritionRaw.cholesterol || 0,
            co2: nutritionRaw.co2 || 0,
          } : created.nutritionPerUnit,
          manufacturerArticleNumber:
            (payload.extracted &&
            typeof payload.extracted.manufacturer_article_number === "string"
              ? payload.extracted.manufacturer_article_number
              : created.manufacturerArticleNumber) ?? null,
          ean:
            (payload.extracted &&
            typeof payload.extracted.ean === "string"
              ? payload.extracted.ean
              : created.ean) ?? null,
          yieldVolume:
            (payload.extracted &&
            typeof payload.extracted.yield_volume === "string"
              ? payload.extracted.yield_volume
              : created.yieldInfo) ?? null, // Note: yieldInfo fallback might be wrong type, but created usually has it
          imageUrl:
            (payload.extracted &&
            typeof payload.extracted.image_url === "string"
              ? payload.extracted.image_url
              : created.imageUrl) ?? null,
          isBio: payload.extracted?.is_bio ?? created.isBio ?? false,
          isDeklarationsfrei: payload.extracted?.is_deklarationsfrei ?? created.isDeklarationsfrei ?? false,
          isAllergenfrei: payload.extracted?.is_allergenfrei ?? created.isAllergenfrei ?? false,
          isCookChill: payload.extracted?.is_cook_chill ?? created.isCookChill ?? false,
          isFreezeThawStable: payload.extracted?.is_freeze_thaw_stable ?? created.isFreezeThawStable ?? false,
          isPalmOilFree: payload.extracted?.is_palm_oil_free ?? created.isPalmOilFree ?? false,
          isYeastFree: payload.extracted?.is_yeast_free ?? created.isYeastFree ?? false,
          isLactoseFree: payload.extracted?.is_lactose_free ?? created.isLactoseFree ?? false,
          isGlutenFree: payload.extracted?.is_gluten_free ?? created.isGlutenFree ?? false,
          isVegan: payload.extracted?.is_vegan ?? created.isVegan ?? false,
          isVegetarian: payload.extracted?.is_vegetarian ?? created.isVegetarian ?? false,
          isPowder: payload.extracted?.is_powder ?? created.isPowder ?? false,
          isGranulate: payload.extracted?.is_granulate ?? created.isGranulate ?? false,
          isPaste: payload.extracted?.is_paste ?? created.isPaste ?? false,
          isLiquid: payload.extracted?.is_liquid ?? created.isLiquid ?? false,
          warengruppe:
            (payload.extracted &&
            payload.extracted.warengruppe
              ? payload.extracted.warengruppe
              : created.warengruppe) || "Trockensortiment",
          storageArea:
            (payload.extracted &&
            payload.extracted.storageArea
              ? payload.extracted.storageArea
              : created.storageArea) || "Trockenwaren",
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

        // Explicitly set boolean flags from extracted data
        setIsBioInput(payload.extracted.is_bio ?? false);
        setIsDeklarationsfreiInput(payload.extracted.is_deklarationsfrei ?? false);
        setIsAllergenfreiInput(payload.extracted.is_allergenfrei ?? false);
        setIsCookChillInput(payload.extracted.is_cook_chill ?? false);
        setIsFreezeThawStableInput(payload.extracted.is_freeze_thaw_stable ?? false);
        setIsPalmOilFreeInput(payload.extracted.is_palm_oil_free ?? false);
        setIsYeastFreeInput(payload.extracted.is_yeast_free ?? false);
        setIsLactoseFreeInput(payload.extracted.is_lactose_free ?? false);
        setIsGlutenFreeInput(payload.extracted.is_gluten_free ?? false);
        setIsVeganInput(payload.extracted.is_vegan ?? false);
        setIsVegetarianInput(payload.extracted.is_vegetarian ?? false);
        setIsPowderInput(payload.extracted.is_powder ?? false);
        setIsGranulateInput(payload.extracted.is_granulate ?? false);
        setIsPasteInput(payload.extracted.is_paste ?? false);
        setIsLiquidInput(payload.extracted.is_liquid ?? false);
        setWarengruppeInput(payload.extracted.warengruppe || "Trockensortiment");
        setStorageAreaInput(payload.extracted.storageArea || "Trockenwaren");
        setIsViewerOpen(true);

        // Nutrition state updates
        const nutritionRaw = (payload.extracted.nutrition_per_100 || payload.extracted.nutrition_per_100g) as any;
        if (nutritionRaw) {
          setProEnergyKcalInput(String(nutritionRaw.energy_kcal || ""));
          setProFatInput(String(nutritionRaw.fat || ""));
          setProSaturatedFatInput(String(nutritionRaw.saturated_fat || ""));
          setProCarbsInput(String(nutritionRaw.carbohydrates || nutritionRaw.carbs || ""));
          setProSugarInput(String(nutritionRaw.sugar || ""));
          setProProteinInput(String(nutritionRaw.protein || ""));
          setProSaltInput(String(nutritionRaw.salt || ""));
          setProFiberInput(String(nutritionRaw.fiber || ""));
          setProSodiumInput(String(nutritionRaw.sodium || ""));
          setProBreadUnitsInput(String(nutritionRaw.bread_units || ""));
          setProCholesterolInput(String(nutritionRaw.cholesterol || ""));
        } else {
          // Keep existing values if not extracted, or clear?
          // Usually better to leave empty if we are confident extraction ran but found nothing.
          // But to be safe, let's not clear if we didn't find any.
          // Actually, if it's a new upload, we probably want to show what was found.
        }

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
          // yieldVolume = payload.extracted.yield_volume.trim(); // User wants to fill this manually
        }
        setProYieldWeightInput(yieldWeight);
        // setProYieldVolumeInput(yieldVolume); // User wants to fill this manually
        if (
          typeof payload.extracted
            .manufacturer_article_number === "string"
        ) {
          setManufacturerInput(
            payload.extracted.manufacturer_article_number
          );
        }
        if (typeof payload.extracted.brand === "string") {
          setBrandInput(payload.extracted.brand);
        }
        if (typeof payload.extracted.preparation_steps === "string") {
           setProPreparationInput(payload.extracted.preparation_steps);
        }
        setProPreparationInput(
          typeof payload.extracted.preparation_steps ===
            "string"
            ? payload.extracted.preparation_steps
            : ""
        );

        // Update selected item with extracted data to ensure UI updates immediately
        setItems((prev) =>
          prev.map((item) => {
            if (item.id !== selectedItemId) return item;

            const extracted = payload.extracted!;
            const nutritionRaw = (extracted.nutrition_per_100 || (extracted as any).nutrition_per_100g) as any;

            return {
              ...item,
              name: extracted.name || item.name,
              brand: extracted.brand || item.brand,
              unit: extracted.unit || item.unit,
              purchasePrice: typeof extracted.purchase_price === 'number' ? extracted.purchase_price : item.purchasePrice,
              manufacturerArticleNumber: extracted.manufacturer_article_number || item.manufacturerArticleNumber,
              ean: extracted.ean || item.ean,
              
              ingredients: typeof extracted.ingredients === 'string' ? extracted.ingredients : item.ingredients,
              allergens: Array.isArray(extracted.allergens) ? extracted.allergens : item.allergens,
              
              warengruppe: extracted.warengruppe || "Trockensortiment",
              storageArea: extracted.storageArea || "Trockenwaren",

              // Boolean flags
              isBio: extracted.is_bio ?? item.isBio,
              isDeklarationsfrei: extracted.is_deklarationsfrei ?? item.isDeklarationsfrei,
              isAllergenfrei: extracted.is_allergenfrei ?? item.isAllergenfrei,
              isCookChill: extracted.is_cook_chill ?? item.isCookChill,
              isFreezeThawStable: extracted.is_freeze_thaw_stable ?? item.isFreezeThawStable,
              isPalmOilFree: extracted.is_palm_oil_free ?? item.isPalmOilFree,
              isYeastFree: extracted.is_yeast_free ?? item.isYeastFree,
              isLactoseFree: extracted.is_lactose_free ?? item.isLactoseFree,
              isGlutenFree: extracted.is_gluten_free ?? item.isGlutenFree,
              isVegan: extracted.is_vegan ?? item.isVegan,
              isVegetarian: extracted.is_vegetarian ?? item.isVegetarian,
              isFairtrade: extracted.is_fairtrade ?? item.isFairtrade,
              
              isPowder: extracted.is_powder ?? item.isPowder,
              isGranulate: extracted.is_granulate ?? item.isGranulate,
              isPaste: extracted.is_paste ?? item.isPaste,
              isLiquid: extracted.is_liquid ?? item.isLiquid,

              // Nutrition
              nutritionPerUnit: nutritionRaw ? {
                energyKcal: nutritionRaw.energy_kcal,
                fat: nutritionRaw.fat,
                saturatedFat: nutritionRaw.saturated_fat,
                carbs: nutritionRaw.carbohydrates || nutritionRaw.carbs,
                sugar: nutritionRaw.sugar,
                protein: nutritionRaw.protein,
                salt: nutritionRaw.salt,
                fiber: nutritionRaw.fiber,
                sodium: nutritionRaw.sodium,
                breadUnits: nutritionRaw.bread_units,
                cholesterol: nutritionRaw.cholesterol,
                co2: nutritionRaw.co2 || null,
              } : item.nutritionPerUnit,
              
               standardPreparation: extracted.standard_preparation ? extracted.standard_preparation : item.standardPreparation,
            };
          })
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
          ean:
            typeof payload.extracted.ean === "string"
              ? payload.extracted.ean
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
          standardPreparation: payload.extracted.standard_preparation || null,
          warengruppe: payload.extracted.warengruppe || "Trockensortiment",
          storageArea: payload.extracted.storageArea || "Trockenwaren",
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
          : selectedItem.name;
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
      if (selectedItem.type !== "eigenproduktion") {
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
        preparationStepsValue = typeof selectedItem.preparationSteps === 'string' ? selectedItem.preparationSteps.trim() : "";
      }

      const parseNutrient = (val: string) => {
        const trimmed = val.trim();
        if (trimmed === "" || trimmed === "k.A.") return null;
        const num = Number(trimmed.replace(",", "."));
        return Number.isNaN(num) ? null : num;
      };

      const nutritionPerUnitValue: NutritionTotals | null =
        proEnergyKcalInput ||
        proFatInput ||
        proSaturatedFatInput ||
        proCarbsInput ||
        proSugarInput ||
        proProteinInput ||
        proSaltInput ||
        proFiberInput ||
        proSodiumInput ||
        proBreadUnitsInput ||
        proCholesterolInput
          ? {
              energyKcal: parseNutrient(proEnergyKcalInput),
              fat: parseNutrient(proFatInput),
              saturatedFat: parseNutrient(proSaturatedFatInput),
              carbs: parseNutrient(proCarbsInput),
              sugar: parseNutrient(proSugarInput),
              protein: parseNutrient(proProteinInput),
              salt: parseNutrient(proSaltInput),
              fiber: parseNutrient(proFiberInput),
              sodium: parseNutrient(proSodiumInput),
              breadUnits: parseNutrient(proBreadUnitsInput),
              cholesterol: parseNutrient(proCholesterolInput),
              co2: null,
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
          unit: selectedItem.unit,
          purchasePrice: selectedItem.purchasePrice,
          brand: brandInput.trim(),
          currency: selectedItem.currency,
          manufacturerArticleNumber: manufacturerInput.trim(),
          ean: eanInput.trim(),
          internalArticleNumber: internalArticleNumberInput.trim(),
          supplier: supplierInput.trim(),
          alternativeItems: alternativeItemsInput,
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
          storageArea: storageAreaInput,
          warengruppe: warengruppeInput,
          category: categoryValue,
          portionUnit: portionUnitValue,
          nutritionTags: nutritionTagsValue,
          nutritionPerUnit: nutritionPerUnitValue,
          standardPreparation:
            selectedItem.type !== "eigenproduktion"
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
          isVegan: isVeganInput,
          isVegetarian: isVegetarianInput,
          isFairtrade: isFairtradeInput,
          isPowder: isPowderInput,
          isGranulate: isGranulateInput,
          isPaste: isPasteInput,
          isLiquid: isLiquidInput,
          deviceSettings: deviceSettingsInput,
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
      setIsDeleting(true);
      setError(null);
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
      alert("Artikel erfolgreich gelöscht.");
    } catch (err) {
      console.error("Delete error:", err);
      const errorMessage = err instanceof Error ? err.message : "Fehler beim Löschen";
      setError(errorMessage);
      alert(`Fehler beim Löschen: ${errorMessage}`);
    } finally {
      setIsDeleting(false);
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
        setPreviewImage(null);
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

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    if (!selectedItem) return;
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          await handleRecipeImageUpload(file);
          return;
        }
      }
    }
  }, [selectedItem]); // handleRecipeImageUpload is stable or we can add it to deps if defined inside component (it is inside)

  const handlePasteClick = useCallback(async () => {
    if (!selectedItem) return;
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageTypes = item.types.filter(type => type.startsWith('image/'));
        for (const type of imageTypes) {
          const blob = await item.getType(type);
          const file = new File([blob], "pasted-image.png", { type });
          await handleRecipeImageUpload(file);
          return;
        }
      }
      // If no image found
      setImageUploadError("Kein Bild in der Zwischenablage gefunden.");
      setTimeout(() => setImageUploadError(null), 3000);
    } catch (err) {
      console.error("Failed to read clipboard:", err);
      setImageUploadError("Zugriff auf Zwischenablage nicht möglich.");
      setTimeout(() => setImageUploadError(null), 3000);
    }
  }, [selectedItem]);

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
        nutritionPerUnit?: NutritionTotals | null;
        dosageInstructions?: string | null;
        warengruppe?: string | null;
        storageArea?: string | null;
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
        warengruppe: data.warengruppe ?? null,
        storageArea: data.storageArea ?? null,
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
          warengruppe: aiParsed.warengruppe ?? null,
          storageArea: aiParsed.storageArea ?? null,
          isBio: aiParsed.isBio,
          isDeklarationsfrei: aiParsed.isDeklarationsfrei,
          isAllergenfrei: aiParsed.isAllergenfrei,
          isCookChill: aiParsed.isCookChill,
          isFreezeThawStable: aiParsed.isFreezeThawStable,
          isPalmOilFree: aiParsed.isPalmOilFree,
          isYeastFree: aiParsed.isYeastFree,
          isLactoseFree: aiParsed.isLactoseFree,
          isGlutenFree: aiParsed.isGlutenFree,
          isVegan: aiParsed.isVegan,
          isVegetarian: aiParsed.isVegetarian,
          isFairtrade: aiParsed.isFairtrade,
          isPowder: aiParsed.isPowder,
          isGranulate: aiParsed.isGranulate,
          isPaste: aiParsed.isPaste,
          isLiquid: aiParsed.isLiquid,
          manufacturerArticleNumber: aiParsed.manufacturerArticleNumber,
          ean: aiParsed.ean,
          bioControlNumber: aiParsed.bioControlNumber,
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



  return (
    <div className="flex flex-1 overflow-hidden bg-[#F6F7F5] text-[#1F2326]">
      {["zutaten", "rezepte"].includes(activeSection) && (
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
              <Accordion className="w-full">
                {["Obst & Gemüse", "Molkerei & Eier", "Trockensortiment", "Getränke", "Zusatz- & Hilfsstoffe", "Unkategorisiert"].map((group) => {
                  const groupItems = filteredItems.filter((item) =>
                    group === "Unkategorisiert"
                      ? !item.warengruppe ||
                        !["Obst & Gemüse", "Molkerei & Eier", "Trockensortiment", "Getränke", "Zusatz- & Hilfsstoffe"].includes(
                          item.warengruppe
                        )
                      : item.warengruppe === group
                  );
                  
                  // Sort items alphabetically within the group
                  groupItems.sort((a, b) => a.name.localeCompare(b.name));

                  if (groupItems.length === 0) return null;

                  const isOpen = openSections.includes(group);
                  const toggle = () => setOpenSections(prev => prev.includes(group) ? prev.filter(a => a !== group) : [...prev, group]);

                  return (
                    <AccordionItem
                      key={group}
                      value={group}
                      className="border-b border-[#6B7176]/50"
                    >
                      <AccordionTrigger 
                        isOpen={isOpen} 
                        onToggle={toggle}
                        className="px-3 py-2 text-xs font-semibold text-white hover:no-underline hover:bg-white/5"
                      >
                        {group}
                        <span className="ml-2 text-[10px] text-[#9CA3AF]">
                          ({groupItems.length})
                        </span>
                      </AccordionTrigger>
                      <AccordionContent isOpen={isOpen} className="pt-0 pb-0">
                        {groupItems.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setSelectedItemId(item.id);
                              setIsDetailView(true);
                            }}
                            className={cn(
                              "flex w-full items-center gap-3 px-3 py-2 text-left text-xs transition-colors hover:bg-white/5 pl-6",
                              selectedItem?.id === item.id &&
                                "bg-white/10 text-white font-medium",
                              selectedItem?.id !== item.id && "text-[#9CA3AF]"
                            )}
                          >
                            <span className="truncate">{item.name}</span>
                          </button>
                        ))}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
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

          {["zutaten", "rezepte"].includes(activeSection) ? (
            <div className="flex h-full flex-col gap-4 overflow-hidden bg-[#F6F7F5] p-6">
              <div className="grid flex-1 min-h-0 grid-cols-[280px_1fr] grid-rows-[minmax(0,1fr)] gap-4">
                <Card className="flex h-full flex-col overflow-hidden border-none bg-white shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 border-b border-[#E5E7EB] px-4 py-3">
                    <CardTitle className="text-base text-[#1F2326]">
                      {activeSection === "rezepte" ? "Rezept-Import" : "Artikel-Import"}
                    </CardTitle>
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
                            const isRecipe = activeSection === "rezepte";
                            const response = await fetch("/api/inventory", {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({
                                name: isRecipe ? "Neues Rezept" : "Neuer Artikel",
                                type: isRecipe ? "eigenproduktion" : "zukauf",
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
                        {isSaving ? "Erstelle..." : activeSection === "rezepte" ? "Neues Rezept anlegen" : "Neuen Artikel anlegen"}
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

                    <div className="space-y-2 rounded-md border border-[#E5E7EB] bg-[#F6F7F5]/50 p-3 text-xs mt-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold text-[#1F2326]">KI Web-Scan</div>
                        {webScanError && <span className="text-[11px] text-destructive">{webScanError}</span>}
                      </div>
                      <form className="space-y-2" onSubmit={handleWebScan}>
                        <input
                          type="url"
                          value={webScanUrl}
                          onChange={(event) => setWebScanUrl(event.target.value)}
                          className="w-full rounded-md border border-[#E5E7EB] bg-white px-2 py-1 text-xs text-[#1F2326] placeholder:text-[#6B7176] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F8F4E] focus-visible:ring-offset-2"
                          placeholder="https://shop.example.com/produkt"
                        />
                        <div className="flex justify-end gap-2">
                          <Button type="submit" size="sm" className="bg-[#4F8F4E] text-white hover:bg-[#3d7a3c]" disabled={isWebScanning || !webScanUrl.trim()}>
                            {isWebScanning ? "Scanne..." : "Webseite scannen"}
                          </Button>
                        </div>
                      </form>
                    </div>


                  </CardContent>
                </Card>

                <Card className="flex h-full flex-col overflow-hidden border-none bg-white shadow-sm">
                   <CardHeader className="flex flex-row items-center justify-between gap-2 border-b border-[#E5E7EB] px-4 py-3">
                      <div className="flex items-center gap-2">
                         <CardTitle className="text-base text-[#1F2326]">{(activeSection as string) === "rezepte" ? "Rezept-Karte" : "Artikel-Details"}</CardTitle>
                      </div>

                   </CardHeader>
                   <CardContent className="flex-1 overflow-y-auto p-4">
                      {error && (
                        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                          {error}
                        </div>
                      )}
                      {selectedItem ? (
                         <div className="space-y-4">
                            <div className="flex flex-col items-center mb-4">
                                <div className="text-[10px] font-medium text-[#6B7176] mb-1 w-full text-left">Packshot-Fokus</div>
                                <div 
          className={cn(
            "relative h-64 w-64 overflow-hidden rounded-md border bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-[#4F8F4E]",
            isPackshotDragOver ? "border-blue-500 bg-blue-50" : "border-gray-200",
            packshotPreview ? "cursor-move touch-none" : "flex flex-col items-center justify-center cursor-default"
          )}
                                    tabIndex={0}
                                    onPaste={handlePaste}
                                    onMouseDown={packshotPreview ? handlePanMouseDown : undefined}
                                    onMouseMove={undefined}
                                    onMouseUp={undefined}
                                    onMouseLeave={handlePackshotLeave}
                                    onDragOver={handlePackshotDragOver}
                                    onDrop={handlePackshotDrop}
                                >
                                    {packshotPreview ? (
                                        <img 
                                            src={packshotPreview} 
                                            alt="Packshot Focus" 
                                            className={cn(
                                              "max-w-none absolute origin-top-left pointer-events-none select-none",
                                              isAutoFit ? "w-full h-full object-contain static transform-none" : ""
                                            )}
                                            style={isAutoFit ? {} : { 
                                                transform: `translate(${packshotPan.x}px, ${packshotPan.y}px)`,
                                                width: `${packshotZoom * 100}%`, 
                                                height: 'auto'
                                            }}
                                            draggable={false}
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center p-4 text-center z-20 relative">
                                            <ImageIcon className="h-8 w-8 text-gray-300 mb-2" />
                                            <span className="text-xs text-gray-500 mb-2">Ziehe ein Bild in das Fenster</span>
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                onClick={() => packshotFileInputRef.current?.click()}
                                                className="bg-white hover:bg-gray-50"
                                            >
                                                Bild hochladen
                                            </Button>
                                        </div>
                                    )}
                                    <input 
                                        type="file" 
                                        ref={packshotFileInputRef} 
                                        className="hidden" 
                                        accept="image/*" 
                                        onChange={handlePackshotFileChange} 
                                    />

                                    {isPackshotDragOver && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-blue-50/90 z-10 border-2 border-blue-500 border-dashed rounded-md">
                                            <span className="text-xs font-medium text-blue-600">Bild hier ablegen</span>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="text-[9px] text-[#6B7176] mt-1 text-center w-64">
                                    {packshotPreview ? "Ausschnitt verschieben oder neues Bild hineinziehen" : "Ziehe ein Bild in das Fenster"}
                                </div>

                                <div className="flex items-center gap-2 mt-2 flex-wrap justify-center w-full">
                                    {packshotPreview && (
                                        <>
                                            <div className="flex items-center rounded-md border border-[#E5E7EB] bg-white p-0.5 shadow-sm">
                                                <Button
                                      variant="ghost"
                                      size="icon"
                                      className="absolute top-2 right-12 h-8 w-8 bg-white/80 hover:bg-white shadow-sm z-10"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setIsAutoFit(true);
                                        setPackshotPan({ x: 0, y: 0 });
                                        setPackshotZoom(1.0);
                                      }}
                                      title="Bild einpassen"
                                    >
                                      <Maximize2 className="h-4 w-4" />
                                    </Button>

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
                                                variant="outline"
                                                size="sm"
                                                className="h-6 w-6 p-0 bg-white hover:bg-gray-50 border-[#E5E7EB]"
                                                onClick={handleCopyPackshot}
                                                title="Bild-URL kopieren"
                                            >
                                                {isCopied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-[#6B7176]" />}
                                            </Button>
                                        </>
                                    )}
                                    
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-6 w-6 p-0 bg-white hover:bg-gray-50 border-[#E5E7EB]"
                                        onClick={handlePasteClick}
                                        title="Bild aus Zwischenablage einfügen"
                                    >
                                        <Clipboard className="h-3 w-3 text-[#6B7176]" />
                                    </Button>

                                    <input 
                                        type="file" 
                                        ref={packshotFileInputRef} 
                                        className="hidden" 
                                        accept="image/*"
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                handleRecipeImageUpload(e.target.files[0]);
                                            }
                                            e.target.value = ""; 
                                        }}
                                    />
                                    
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-6 px-2 text-[10px]"
                                        onClick={() => packshotFileInputRef.current?.click()}
                                        disabled={imageIsUploading}
                                    >
                                        {imageIsUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Bild hochladen"}
                                    </Button>

                                    {packshotPreview && (
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
                                    )}
                                </div>
                            </div>
                            <div className="grid gap-4">
                               <div className="flex gap-4">
                                 <div className="grid gap-2 flex-1">
                                    <label className="text-xs font-medium text-[#1F2326]">
                                      {(activeSection as string) === "rezepte" ? "Rezeptbezeichnung" : "Artikelbezeichnung"}
                                    </label>
                                    <Input 
                                      value={selectedItem.name} 
                                      className="border-[#E5E7EB] bg-white text-[#1F2326]"
                                      onChange={(e) => {
                                         const val = e.target.value;
                                         setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, name: val } : i));
                                         setNameInput(val);
                                      }}
                                    />
                                 </div>
                                 <div className="grid gap-2 w-32">
                                    <label className="text-xs font-medium text-[#1F2326]">
                                      {(activeSection as string) === "rezepte" ? "Rezept-Nr." : "Int. A.Nr."}
                                    </label>
                                    <Input 
                                      value={internalArticleNumberInput} 
                                      className="border-[#E5E7EB] bg-white text-[#1F2326]"
                                      onChange={(e) => {
                                         const val = e.target.value;
                                         setInternalArticleNumberInput(val);
                                         setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, internalArticleNumber: val } : i));
                                      }}
                                    />
                                 </div>
                               </div>
                               <div className="grid grid-cols-3 gap-4">
                                <div className="grid gap-2">
                                  <label className="text-xs font-medium text-[#1F2326]">{(activeSection as string) === "rezepte" ? "Autor / Quelle" : "Marke (Brand)"}</label>
                                  <Input 
                                    value={selectedItem.brand || ""} 
                                    className="border-[#E5E7EB] bg-white text-[#1F2326]"
                                    onChange={(e) => {
                                       const val = e.target.value;
                                       setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, brand: val } : i));
                                       setBrandInput(val);
                                    }}
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <label className="text-xs font-medium text-[#1F2326]">{(activeSection as string) === "rezepte" ? "Internet-Link" : "Hersteller-Artikelnummer"}</label>
                                  <Input 
                                    value={selectedItem.manufacturerArticleNumber || ""} 
                                    className="border-[#E5E7EB] bg-white text-[#1F2326]"
                                    onChange={(e) => {
                                       const val = e.target.value;
                                       setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, manufacturerArticleNumber: val } : i));
                                       setManufacturerInput(val);
                                    }}
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <label className="text-xs font-medium text-[#1F2326]">{(activeSection as string) === "rezepte" ? "Portionen im Durchschnitt" : "EAN (GTIN)"}</label>
                                  <Input 
                                    value={selectedItem.ean || ""} 
                                    className="border-[#E5E7EB] bg-white text-[#1F2326]"
                                    onChange={(e) => {
                                       const val = e.target.value;
                                       setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, ean: val } : i));
                                       setEanInput(val);
                                    }}
                                  />
                                </div>
                              </div>
                               
                               <div className="grid gap-2">
                                <label className="text-xs font-medium text-[#1F2326]">{(activeSection as string) === "rezepte" ? "Kategorien" : "Warengruppe (kulinarisch)"}</label>
                                <select
                                  value={selectedItem.warengruppe || ""}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setWarengruppeInput(val);
                                    setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, warengruppe: val } : i));
                                  }}
                                  className="flex h-9 w-full rounded-md border border-[#E5E7EB] bg-white px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-[#1F2326]"
                                >
                                  <option value="">Bitte wählen...</option>
                                  <option value="Obst & Gemüse">Obst & Gemüse</option>
                                  <option value="Molkerei & Eier">Molkerei & Eier</option>
                                  <option value="Trockensortiment">Trockensortiment</option>
                                  <option value="Getränke">Getränke</option>
                                  <option value="Zusatz- & Hilfsstoffe">Zusatz- & Hilfsstoffe</option>
                                </select>
                              </div>

                              {(activeSection as string) !== "rezepte" && (
                                <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                  <label className="text-xs font-medium text-[#1F2326]">Lagerbereich (räumlich)</label>
                                  <select
                                    value={selectedItem.storageArea || ""}
                                     onChange={(e) => {
                                       const val = e.target.value;
                                       setStorageAreaInput(val);
                                       setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, storageArea: val } : i));
                                     }}
                                     className="flex h-9 w-full rounded-md border border-[#E5E7EB] bg-white px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-[#1F2326]"
                                   >
                                     <option value="">Bitte wählen...</option>
                                     <option value="Frischwaren">Frischwaren</option>
                                     <option value="Kühlwaren">Kühlwaren</option>
                                     <option value="Tiefkühlwaren">Tiefkühlwaren</option>
                                     <option value="Trockenwaren">Trockenwaren</option>
                                     <option value="Non Food">Non Food</option>
                                   </select>
                                 </div>
                                 <div className="grid gap-2">
                                    <label className="text-xs font-medium text-[#1F2326]">Lieferant</label>
                                    <Input 
                                      value={selectedItem.supplier || ""} 
                                      className="border-[#E5E7EB] bg-white text-[#1F2326]"
                                      onChange={(e) => {
                                         const val = e.target.value;
                                         setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, supplier: val } : i));
                                      }}
                                    />
                                 </div>
                               </div>
                               )}

                               {(activeSection as string) !== "rezepte" && (
                               <div className="grid grid-cols-2 gap-4">
                                  <div className="grid gap-2">
                                    <label className="text-xs font-medium text-[#1F2326]">Gewicht (netto)/Abtropfgewicht</label>
                                    <Input value={selectedItem.unit} 
                                      className="border-[#E5E7EB] bg-white text-[#1F2326]"
                                      onChange={(e) => {
                                       const val = e.target.value;
                                       setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, unit: val } : i));
                                    }} />
                                  </div>
                                  <div className="grid gap-2">
                                    <label className="text-xs font-medium text-[#1F2326]">EK-Preis/VE</label>
                                    <div className="flex gap-2">
                                      <Input 
                                        type="number" 
                                        value={selectedItem.purchasePrice} 
                                        className="border-[#E5E7EB] bg-white text-[#1F2326] flex-1"
                                        onChange={(e) => {
                                           const val = parseFloat(e.target.value);
                                           setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, purchasePrice: val } : i));
                                        }} 
                                      />
                                      <Input
                                        value={selectedItem.currency || "EUR"}
                                        className="w-16 border-[#E5E7EB] bg-white text-[#1F2326] text-center"
                                        placeholder="EUR"
                                        onChange={(e) => {
                                           const val = e.target.value;
                                           setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, currency: val } : i));
                                        }}
                                      />
                                    </div>
                                  </div>
                               </div>
                               )}

                               {(activeSection as string) !== "rezepte" && (
                              <div className="grid gap-2">
                                <Accordion className="w-full">
                                   <AccordionItem value="alternative-items" className="border-none">
                                     <AccordionTrigger 
                                        isOpen={isAlternativeItemsOpen} 
                                        onToggle={() => setIsAlternativeItemsOpen(!isAlternativeItemsOpen)}
                                        className="py-2 text-xs font-medium text-[#1F2326] hover:no-underline"
                                     >
                                       Alternative Artikel
                                     </AccordionTrigger>
                                     <AccordionContent isOpen={isAlternativeItemsOpen}>
                                       <div className="space-y-4 pt-2">
                                        {(selectedItem.alternativeItems || []).map((item, idx) => (
                                          <div key={idx} className="grid gap-2 p-2 border rounded-md border-[#E5E7EB]">
                                            <div className="flex justify-between items-center">
                                              <span className="text-xs font-semibold">Alternative {idx + 1}</span>
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => {
                                                  const newItems = (selectedItem.alternativeItems || []).filter((_, i) => i !== idx);
                                                  setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, alternativeItems: newItems } : i));
                                                }}
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </Button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                              <div className="grid gap-1">
                                                <label className="text-[10px] text-gray-500">Int. Art.Nr.</label>
                                                <Input
                                                  value={item.internalArticleNumber}
                                                  className="h-7 text-xs border-[#E5E7EB] bg-white text-[#1F2326]"
                                                  onChange={(e) => {
                                                    const val = e.target.value;
                                                    const newItems = [...(selectedItem.alternativeItems || [])];
                                                    newItems[idx] = { ...newItems[idx], internalArticleNumber: val };
                                                    setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, alternativeItems: newItems } : i));
                                                  }}
                                                />
                                              </div>
                                              <div className="grid gap-1">
                                                <label className="text-[10px] text-gray-500">Herst. Art.Nr.</label>
                                                <Input
                                                  value={item.manufacturerArticleNumber}
                                                  className="h-7 text-xs border-[#E5E7EB] bg-white text-[#1F2326]"
                                                  onChange={(e) => {
                                                    const val = e.target.value;
                                                    const newItems = [...(selectedItem.alternativeItems || [])];
                                                    newItems[idx] = { ...newItems[idx], manufacturerArticleNumber: val };
                                                    setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, alternativeItems: newItems } : i));
                                                  }}
                                                />
                                              </div>
                                              <div className="grid gap-1 col-span-2">
                                                <label className="text-[10px] text-gray-500">Name</label>
                                                <Input
                                                  value={item.name}
                                                  className="h-7 text-xs border-[#E5E7EB] bg-white text-[#1F2326]"
                                                  onChange={(e) => {
                                                    const val = e.target.value;
                                                    const newItems = [...(selectedItem.alternativeItems || [])];
                                                    newItems[idx] = { ...newItems[idx], name: val };
                                                    setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, alternativeItems: newItems } : i));
                                                  }}
                                                />
                                              </div>
                                              <div className="grid gap-1">
                                                <label className="text-[10px] text-gray-500">Netto-Gewicht</label>
                                                <Input
                                                  value={item.netWeight}
                                                  className="h-7 text-xs border-[#E5E7EB] bg-white text-[#1F2326]"
                                                  onChange={(e) => {
                                                    const val = e.target.value;
                                                    const newItems = [...(selectedItem.alternativeItems || [])];
                                                    newItems[idx] = { ...newItems[idx], netWeight: val };
                                                    setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, alternativeItems: newItems } : i));
                                                  }}
                                                />
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          className="w-full text-xs h-7 border-dashed"
                                          onClick={() => {
                                            const newItems = [...(selectedItem.alternativeItems || []), {
                                              internalArticleNumber: "",
                                              manufacturerArticleNumber: "",
                                              name: "",
                                              netWeight: ""
                                            }];
                                            setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, alternativeItems: newItems } : i));
                                          }}
                                        >
                                          <Plus className="h-3 w-3 mr-1" />
                                          Alternative hinzufügen
                                        </Button>
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                </Accordion>
                              </div>
                              )}

                              {(activeSection as string) !== "rezepte" && (
                              <>
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
                                          type="number"
                                          placeholder="Menge"
                                          value={comp.quantity}
                                          className="h-7 w-20 text-xs border-[#E5E7EB] bg-white text-[#1F2326] shrink-0"
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
                                          className="h-7 w-20 text-xs border-[#E5E7EB] bg-white text-[#1F2326] shrink-0"
                                          onChange={(e) => {
                                             const val = e.target.value;
                                             const currentPrep = selectedItem.standardPreparation!;
                                             const newComponents = [...currentPrep.components];
                                             newComponents[idx] = { ...newComponents[idx], unit: val };
                                             setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, standardPreparation: { ...currentPrep, components: newComponents } } : i));
                                          }}
                                        />
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
                                </>
                                )}

                                {!showProductionPanel && (
                                   <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="mt-4 w-full text-xs h-7 border-dashed text-muted-foreground"
                                      onClick={() => {
                                         setShowProductionPanel(true);
                                         setIsProductionAccordionOpen(true);
                                      }}
                                   >
                                      <Plus className="h-3 w-3 mr-1" />
                                      Produktion & Ressourcen hinzufügen
                                   </Button>
                                 )}

                                 {showProductionPanel && (
                                  <div className="grid gap-2 mt-4 border rounded-md overflow-hidden">
                                     <div 
                                       className="flex items-center justify-between px-3 py-2 bg-[#6B7176] text-white cursor-pointer"
                                       onClick={() => setIsProductionAccordionOpen(!isProductionAccordionOpen)}
                                     >
                                       <span className="text-xs font-medium">Produktion & Ressourcen</span>
                                       {isProductionAccordionOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                     </div>
                                     
                                     {isProductionAccordionOpen && (
                                       <div className="p-3 bg-gray-50 space-y-3">
                                          <div className="flex justify-end">
                                             <Button 
                                                type="button" 
                                                variant="outline" 
                                                size="sm" 
                                                onClick={handleAiForecast}
                                                disabled={isPredictingProduction}
                                                className="text-xs h-7 bg-white border-[#4F8F4E] text-[#4F8F4E] hover:bg-[#4F8F4E] hover:text-white transition-colors"
                                             >
                                                {isPredictingProduction ? (
                                                   <>
                                                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                                      Analysiere...
                                                   </>
                                                ) : (
                                                   <>
                                                      <Sparkles className="h-3 w-3 mr-1" />
                                                      KI-Prognose generieren
                                                   </>
                                                )}
                                             </Button>
                                          </div>

                                          <div className="space-y-4">
                                            {deviceSettingsInput.map((setting, idx) => (
                                              <div key={idx} className="p-3 bg-white rounded border border-gray-200 shadow-sm space-y-3 relative">
                                                <Button
                                                  type="button"
                                                  variant="ghost"
                                                  size="sm"
                                                  className="absolute top-1 right-1 h-6 w-6 p-0 text-gray-400 hover:text-destructive"
                                                  onClick={() => {
                                                    const newSettings = deviceSettingsInput.filter((_, i) => i !== idx);
                                                    setDeviceSettingsInput(newSettings);
                                                    setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, deviceSettings: newSettings } : i));
                                                  }}
                                                >
                                                  <X className="h-3 w-3" />
                                                </Button>

                                                {/* Menge & Geräte-Slot */}
                                                <div className="grid grid-cols-3 gap-2">
                                                   <div className="col-span-1 space-y-1">
                                                      <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Menge</label>
                                                      <Input
                                                         placeholder="bis 1 Liter"
                                                         value={setting.quantity}
                                                         className="h-7 text-xs border-[#E5E7EB]"
                                                         onChange={(e) => {
                                                            const newSettings = [...deviceSettingsInput];
                                                            newSettings[idx] = { ...newSettings[idx], quantity: e.target.value };
                                                            setDeviceSettingsInput(newSettings);
                                                            setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, deviceSettings: newSettings } : i));
                                                         }}
                                                      />
                                                   </div>
                                                   <div className="col-span-2 space-y-1">
                                                      <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Gerät</label>
                                                      <Input
                                                         placeholder="z.B. Rational iCombi Pro"
                                                         value={setting.device}
                                                         className="h-7 text-xs border-[#E5E7EB]"
                                                         onChange={(e) => {
                                                            const newSettings = [...deviceSettingsInput];
                                                            newSettings[idx] = { ...newSettings[idx], device: e.target.value };
                                                            setDeviceSettingsInput(newSettings);
                                                            setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, deviceSettings: newSettings } : i));
                                                         }}
                                                      />
                                                   </div>
                                                </div>

                                                {/* Parameter-Zeile - Aufgeteilt für bessere Übersicht */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                   <div className="space-y-1">
                                                      <label className="text-[10px] text-gray-400">Programm/Stufe</label>
                                                      <Input
                                                         placeholder="Einstellungen"
                                                         value={setting.settings || ""}
                                                         className="h-7 text-xs border-[#E5E7EB]"
                                                         onChange={(e) => {
                                                            const newSettings = [...deviceSettingsInput];
                                                            newSettings[idx] = { ...newSettings[idx], settings: e.target.value };
                                                            setDeviceSettingsInput(newSettings);
                                                            setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, deviceSettings: newSettings } : i));
                                                         }}
                                                      />
                                                   </div>
                                                   <div className="space-y-1">
                                                      <label className="text-[10px] text-gray-400">Zeit</label>
                                                      <Input
                                                         placeholder="Minuten"
                                                         value={setting.runtime}
                                                         className="h-7 text-xs border-[#E5E7EB]"
                                                         onChange={(e) => {
                                                            const newSettings = [...deviceSettingsInput];
                                                            newSettings[idx] = { ...newSettings[idx], runtime: e.target.value };
                                                            setDeviceSettingsInput(newSettings);
                                                            setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, deviceSettings: newSettings } : i));
                                                         }}
                                                      />
                                                   </div>
                                                </div>
                                                
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                   <div className="space-y-1">
                                                      <label className="text-[10px] text-gray-400">Energie</label>
                                                      <Input
                                                         placeholder="kWh"
                                                         value={setting.energy}
                                                         className="h-7 text-xs border-[#E5E7EB]"
                                                         onChange={(e) => {
                                                            const newSettings = [...deviceSettingsInput];
                                                            newSettings[idx] = { ...newSettings[idx], energy: e.target.value };
                                                            setDeviceSettingsInput(newSettings);
                                                            setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, deviceSettings: newSettings } : i));
                                                         }}
                                                      />
                                                   </div>
                                                   <div className="space-y-1">
                                                      <label className="text-[10px] text-gray-400">Wasser (l)</label>
                                                      <Input
                                                         placeholder="Liter"
                                                         value={setting.water || ""}
                                                         className="h-7 text-xs border-[#E5E7EB]"
                                                         onChange={(e) => {
                                                            const newSettings = [...deviceSettingsInput];
                                                            newSettings[idx] = { ...newSettings[idx], water: e.target.value };
                                                            setDeviceSettingsInput(newSettings);
                                                            setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, deviceSettings: newSettings } : i));
                                                         }}
                                                      />
                                                   </div>
                                                </div>

                                                {/* Output & Reinigung */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                                                   <div className="space-y-1">
                                                      <label className="text-[10px] font-medium text-gray-500 uppercase">Output / Reichweite</label>
                                                      <Input
                                                         placeholder="z.B. 5 GN-Behälter"
                                                         value={setting.outputYield || ""}
                                                         className="h-7 text-xs border-[#E5E7EB]"
                                                         onChange={(e) => {
                                                            const newSettings = [...deviceSettingsInput];
                                                            newSettings[idx] = { ...newSettings[idx], outputYield: e.target.value };
                                                            setDeviceSettingsInput(newSettings);
                                                            setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, deviceSettings: newSettings } : i));
                                                         }}
                                                      />
                                                   </div>
                                                   <div className="space-y-1">
                                                      <label className="text-[10px] font-medium text-gray-500 uppercase">Reinigung</label>
                                                      <Input
                                                         placeholder="z.B. Spülmaschine"
                                                         value={setting.cleaningEffort || ""}
                                                         className="h-7 text-xs border-[#E5E7EB]"
                                                         onChange={(e) => {
                                                            const newSettings = [...deviceSettingsInput];
                                                            newSettings[idx] = { ...newSettings[idx], cleaningEffort: e.target.value };
                                                            setDeviceSettingsInput(newSettings);
                                                            setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, deviceSettings: newSettings } : i));
                                                         }}
                                                      />
                                                   </div>
                                                </div>
                                              </div>
                                            ))}
                                            
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="sm"
                                              className="w-full text-xs h-7 border-dashed"
                                              onClick={() => {
                                                const newSettings = [
                                                  ...deviceSettingsInput,
                                                  { quantity: "", device: "", runtime: "", energy: "", settings: "", water: "", outputYield: "", cleaningEffort: "" }
                                                ];
                                                setDeviceSettingsInput(newSettings);
                                                setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, deviceSettings: newSettings } : i));
                                              }}
                                            >
                                              <Plus className="h-3 w-3 mr-1" />
                                              Produktionsschritt hinzufügen
                                            </Button>
                                          </div>
                                       </div>
                           )}
                           </div>
                           )}

                               {(selectedItem.type !== "eigenproduktion" || (activeSection as any) === "zutaten") && (
                                 <>
                        <div className="space-y-1">
                          <div className="text-[11px] text-muted-foreground">
                            Zutatenliste (Deklaration)
                          </div>
                          <textarea
                            rows={3}
                            value={proIngredientsInput}
                            onChange={(event) => {
                              setProIngredientsInput(event.target.value);
                              event.target.style.height = "auto";
                              event.target.style.height = event.target.scrollHeight + "px";
                            }}
                            ref={(el) => {
                                if (el) {
                                    el.style.height = "auto";
                                    el.style.height = el.scrollHeight + "px";
                                }
                            }}
                            className="w-full rounded-md border border-input bg-background px-2 py-1 text-[11px] text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background overflow-hidden"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <div className="text-[11px] text-muted-foreground">
                              Ergiebigkeit / Gebinde
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
                              Volumen-Ergiebigkeit
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
                          <div className="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={isVeganInput}
                              onChange={(e) =>
                                setIsVeganInput(e.target.checked)
                              }
                              id="check-vegan"
                              className="h-3 w-3 rounded border-gray-300"
                            />
                            <label htmlFor="check-vegan">Vegan</label>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={isVegetarianInput}
                              onChange={(e) =>
                                setIsVegetarianInput(e.target.checked)
                              }
                              id="check-vegetarian"
                              className="h-3 w-3 rounded border-gray-300"
                            />
                            <label htmlFor="check-vegetarian">Vegetarisch</label>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={isFairtradeInput}
                              onChange={(e) =>
                                setIsFairtradeInput(e.target.checked)
                              }
                              id="check-fairtrade"
                              className="h-3 w-3 rounded border-gray-300"
                            />
                            <label htmlFor="check-fairtrade">Fairtrade</label>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={isPowderInput}
                              onChange={(e) =>
                                setIsPowderInput(e.target.checked)
                              }
                              id="check-powder"
                              className="h-3 w-3 rounded border-gray-300"
                            />
                            <label htmlFor="check-powder">Pulver</label>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={isGranulateInput}
                              onChange={(e) =>
                                setIsGranulateInput(e.target.checked)
                              }
                              id="check-granulate"
                              className="h-3 w-3 rounded border-gray-300"
                            />
                            <label htmlFor="check-granulate">Granulat</label>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={isPasteInput}
                              onChange={(e) =>
                                setIsPasteInput(e.target.checked)
                              }
                              id="check-paste"
                              className="h-3 w-3 rounded border-gray-300"
                            />
                            <label htmlFor="check-paste">Paste</label>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={isLiquidInput}
                              onChange={(e) =>
                                setIsLiquidInput(e.target.checked)
                              }
                              id="check-liquid"
                              className="h-3 w-3 rounded border-gray-300"
                            />
                            <label htmlFor="check-liquid">Flüssig</label>
                          </div>
                        </div>

                        {isBioInput && (
                          <div className="mt-2 flex items-center gap-2">
                            <label className="w-24 shrink-0 text-[11px] text-muted-foreground">
                              Bio-Kontrollstelle:
                            </label>
                            <Input
                              value={bioControlNumberInput}
                              onChange={(e) =>
                                setBioControlNumberInput(e.target.value)
                              }
                              className="h-7 w-full px-2 py-1 text-[11px]"
                              placeholder="z.B. DE-ÖKO-006"
                            />
                          </div>
                        )}

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
                                type="text"
                                value={proEnergyKcalInput}
                                onChange={(e) =>
                                  setProEnergyKcalInput(e.target.value)
                                }
                                className="h-7 px-2 py-1 text-[11px]"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <label className="text-[10px] text-muted-foreground">
                                Fett (g)
                              </label>
                              <Input
                                type="text"
                                value={proFatInput}
                                onChange={(e) => setProFatInput(e.target.value)}
                                className="h-7 px-2 py-1 text-[11px]"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <label className="text-[10px] text-muted-foreground">
                                ges. Fettsäuren (g)
                              </label>
                              <Input
                                type="text"
                                value={proSaturatedFatInput}
                                onChange={(e) =>
                                  setProSaturatedFatInput(e.target.value)
                                }
                                className="h-7 px-2 py-1 text-[11px]"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <label className="text-[10px] text-muted-foreground">
                                Kohlenhydrate (g)
                              </label>
                              <Input
                                type="text"
                                value={proCarbsInput}
                                onChange={(e) =>
                                  setProCarbsInput(e.target.value)
                                }
                                className="h-7 px-2 py-1 text-[11px]"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <label className="text-[10px] text-muted-foreground">
                                Zucker (g)
                              </label>
                              <Input
                                type="text"
                                value={proSugarInput}
                                onChange={(e) => setProSugarInput(e.target.value)}
                                className="h-7 px-2 py-1 text-[11px]"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <label className="text-[10px] text-muted-foreground">
                                Eiweiß (g)
                              </label>
                              <Input
                                type="text"
                                value={proProteinInput}
                                onChange={(e) =>
                                  setProProteinInput(e.target.value)
                                }
                                className="h-7 px-2 py-1 text-[11px]"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <label className="text-[10px] text-muted-foreground">
                                Salz (g)
                              </label>
                              <Input
                                type="text"
                                value={proSaltInput}
                                onChange={(e) => setProSaltInput(e.target.value)}
                                className="h-7 px-2 py-1 text-[11px]"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <label className="text-[10px] text-muted-foreground">
                                Ballaststoffe (g)
                              </label>
                              <Input
                                type="text"
                                value={proFiberInput}
                                onChange={(e) => setProFiberInput(e.target.value)}
                                className="h-7 px-2 py-1 text-[11px]"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <label className="text-[10px] text-muted-foreground">
                                Natrium (mg)
                              </label>
                              <Input
                                type="text"
                                value={proSodiumInput}
                                onChange={(e) => setProSodiumInput(e.target.value)}
                                className="h-7 px-2 py-1 text-[11px]"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <label className="text-[10px] text-muted-foreground">
                                BE
                              </label>
                              <Input
                                type="text"
                                value={proBreadUnitsInput}
                                onChange={(e) => setProBreadUnitsInput(e.target.value)}
                                className="h-7 px-2 py-1 text-[11px]"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <label className="text-[10px] text-muted-foreground">
                                Cholesterin (mg)
                              </label>
                              <Input
                                type="text"
                                value={proCholesterolInput}
                                onChange={(e) => setProCholesterolInput(e.target.value)}
                                className="h-7 px-2 py-1 text-[11px]"
                              />
                            </div>
                          </div>
                        </div>
                                 </>
                               )}

                        <div className="pt-4">
                          <div
                            className="flex items-center justify-between rounded-t-md bg-[#6B7176] px-3 py-2 text-white cursor-pointer hover:bg-[#5a5f64] transition-colors"
                            onClick={() => setIsViewerOpen(!isViewerOpen)}
                          >
                            <span className="text-xs font-medium">Original-Dokument / Produktpass</span>
                            <div className="flex items-center gap-2">
                                {(selectedItem?.fileUrl || selectedItem?.imageUrl) && (
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        className="h-6 text-[10px] px-2 bg-white/20 hover:bg-white/30 text-white border-none"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleReScan();
                                        }}
                                        disabled={isReScanning}
                                    >
                                        {isReScanning ? (
                                            <>
                                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                                Scanne...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="mr-1 h-3 w-3" />
                                                KI Re-Scan
                                            </>
                                        )}
                                    </Button>
                                )}
                                {isViewerOpen ? (
                                    <ChevronUp className="h-4 w-4" />
                                ) : (
                                    <ChevronDown className="h-4 w-4" />
                                )}
                            </div>
                          </div>
                          
                          {isViewerOpen && (
                             <div className="border border-t-0 border-gray-200 rounded-b-md p-2 bg-white">
                                {selectedItem?.fileUrl || selectedItem?.imageUrl ? (
                                   <div className="flex flex-col gap-2">
                                      {!(selectedItem.fileUrl?.toLowerCase().endsWith('.pdf')) && (
                                          <div className="flex justify-end gap-2">
                                              <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => setViewerZoom(z => Math.max(0.5, z - 0.1))}><Minus className="h-3 w-3" /></Button>
                                              <span className="text-[10px] self-center w-8 text-center">{Math.round(viewerZoom * 100)}%</span>
                                              <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => setViewerZoom(z => Math.min(3, z + 0.1))}><Plus className="h-3 w-3" /></Button>
                                          </div>
                                      )}
                                      <div className="overflow-auto max-h-[500px] border rounded bg-gray-50 flex justify-center p-2 relative">
                                          {selectedItem.fileUrl?.toLowerCase().endsWith('.pdf') ? (
                                              <iframe 
                                                src={selectedItem.fileUrl} 
                                                className="w-full h-[500px]" 
                                                style={{ border: 'none' }} 
                                              />
                                          ) : (
                                              <div style={{ transform: `scale(${viewerZoom})`, transformOrigin: 'top left', transition: 'transform 0.2s' }}>
                                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                                  <img 
                                                    src={selectedItem.imageUrl || selectedItem.fileUrl || ""} 
                                                    alt="Original Dokument" 
                                                    className="max-w-full h-auto"
                                                  />
                                              </div>
                                          )}
                                      </div>
                                   </div>
                                ) : (
                                   <div className="text-center text-xs text-gray-500 py-4">Kein Dokument vorhanden</div>
                                )}
                             </div>
                          )}
                        </div>

                               <div className="flex justify-between items-center">
                                  {/* Buttons moved to header */}
                               </div>
                            </div>
                         </div>
                      ) : (
                         <div className="flex h-full flex-col items-center justify-center text-[#6B7176] text-xs">
                            <p>Wähle {activeSection === "rezepte" ? "ein Rezept" : "einen Artikel"} aus der Liste.</p>
                         </div>
                      )}
                   </CardContent>
                   {selectedItem && (
                     <div className="flex justify-end gap-2 px-6 pb-6">
                       <Button
                         type="button"
                         size="sm"
                         style={{ backgroundColor: 'var(--recetui-green)', color: 'white' }}
                         className="px-3 py-1 text-[11px] font-medium hover:opacity-90"
                         disabled={isSaving}
                         onClick={() => {
                           void handleSaveAll();
                         }}
                       >
                         {isSaving ? "Speichere..." : activeSection === "rezepte" ? "Rezept speichern" : "Artikel speichern"}
                       </Button>
                       <Button
                         type="button"
                         size="sm"
                         style={{ backgroundColor: 'var(--recetui-orange)', color: 'white' }}
                         className="px-3 py-1 text-[11px] font-medium hover:opacity-90"
                         onClick={handleDelete}
                         disabled={isDeleting || isSaving}
                       >
                         {isDeleting ? "Lösche..." : activeSection === "rezepte" ? "Rezept löschen" : "Artikel löschen"}
                       </Button>
                     </div>
                   )}
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
                                {(nutritionSummary.perRecipe.energyKcal ?? 0).toFixed(
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
                                {(nutritionSummary.perRecipe.fat ?? 0).toFixed(1)} g
                              </span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-muted-foreground">
                                Kohlenhydrate gesamt (Rezept)
                              </span>
                              <span className="font-medium">
                                {(nutritionSummary.perRecipe.carbs ?? 0).toFixed(1)} g
                              </span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-muted-foreground">
                                Eiweiß gesamt (Rezept)
                              </span>
                              <span className="font-medium">
                                {(nutritionSummary.perRecipe.protein ?? 0).toFixed(1)}{" "}
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
                          <div key={selectedItem.id} className="relative h-full w-full">
                          <Image
                            unoptimized
                            src={imageUrlInput || selectedItem.imageUrl || ""}
                            alt={selectedItem.name}
                            fill
                            className="object-cover"
                          />
                          </div>
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

                  {/* DEBUG OVERLAY */}
                  {(activeSection as any) === "zutaten" && (
                    <div className="bg-red-100 p-2 border border-red-500 text-xs mb-2 text-red-900">
                      DEBUG INFO: <br/>
                      Type: {selectedItem.type} <br/>
                      Nutrition Present: {selectedItem.nutritionPerUnit ? "Yes" : "No"} <br/>
                      Nutrition State: kcal={proEnergyKcalInput}
                    </div>
                  )}

                  {(selectedItem.type !== "eigenproduktion" || (activeSection as any) === "zutaten") && (
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
                              Ergiebigkeit / Gebinde
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
                              Volumen-Ergiebigkeit
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
                                type="text"
                                value={proEnergyKcalInput}
                                onChange={(e) =>
                                  setProEnergyKcalInput(e.target.value)
                                }
                                className="h-7 px-2 py-1 text-[11px]"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <label className="text-[10px] text-muted-foreground">
                                Fett (g)
                              </label>
                              <Input
                                type="text"
                                value={proFatInput}
                                onChange={(e) => setProFatInput(e.target.value)}
                                className="h-7 px-2 py-1 text-[11px]"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <label className="text-[10px] text-muted-foreground">
                                ges. Fettsäuren (g)
                              </label>
                              <Input
                                type="text"
                                value={proSaturatedFatInput}
                                onChange={(e) =>
                                  setProSaturatedFatInput(e.target.value)
                                }
                                className="h-7 px-2 py-1 text-[11px]"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <label className="text-[10px] text-muted-foreground">
                                Kohlenhydrate (g)
                              </label>
                              <Input
                                type="text"
                                value={proCarbsInput}
                                onChange={(e) =>
                                  setProCarbsInput(e.target.value)
                                }
                                className="h-7 px-2 py-1 text-[11px]"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <label className="text-[10px] text-muted-foreground">
                                Zucker (g)
                              </label>
                              <Input
                                type="text"
                                value={proSugarInput}
                                onChange={(e) => setProSugarInput(e.target.value)}
                                className="h-7 px-2 py-1 text-[11px]"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <label className="text-[10px] text-muted-foreground">
                                Eiweiß (g)
                              </label>
                              <Input
                                type="text"
                                value={proProteinInput}
                                onChange={(e) =>
                                  setProProteinInput(e.target.value)
                                }
                                className="h-7 px-2 py-1 text-[11px]"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <label className="text-[10px] text-muted-foreground">
                                Salz (g)
                              </label>
                              <Input
                                type="text"
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
                                Ergiebigkeit / Gebinde
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
                              Volumen-Ergiebigkeit
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
                      {activeSection === "rezepte" ? (
                        <SmartIngredientMatrix
                          components={isEditingComponents ? (editingComponents as SmartInventoryComponent[]) : (selectedItem.components as SmartInventoryComponent[] ?? [])}
                          availableItems={effectiveItems.filter(i => i.id !== selectedItem?.id)}
                          onUpdate={(comps) => setEditingComponents(comps as InventoryComponent[])}
                          onQuickImport={handleQuickImport}
                          readOnly={!isEditingComponents}
                        />
                      ) : (
                        <>
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
                        </>
                      )}
                      {isEditingComponents && (
                        <div className="space-y-3 rounded-md border bg-muted/40 p-3 text-xs">
                          {activeSection !== "rezepte" && (
                          <>
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
                          </>
                          )}
                          {activeSection === "rezepte" ? (
                              <SmartIngredientMatrix
                                components={editingComponents as SmartInventoryComponent[]}
                                availableItems={effectiveItems.filter(i => i.id !== selectedItem?.id)}
                                onUpdate={(comps) => setEditingComponents(comps as InventoryComponent[])}
                                onQuickImport={handleQuickImport}
                                readOnly={false}
                              />
                          ) : (
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
                          )}
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
                                        <div className="mt-1 relative group">
                                          <div className="text-[10px] text-muted-foreground">
                                            Vorschau
                                          </div>
                                          <div className="relative inline-block w-full">
                                            <button
                                              type="button"
                                              className="w-full"
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
                                            <Button
                                              type="button"
                                              variant="destructive"
                                              size="icon"
                                              className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                              onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleStepImageDelete(step.id, step.imageUrl!);
                                              }}
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          </div>
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
                                    {(nutritionSummary.perRecipe.energyKcal ?? 0).toFixed(
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
                                    {(nutritionSummary.perRecipe.fat ?? 0).toFixed(
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
                                    {(nutritionSummary.perRecipe.saturatedFat ?? 0).toFixed(
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
                                    {(nutritionSummary.perRecipe.carbs ?? 0).toFixed(
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
                                    {(nutritionSummary.perRecipe.sugar ?? 0).toFixed(
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
                                    {(nutritionSummary.perRecipe.protein ?? 0).toFixed(
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
                                    {(nutritionSummary.perRecipe.salt ?? 0).toFixed(
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
                                {(nutritionSummary.perPortion.energyKcal ?? 0).toFixed(
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
                                        {(nutritionSummary.perPortion.fat ?? 0).toFixed(
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
                                {(nutritionSummary.perPortion.saturatedFat ?? 0).toFixed(
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
                                        {(nutritionSummary.perPortion.carbs ?? 0).toFixed(
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
                                        {(nutritionSummary.perPortion.sugar ?? 0).toFixed(
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
                                {(nutritionSummary.perPortion.protein ?? 0).toFixed(
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
                                        {(nutritionSummary.perPortion.salt ?? 0).toFixed(
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
                            Ergiebigkeit / Gebinde
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
                              Volumen-Ergiebigkeit
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
