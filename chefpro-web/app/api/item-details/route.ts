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

type SupabaseItemRow = {
  id: string;
  name: string;
  item_type: InventoryType;
  unit: string;
  purchase_price: number;
  target_portions: number | null;
  target_sales_price: number | null;
  category: string | null;
  portion_unit: string | null;
  nutrition_tags: string[] | null;
  internal_id: number | null;
  manufacturer_article_number: string | null;
  ean: string | null;
  allergens: string[] | null;
  ingredients: string | null;
  dosage_instructions: string | null;
  yield_info: string | null;
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
  preparationSteps?: string | null;
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
  hasGhostComponents?: boolean;
  components?: InventoryComponent[];
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
    manufacturerArticleNumber?: string;
    allergens?: string[];
    ingredients?: string;
    dosageInstructions?: string;
    yieldInfo?: string;
    preparationSteps?: string;
    targetPortions?: number | null;
    targetSalesPrice?: number | null;
    category?: string | null;
    portionUnit?: string | null;
    nutritionTags?: string[];
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
  };

  if (!body.id) {
    return NextResponse.json(
      { error: "id ist erforderlich" },
      { status: 400 }
    );
  }

  const updates: {
    name?: string;
    manufacturer_article_number?: string | null;
    allergens?: string[] | null;
    ingredients?: string | null;
    dosage_instructions?: string | null;
    yield_info?: string | null;
    preparation_steps?: string | null;
    target_portions?: number | null;
    target_sales_price?: number | null;
    category?: string | null;
    portion_unit?: string | null;
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
  } = {};

  if (typeof body.name === "string") {
    const trimmed = body.name.trim();
    if (trimmed.length > 0) {
      updates.name = trimmed;
    }
  }

  if (typeof body.manufacturerArticleNumber === "string") {
    updates.manufacturer_article_number =
      body.manufacturerArticleNumber.trim().length > 0
        ? body.manufacturerArticleNumber.trim()
        : null;
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

  if (updateResponse.error || !updateResponse.data) {
    return NextResponse.json(
      {
        error:
          updateResponse.error?.message ??
          'Fehler beim Aktualisieren des Artikels in Tabelle "items"',
      },
      { status: 500 }
    );
  }

  const row = updateResponse.data as SupabaseItemRow;

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
    preparationSteps: row.preparation_steps,
    standardPreparation: row.standard_preparation,
    isBio: row.is_bio ?? false,
    isDeklarationsfrei: row.is_deklarationsfrei ?? false,
    isAllergenfrei: row.is_allergenfrei ?? false,
    isCookChill: row.is_cook_chill ?? false,
    isFreezeThawStable: row.is_freeze_thaw_stable ?? false,
    isPalmOilFree: row.is_palm_oil_free ?? false,
    isYeastFree: row.is_yeast_free ?? false,
    isLactoseFree: row.is_lactose_free ?? false,
    isGlutenFree: row.is_gluten_free ?? false,
    hasGhostComponents:
      hasGhostComponents || undefined,
    components,
  };

  return NextResponse.json({ item });
}
