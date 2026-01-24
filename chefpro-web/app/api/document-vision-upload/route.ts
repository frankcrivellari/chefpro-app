import { NextResponse } from "next/server";
import pdfParse from "pdf-parse";
import { getSupabaseServerClient } from "@/lib/supabase-server";

type VisionNutritionPer100 = {
  energy_kcal: number;
  fat: number;
  saturated_fat: number;
  carbs: number;
  sugar: number;
  protein: number;
  salt: number;
  fiber?: number;
  sodium?: number;
  bread_units?: number;
  cholesterol?: number;
};

type VisionExtracted = {
  name: string;
  brand?: string | null;
  unit: string;
  purchase_price: number;
  allergens: string[];
  ingredients?: string | null;
  dosage_instructions?: string | null;
  yield_info?: string | null;
  yield_volume?: string | null;
  preparation_steps?: string | null;
  nutrition_per_100?: VisionNutritionPer100 | null;
  manufacturer_article_number?: string | null;
  is_bio?: boolean;
  is_deklarationsfrei?: boolean;
  is_allergenfrei?: boolean;
  is_cook_chill?: boolean;
  is_freeze_thaw_stable?: boolean;
  is_palm_oil_free?: boolean;
  is_yeast_free?: boolean;
  is_lactose_free?: boolean;
  is_gluten_free?: boolean;
  is_vegan?: boolean;
  is_vegetarian?: boolean;
  standard_preparation?: {
    components: {
      name: string;
      quantity: number;
      unit: string;
    }[];
  } | null;
};

type InventoryType = "zukauf" | "eigenproduktion";

