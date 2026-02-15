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
    .select("*")
    .eq("parent_item_id", parentItemId);

  if (error) {
    console.error("Supabase recipe_structure GET error", {
      table: "recipe_structure",
      error: error.message,
      details: (error as any)?.details,
      code: (error as any)?.code,
      hint: (error as any)?.hint,
      parentItemId,
    });
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  const components: InventoryComponent[] = (data || []).map((row: any) => {
    const qty = row.amount ?? row.quantity ?? null;
    return {
      itemId: row.child_item_id ?? null,
      quantity: qty,
      unit: row.unit,
    };
  });

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
    console.error("Supabase recipe_structure DELETE error", {
      table: "recipe_structure",
      error: deleteResponse.error.message,
      details: (deleteResponse.error as any)?.details,
      code: (deleteResponse.error as any)?.code,
      hint: (deleteResponse.error as any)?.hint,
      parentItemId: body.parentItemId,
    });
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
  // First try with 'amount' column (older schema)
  let insertResponse = await client
    .from("recipe_structure")
    .insert(
      components.map((component) => ({
        parent_item_id: body.parentItemId,
        child_item_id: component.itemId,
        amount: component.quantity,
        unit: component.unit,
      }))
    )
    .select("*");

  // If column 'amount' doesn't exist, retry with 'quantity'
  if (
    insertResponse.error &&
    typeof insertResponse.error.message === "string" &&
    insertResponse.error.message.toLowerCase().includes("amount")
  ) {
    insertResponse = await client
      .from("recipe_structure")
      .insert(
        components.map((component) => ({
          parent_item_id: body.parentItemId,
          child_item_id: component.itemId,
          quantity: component.quantity,
          unit: component.unit,
        }))
      )
      .select("*");
  }

  if (insertResponse.error || !insertResponse.data) {
    console.error("Supabase recipe_structure INSERT error", {
      table: "recipe_structure",
      error: insertResponse.error?.message,
      details: (insertResponse.error as any)?.details,
      code: (insertResponse.error as any)?.code,
      hint: (insertResponse.error as any)?.hint,
      parentItemId: body.parentItemId,
      componentsCount: components.length,
    });
    return NextResponse.json(
      { error: insertResponse.error?.message ?? "Fehler beim Speichern" },
      { status: 500 }
    );
  }

  const saved: InventoryComponent[] = insertResponse.data.map((row: any) => {
    const qty = row.amount ?? row.quantity ?? null;
    return {
      itemId: row.child_item_id,
      quantity: qty,
      unit: row.unit,
    };
  });

  return NextResponse.json(saved);
}
