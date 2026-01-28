import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = 'force-dynamic';

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
  preparationSteps?: string | null;
  fileUrl?: string | null;
  imageUrl?: string | null;
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
  isFairtrade?: boolean;
  isPowder?: boolean;
  isGranulate?: boolean;
  isPaste?: boolean;
  isLiquid?: boolean;
  hasGhostComponents?: boolean;
  components?: InventoryComponent[];
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
  internal_id: number | null;
  internal_article_number: string | null;
  manufacturer_article_number: string | null;
  ean: string | null;
  allergens: string[] | null;
  ingredients: string | null;
  dosage_instructions: string | null;
  yield_info: string | null;
  preparation_steps: string | null;
  file_url: string | null;
  image_url: string | null;
  standard_preparation: StandardPreparation | null;
  nutrition_per_unit: NutritionTotals | null;
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
  is_fairtrade: boolean | null;
  is_powder: boolean | null;
  is_granulate: boolean | null;
  is_paste: boolean | null;
  is_liquid: boolean | null;
  packshot_x: number | null;
  packshot_y: number | null;
  packshot_zoom: number | null;
  storage_area: string | null;
  warengruppe: string | null;
  bio_control_number: string | null;
  device_settings: DeviceSetting[] | null;
  supplier: string | null;
  alternative_items: AlternativeItem[] | null;
};

type SupabaseRecipeStructureRow = {
  id: string;
  parent_item_id: string;
  component_item_id: string | null;
  quantity: number;
  unit: string;
  deleted_item_name: string | null;
};