type SupabaseItemRow = {
  id: string;
  name: string;
  item_type: InventoryType;
  unit: string;
  purchase_price: number;
  manufacturer_article_number: string | null;
  is_bio: boolean | null;
  is_deklarationsfrei: boolean | null;
  is_allergenfrei: boolean | null;
  is_cook_chill: boolean | null;
  is_freeze_thaw_stable: boolean | null;
  is_palm_oil_free: boolean | null;
  is_yeast_free: boolean | null;
  is_lactose_free: boolean | null;
  is_gluten_free: boolean | null;
  file_url: string | null;
  image_url: string | null;
  nutrition_per_unit: {
    energyKcal: number;
    fat: number;
    saturatedFat: number;
    carbs: number;
    sugar: number;
    protein: number;
    salt: number;
    fiber?: number;
    sodium?: number;
    breadUnits?: number;
    cholesterol?: number;
  } | null;
  allergens: string[] | null;
  ingredients: string | null;
  dosage_instructions: string | null;
  yield_info: string | null;
  preparation_steps: string | null;
  standard_preparation: {
    components: {
      name: string;
      quantity: number;
      unit: string;
    }[];
  } | null;
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

    const isImage = file.type.startsWith("image/");
    const isPdf =
      file.type === "application/pdf" ||
      file.type === "application/x-pdf" ||
      file.type.endsWith("+pdf");

    const imagePublicUrl = isImage ? publicUrl : null;

    let promptInputText: string | null = null;
    let useImage: boolean = false;

    if (isImage) {
      useImage = true;
    } else if (isPdf) {
      const pdfData = await pdfParse(fileBuffer);
      promptInputText = pdfData.text.slice(0, 15000);
    } else {
      return NextResponse.json(
        {
          error:
            "Nur Bild- und PDF-Dokumente werden für die KI-Analyse unterstützt. Das Dokument wurde im Storage gespeichert.",
          fileUrl: publicUrl,
        },
        { status: 400 }
      );
    }

    const systemPrompt =
      "Du analysierst Produktdatenblätter und extrahierst strukturierte Einkaufs- und Nährwertdaten für eine Küchen-Software. Antworte immer als JSON-Objekt mit den Feldern: name (string), brand (string), unit (string), purchase_price (number), allergens (array of strings), ingredients (string), dosage_instructions (string), standard_preparation (object), yield_info (string), yield_volume (string), preparation_steps (string), nutrition_per_100 (object), manufacturer_article_number (string), is_bio (boolean), is_deklarationsfrei (boolean), is_allergenfrei (boolean), is_cook_chill (boolean), is_freeze_thaw_stable (boolean), is_palm_oil_free (boolean), is_yeast_free (boolean), is_lactose_free (boolean), is_gluten_free (boolean), is_vegan (boolean), is_vegetarian (boolean). nutrition_per_100 beschreibt die Nährwerte pro 100 g bzw. 100 ml und enthält die Felder: energy_kcal (number), fat (number), saturated_fat (number), carbs (number), sugar (number), protein (number), salt (number), fiber (number), sodium (number), bread_units (number), cholesterol (number). Die Währung ist immer EUR und muss nicht angegeben werden. purchase_price ist der Gesamt-Einkaufspreis für die auf dem Datenblatt ausgewiesene Gebindegröße. allergens enthält alle deklarierten Allergene als kurze Klartexteinträge. ingredients sind die Zutaten in der Reihenfolge der Deklaration. dosage_instructions beschreibt ausschließlich Mischverhältnisse, Basismengen und Dosierungen als Text (z.B. '100g auf 1l' oder '10%'). standard_preparation enthält strukturierte Dosierungsdaten in 'components' (Array). Jeder Eintrag in components hat: name (string), quantity (number), unit (string). Falls im Text 'Produkt', 'Basisprodukt' oder 'Basis' steht, ersetze dies durch den Artikelnamen oder 'Hauptartikel'. preparation_steps beschreibt die eigentliche Zubereitung und Kochanleitung, jedoch OHNE die reinen Mengenangaben. yield_info beschreibt Ausbeute oder Fertig-Gewicht, yield_volume beschreibt explizit das End-Volumen (z.B. ml, l). manufacturer_article_number ist die Hersteller-Artikelnummer des Herstellers (nicht die EAN/GTIN) und kann z.B. als „Art.-Nr.“ oder „Artikelnummer“ gekennzeichnet sein. brand ist der Markenname des Produkts (z.B. 'Knorr', 'Maggi', 'Lukull'). Falls ein Feld nicht im Dokument zu finden ist, setze es auf null (bei Zahlen) oder einen leeren String (bei Text). Setze boolean-Flags nur auf true, wenn es explizit im Text steht (z.B. 'Bio', 'Vegan', 'Hefefrei').";

    const userText =
      promptInputText ??
      "Analysiere dieses Produktdatenblatt und gib die Felder name, brand, unit, purchase_price, allergens, ingredients, dosage_instructions, standard_preparation, yield_info, yield_volume, preparation_steps, nutrition_per_100, manufacturer_article_number sowie alle boolean-Flags is_bio, is_deklarationsfrei, is_allergenfrei, is_cook_chill, is_freeze_thaw_stable, is_palm_oil_free, is_yeast_free, is_lactose_free, is_gluten_free, is_vegan, is_vegetarian zurück. nutrition_per_100 sind die Nährwerte pro 100 g bzw. 100 ml mit energy_kcal, fat, saturated_fat, carbs, sugar, protein, salt, fiber, sodium, bread_units, cholesterol.";

    const messages = [
      {
        role: "system" as const,
        content: systemPrompt,
      },
      {
        role: "user" as const,
        content: useImage
          ? [
              {
                type: "text" as const,
                text: userText,
              },
              {
                type: "image_url" as const,
                image_url: {
                  url: publicUrl,
                },
              },
            ]
          : userText,
      },
    ];

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
          messages,
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

    const ingredients =
      typeof parsed.ingredients === "string" ? parsed.ingredients : null;
    const dosageInstructions =
      typeof parsed.dosage_instructions === "string"
        ? parsed.dosage_instructions
        : null;
    let yieldInfo: string | null =
      typeof parsed.yield_info === "string" ? parsed.yield_info : null;
    const yieldVolume =
      typeof parsed.yield_volume === "string"
        ? parsed.yield_volume
        : null;
    const preparationSteps =
      typeof parsed.preparation_steps === "string"
        ? parsed.preparation_steps
        : null;

    if (yieldVolume && yieldVolume.trim().length > 0) {
      const base = yieldInfo && yieldInfo.trim().length > 0 ? yieldInfo : "";
      if (base.length > 0) {
        yieldInfo = `${base} | ${yieldVolume.trim()}`;
      } else {
        yieldInfo = yieldVolume.trim();
      }
    }

    const nutritionPerUnit =
      parsed.nutrition_per_100 && typeof parsed.nutrition_per_100 === "object"
        ? {
            energyKcal: Number(parsed.nutrition_per_100.energy_kcal) || 0,
            fat: Number(parsed.nutrition_per_100.fat) || 0,
            saturatedFat:
              Number(parsed.nutrition_per_100.saturated_fat) || 0,
            carbs: Number(parsed.nutrition_per_100.carbs) || 0,
            sugar: Number(parsed.nutrition_per_100.sugar) || 0,
            protein: Number(parsed.nutrition_per_100.protein) || 0,
            salt: Number(parsed.nutrition_per_100.salt) || 0,
          }
        : null;

    const isBio = typeof parsed.is_bio === "boolean" ? parsed.is_bio : false;
    const isDeklarationsfrei =
      typeof parsed.is_deklarationsfrei === "boolean"
        ? parsed.is_deklarationsfrei
        : false;
    const isAllergenfrei =
      typeof parsed.is_allergenfrei === "boolean"
        ? parsed.is_allergenfrei
        : false;
    const isCookChill =
      typeof parsed.is_cook_chill === "boolean" ? parsed.is_cook_chill : false;
    const isFreezeThawStable =
      typeof parsed.is_freeze_thaw_stable === "boolean"
        ? parsed.is_freeze_thaw_stable
        : false;
    const isPalmOilFree =
      typeof parsed.is_palm_oil_free === "boolean"
        ? parsed.is_palm_oil_free
        : false;
    const isYeastFree =
      typeof parsed.is_yeast_free === "boolean" ? parsed.is_yeast_free : false;
    const isLactoseFree =
      typeof parsed.is_lactose_free === "boolean"
        ? parsed.is_lactose_free
        : false;
    const isGlutenFree =
      typeof parsed.is_gluten_free === "boolean"
        ? parsed.is_gluten_free
        : false;
    const isVegan = typeof parsed.is_vegan === "boolean" ? parsed.is_vegan : false;
    const isVegetarian =
      typeof parsed.is_vegetarian === "boolean" ? parsed.is_vegetarian : false;

    const manufacturerArticleNumber =
      typeof parsed.manufacturer_article_number === "string"
        ? parsed.manufacturer_article_number
        : null;

    const insertItemResponse = await client
      .from("items")
      .insert({
        name: parsed.name,
        item_type: "zukauf",
        unit: parsed.unit,
        purchase_price: parsed.purchase_price,
        nutrition_per_unit: nutritionPerUnit,
        allergens,
        ingredients,
        dosage_instructions: dosageInstructions,
        standard_preparation: parsed.standard_preparation,
        yield_info: yieldInfo,
        preparation_steps: preparationSteps,
        manufacturer_article_number: manufacturerArticleNumber,
        is_bio: isBio,
        is_deklarationsfrei: isDeklarationsfrei,
        is_allergenfrei: isAllergenfrei,
        is_cook_chill: isCookChill,
        is_freeze_thaw_stable: isFreezeThawStable,
        is_palm_oil_free: isPalmOilFree,
        is_yeast_free: isYeastFree,
        is_lactose_free: isLactoseFree,
        is_gluten_free: isGlutenFree,
        is_vegan: isVegan,
        is_vegetarian: isVegetarian,
        file_url: publicUrl,
        image_url: imagePublicUrl,
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
            ingredients,
            dosage_instructions: dosageInstructions,
            standard_preparation: parsed.standard_preparation,
            yield_info: yieldInfo,
            preparation_steps: preparationSteps,
            manufacturer_article_number: manufacturerArticleNumber,
            yield_volume: yieldVolume,
            image_url: imagePublicUrl,
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
        manufacturerArticleNumber:
          createdItemRow.manufacturer_article_number,
        isBio: createdItemRow.is_bio ?? false,
        isDeklarationsfrei: createdItemRow.is_deklarationsfrei ?? false,
        isAllergenfrei: createdItemRow.is_allergenfrei ?? false,
        isCookChill: createdItemRow.is_cook_chill ?? false,
        isFreezeThawStable: createdItemRow.is_freeze_thaw_stable ?? false,
        isPalmOilFree: createdItemRow.is_palm_oil_free ?? false,
        isYeastFree: createdItemRow.is_yeast_free ?? false,
        isLactoseFree: createdItemRow.is_lactose_free ?? false,
        isGlutenFree: createdItemRow.is_gluten_free ?? false,
        fileUrl: createdItemRow.file_url,
        imageUrl: createdItemRow.image_url,
        nutritionPerUnit: createdItemRow.nutrition_per_unit,
      },
      extracted: {
        name: parsed.name,
        unit: parsed.unit,
        purchase_price: parsed.purchase_price,
        nutrition_per_100: parsed.nutrition_per_100,
        allergens,
        ingredients,
        dosage_instructions: dosageInstructions,
        standard_preparation: parsed.standard_preparation,
        yield_info: yieldInfo,
        preparation_steps: preparationSteps,
        manufacturer_article_number: manufacturerArticleNumber,
        yield_volume: yieldVolume,
        is_bio: isBio,
        is_deklarationsfrei: isDeklarationsfrei,
        is_allergenfrei: isAllergenfrei,
        is_cook_chill: isCookChill,
        is_freeze_thaw_stable: isFreezeThawStable,
        is_palm_oil_free: isPalmOilFree,
        is_yeast_free: isYeastFree,
        is_lactose_free: isLactoseFree,
        is_gluten_free: isGlutenFree,
        image_url: imagePublicUrl,
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
