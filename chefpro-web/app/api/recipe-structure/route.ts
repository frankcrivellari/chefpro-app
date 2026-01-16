import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

type InventoryComponent = {
  itemId: string;
  quantity: number;
  unit: string;
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
    itemId: row.component_item_id as string,
    quantity: row.quantity as number,
    unit: row.unit as string,
  }));

  return NextResponse.json<InventoryComponent[]>(saved);
}

