import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

type VisionExtracted = {
  name: string;
  unit: string;
  purchase_price: number;
  allergens: string[];
};

type InventoryType = "zukauf" | "eigenproduktion";

type SupabaseItemRow = {
  id: string;
  name: string;
  item_type: InventoryType;
  unit: string;
  purchase_price: number;
};

const STORAGE_BUCKET = "product-documents";

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

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "OPENAI_API_KEY ist nicht konfiguriert (Bitte .env oder Vercel-Environment prüfen)",
      },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof Blob)) {
      return NextResponse.json(
        { error: "Es wurde keine Datei hochgeladen." },
        { status: 400 }
      );
    }

    const originalName =
      typeof formData.get("filename") === "string"
        ? (formData.get("filename") as string)
        : "upload";

    const extensionFromName = originalName.includes(".")
      ? originalName.split(".").pop() ?? ""
      : "";

    const safeExtension =
      extensionFromName ||
      (file.type === "application/pdf"
        ? "pdf"
        : file.type.startsWith("image/")
        ? "jpg"
        : "bin");

    const objectPath = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${safeExtension}`;

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const uploadResult = await client.storage
      .from(STORAGE_BUCKET)
      .upload(objectPath, fileBuffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadResult.error) {
      return NextResponse.json(
        {
          error: `Fehler beim Upload in Supabase Storage: ${uploadResult.error.message}`,
        },
        { status: 500 }
      );
    }

    const publicUrlResult = client.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(objectPath);

    const publicUrl = publicUrlResult.data.publicUrl;

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        {
          error:
            "Die AI-Auswertung ist aktuell nur für Bilddateien verfügbar. Das Dokument wurde trotzdem im Storage gespeichert.",
          fileUrl: publicUrl,
        },
        { status: 400 }
      );
    }

    const visionResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "Du analysierst Produktdatenblätter und extrahierst strukturierte Einkaufsdaten für eine Küchen-Software. Antworte immer als JSON-Objekt mit den Feldern: name (string), unit (string), purchase_price (number), allergens (array of strings). Die Währung ist immer EUR und muss nicht angegeben werden. purchase_price ist der Gesamt-Einkaufspreis für die auf dem Datenblatt ausgewiesene Gebindegröße. allergens enthält alle deklarierten Allergene als kurze Klartexteinträge.",
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Analysiere dieses Produktdatenblatt und gib die Felder name, unit, purchase_price und allergens zurück.",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: publicUrl,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    if (!visionResponse.ok) {
      let details = "";
      try {
        details = await visionResponse.text();
      } catch {
        details = "";
      }
      return NextResponse.json(
        {
          error: `OpenAI Vision Fehler: ${visionResponse.statusText} (Status: ${visionResponse.status})`,
          details,
          fileUrl: publicUrl,
        },
        { status: 500 }
      );
    }

    const completionJson = (await visionResponse.json()) as {
      choices: {
        message: {
          content: string | null;
        };
      }[];
    };

    const content = completionJson.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        {
          error: "Leere Antwort von OpenAI Vision.",
          fileUrl: publicUrl,
        },
        { status: 500 }
      );
    }

    let parsed: VisionExtracted;

    try {
      parsed = JSON.parse(content) as VisionExtracted;
    } catch {
      return NextResponse.json(
        {
          error:
            "Antwort von OpenAI Vision konnte nicht als JSON gelesen werden.",
          fileUrl: publicUrl,
        },
        { status: 500 }
      );
    }

    if (
      !parsed.name ||
      !parsed.unit ||
      typeof parsed.purchase_price !== "number"
    ) {
      return NextResponse.json(
        {
          error: "Antwort von OpenAI Vision ist unvollständig.",
          raw: parsed,
          fileUrl: publicUrl,
        },
        { status: 500 }
      );
    }

    const allergens =
      Array.isArray(parsed.allergens) && parsed.allergens.length > 0
        ? parsed.allergens.map((value) => String(value))
        : [];

    const insertItemResponse = await client
      .from("items")
      .insert({
        name: parsed.name,
        item_type: "zukauf",
        unit: parsed.unit,
        purchase_price: parsed.purchase_price,
      })
      .select("*")
      .single();

    if (insertItemResponse.error || !insertItemResponse.data) {
      return NextResponse.json(
        {
          error:
            insertItemResponse.error?.message ??
            'Fehler beim Speichern des Artikels in Tabelle "items"',
          fileUrl: publicUrl,
          extracted: {
            name: parsed.name,
            unit: parsed.unit,
            purchase_price: parsed.purchase_price,
            allergens,
          },
        },
        { status: 500 }
      );
    }

    const createdItemRow = insertItemResponse.data as SupabaseItemRow;

    return NextResponse.json({
      item: {
        id: createdItemRow.id,
        name: createdItemRow.name,
        type: createdItemRow.item_type,
        unit: createdItemRow.unit,
        purchasePrice: createdItemRow.purchase_price,
      },
      extracted: {
        name: parsed.name,
        unit: parsed.unit,
        purchase_price: parsed.purchase_price,
        allergens,
      },
      fileUrl: publicUrl,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unbekannter Fehler";
    return NextResponse.json(
      {
        error: `Unerwarteter Fehler beim Dokumenten-Upload: ${message}`,
      },
      { status: 500 }
    );
  }
}

