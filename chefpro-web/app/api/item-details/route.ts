import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

type InventoryType = "zukauf" | "eigenproduktion";

type StandardPreparationComponent = {
  name: string;
  quantity: number;
  unit: string;
};

type StandardPreparation = {
  components: StandardPreparationComponent[];
  text?: string | null;
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
};

type SupabaseItemRow = {
  id: string;
  name: string;
  item_type: InventoryType;
  unit: string;
  brand: string | null;
  currency: string | null;
  purchase_price: number;
  target_portions: number | null;
  target_sales_price: number | null;
  category: string | null;
  portion_unit: string | null;
  nutrition_tags: string[] | null;
  nutrition_per_unit: NutritionTotals | null;
  internal_id: number | null;
  manufacturer_article_number: string | null;
  ean: string | null;
  allergens: string[] | null;
  ingredients: string | null;
  dosage_instructions: string | null;
  yield_info: string | null;
  yield_volume: string | null;
  preparation_steps: string | null;
  standard_preparation: StandardPreparation | null;
  is_bio: boolean | null;
  is_deklarationsfrei: boolean | null;
  is_allergenfrei: boolean | null;
  is_cook_chill: boolean | null;
  is_freeze_thaw_stable: boolean | null;
  is_palm_oil_free: boolean | null;
  is_yeast_free: boolean | null;
  is_lactose_free: boolean | null;
  is_gluten_free: boolean | null;
  is_vegan: boolean | null;
  is_vegetarian: boolean | null;
  is_powder: boolean | null;
  is_granulate: boolean | null;
  is_paste: boolean | null;
  is_liquid: boolean | null;
  packshot_x: number | null;
  packshot_y: number | null;
  packshot_zoom: number | null;
  storage_area: string | null;
  file_url: string | null;
  image_url: string | null;
};

type SupabaseRecipeStructureRow = {
  id: string;
  parent_item_id: string;
  component_item_id: string | null;
  quantity: number;
  unit: string;
  deleted_item_name: string | null;
};

type InventoryComponent = {
  itemId: string | null;
  quantity: number;
  unit: string;
  deletedItemName?: string | null;
};

type InventoryItem = {
  id: string;
  internalId?: number | null;
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
  preparationSteps?: string | null;
  nutritionPerUnit?: NutritionTotals | null;
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
  isVegan?: boolean;
  isVegetarian?: boolean;
  hasGhostComponents?: boolean;
  components?: InventoryComponent[];
  packshotX?: number | null;
  packshotY?: number | null;
  packshotZoom?: number | null;
  imageUrl?: string | null;
  fileUrl?: string | null;
};

