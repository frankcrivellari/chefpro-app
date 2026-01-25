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
  preparation_steps?: string | null;
  nutrition_per_100?: VisionNutritionPer100 | null;
  manufacturer_article_number?: string | null;
  ean?: string | null;
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
  is_powder?: boolean;
  is_granulate?: boolean;
  is_paste?: boolean;
  is_liquid?: boolean;
  warengruppe?: string | null;
  storageArea?: string | null;
  debug_reasoning?: string;
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
  brand: string | null;
  manufacturer_article_number: string | null;
  ean: string | null;
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
  is_powder: boolean | null;
  is_granulate: boolean | null;
  is_paste: boolean | null;
  is_liquid: boolean | null;
  warengruppe: string | null;
  storage_area: string | null;
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
    const existingImageUrl = formData.get("existing_image_url");
    const analyzeOnly = formData.get("analyze_only") === "true";
    let file = formData.get("file");

    let publicUrl = "";
    let originalName = "upload";
    let isImage = false;
    let isPdf = false;
    let fileBuffer: Buffer | null = null;

    if (existingImageUrl && typeof existingImageUrl === "string") {
      publicUrl = existingImageUrl;
      originalName = publicUrl.split("/").pop() ?? "existing_file";
      isImage = true; // Assume image for simplicity if re-scanning, or check extension
      if (publicUrl.toLowerCase().endsWith(".pdf")) {
         isImage = false;
         isPdf = true;
         // For existing PDFs, we might need to fetch content if we want to extract text, 
         // but for now let's assume we rely on vision if possible or just skip text extraction if we can't fetch easily.
         // Actually, if it's a PDF, we need the buffer to parse text.
         try {
            const response = await fetch(publicUrl);
            const arrayBuffer = await response.arrayBuffer();
            fileBuffer = Buffer.from(arrayBuffer);
         } catch (e) {
            console.error("Failed to fetch existing PDF for re-scan:", e);
         }
      }
    } else {
        if (!(file instanceof Blob)) {
        return NextResponse.json(
            { error: "Es wurde keine Datei hochgeladen." },
            { status: 400 }
        );
        }

        originalName =
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
        fileBuffer = Buffer.from(arrayBuffer);

        console.log(
        `Starting upload to Supabase Storage. Bucket: ${STORAGE_BUCKET}, File: ${originalName}, Size: ${file.size}`
        );

        const uploadResult = await client.storage
        .from(STORAGE_BUCKET)
        .upload(objectPath, fileBuffer, {
            contentType: file.type || "application/octet-stream",
            upsert: false,
        });

        if (uploadResult.error) {
        console.error("Supabase Storage Upload Error:", uploadResult.error);
        const isHtmlError =
            uploadResult.error.message.includes("<") ||
            uploadResult.error.message.includes("Unexpected token");
        
        let errorMessage = uploadResult.error.message;
        if (isHtmlError) {
            errorMessage = "Der Storage-Server hat eine ungültige Antwort (HTML statt JSON) zurückgegeben. Möglicherweise ist die Datei zu groß oder der Service nicht erreichbar.";
        }

        return NextResponse.json(
            {
            error: `Fehler beim Upload in Supabase Storage: ${errorMessage}`,
            },
            { status: 500 }
        );
        }

        const publicUrlResult = client.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(objectPath);

        publicUrl = publicUrlResult.data.publicUrl;

        isImage = file.type.startsWith("image/");
        isPdf =
        file.type === "application/pdf" ||
        file.type === "application/x-pdf" ||
        file.type.endsWith("+pdf");
    }

    const imagePublicUrl = isImage ? publicUrl : null;

    let promptInputText: string | null = null;
    let useImage: boolean = false;
    let visionImageUrl: string | null = null;

    const visionFile = formData.get("vision_file");
    if (visionFile && visionFile instanceof Blob) {
      const arrayBuffer = await visionFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString("base64");
      const mimeType = visionFile.type || "image/jpeg";
      visionImageUrl = `data:${mimeType};base64,${base64}`;
      useImage = true;
    } else if (isImage) {
      visionImageUrl = publicUrl;
      useImage = true;
    }

    if (isPdf && fileBuffer) {
      try {
        const pdfData = await pdfParse(fileBuffer);
        promptInputText = pdfData.text.slice(0, 15000);
      } catch (error) {
        console.error("Fehler beim Parsen der PDF-Datei:", error);
      }
    } else if (!isImage && !useImage) {
      return NextResponse.json(
        {
          error:
            "Nur Bild- und PDF-Dokumente werden für die KI-Analyse unterstützt. Das Dokument wurde im Storage gespeichert.",
          fileUrl: publicUrl,
        },
        { status: 400 }
      );
    }

    const instructions =
      "Du analysierst Produktdatenblätter und extrahierst strukturierte Einkaufs- und Nährwertdaten für eine Küchen-Software. Antworte immer als JSON-Objekt. WICHTIG: Füge ein Feld 'debug_reasoning' (string) hinzu, in dem du zuerst beschreibst, welche visuellen Elemente, Logos, Siegel oder Text-Hinweise du gefunden hast, die auf Eigenschaften wie Bio, Vegan, Glutenfrei etc. hinweisen. Begründe kurz deine Entscheidung für jedes Boolean-Flag. Ordne das Produkt zudem einer 'warengruppe' (Obst & Gemüse, Molkerei & Eier, Trockensortiment, Getränke, Zusatz- & Hilfsstoffe) und einem 'storageArea' (Frischwaren, Kühlwaren, Tiefkühlwaren, Trockenwaren, Non Food) zu. Bestimme auch den Aggregatzustand des Produkts (Pulver, Granulat, Paste, Flüssigkeit) anhand der Beschreibung und Bilder. Danach folgen die Felder: name (string), brand (string), unit (string), purchase_price (number), allergens (array of strings), ingredients (string), dosage_instructions (string), standard_preparation (object), yield_info (string), preparation_steps (string), nutrition_per_100 (object), manufacturer_article_number (string), ean (string), is_bio (boolean), is_deklarationsfrei (boolean), is_allergenfrei (boolean), is_cook_chill (boolean), is_freeze_thaw_stable (boolean), is_palm_oil_free (boolean), is_yeast_free (boolean), is_lactose_free (boolean), is_gluten_free (boolean), is_vegan (boolean), is_vegetarian (boolean), is_powder (boolean), is_granulate (boolean), is_paste (boolean), is_liquid (boolean), warengruppe (string), storageArea (string). WICHTIG: Das Feld 'name' muss die reine Artikelbezeichnung sein und darf KEINE Zusätze wie 'Pulver', 'Granulat', 'Paste' oder 'Flüssigkeit' enthalten, es sei denn, sie sind fester Bestandteil des offiziellen Produktnamens auf der Verpackung. Diese Information wird primär über die Boolean-Flags (is_powder, etc.) erfasst. nutrition_per_100 beschreibt die Nährwerte pro 100 g bzw. 100 ml und enthält die Felder: energy_kcal (number), fat (number), saturated_fat (number), carbs (number), sugar (number), protein (number), salt (number), fiber (number), sodium (number), bread_units (number), cholesterol (number). Die Währung ist immer EUR und muss nicht angegeben werden. purchase_price ist der Gesamt-Einkaufspreis für die auf dem Datenblatt ausgewiesene Gebindegröße. allergens enthält alle deklarierten Allergene als kurze Klartexteinträge. ingredients sind die Zutaten in der Reihenfolge der Deklaration. dosage_instructions beschreibt ausschließlich Mischverhältnisse, Basismengen und Dosierungen als Text (z.B. '100g auf 1l' oder '10%'). standard_preparation enthält strukturierte Dosierungsdaten in 'components' (Array). Jeder Eintrag in components hat: name (string), quantity (number), unit (string). Für die erste Komponente der 'standard_preparation' (die das Produkt selbst darstellt), verwende immer den vollständigen, extrahierten Artikelnamen (Feld 'name'). Wenn es sich um ein Pulver handelt, hänge das Wort 'Pulver' an den Namen an (z.B. 'Mousse au Chocolat Klassik FAIRTRADE Pulver'). Verwende keine generischen Begriffe wie 'Mousse-Pulver', 'Produkt' oder 'Basis'. yield_info enthält die Ergiebigkeit als Text (z.B. 'ergibt 5 Liter' oder '50 Portionen à 100g'). preparation_steps enthält die Zubereitungsschritte als Fließtext. manufacturer_article_number ist die Artikelnummer des Herstellers. ean ist die EAN-Nummer (GTIN) des Produkts.";

    const userTextInstructions =
      "Analysiere dieses Produktdatenblatt und gib die Felder debug_reasoning, name, brand, unit, purchase_price, allergens, ingredients, dosage_instructions, standard_preparation, yield_info, preparation_steps, nutrition_per_100, manufacturer_article_number, ean, warengruppe, storageArea sowie alle boolean-Flags is_bio, is_deklarationsfrei, is_allergenfrei, is_cook_chill, is_freeze_thaw_stable, is_palm_oil_free, is_yeast_free, is_lactose_free, is_gluten_free, is_vegan, is_vegetarian, is_powder, is_granulate, is_paste, is_liquid zurück. WICHTIG: Achte besonders auf Logos, Icons oder Siegel (z.B. Bio-Logo, Vegan-Blume, Glutenfrei-Symbol), die auf dem Bild zu sehen sind, auch wenn sie nicht explizit im Text stehen. Setze die entsprechenden Flags auf true, wenn solche Symbole erkannt werden. Schreibe deine Beobachtungen dazu in 'debug_reasoning'. nutrition_per_100 sind die Nährwerte pro 100 g bzw. 100 ml mit energy_kcal, fat, saturated_fat, carbs, sugar, protein, salt, fiber, sodium, bread_units, cholesterol.";

    const userText = promptInputText
      ? `${userTextInstructions}\n\nHier ist der extrahierte Text aus dem Dokument (nutze zusätzlich das Bild für Logos/Icons):\n${promptInputText}`
      : userTextInstructions;

    const messages = [
      {
        role: "system" as const,
        content: instructions,
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
                  url: visionImageUrl ?? publicUrl,
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

    if (!parsed.name) {
      return NextResponse.json(
        {
          error: "Antwort von OpenAI Vision ist unvollständig (Name fehlt).",
          raw: parsed,
          fileUrl: publicUrl,
        },
        { status: 500 }
      );
    }

    // Defaults for missing fields
    if (!parsed.unit) parsed.unit = "Stück";
    if (typeof parsed.purchase_price !== "number") parsed.purchase_price = 0;

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
    const yieldInfo = parsed.yield_info ?? null;
    const preparationSteps =
      typeof parsed.preparation_steps === "string"
        ? parsed.preparation_steps
        : null;

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
    const isPowder = typeof parsed.is_powder === "boolean" ? parsed.is_powder : false;
    const isGranulate = typeof parsed.is_granulate === "boolean" ? parsed.is_granulate : false;
    const isPaste = typeof parsed.is_paste === "boolean" ? parsed.is_paste : false;
    const isLiquid = typeof parsed.is_liquid === "boolean" ? parsed.is_liquid : false;

    const manufacturerArticleNumber =
      typeof parsed.manufacturer_article_number === "string"
        ? parsed.manufacturer_article_number
        : null;

    const ean =
      typeof parsed.ean === "string"
        ? parsed.ean
        : null;

    const extractedData = {
      name: parsed.name,
      brand: parsed.brand,
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
      ean: ean,
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
      is_powder: isPowder,
      is_granulate: isGranulate,
      is_paste: isPaste,
      is_liquid: isLiquid,
      warengruppe: parsed.warengruppe || null,
      storageArea: parsed.storageArea || null,
      image_url: imagePublicUrl,
      debug_reasoning: parsed.debug_reasoning,
    };

    if (analyzeOnly) {
        return NextResponse.json({
            item: null, // No new item created
            extracted: extractedData,
        });
    }

    const itemData: SupabaseItemRow = {
        id: undefined as unknown as string, // Let DB generate ID
        name: parsed.name,
        item_type: "zukauf",
        unit: parsed.unit,
        purchase_price: parsed.purchase_price,
        nutrition_per_unit: nutritionPerUnit,
        allergens,
        ingredients,
        dosage_instructions: dosageInstructions,
        standard_preparation: parsed.standard_preparation || null,
        yield_info: yieldInfo,
        preparation_steps: preparationSteps,
        manufacturer_article_number: manufacturerArticleNumber,
        ean: ean,
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
        is_powder: isPowder,
        is_granulate: isGranulate,
        is_paste: isPaste,
        is_liquid: isLiquid,
        warengruppe: parsed.warengruppe || null,
        storage_area: parsed.storageArea || null,
        file_url: publicUrl,
        image_url: imagePublicUrl,
        brand: parsed.brand || null,
    };

    // Remove id from object to let DB generate it
    const { id, ...insertData } = itemData;

    const insertItemResponse = await client
      .from("items")
      .insert(insertData)
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
            image_url: imagePublicUrl,
            warengruppe: parsed.warengruppe || null,
            storageArea: parsed.storageArea || null,
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
        brand: createdItemRow.brand,
        manufacturerArticleNumber:
          createdItemRow.manufacturer_article_number,
        ean: createdItemRow.ean,
        isBio: createdItemRow.is_bio ?? false,
        isDeklarationsfrei: createdItemRow.is_deklarationsfrei ?? false,
        isAllergenfrei: createdItemRow.is_allergenfrei ?? false,
        isCookChill: createdItemRow.is_cook_chill ?? false,
        isFreezeThawStable: createdItemRow.is_freeze_thaw_stable ?? false,
        isPalmOilFree: createdItemRow.is_palm_oil_free ?? false,
        isYeastFree: createdItemRow.is_yeast_free ?? false,
        isLactoseFree: createdItemRow.is_lactose_free ?? false,
        isGlutenFree: createdItemRow.is_gluten_free ?? false,
        isVegan: isVegan,
        isVegetarian: isVegetarian,
        isPowder: createdItemRow.is_powder ?? false,
        isGranulate: createdItemRow.is_granulate ?? false,
        isPaste: createdItemRow.is_paste ?? false,
        isLiquid: createdItemRow.is_liquid ?? false,
        fileUrl: createdItemRow.file_url,
        imageUrl: createdItemRow.image_url,
        warengruppe: createdItemRow.warengruppe,
        storageArea: createdItemRow.storage_area,
        nutritionPerUnit: createdItemRow.nutrition_per_unit,
      },
      extracted: {
        name: parsed.name,
        brand: parsed.brand,
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
        ean: ean,
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
        is_powder: isPowder,
        is_granulate: isGranulate,
        is_paste: isPaste,
        is_liquid: isLiquid,
        warengruppe: parsed.warengruppe || null,
        storageArea: parsed.storageArea || null,
        image_url: imagePublicUrl,
        debug_reasoning: parsed.debug_reasoning,
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
