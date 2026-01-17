import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

type InventoryType = "zukauf" | "eigenproduktion";

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
  };

  return NextResponse.json({ item });
}