export async function POST(request: Request) {
  try {
    const client = getSupabaseServerClient();

    if (!client) {
      console.error("Supabase client init failed");
      return NextResponse.json(
        {
          error:
            'Supabase ist nicht konfiguriert (Bitte env-Variablen prüfen: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY oder NEXT_PUBLIC_SUPABASE_ANON_KEY)',
        },
        { status: 500 }
      );
    }

    const body = (await request.json()) as {
      id: string;
      name?: string;
      brand?: string;
      currency?: string;
      manufacturerArticleNumber?: string;
      ean?: string;
      allergens?: string[];
      ingredients?: string;
      dosageInstructions?: string;
      yieldInfo?: string;
      preparationSteps?: string;
      targetPortions?: number | null;
      targetSalesPrice?: number | null;
      category?: string | null;
      portionUnit?: string | null;
      purchasePrice?: number;
      unit?: string;
      nutritionTags?: string[];
      nutritionPerUnit?: NutritionTotals | null;
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
      isVegan?: boolean;
      isVegetarian?: boolean;
      isPowder?: boolean;
      isGranulate?: boolean;
      isPaste?: boolean;
      isLiquid?: boolean;
      packshotX?: number | null;
      packshotY?: number | null;
      packshotZoom?: number | null;
      storageArea?: string | null;
      imageUrl?: string | null;
      fileUrl?: string | null;
    };

    if (!body || typeof body !== 'object') {
       return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!body.id) {
      return NextResponse.json(
        { error: "id ist erforderlich" },
        { status: 400 }
      );
    }

  const updates: {
    name?: string;
    brand?: string | null;
    currency?: string;
    manufacturer_article_number?: string | null;
    ean?: string | null;
    allergens?: string[] | null;
    ingredients?: string | null;
    dosage_instructions?: string | null;
    yield_info?: string | null;
    preparation_steps?: string | null;
    target_portions?: number | null;
    target_sales_price?: number | null;
    category?: string | null;
    portion_unit?: string | null;
    purchase_price?: number;
    unit?: string;
    nutrition_tags?: string[] | null;
    standard_preparation?: StandardPreparation | null;
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
    is_powder?: boolean;
    is_granulate?: boolean;
    is_paste?: boolean;
    is_liquid?: boolean;
    packshot_x?: number | null;
    packshot_y?: number | null;
    packshot_zoom?: number | null;
    storage_area?: string | null;
    file_url?: string | null;
    image_url?: string | null;
    nutrition_per_unit?: NutritionTotals | null;
  } = {};

  if (typeof body.name === "string") {
    const trimmed = body.name.trim();
    if (trimmed.length > 0) {
      updates.name = trimmed;
    }
  }

  if (typeof body.brand === "string") {
    const trimmed = body.brand.trim();
    updates.brand = trimmed.length > 0 ? trimmed : null;
  }

  if (typeof body.currency === "string") {
    const trimmed = body.currency.trim();
    if (trimmed.length > 0) {
      updates.currency = trimmed;
    }
  }

  if (typeof body.manufacturerArticleNumber === "string") {
    updates.manufacturer_article_number =
      body.manufacturerArticleNumber.trim().length > 0
        ? body.manufacturerArticleNumber.trim()
        : null;
  }

  if (typeof body.ean === "string") {
    updates.ean =
      body.ean.trim().length > 0
        ? body.ean.trim()
        : null;
  }

  if (typeof body.purchasePrice === "number") {
    updates.purchase_price = body.purchasePrice;
  }

  if (typeof body.unit === "string") {
    const trimmedUnit = body.unit.trim();
    if (trimmedUnit.length > 0) {
      updates.unit = trimmedUnit;
    }
  }

  if (body.allergens) {
    updates.allergens =
      body.allergens.length > 0 ? body.allergens : [];
  }

  if (typeof body.ingredients === "string") {
    updates.ingredients =
      body.ingredients.trim().length > 0
        ? body.ingredients.trim()
        : null;
  }

  if (typeof body.dosageInstructions === "string") {
    updates.dosage_instructions =
      body.dosageInstructions.trim().length > 0
        ? body.dosageInstructions.trim()
        : null;
  }

  if (typeof body.yieldInfo === "string") {
    updates.yield_info =
      body.yieldInfo.trim().length > 0
        ? body.yieldInfo.trim()
        : null;
  }

  if (typeof body.preparationSteps === "string") {
    updates.preparation_steps =
      body.preparationSteps.trim().length > 0
        ? body.preparationSteps.trim()
        : null;
  }

  if (typeof body.imageUrl === "string") {
    const trimmed = body.imageUrl.trim();
    updates.image_url = trimmed.length > 0 ? trimmed : null;
  }

  if (typeof body.fileUrl === "string") {
    const trimmed = body.fileUrl.trim();
    updates.file_url = trimmed.length > 0 ? trimmed : null;
  }

  if (body.targetPortions === null || typeof body.targetPortions === "number") {
    updates.target_portions =
      typeof body.targetPortions === "number" &&
      Number.isFinite(body.targetPortions) &&
      body.targetPortions > 0
        ? body.targetPortions
        : null;
  }

  if (body.targetSalesPrice === null || typeof body.targetSalesPrice === "number") {
    updates.target_sales_price =
      typeof body.targetSalesPrice === "number" &&
      Number.isFinite(body.targetSalesPrice) &&
      body.targetSalesPrice > 0
        ? body.targetSalesPrice
        : null;
  }

  if (typeof body.category === "string") {
    const trimmed = body.category.trim();
    updates.category = trimmed.length > 0 ? trimmed : null;
  }

  if (typeof body.portionUnit === "string") {
    const trimmed = body.portionUnit.trim();
    updates.portion_unit = trimmed.length > 0 ? trimmed : null;
  }

  if (body.nutritionTags) {
    updates.nutrition_tags =
      body.nutritionTags.length > 0 ? body.nutritionTags : [];
  }

  if (Object.prototype.hasOwnProperty.call(body, "nutritionPerUnit")) {
    const value = body.nutritionPerUnit;
    if (value === null) {
      updates.nutrition_per_unit = null;
    } else if (value && typeof value === "object") {
      // Validate and clean structure to ensure DB compatibility
      const safeNutrition: NutritionTotals = {
        energyKcal: typeof value.energyKcal === 'number' ? value.energyKcal : null,
        fat: typeof value.fat === 'number' ? value.fat : null,
        saturatedFat: typeof value.saturatedFat === 'number' ? value.saturatedFat : null,
        carbs: typeof value.carbs === 'number' ? value.carbs : null,
        sugar: typeof value.sugar === 'number' ? value.sugar : null,
        protein: typeof value.protein === 'number' ? value.protein : null,
        salt: typeof value.salt === 'number' ? value.salt : null,
        fiber: typeof value.fiber === 'number' ? value.fiber : null,
        sodium: typeof value.sodium === 'number' ? value.sodium : null,
        breadUnits: typeof value.breadUnits === 'number' ? value.breadUnits : null,
        cholesterol: typeof value.cholesterol === 'number' ? value.cholesterol : null,
      };
      updates.nutrition_per_unit = safeNutrition;
    }
  }

  if (typeof body.isBio === "boolean") {
    updates.is_bio = body.isBio;
  }
  if (typeof body.isDeklarationsfrei === "boolean") {
    updates.is_deklarationsfrei = body.isDeklarationsfrei;
  }
  if (typeof body.isAllergenfrei === "boolean") {
    updates.is_allergenfrei = body.isAllergenfrei;
  }
  if (typeof body.isCookChill === "boolean") {
    updates.is_cook_chill = body.isCookChill;
  }
  if (typeof body.isFreezeThawStable === "boolean") {
    updates.is_freeze_thaw_stable = body.isFreezeThawStable;
  }
  if (typeof body.isPalmOilFree === "boolean") {
    updates.is_palm_oil_free = body.isPalmOilFree;
  }
  if (typeof body.isYeastFree === "boolean") {
    updates.is_yeast_free = body.isYeastFree;
  }
  if (typeof body.isLactoseFree === "boolean") {
    updates.is_lactose_free = body.isLactoseFree;
  }
  if (typeof body.isGlutenFree === "boolean") {
    updates.is_gluten_free = body.isGlutenFree;
  }
  if (typeof body.isVegan === "boolean") {
    updates.is_vegan = body.isVegan;
  }
  if (typeof body.isVegetarian === "boolean") {
    updates.is_vegetarian = body.isVegetarian;
  }
  if (typeof body.isPowder === "boolean") {
    updates.is_powder = body.isPowder;
  }
  if (typeof body.isGranulate === "boolean") {
    updates.is_granulate = body.isGranulate;
  }
  if (typeof body.isPaste === "boolean") {
    updates.is_paste = body.isPaste;
  }
  if (typeof body.isLiquid === "boolean") {
    updates.is_liquid = body.isLiquid;
  }

  if (typeof body.packshotX === "number") {
    updates.packshot_x = body.packshotX;
  }
  if (typeof body.packshotY === "number") {
    updates.packshot_y = body.packshotY;
  }
  if (typeof body.packshotZoom === "number") {
    updates.packshot_zoom = body.packshotZoom;
  }

  if (typeof body.storageArea === "string") {
    const trimmed = body.storageArea.trim();
    updates.storage_area = trimmed.length > 0 ? trimmed : null;
  }

  if (Object.prototype.hasOwnProperty.call(body, "standardPreparation")) {
    const value = body.standardPreparation;
    if (value === null) {
      updates.standard_preparation = null;
    } else if (value && typeof value === "object") {
      updates.standard_preparation = value as StandardPreparation;
    }
  }

  // Check if ID is a valid UUID
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id);

  let updateResponse;

  if (!isUUID) {
    console.log(`Creating new item for virtual ID: ${body.id}`);
    // This is a virtual item (e.g. "staple-0"), so we INSERT instead of UPDATE
    // We must ensure all mandatory fields for INSERT are present
    const insertData = {
      ...updates,
      item_type: 'zukauf', // Staple items are always 'zukauf'
      // Ensure mandatory fields have defaults if missing in updates
      name: updates.name ?? 'Unbenannt',
      unit: updates.unit ?? 'stk',
      purchase_price: updates.purchase_price ?? 0,
    };

    updateResponse = await client
      .from("items")
      .insert(insertData)
      .select("*");
  } else {
    updateResponse = await client
      .from("items")
      .update(updates)
      .eq("id", body.id)
      .select("*");
  }

  // Retry logic for missing columns (schema mismatch)
  if (
    updateResponse.error &&
    (updateResponse.error.code === "42703" || // undefined_column
      updateResponse.error.message.includes("column") ||
      updateResponse.error.message.includes("does not exist"))
  ) {
    console.warn(
      "Operation failed with column error, retrying with legacy schema",
      updateResponse.error
    );

    const safeUpdates = { ...updates };
    // Remove potentially missing columns (recently added)
    delete safeUpdates.is_powder;
    delete safeUpdates.is_granulate;
    delete safeUpdates.is_paste;
    delete safeUpdates.is_liquid;
    delete safeUpdates.packshot_x;
    delete safeUpdates.packshot_y;
    delete safeUpdates.packshot_zoom;
    delete safeUpdates.nutrition_per_unit;
    delete safeUpdates.brand;
    delete safeUpdates.currency;
    delete safeUpdates.ean;
    delete safeUpdates.file_url;
    delete safeUpdates.image_url;
    
    // Remove all boolean flags
    delete safeUpdates.is_bio;
    delete safeUpdates.is_deklarationsfrei;
    delete safeUpdates.is_allergenfrei;
    delete safeUpdates.is_cook_chill;
    delete safeUpdates.is_freeze_thaw_stable;
    delete safeUpdates.is_palm_oil_free;
    delete safeUpdates.is_yeast_free;
    delete safeUpdates.is_lactose_free;
    delete safeUpdates.is_gluten_free;
    delete safeUpdates.is_vegan;
    delete safeUpdates.is_vegetarian;

    if (!isUUID) {
      const safeInsertData = {
        ...safeUpdates,
        item_type: 'zukauf',
        name: safeUpdates.name ?? 'Unbenannt',
        unit: safeUpdates.unit ?? 'stk',
        purchase_price: safeUpdates.purchase_price ?? 0,
      };
      updateResponse = await client
        .from("items")
        .insert(safeInsertData)
        .select("*");
    } else {
      updateResponse = await client
        .from("items")
        .update(updates)
        .eq("id", body.id)
        .select("*");
    }
  }

  if (updateResponse.error) {
    console.error("Supabase Update Error:", JSON.stringify(updateResponse.error, null, 2));
    const msg = updateResponse.error.message;
    const details = updateResponse.error.details || "";
    const hint = updateResponse.error.hint || "";
    const code = updateResponse.error.code || "";
    
    return NextResponse.json(
      {
        error: `Datenbank-Fehler (${code}): ${msg}. Details: ${details}. Hint: ${hint}`,
        originalError: updateResponse.error
      },
      { status: 500 }
    );
  }

  if (!updateResponse.data || updateResponse.data.length === 0) {
    return NextResponse.json(
      { error: "Artikel nicht gefunden (ID existiert nicht)" },
      { status: 404 }
    );
  }

  const row = updateResponse.data[0] as SupabaseItemRow;

  let components: InventoryComponent[] | undefined;
  let hasGhostComponents = false;

  const relationsResponse = await client
    .from("recipe_structure")
    .select(
      "id,parent_item_id,component_item_id,quantity,unit,deleted_item_name"
    )
    .eq("parent_item_id", row.id);

  if (relationsResponse.error) {
    const relationsError = relationsResponse.error;
    const isMissingDeletedItemNameColumn =
      relationsError.code === "42703" ||
      (typeof relationsError.message === "string" &&
        relationsError.message
          .toLowerCase()
          .includes("deleted_item_name"));

    if (isMissingDeletedItemNameColumn) {
      const fallbackRelationsResponse = await client
        .from("recipe_structure")
        .select("id,parent_item_id,component_item_id,quantity,unit")
        .eq("parent_item_id", row.id);

      if (fallbackRelationsResponse.error) {
        return NextResponse.json(
          {
            error:
              fallbackRelationsResponse.error.message ??
              'Fehler beim Laden der Komponenten aus Tabelle "recipe_structure"',
          },
          { status: 500 }
        );
      }

      const relations =
        (fallbackRelationsResponse.data ??
          []) as SupabaseRecipeStructureRow[];

      components = relations.map((rel) => ({
        itemId: rel.component_item_id,
        quantity: rel.quantity,
        unit: rel.unit,
      }));
    } else {
      return NextResponse.json(
        {
          error:
            relationsError.message ??
            'Fehler beim Laden der Komponenten aus Tabelle "recipe_structure"',
        },
        { status: 500 }
      );
    }
  } else {
    const relations =
      (relationsResponse.data ??
        []) as SupabaseRecipeStructureRow[];

    components = relations.map((rel) => ({
      itemId: rel.component_item_id,
      quantity: rel.quantity,
      unit: rel.unit,
      deletedItemName: rel.deleted_item_name,
    }));

    hasGhostComponents = relations.some(
      (rel) => !rel.component_item_id && !!rel.deleted_item_name
    );
  }

  const item: InventoryItem = {
    id: row.id,
    internalId: row.internal_id,
    name: row.name,
    type: row.item_type,
    unit: row.unit,
    brand: row.brand,
    currency: row.currency ?? "EUR",
    purchasePrice: row.purchase_price,
    targetPortions: row.target_portions,
    targetSalesPrice: row.target_sales_price,
    category: row.category,
    portionUnit: row.portion_unit,
    nutritionTags: row.nutrition_tags ?? undefined,
    manufacturerArticleNumber: row.manufacturer_article_number,
    ean: row.ean,
    allergens: row.allergens ?? undefined,
    ingredients: row.ingredients,
    dosageInstructions: row.dosage_instructions,
    yieldInfo: row.yield_info,
    yieldVolume: row.yield_volume,
    preparationSteps: row.preparation_steps,
    standardPreparation: row.standard_preparation,
    nutritionPerUnit: row.nutrition_per_unit,
    isBio: row.is_bio ?? false,
    isDeklarationsfrei: row.is_deklarationsfrei ?? false,
    isAllergenfrei: row.is_allergenfrei ?? false,
    isCookChill: row.is_cook_chill ?? false,
    isFreezeThawStable: row.is_freeze_thaw_stable ?? false,
    isPalmOilFree: row.is_palm_oil_free ?? false,
    isYeastFree: row.is_yeast_free ?? false,
    isLactoseFree: row.is_lactose_free ?? false,
    isGlutenFree: row.is_gluten_free ?? false,
    isVegan: row.is_vegan ?? false,
    isVegetarian: row.is_vegetarian ?? false,
    packshotX: row.packshot_x,
    packshotY: row.packshot_y,
    packshotZoom: row.packshot_zoom,
    hasGhostComponents:
      hasGhostComponents || undefined,
    components,
    imageUrl: row.image_url,
    fileUrl: row.file_url,
  };

  return NextResponse.json({ item });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Ein interner Serverfehler ist aufgetreten",
      },
      { status: 500 }
    );
  }
}
