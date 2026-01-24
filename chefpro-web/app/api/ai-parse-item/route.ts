import { NextResponse } from "next/server";

type StandardPreparationComponent = {
  name: string;
  quantity: number;
  unit: string;
};

type StandardPreparation = {
  components: StandardPreparationComponent[];
};

type NutritionTotals = {
  energyKcal: number | null;
  fat: number | null;
  saturatedFat: number | null;
  carbs: number | null;
  sugar: number | null;
  protein: number | null;
  salt: number | null;
  fiber: number | null;
  sodium: number | null;
  breadUnits: number | null;
  cholesterol: number | null;
};

type ParsedItem = {
  name: string;
  brand?: string;
  unit: string;
  quantity: number;
  purchase_price: number;
  calculated_price_per_unit: number;
  standardPreparation?: StandardPreparation | null;
  preparationText?: string | null;
  nutritionPerUnit?: NutritionTotals | null;
  dosageInstructions?: string | null;
  isBio?: boolean;
  isDeklarationsfrei?: boolean;
  isAllergenfrei?: boolean;
  isCookChill?: boolean;
  isFreezeThawStable?: boolean;
  isPalmOilFree?: boolean;
  isYeastFree?: boolean;
  isLactoseFree?: boolean;
  isGlutenFree?: boolean;
  isVegan?: boolean;
  isVegetarian?: boolean;
};

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error(
      "OpenAI API key missing: OPENAI_API_KEY is not set in environment"
    );
    return NextResponse.json(
      {
        error:
          "OPENAI_API_KEY ist nicht konfiguriert (Bitte .env.local prüfen)",
      },
      { status: 500 }
    );
  }

  try {
    const body = (await request.json()) as {
      text: string;
    };

    if (!body.text || !body.text.trim()) {
      console.error("OpenAI parse error: Empty text input");
      return NextResponse.json(
        { error: "Text ist erforderlich" },
        { status: 400 }
      );
    }

    const systemPrompt = `
Du bist ein KI-Assistent, der Zutaten-Texte und Dosierungsanleitungen für eine Küchen-Software analysiert.
Dein Ziel ist es, aus unstrukturiertem Text strukturierte JSON-Daten zu extrahieren.

Besondere Anweisung für "Dosierungsangaben" / "standardPreparation":
Wenn der Text eine Mischung oder Dosierung beschreibt (z.B. "400 g Produkt, 1 l Milch"), dann extrahiere diese Bestandteile bitte in das Feld 'standardPreparation.components'.
Jeder Bestandteil muss 'name', 'quantity' (Zahl) und 'unit' haben.
Falls als Name "Produkt", "Basisprodukt" oder "Basis" verwendet wird, ersetze diesen durch den Artikelnamen, falls im Text erkennbar, oder verwende "Hauptartikel" als Platzhalter.

Beispiel Input: "400 g Mousse Pulver, 1 l Milch"
Beispiel Output standardPreparation: { "components": [ { "name": "Mousse Pulver", "quantity": 400, "unit": "g" }, { "name": "Milch", "quantity": 1, "unit": "l" } ] }

Beispiel Input 2: "400 g Produkt, 1 l Milch"
Beispiel Output standardPreparation: { "components": [ { "name": "Hauptartikel", "quantity": 400, "unit": "g" }, { "name": "Milch", "quantity": 1, "unit": "l" } ] }

Extrahiere folgende Daten als JSON:
- name: Name des Artikels (falls im Text erkennbar, sonst "Neuer Artikel"). WICHTIG: Das Feld 'name' muss die reine Artikelbezeichnung sein und darf KEINE Zusätze wie 'Pulver', 'Granulat', 'Paste' oder 'Flüssigkeit' enthalten, es sei denn, sie sind fester Bestandteil des offiziellen Produktnamens.
- brand: Marke/Hersteller des Artikels (falls erkennbar)
- unit: Gewicht/Menge des Inhalts (z.B. "1kg", "500g", "400g Abtropfgewicht"). WICHTIG: Das Feld soll den Wert UND die Einheit enthalten (z.B. "500g"), nicht nur die Einheit. Priorisiere Netto- oder Abtropfgewicht.
- quantity: Menge des Artikels (als Zahl, z.B. 1 für 1 Stück/Packung, oder das Gewicht als Zahl wenn 'unit' nur 'kg' ist. Wenn 'unit' z.B. '500g' ist, setze quantity auf 1).
- purchase_price: Einkaufspreis (als Zahl)
- standardPreparation: { components: [{ name, quantity, unit }] } (optional, für Dosierungen/Mischverhältnisse)
- preparationText: Zubereitungsschritte als Text (optional, Fließtext)
- nutritionPerUnit: { energyKcal, fat, saturatedFat, carbs, sugar, protein, salt, fiber (Ballaststoffe), sodium (Natrium), breadUnits (BE), cholesterol (Cholesterin) } (optional, Werte als numbers oder null wenn k.A.)
- dosageInstructions: Dosieranweisungen als Text (optional, falls nicht als components parsbar)
- Boolean Flags (true/false, default false): isBio, isDeklarationsfrei, isAllergenfrei, isCookChill, isFreezeThawStable, isPalmOilFree, isYeastFree (Hefefrei), isLactoseFree (Laktosefrei), isGlutenFree (Glutenfrei), isVegan, isVegetarian.
- manufacturerArticleNumber: Hersteller-Artikelnummer (optional, als String)
- ean: EAN-Nummer / GTIN (optional, als String)

Berechne 'calculated_price_per_unit' = purchase_price / quantity.
Antworte NUR mit dem JSON-Objekt.
    `;

    const completionResponse = await fetch(
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
              content: systemPrompt,
            },
            {
              role: "user",
              content: body.text,
            },
          ],
        }),
      }
    );

    if (!completionResponse.ok) {
      let details = "";
      try {
        details = await completionResponse.text();
      } catch {
        details = "";
      }
      console.error("OpenAI API request failed", {
        status: completionResponse.status,
        statusText: completionResponse.statusText,
        details,
      });
      return NextResponse.json(
        {
          error: `OpenAI API Fehler: ${completionResponse.statusText} (Status: ${completionResponse.status})`,
        },
        { status: 500 }
      );
    }

    const completionJson = (await completionResponse.json()) as {
      choices: {
        message: {
          content: string | null;
        };
      }[];
    };

    const content = completionJson.choices[0]?.message?.content;

    if (!content) {
      console.error("OpenAI API response missing content", completionJson);
      return NextResponse.json(
        { error: "Leere Antwort von OpenAI" },
        { status: 500 }
      );
    }

    let parsedRaw: ParsedItem;

    try {
      parsedRaw = JSON.parse(content) as ParsedItem;
    } catch (error) {
      console.error(
        "Antwort von OpenAI konnte nicht als JSON gelesen werden",
        error,
        content
      );
      return NextResponse.json(
        {
          error:
            "Antwort von OpenAI konnte nicht als JSON gelesen werden",
        },
        { status: 500 }
      );
    }

    if (
      !parsedRaw.name ||
      !parsedRaw.unit ||
      typeof parsedRaw.quantity !== "number" ||
      typeof parsedRaw.purchase_price !== "number"
    ) {
      console.error("Antwort von OpenAI ist unvollständig", parsedRaw);
      return NextResponse.json(
        { error: "Antwort von OpenAI ist unvollständig" },
        { status: 500 }
      );
    }

    const quantity =
      parsedRaw.quantity > 0 ? parsedRaw.quantity : 1;

    const purchasePrice =
      parsedRaw.purchase_price >= 0 ? parsedRaw.purchase_price : 0;

    const calculated =
      quantity > 0 ? purchasePrice / quantity : 0;

    let standardPreparation: StandardPreparation | null = null;
    const rawStd = parsedRaw.standardPreparation;
    if (rawStd && Array.isArray(rawStd.components)) {
      const cleanedComponents = rawStd.components
        .map((component) => ({
          name: String(component.name),
          quantity: Number(component.quantity),
          unit: String(component.unit),
        }))
        .filter(
          (component) =>
            component.name.trim().length > 0 &&
            Number.isFinite(component.quantity) &&
            component.quantity > 0 &&
            component.unit.trim().length > 0
        );
      if (cleanedComponents.length > 0) {
        standardPreparation = {
          components: cleanedComponents,
        };
      }
    }

    const normalized: ParsedItem = {
      name: parsedRaw.name,
      unit: parsedRaw.unit,
      quantity,
      purchase_price: purchasePrice,
      calculated_price_per_unit: Number(
        calculated.toFixed(2)
      ),
      standardPreparation,
      preparationText:
        typeof parsedRaw.preparationText === "string"
          ? parsedRaw.preparationText
          : null,
      nutritionPerUnit:
        parsedRaw.nutritionPerUnit && typeof parsedRaw.nutritionPerUnit === "object"
          ? {
              energyKcal: typeof parsedRaw.nutritionPerUnit.energyKcal === 'number' ? parsedRaw.nutritionPerUnit.energyKcal : null,
              fat: typeof parsedRaw.nutritionPerUnit.fat === 'number' ? parsedRaw.nutritionPerUnit.fat : null,
              saturatedFat: typeof parsedRaw.nutritionPerUnit.saturatedFat === 'number' ? parsedRaw.nutritionPerUnit.saturatedFat : null,
              carbs: typeof parsedRaw.nutritionPerUnit.carbs === 'number' ? parsedRaw.nutritionPerUnit.carbs : null,
              sugar: typeof parsedRaw.nutritionPerUnit.sugar === 'number' ? parsedRaw.nutritionPerUnit.sugar : null,
              protein: typeof parsedRaw.nutritionPerUnit.protein === 'number' ? parsedRaw.nutritionPerUnit.protein : null,
              salt: typeof parsedRaw.nutritionPerUnit.salt === 'number' ? parsedRaw.nutritionPerUnit.salt : null,
              fiber: typeof parsedRaw.nutritionPerUnit.fiber === 'number' ? parsedRaw.nutritionPerUnit.fiber : null,
              sodium: typeof parsedRaw.nutritionPerUnit.sodium === 'number' ? parsedRaw.nutritionPerUnit.sodium : null,
              breadUnits: typeof parsedRaw.nutritionPerUnit.breadUnits === 'number' ? parsedRaw.nutritionPerUnit.breadUnits : null,
              cholesterol: typeof parsedRaw.nutritionPerUnit.cholesterol === 'number' ? parsedRaw.nutritionPerUnit.cholesterol : null,
            }
          : null,
      dosageInstructions:
        typeof parsedRaw.dosageInstructions === "string"
          ? parsedRaw.dosageInstructions
          : null,
      isBio: !!parsedRaw.isBio,
      isDeklarationsfrei: !!parsedRaw.isDeklarationsfrei,
      isAllergenfrei: !!parsedRaw.isAllergenfrei,
      isCookChill: !!parsedRaw.isCookChill,
      isFreezeThawStable: !!parsedRaw.isFreezeThawStable,
      isPalmOilFree: !!parsedRaw.isPalmOilFree,
      isYeastFree: !!parsedRaw.isYeastFree,
      isLactoseFree: !!parsedRaw.isLactoseFree,
      isGlutenFree: !!parsedRaw.isGlutenFree,
      isVegan: !!parsedRaw.isVegan,
      isVegetarian: !!parsedRaw.isVegetarian,
      brand: parsedRaw.brand,
    };

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("Unexpected error in /api/ai-parse-item POST", error);
    const message =
      error instanceof Error ? error.message : "Unbekannter Fehler";
    return NextResponse.json(
      {
        error: `Unerwarteter Fehler im KI-Parser: ${message}`,
      },
      { status: 500 }
    );
  }
}
