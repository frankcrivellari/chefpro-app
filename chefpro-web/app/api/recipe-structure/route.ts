import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

type InventoryComponent = {
  itemId: string | null;
  quantity: number;
  unit: string;
  subRecipeId?: string | null;
  subRecipeName?: string | null;
};

export async function POST(request: Request) {
  const client = getSupabaseServerClient();

  if (!client) {
    return NextResponse.json(
      { error: "Supabase ist nicht konfiguriert" },
      { status: 500 }
    );
  }

  const body = (await request.json()) as {
    parentItemId: string;
    components: InventoryComponent[];
  };

  if (!body.parentItemId) {
    return NextResponse.json(
      { error: "parentItemId ist erforderlich" },
      { status: 400 }
    );
  }

  await client
    .from("recipe_structure")
    .delete()
    .eq("parent_item_id", body.parentItemId);

  const components = body.components ?? [];

  if (components.length === 0) {
    return NextResponse.json<InventoryComponent[]>([]);
  }

  const insertResponse = await client
    .from("recipe_structure")
    .insert(
      components.map((component) => ({
        parent_item_id: body.parentItemId,
        component_item_id: component.itemId,
        quantity: component.quantity,
        unit: component.unit,
        sub_recipe_id: component.subRecipeId || null,
        sub_recipe_name: component.subRecipeName || null,
      }))
    )
    .select("*");

  if (insertResponse.error || !insertResponse.data) {
    return NextResponse.json(
      { error: insertResponse.error?.message ?? "Fehler beim Speichern" },
      { status: 500 }
    );
  }

  const saved = insertResponse.data.map((row) => ({
    itemId: row.component_item_id as string | null,
    quantity: row.quantity as number,
    unit: row.unit as string,
    subRecipeId: row.sub_recipe_id as string | null,
    subRecipeName: row.sub_recipe_name as string | null,
  }));

  return NextResponse.json<InventoryComponent[]>(saved);
}

export async function PATCH(request: Request) {
  const client = getSupabaseServerClient();

  if (!client) {
    return NextResponse.json(
      { error: "Supabase ist nicht konfiguriert" },
      { status: 500 }
    );
  }

  const body = (await request.json()) as {
    deletedItemName: string;
    newItemId: string;
  };

  if (!body.deletedItemName || !body.newItemId) {
    return NextResponse.json(
      {
        error:
          "deletedItemName und newItemId sind erforderlich, um einen Ersatz vorzunehmen",
      },
      { status: 400 }
    );
  }

  const updateResponse = await client
    .from("recipe_structure")
    .update({
      component_item_id: body.newItemId,
      deleted_item_name: null,
    })
    .eq("deleted_item_name", body.deletedItemName)
    .is("component_item_id", null)
    .select("id");

  if (updateResponse.error) {
    return NextResponse.json(
      {
        error:
          updateResponse.error.message ??
          "Fehler beim globalen Ersetzen der Komponenten",
      },
      { status: 500 }
    );
  }

  const count = Array.isArray(updateResponse.data)
    ? updateResponse.data.length
    : 0;

  return NextResponse.json({
    replacedCount: count,
  });
}