export async function GET() {
  const client = getSupabaseServerClient();

  if (!client) {
    console.error(
      "Supabase client initialization failed: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY"
    );
    return NextResponse.json(
      {
        error:
          'Supabase ist nicht konfiguriert (Bitte env-Variablen prüfen: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY oder SUPABASE_ANON_KEY)',
      },
      { status: 500 }
    );
  }

  try {
    const itemsResponse = await client.from("items").select("*");

    if (itemsResponse.error) {
      console.error("Supabase items query error", {
        table: "items",
        error: itemsResponse.error.message,
        code: itemsResponse.error.code,
        details: itemsResponse.error.details,
      });
      return NextResponse.json(
        {
          error: `Datenbankfehler in Tabelle "items": ${itemsResponse.error.message}`,
        },
        { status: 500 }
      );
    }

    const recipeResponse = await client
      .from("recipe_structure")
      .select("*");

    if (recipeResponse.error) {
      console.error("Supabase recipe_structure query error", {
        table: "recipe_structure",
        error: recipeResponse.error.message,
        code: recipeResponse.error.code,
        details: recipeResponse.error.details,
      });
      return NextResponse.json(
        {
          error: `Datenbankfehler in Tabelle "recipe_structure": ${recipeResponse.error.message}`,
        },
        { status: 500 }
      );
    }

    const items = (itemsResponse.data ?? []) as SupabaseItemRow[];
    const relations =
      (recipeResponse.data ?? []) as SupabaseRecipeStructureRow[];

    const itemsById = new Map<string, InventoryItem>();

    for (const row of items) {
      itemsById.set(row.id, {
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
        internalArticleNumber: row.internal_article_number,
        manufacturerArticleNumber: row.manufacturer_article_number,
        ean: row.ean,
        allergens: row.allergens ?? undefined,
        ingredients: row.ingredients,
        dosageInstructions: row.dosage_instructions,
        yieldInfo: row.yield_info,
        preparationSteps: row.preparation_steps,
        fileUrl: row.file_url,
        imageUrl: row.image_url,
        nutritionPerUnit: row.nutrition_per_unit,
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
        isVegan: row.is_vegan ?? false,
          isVegetarian: row.is_vegetarian ?? false,
          isFairtrade: row.is_fairtrade ?? false,
          isPowder: row.is_powder ?? false,
        isGranulate: row.is_granulate ?? false,
        isPaste: row.is_paste ?? false,
        isLiquid: row.is_liquid ?? false,
        packshotX: row.packshot_x,
        packshotY: row.packshot_y,
        packshotZoom: row.packshot_zoom,
        storageArea: row.storage_area,
        warengruppe: row.warengruppe,
        bioControlNumber: row.bio_control_number,
        deviceSettings: row.device_settings,
        supplier: row.supplier,
        alternativeItems: row.alternative_items,
      });
    }

    const componentsByParent = new Map<string, InventoryComponent[]>();

    for (const rel of relations) {
      const existing = componentsByParent.get(rel.parent_item_id) ?? [];
      existing.push({
        itemId: rel.component_item_id,
        quantity: rel.quantity,
        unit: rel.unit,
        deletedItemName: rel.deleted_item_name,
      });
      componentsByParent.set(rel.parent_item_id, existing);
    }

    for (const [parentId, components] of componentsByParent) {
      const item = itemsById.get(parentId);
      if (!item) {
        continue;
      }
      item.components = components;
      const hasGhost = components.some(
        (component) =>
          !component.itemId && !!component.deletedItemName
      );
      if (hasGhost) {
        (item as InventoryItem & { hasGhostComponents?: boolean }).hasGhostComponents =
          true;
      }
    }

    const result = Array.from(itemsById.values());

    // DEBUG LOG
    console.log("Returning inventory items count:", result.length);
    const debugItem = result.find(i => i.nutritionPerUnit);
    if (debugItem) {
        console.log("Sample item with nutrition:", debugItem.name, debugItem.nutritionPerUnit);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Unexpected error in /api/inventory GET", error);
    const message =
      error instanceof Error ? error.message : "Unbekannter Fehler";
    return NextResponse.json(
      {
        error: `Unerwarteter Fehler im Inventory-Endpoint: ${message}`,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name: string;
      type: InventoryType;
      unit: string;
      brand?: string | null;
      currency?: string;
      purchasePrice: number;
      category?: string | null;
      portionUnit?: string | null;
      nutritionTags?: string[];
      components?: InventoryComponent[];
      standardPreparation?: StandardPreparation | null;
      preparationSteps?: string | null;
      nutritionPerUnit?: NutritionTotals | null;
      dosageInstructions?: string | null;
      ingredients?: string | null;
      yieldInfo?: string | null;
      manufacturerArticleNumber?: string | null;
      ean?: string | null;
      allergens?: string[] | null;
      fileUrl?: string | null;
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
      isVegan?: boolean;
      isVegetarian?: boolean;
      isFairtrade?: boolean;
      isPowder?: boolean;
      isGranulate?: boolean;
      isPaste?: boolean;
      isLiquid?: boolean;
      storageArea?: string | null;
      warengruppe?: string | null;
      bioControlNumber?: string | null;
      deviceSettings?: DeviceSetting[] | null;
    };

    const client = getSupabaseServerClient();

    if (!client) {
      console.error(
        "Supabase client initialization failed in POST: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY"
      );
      return NextResponse.json(
        {
          error:
            'Supabase ist nicht konfiguriert (Bitte env-Variablen prüfen: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY oder SUPABASE_ANON_KEY)',
        },
        { status: 500 }
      );
    }

    let insertItemResponse = await client
      .from("items")
      .insert({
        name: body.name,
        item_type: body.type,
        unit: body.unit,
        brand: body.brand,
        currency: body.currency ?? "EUR",
        purchase_price: body.purchasePrice,
        category: body.category ?? null,
        portion_unit: body.portionUnit ?? null,
        nutrition_tags:
          body.nutritionTags && body.nutritionTags.length > 0
            ? body.nutritionTags
            : null,
        preparation_steps:
          typeof body.preparationSteps === "string" &&
          body.preparationSteps.trim().length > 0
            ? body.preparationSteps.trim()
            : null,
        nutrition_per_unit:
          body.nutritionPerUnit && typeof body.nutritionPerUnit === "object"
            ? body.nutritionPerUnit
            : null,
        dosage_instructions:
          typeof body.dosageInstructions === "string" &&
          body.dosageInstructions.trim().length > 0
            ? body.dosageInstructions.trim()
            : null,
        ingredients: body.ingredients ?? null,
        yield_info: body.yieldInfo ?? null,
        manufacturer_article_number: body.manufacturerArticleNumber ?? null,
        ean: body.ean ?? null,
        allergens: body.allergens ?? null,
        file_url: body.fileUrl ?? null,
        image_url: body.imageUrl ?? null,
        standard_preparation:
          body.standardPreparation && typeof body.standardPreparation === "object"
            ? body.standardPreparation
            : null,
        is_bio: body.isBio ?? false,
        is_deklarationsfrei: body.isDeklarationsfrei ?? false,
        is_allergenfrei: body.isAllergenfrei ?? false,
        is_cook_chill: body.isCookChill ?? false,
        is_freeze_thaw_stable: body.isFreezeThawStable ?? false,
        is_palm_oil_free: body.isPalmOilFree ?? false,
        is_yeast_free: body.isYeastFree ?? false,
        is_lactose_free: body.isLactoseFree ?? false,
        is_gluten_free: body.isGlutenFree ?? false,
        is_vegan: body.isVegan ?? false,
        is_vegetarian: body.isVegetarian ?? false,
        is_fairtrade: body.isFairtrade ?? false,
        is_powder: body.isPowder ?? false,
        is_granulate: body.isGranulate ?? false,
        is_paste: body.isPaste ?? false,
        is_liquid: body.isLiquid ?? false,
        storage_area: body.storageArea ?? null,
        warengruppe: body.warengruppe ?? null,
        bio_control_number: body.bioControlNumber ?? null,
        device_settings: body.deviceSettings ?? [],
      })
      .select("*")
      .single();

    // Retry logic for missing columns (schema mismatch)
    if (
      insertItemResponse.error &&
      (insertItemResponse.error.code === "42703" || // undefined_column
        insertItemResponse.error.message.includes("column") ||
        insertItemResponse.error.message.includes("does not exist"))
    ) {
      console.warn(
        "Operation failed with column error, retrying with legacy schema",
        insertItemResponse.error
      );
      
      insertItemResponse = await client
        .from("items")
        .insert({
          name: body.name,
          item_type: body.type,
          unit: body.unit,
          brand: body.brand,
          currency: body.currency ?? "EUR",
          purchase_price: body.purchasePrice,
          category: body.category ?? null,
          portion_unit: body.portionUnit ?? null,
          nutrition_tags:
            body.nutritionTags && body.nutritionTags.length > 0
              ? body.nutritionTags
              : null,
          preparation_steps:
            typeof body.preparationSteps === "string" &&
            body.preparationSteps.trim().length > 0
              ? body.preparationSteps.trim()
              : null,
          nutrition_per_unit:
            body.nutritionPerUnit && typeof body.nutritionPerUnit === "object"
              ? body.nutritionPerUnit
              : null,
          dosage_instructions:
            typeof body.dosageInstructions === "string" &&
            body.dosageInstructions.trim().length > 0
              ? body.dosageInstructions.trim()
              : null,
          standard_preparation:
            body.standardPreparation && typeof body.standardPreparation === "object"
              ? body.standardPreparation
              : null,
          is_vegan: body.isVegan ?? false,
          is_vegetarian: body.isVegetarian ?? false,
          is_powder: body.isPowder ?? false,
          is_granulate: body.isGranulate ?? false,
          is_paste: body.isPaste ?? false,
          is_liquid: body.isLiquid ?? false,
          // Exclude new fields in fallback
        })
        .select("*")
        .single();
    }

    if (insertItemResponse.error || !insertItemResponse.data) {
      console.error("Supabase insert item error", {
        table: "items",
        error: insertItemResponse.error,
        data: insertItemResponse.data,
      });
      return NextResponse.json(
        {
          error:
            insertItemResponse.error?.message ??
            'Fehler beim Speichern des Artikels in Tabelle "items"',
        },
        { status: 500 }
      );
    }

    const createdItemRow = insertItemResponse.data as SupabaseItemRow;

    let components: InventoryComponent[] | undefined;

    if (body.components && body.components.length > 0) {
      const insertRelationsResponse = await client
        .from("recipe_structure")
        .insert(
          body.components.map((component) => ({
            parent_item_id: createdItemRow.id,
            component_item_id: component.itemId,
            quantity: component.quantity,
            unit: component.unit,
          }))
        )
        .select("*");

      if (insertRelationsResponse.error) {
        console.error("Supabase insert recipe_structure error", {
          table: "recipe_structure",
          error: insertRelationsResponse.error,
        });
        return NextResponse.json(
          {
            error:
              insertRelationsResponse.error.message ??
              'Fehler beim Speichern der Komponenten in Tabelle "recipe_structure"',
          },
          { status: 500 }
        );
      }

      const createdRelations =
        (insertRelationsResponse.data as SupabaseRecipeStructureRow[]) ?? [];

      components = createdRelations.map((rel) => ({
        itemId: rel.component_item_id,
        quantity: rel.quantity,
        unit: rel.unit,
      }));
    }

    const resultItem: InventoryItem = {
      id: createdItemRow.id,
      internalId: createdItemRow.internal_id,
      name: createdItemRow.name,
      type: createdItemRow.item_type,
      unit: createdItemRow.unit,
      brand: createdItemRow.brand,
      currency: createdItemRow.currency ?? "EUR",
      purchasePrice: createdItemRow.purchase_price,
      targetPortions: createdItemRow.target_portions,
      targetSalesPrice: createdItemRow.target_sales_price,
      category: createdItemRow.category,
      portionUnit: createdItemRow.portion_unit,
      nutritionTags: createdItemRow.nutrition_tags ?? undefined,
      manufacturerArticleNumber: createdItemRow.manufacturer_article_number,
      ean: createdItemRow.ean,
      ingredients: createdItemRow.ingredients,
      dosageInstructions: createdItemRow.dosage_instructions,
      yieldInfo: createdItemRow.yield_info,
      preparationSteps: createdItemRow.preparation_steps,
      fileUrl: createdItemRow.file_url,
      standardPreparation: createdItemRow.standard_preparation,
      nutritionPerUnit: createdItemRow.nutrition_per_unit,
      isBio: createdItemRow.is_bio ?? false,
      isDeklarationsfrei: createdItemRow.is_deklarationsfrei ?? false,
      isAllergenfrei: createdItemRow.is_allergenfrei ?? false,
      isCookChill: createdItemRow.is_cook_chill ?? false,
      isFreezeThawStable: createdItemRow.is_freeze_thaw_stable ?? false,
      isPalmOilFree: createdItemRow.is_palm_oil_free ?? false,
      isYeastFree: createdItemRow.is_yeast_free ?? false,
      isLactoseFree: createdItemRow.is_lactose_free ?? false,
      isGlutenFree: createdItemRow.is_gluten_free ?? false,
      isVegan: createdItemRow.is_vegan ?? false,
      isVegetarian: createdItemRow.is_vegetarian ?? false,
      packshotX: createdItemRow.packshot_x,
      packshotY: createdItemRow.packshot_y,
      packshotZoom: createdItemRow.packshot_zoom,
      deviceSettings: createdItemRow.device_settings,
      components,
    };

    return NextResponse.json(resultItem, { status: 201 });
  } catch (error) {
    console.error("Unexpected error in /api/inventory POST", error);
    const message =
      error instanceof Error ? error.message : "Unbekannter Fehler";
    return NextResponse.json(
      {
        error: `Unerwarteter Fehler beim Speichern des Artikels: ${message}`,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const client = getSupabaseServerClient();

    if (!client) {
      console.error(
        "Supabase client initialization failed in DELETE: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY"
      );
      return NextResponse.json(
        {
          error:
            'Supabase ist nicht konfiguriert (Bitte env-Variablen prüfen: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY oder SUPABASE_ANON_KEY)',
        },
        { status: 500 }
      );
    }

    const body = (await request.json()) as {
      id: string;
    };

    if (!body.id) {
      return NextResponse.json(
        { error: "id ist erforderlich" },
        { status: 400 }
      );
    }

    const itemResponse = await client
      .from("items")
      .select("id,name")
      .eq("id", body.id)
      .single();

    if (itemResponse.error || !itemResponse.data) {
      const status =
        itemResponse.error?.code === "PGRST116" ? 404 : 500;
      return NextResponse.json(
        {
          error:
            itemResponse.error?.message ??
            'Artikel wurde nicht gefunden und kann nicht gelöscht werden',
        },
        { status }
      );
    }

    const itemName =
      (itemResponse.data as { name: string }).name;

    const deleteParentRelationsResponse = await client
      .from("recipe_structure")
      .delete()
      .eq("parent_item_id", body.id);

    if (deleteParentRelationsResponse.error) {
      console.error("Supabase delete recipe_structure error", {
        table: "recipe_structure",
        error: deleteParentRelationsResponse.error,
      });
      return NextResponse.json(
        {
          error:
            deleteParentRelationsResponse.error.message ??
            'Fehler beim Löschen der Komponenten in Tabelle "recipe_structure"',
        },
        { status: 500 }
      );
    }

    const updateComponentRelationsResponse = await client
      .from("recipe_structure")
      .update({
        component_item_id: null,
        deleted_item_name: itemName,
      })
      .eq("component_item_id", body.id);

    if (updateComponentRelationsResponse.error) {
      const updateError = updateComponentRelationsResponse.error;
      const isMissingDeletedItemNameColumn =
        updateError.code === "42703" ||
        (typeof updateError.message === "string" &&
          updateError.message.toLowerCase().includes("deleted_item_name"));

      if (isMissingDeletedItemNameColumn) {
        const fallbackUpdateResponse = await client
          .from("recipe_structure")
          .update({
            component_item_id: null,
          })
          .eq("component_item_id", body.id);

        if (fallbackUpdateResponse.error) {
          console.error("Supabase update recipe_structure fallback error", {
            table: "recipe_structure",
            error: fallbackUpdateResponse.error,
          });
          return NextResponse.json(
            {
              error:
                fallbackUpdateResponse.error.message ??
                'Fehler beim Aktualisieren der Komponenten in Tabelle "recipe_structure"',
            },
            { status: 500 }
          );
        }
      } else {
        console.error("Supabase update recipe_structure error", {
          table: "recipe_structure",
          error: updateError,
        });
        return NextResponse.json(
          {
            error:
              updateError.message ??
              'Fehler beim Aktualisieren der Komponenten in Tabelle "recipe_structure"',
          },
          { status: 500 }
        );
      }
    }

    const deleteItemResponse = await client
      .from("items")
      .delete()
      .eq("id", body.id)
      .select("id")
      .single();

    if (deleteItemResponse.error) {
      console.error("Supabase delete item error", {
        table: "items",
        error: deleteItemResponse.error,
      });
      const status =
        deleteItemResponse.error.code === "PGRST116"
          ? 404
          : 500;
      return NextResponse.json(
        {
          error:
            deleteItemResponse.error.message ??
            'Fehler beim Löschen des Artikels in Tabelle "items"',
        },
        { status }
      );
    }

    return NextResponse.json(
      { success: true },
      { status: 200 }
    );
  } catch (error) {
    console.error("Unexpected error in /api/inventory DELETE", error);
    const message =
      error instanceof Error ? error.message : "Unbekannter Fehler";
    return NextResponse.json(
      {
        error: `Unerwarteter Fehler beim Löschen des Artikels: ${message}`,
      },
      { status: 500 }
    );
  }
}
