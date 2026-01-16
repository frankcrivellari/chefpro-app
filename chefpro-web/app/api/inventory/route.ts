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
    return NextResponse.json(
      { error: "Supabase ist nicht konfiguriert" },
      { status: 500 }
    );
  }

  const itemsResponse = await client
    .from("items")
    .select("*");

  if (itemsResponse.error) {
    return NextResponse.json(
      { error: itemsResponse.error.message },
      { status: 500 }
    );
  }

  const recipeResponse = await client
    .from("recipe_structure")
    .select("*");

  if (recipeResponse.error) {
    return NextResponse.json(
      { error: recipeResponse.error.message },
      { status: 500 }
    );
  }

  const items = (itemsResponse.data ?? []) as SupabaseItemRow[];
  const relations = (recipeResponse.data ?? []) as SupabaseRecipeStructureRow[];

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
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name: string;
    type: InventoryType;
    unit: string;
    purchasePrice: number;
    components?: InventoryComponent[];
  };

  const client = getSupabaseServerClient();

  if (!client) {
    return NextResponse.json(
      { error: "Supabase ist nicht konfiguriert" },
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
    return NextResponse.json(
      { error: insertItemResponse.error?.message ?? "Fehler beim Speichern" },
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
      return NextResponse.json(
        { error: insertRelationsResponse.error.message },
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
}
