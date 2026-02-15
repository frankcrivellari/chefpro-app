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
  packshot_x: number | null;
  packshot_y: number | null;
  packshot_zoom: number | null;
  file_url: string | null;
  image_url: string | null;
};

type SupabaseRecipeStructureRow = {
  id: string;
  parent_item_id: string;
  child_item_id: string;
  amount: number;
  unit: string;
};

type SupabasePreparationStepRow = {
  id: string;
  item_id: string;
  step_order: number;
  instruction: string;
};

type InventoryComponent = {
  itemId: string | null;
  quantity: number;
  unit: string;
  hasSubIngredients?: boolean;
};

type PreparationStep = {
  id?: string;
  stepOrder: number;
  instruction: string;
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
  preparationSteps?: PreparationStep[]; // Changed from string | null
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
  const client = getSupabaseServerClient();

  if (!client) {
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
    allergens?: string[];
    ingredients?: string;
    dosageInstructions?: string;
    yieldInfo?: string;
    preparationSteps?: PreparationStep[]; // Updated type
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
    packshotX?: number | null;
    packshotY?: number | null;
    packshotZoom?: number | null;
    imageUrl?: string | null;
    fileUrl?: string | null;
    components?: InventoryComponent[]; // Add components to body
  };

  if (!body.id) {
    console.error("❌ POST /api/item-details: ID fehlt im Body");
    return NextResponse.json(
      { error: "id ist erforderlich" },
      { status: 400 }
    );
  }

  console.log("📝 POST /api/item-details empfangen:", {
    id: body.id,
    updates_count: Object.keys(body).length,
    preparationSteps_length: body.preparationSteps?.length,
    components_length: body.components?.length,
    nutrition_per_unit: body.nutritionPerUnit
  });

  const updates: {
    name?: string;
    brand?: string | null;
    currency?: string;
    manufacturer_article_number?: string | null;
    allergens?: string[] | null;
    ingredients?: string | null;
    dosage_instructions?: string | null;
    yield_info?: string | null;
    // preparation_steps removed from updates object as it's now a separate table
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
    packshot_x?: number | null;
    packshot_y?: number | null;
    packshot_zoom?: number | null;
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

  // preparation_steps removed from updates block

  if (typeof body.imageUrl === "string") {
    const trimmed = body.imageUrl.trim();
    updates.image_url = trimmed.length > 0 ? trimmed : null;
  }

  if (typeof body.fileUrl === "string") {
    const trimmed = body.fileUrl.trim();
    updates.file_url = trimmed.length > 0 ? trimmed : null;
  }

  if (typeof body.targetPortions === "number") {
    updates.target_portions =
      Number.isFinite(body.targetPortions) && body.targetPortions > 0
        ? body.targetPortions
        : null;
  }

  if (typeof body.targetSalesPrice === "number") {
    updates.target_sales_price =
      Number.isFinite(body.targetSalesPrice) && body.targetSalesPrice > 0
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
      updates.nutrition_per_unit = value as NutritionTotals;
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

  if (typeof body.packshotX === "number") {
    updates.packshot_x = body.packshotX;
  }
  if (typeof body.packshotY === "number") {
    updates.packshot_y = body.packshotY;
  }
  if (typeof body.packshotZoom === "number") {
    updates.packshot_zoom = body.packshotZoom;
  }

  if (Object.prototype.hasOwnProperty.call(body, "standardPreparation")) {
    const value = body.standardPreparation;
    if (value === null) {
      updates.standard_preparation = null;
    } else if (value && typeof value === "object") {
      updates.standard_preparation = value as StandardPreparation;
    }
  }

  const updateResponse = await client
    .from("items")
    .update(updates)
    .eq("id", body.id)
    .select("*")
    .single();

  if (updateResponse.error) {
    console.error("❌ Fehler beim Update in /api/item-details:", updateResponse.error);
    return NextResponse.json(
      {
        error:
          updateResponse.error?.message ??
          'Fehler beim Aktualisieren des Artikels in Tabelle "items"',
      },
      { status: 500 }
    );
  }

  console.log("✅ Update erfolgreich:", {
    id: updateResponse.data.id,
    nutrition_per_unit_saved: !!updateResponse.data.nutrition_per_unit
  });

  const row = updateResponse.data as SupabaseItemRow;

  // --- Atomic Save for Recipe Structure ---
  if (body.components) {
    // 1. Delete existing relations
    const deleteRelations = await client
      .from("recipe_structure")
      .delete()
      .eq("parent_item_id", row.id);

    if (deleteRelations.error) {
      console.error("❌ Fehler beim Löschen der Rezept-Struktur:", deleteRelations.error);
      return NextResponse.json(
        { error: `Fehler beim Löschen der Rezept-Struktur: ${deleteRelations.error.message}` },
        { status: 500 }
      );
    }

    // 2. Insert new relations
    if (body.components.length > 0) {
      // Try insert with 'amount'; if it fails due to missing column, retry with 'quantity'
      let insertRelations = await client
        .from("recipe_structure")
        .insert(
          body.components.map((comp) => ({
            parent_item_id: row.id,
            child_item_id: comp.itemId!, // Assumes valid ID
            amount: comp.quantity,
            unit: comp.unit,
          }))
        );

      if (insertRelations.error && typeof insertRelations.error.message === "string" && insertRelations.error.message.toLowerCase().includes("amount")) {
        insertRelations = await client
          .from("recipe_structure")
          .insert(
            body.components.map((comp) => ({
              parent_item_id: row.id,
              child_item_id: comp.itemId!, // Assumes valid ID
              quantity: comp.quantity,
              unit: comp.unit,
            }))
          );
      }

      if (insertRelations.error) {
        console.error("❌ Fehler beim Speichern der Rezept-Struktur:", insertRelations.error);
        return NextResponse.json(
          { error: `Fehler beim Speichern der Rezept-Struktur: ${insertRelations.error.message}` },
          { status: 500 }
        );
      }
    }
  }

  // --- Atomic Save for Preparation Steps ---
  if (body.preparationSteps) {
    // 1. Delete existing steps
    const deleteSteps = await client
      .from("preparation_steps")
      .delete()
      .eq("item_id", row.id);

    if (deleteSteps.error) {
      console.error("❌ Fehler beim Löschen der Zubereitungsschritte:", deleteSteps.error);
      return NextResponse.json(
        { error: `Fehler beim Löschen der Zubereitungsschritte: ${deleteSteps.error.message}` },
        { status: 500 }
      );
    }

    // 2. Insert new steps
    if (body.preparationSteps.length > 0) {
      const newSteps = body.preparationSteps.map((step, index) => ({
        item_id: row.id,
        step_order: index + 1,
        instruction: step.instruction,
      }));

      const insertSteps = await client
        .from("preparation_steps")
        .insert(newSteps);

      if (insertSteps.error) {
        console.error("❌ Fehler beim Speichern der Zubereitungsschritte:", insertSteps.error);
        return NextResponse.json(
          { error: `Fehler beim Speichern der Zubereitungsschritte: ${insertSteps.error.message}` },
          { status: 500 }
        );
      }
    }
  }

  let components: InventoryComponent[] | undefined;
  let hasGhostComponents = false;

  const relationsResponse = await client
    .from("recipe_structure")
    .select("*")
    .eq("parent_item_id", row.id);

  if (relationsResponse.error) {
    return NextResponse.json(
        {
          error:
            relationsResponse.error.message ??
            'Fehler beim Laden der Komponenten aus Tabelle "recipe_structure"',
        },
        { status: 500 }
      );
  } else {
    const relations =
      (relationsResponse.data ??
        []) as SupabaseRecipeStructureRow[];

    // Fetch sub-recipe info for icons (is this efficient? maybe separate query or view later)
    // For now, simple check if child items have their own recipe structure
    // Optimization: Get all child IDs
    const childIds = relations.map(r => r.child_item_id).filter(Boolean);
    let subRecipeMap = new Set<string>();
    
    if (childIds.length > 0) {
        const subRecipesCheck = await client
            .from("recipe_structure")
            .select("parent_item_id")
            .in("parent_item_id", childIds);
            
        if (subRecipesCheck.data) {
            subRecipesCheck.data.forEach(r => subRecipeMap.add(r.parent_item_id));
        }
    }

    components = relations.map((rel: any) => {
      const qty = (rel as any).amount ?? (rel as any).quantity;
      return {
        itemId: rel.child_item_id,
        quantity: qty,
        unit: rel.unit,
        hasSubIngredients: subRecipeMap.has(rel.child_item_id)
      };
    });
  }

  // Fetch Preparation Steps for Response
  const stepsResponse = await client
    .from("preparation_steps")
    .select("id, step_order, instruction")
    .eq("item_id", row.id)
    .order("step_order", { ascending: true });
    
  let preparationSteps: PreparationStep[] = [];
  if (stepsResponse.data) {
    preparationSteps = stepsResponse.data.map(s => ({
        id: s.id,
        stepOrder: s.step_order,
        instruction: s.instruction
    }));
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
    preparationSteps: preparationSteps, // Use the fetched array
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
    hasGhostComponents: undefined, // Concept removed? Or needs check?
    components,
    imageUrl: row.image_url,
    fileUrl: row.file_url,
  };

  return NextResponse.json({ item });
}
