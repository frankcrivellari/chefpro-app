import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

type InventoryType = "zukauf" | "eigenproduktion";

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
  manufacturerArticleNumber?: string | null;
  ean?: string | null;
  allergens?: string[];
  ingredients?: string | null;
  dosageInstructions?: string | null;
  yieldInfo?: string | null;
  preparationSteps?: string | null;
  hasGhostComponents?: boolean;
  components?: InventoryComponent[];
};

type SupabaseItemRow = {
  id: string;
  name: string;
  item_type: InventoryType;
  unit: string;
  purchase_price: number;
  target_portions: number | null;
  target_sales_price: number | null;
  internal_id: number | null;
  manufacturer_article_number: string | null;
  ean: string | null;
  allergens: string[] | null;
  ingredients: string | null;
  dosage_instructions: string | null;
  yield_info: string | null;
  preparation_steps: string | null;
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
        purchasePrice: row.purchase_price,
        targetPortions: row.target_portions,
        targetSalesPrice: row.target_sales_price,
        manufacturerArticleNumber: row.manufacturer_article_number,
        ean: row.ean,
        allergens: row.allergens ?? undefined,
        ingredients: row.ingredients,
        dosageInstructions: row.dosage_instructions,
        yieldInfo: row.yield_info,
        preparationSteps: row.preparation_steps,
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
      purchasePrice: number;
      components?: InventoryComponent[];
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

    const insertItemResponse = await client
      .from("items")
      .insert({
        name: body.name,
        item_type: body.type,
        unit: body.unit,
        purchase_price: body.purchasePrice,
      })
      .select("*")
      .single();

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
      purchasePrice: createdItemRow.purchase_price,
      targetPortions: createdItemRow.target_portions,
      targetSalesPrice: createdItemRow.target_sales_price,
      manufacturerArticleNumber: createdItemRow.manufacturer_article_number,
      ean: createdItemRow.ean,
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
      console.error("Supabase update recipe_structure error", {
        table: "recipe_structure",
        error: updateComponentRelationsResponse.error,
      });
      return NextResponse.json(
        {
          error:
            updateComponentRelationsResponse.error.message ??
            'Fehler beim Aktualisieren der Komponenten in Tabelle "recipe_structure"',
        },
        { status: 500 }
      );
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
