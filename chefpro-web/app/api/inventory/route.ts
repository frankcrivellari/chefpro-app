import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

type InventoryType = "zukauf" | "eigenproduktion";

type InventoryComponent = {
  itemId: string;
  quantity: number;
  unit: string;
};

type InventoryItem = {
  id: string;
  name: string;
  type: InventoryType;
  unit: string;
  purchasePrice: number;
  components?: InventoryComponent[];
};

type SupabaseItemRow = {
  id: string;
  name: string;
  item_type: InventoryType;
  unit: string;
  purchase_price: number;
};

type SupabaseRecipeStructureRow = {
  id: string;
  parent_item_id: string;
  component_item_id: string;
  quantity: number;
  unit: string;
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
        name: row.name,
        type: row.item_type,
        unit: row.unit,
        purchasePrice: row.purchase_price,
      });
    }

    const componentsByParent = new Map<string, InventoryComponent[]>();

    for (const rel of relations) {
      const existing = componentsByParent.get(rel.parent_item_id) ?? [];
      existing.push({
        itemId: rel.component_item_id,
        quantity: rel.quantity,
        unit: rel.unit,
      });
      componentsByParent.set(rel.parent_item_id, existing);
    }

    for (const [parentId, components] of componentsByParent) {
      const item = itemsById.get(parentId);
      if (!item) {
        continue;
      }
      item.components = components;
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
      name: createdItemRow.name,
      type: createdItemRow.item_type,
      unit: createdItemRow.unit,
      purchasePrice: createdItemRow.purchase_price,
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
