import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

type InventoryComponent = {
  itemId: string | null;
  quantity: number;
  unit: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parentItemId = searchParams.get("parentItemId");

  const client = getSupabaseServerClient();

  if (!client) {
    return NextResponse.json(
      { error: "Supabase ist nicht konfiguriert" },
      { status: 500 }
    );
  }

  if (!parentItemId) {
    return NextResponse.json(
      { error: "parentItemId ist erforderlich" },
      { status: 400 }
    );
  }

  const { data, error } = await client
    .from("recipe_structure")
    .select("child_item_id, amount, unit")
    .eq("parent_item_id", parentItemId);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  const components: InventoryComponent[] = (data || []).map((row) => ({
    itemId: row.child_item_id,
    quantity: row.amount,
    unit: row.unit,
  }));

  return NextResponse.json(components);
}

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

  // Atomic Save: First delete all existing components for this parent
  const deleteResponse = await client
    .from("recipe_structure")
    .delete()
    .eq("parent_item_id", body.parentItemId);

  if (deleteResponse.error) {
    return NextResponse.json(
      { error: deleteResponse.error.message },
      { status: 500 }
    );
  }

  const components = body.components ?? [];

  if (components.length === 0) {
    return NextResponse.json<InventoryComponent[]>([]);
  }

  // Then insert the new components
  const insertResponse = await client
    .from("recipe_structure")
    .insert(
      components.map((component) => ({
        parent_item_id: body.parentItemId,
        child_item_id: component.itemId,
        amount: component.quantity,
        unit: component.unit,
      }))
    )
    .select("child_item_id, amount, unit");

  if (insertResponse.error || !insertResponse.data) {
    return NextResponse.json(
      { error: insertResponse.error?.message ?? "Fehler beim Speichern" },
      { status: 500 }
    );
  }

  const saved: InventoryComponent[] = insertResponse.data.map((row) => ({
    itemId: row.child_item_id,
    quantity: row.amount,
    unit: row.unit,
  }));

  return NextResponse.json(saved);
}
