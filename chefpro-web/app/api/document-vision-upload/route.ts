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
  is_fairtrade?: boolean;
  is_powder?: boolean;
  is_granulate?: boolean;
  is_paste?: boolean;
  is_liquid?: boolean;
  warengruppe?: string | null;
  storageArea?: string | null;
  bio_control_number?: string | null;
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
  is_fairtrade: boolean | null;
  is_powder: boolean | null;
  is_granulate: boolean | null;
  is_paste: boolean | null;
  is_liquid: boolean | null;
  warengruppe: string | null;
  storage_area: string | null;
  bio_control_number: string | null;
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
         // For existing PDFs, we need to fetch content to extract text
         try {
            console.log(`Re-Scan: Fetching PDF content from ${publicUrl}`);
            const response = await fetch(publicUrl);
            if (!response.ok) {
                throw new Error(`Fetch failed with status ${response.status}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            fileBuffer = Buffer.from(arrayBuffer);
            console.log(`Re-Scan: PDF fetched successfully, size: ${fileBuffer.length}`);
         } catch (e) {
            console.error("Failed to fetch existing PDF for re-scan:", e);
            // If fetch fails, we cannot extract text, which leads to poor AI results.
            // We should probably fail or warn, but for now we proceed (AI will only get instructions).
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
      "Du analysierst Produktdatenblätter und extrahierst strukturierte Einkaufs- und Nährwertdaten für eine Küchen-Software. Antworte immer als JSON-Objekt. WICHTIG: Das Feld 'name' ist das allerwichtigste Feld. Es MUSS immer einen Wert enthalten (String).\n" +
      "- Der Name soll exakt wie auf der Packung übernommen werden.\n" +
      "- WICHTIG: Übernimm ALLE Namensbestandteile, inklusive 'Fairtrade', 'Bio', 'Vegan' oder Markenzusätze (z.B. 'Mousse au Chocolat FAIRTRADE'). Kürze den Namen NICHT ab.\n" +
      "- VERBOTEN: Erfinde KEINE eigenen Namen. Beschreibe das Produkt NICHT (z.B. 'Schoko Dessert' statt 'Mousse au Chocolat'). Nutze NUR den Text, der auf der Packung steht.\n" +
      "- Negativ-Beispiel: Aus 'Mousse au Chocolat FAIRTRADE' darf NICHT 'Fairtrade Schoko Dessert' werden. Es MUSS 'Mousse au Chocolat FAIRTRADE' bleiben.\n" +
      "- Entferne jedoch rein physische Zustandsbeschreibungen wie 'Pulver', 'Granulat', 'Paste' oder 'Flüssigkeit', es sei denn, sie sind fester Bestandteil des offiziellen Produktnamens.\n" +
      "\n" +
      "WICHTIG für 'brand' (Marke):\n" +
      "- Suche explizit nach Hersteller-Logos oder Markennamen (z.B. 'Vogeley', 'Knorr', 'Unilever').\n" +
      "- Verwechsle diese NICHT mit anderen Marken. Wenn 'Vogeley' auf der Packung steht, ist das die Marke.\n" +
      "\n" +
      "WICHTIG für 'unit' (Menge/Gewicht):\n" +
      "- Suche nach der Nettofüllmenge oder dem Abtropfgewicht (z.B. '2,4 kg', '1000 ml', '500 g').\n" +
      "- Ignoriere Portionsangaben (z.B. '72g pro Portion') oder Nährwert-Referenzmengen (z.B. '100g').\n" +
      "- Das Feld 'unit' muss die GESAMT-Menge der Verkaufseinheit enthalten.\n" +
      "\n" +
      "WICHTIG für 'standard_preparation' (Zubereitung):\n" +
      "- Wenn die Zubereitung aus mehreren Komponenten besteht (z.B. '400g Produkt + 1l Milch'), MÜSSEN diese als separate Objekte im Array `standard_preparation.components` zurückgegeben werden.\n" +
      "- Beispiel: `[{name: 'Produkt', quantity: 400, unit: 'g'}, {name: 'Milch (1,5% Fett)', quantity: 1, unit: 'l'}]`.\n" +
      "- Schreibe NICHT alles in ein Feld (z.B. NICHT `name: 'Produkt, 1l Milch'`). Trenne die Zutaten sauber auf.\n" +
      "\n" +
      "Füge ein Feld 'debug_reasoning' (string) hinzu, in dem du zuerst beschreibst, welche visuellen Elemente, Logos, Siegel oder Text-Hinweise du gefunden hast.\n" +
      "- Suche aggressiv nach dem Wort 'Fairtrade' oder dem Fairtrade-Logo. Wenn 'Fairtrade' im Namen oder auf dem Bild steht, MUSS 'is_fairtrade' true sein.\n" +
      "- Begründe kurz deine Entscheidung für jedes Boolean-Flag.\n" +
      "\n" +
      "Kategorisierung (WICHTIG: Du MUSST zwingend einen Wert aus den Listen wählen, auch wenn du ihn schätzen musst):\n" +
      "- 'warengruppe': Wähle exakt einen aus: ['Obst & Gemüse', 'Molkerei & Eier', 'Trockensortiment', 'Getränke', 'Zusatz- & Hilfsstoffe']. Wenn unsicher, nimm 'Trockensortiment' oder was am besten passt.\n" +
      "- 'storageArea': Wähle exakt einen aus: ['Frischwaren', 'Kühlwaren', 'Tiefkühlwaren', 'Trockenwaren', 'Non Food']. Wenn unsicher, nimm 'Trockenwaren' oder was am besten passt.\n" +
      "\n" +
      "Bestimme auch den Aggregatzustand des Produkts (Pulver, Granulat, Paste, Flüssigkeit) anhand der Beschreibung und Bilder.\n" +
      "Die erwarteten Felder sind: name (PFLICHT!), brand (string), unit (string), purchase_price (number), allergens (array of strings), ingredients (string), dosage_instructions (string), standard_preparation (object), yield_info (string), preparation_steps (string), nutrition_per_100 (object), manufacturer_article_number (string), ean (string), is_bio (boolean), bio_control_number (string), is_deklarationsfrei (boolean), is_allergenfrei (boolean), is_cook_chill (boolean), is_freeze_thaw_stable (boolean), is_palm_oil_free (boolean), is_yeast_free (boolean), is_lactose_free (boolean), is_gluten_free (boolean), is_vegan (boolean), is_vegetarian (boolean), is_fairtrade (boolean), is_powder (boolean), is_granulate (boolean), is_paste (boolean), is_liquid (boolean), warengruppe (string), storageArea (string).";

    const userTextInstructions =
      "Analysiere dieses Produktdatenblatt. WICHTIG: Marke (brand) muss korrekt erkannt werden (z.B. Vogeley). Unit muss die Gesamtmenge sein (z.B. 2,4 kg), NICHT Portionsgröße. Standardzubereitung MUSS in separate Komponenten aufgeteilt werden (z.B. 400g Produkt und 1l Milch als ZWEI Einträge). Gib die Felder debug_reasoning, name, brand, unit, purchase_price, allergens, ingredients, dosage_instructions, standard_preparation, yield_info, preparation_steps, nutrition_per_100, manufacturer_article_number, ean, warengruppe, storageArea, bio_control_number sowie alle boolean-Flags zurück. Achte besonders auf Logos (Bio, Vegan, Fairtrade). Wenn 'Fairtrade' im Text/Bild, setze is_fairtrade=true. Name EXAKT übernehmen.";

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
          model: "gpt-4o",
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

    // Clean content from markdown code blocks if present (sometimes happens despite JSON mode)
    const cleanContent = content.trim().replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/\s*```$/, "");

    try {
      parsed = JSON.parse(cleanContent) as VisionExtracted;
    } catch (e) {
      console.error("JSON Parse Error:", e);
      return NextResponse.json(
        {
          error: "Antwort von OpenAI Vision konnte nicht als JSON gelesen werden.",
          details: String(e),
          contentPreview: content.substring(0, 100),
          fileUrl: publicUrl,
        },
        { status: 500 }
      );
    }

    if (!parsed || typeof parsed !== "object") {
      return NextResponse.json(
        {
          error: "Antwort von OpenAI Vision ist kein gültiges Objekt.",
          fileUrl: publicUrl,
        },
        { status: 500 }
      );
    }

    if (!parsed.name || typeof parsed.name !== "string" || parsed.name.trim() === "") {
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
    const isFairtrade = typeof parsed.is_fairtrade === "boolean" ? parsed.is_fairtrade : false;
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
      is_fairtrade: isFairtrade,
      is_powder: isPowder,
      is_granulate: isGranulate,
      is_paste: isPaste,
      is_liquid: isLiquid,
      bio_control_number: parsed.bio_control_number || null,
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
        is_fairtrade: isFairtrade,
        is_powder: isPowder,
        is_granulate: isGranulate,
        is_paste: isPaste,
        is_liquid: isLiquid,
        warengruppe: parsed.warengruppe || null,
        storage_area: parsed.storageArea || null,
        bio_control_number: parsed.bio_control_number || null,
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
        isFairtrade: isFairtrade,
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
        is_fairtrade: isFairtrade,
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
