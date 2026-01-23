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
  energyKcal: number;
  fat: number;
  saturatedFat: number;
  carbs: number;
  sugar: number;
  protein: number;
  salt: number;
};

type ParsedItem = {
  name: string;
  unit: string;
  quantity: number;
  purchase_price: number;
  calculated_price_per_unit: number;
  standardPreparation?: StandardPreparation | null;
  preparationText?: string | null;
  nutritionPerUnit?: NutritionTotals | null;
  dosageInstructions?: string | null;
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
Du bist ein KI-Assistent, der Zutaten-Texte analysiert.
Extrahiere folgende Daten als JSON:
- name: Name der Zutat
- unit: Einheit (kg, l, stück, bund, etc.)
- quantity: Menge (als Zahl)
- purchase_price: Einkaufspreis (als Zahl)
- standardPreparation: { components: [{ name, quantity, unit }] } (optional)
- preparationText: Zubereitungsschritte als Text (optional)
- nutritionPerUnit: { energyKcal, fat, saturatedFat, carbs, sugar, protein, salt } (optional, alle Werte als numbers)
- dosageInstructions: Dosieranweisungen als Text (optional)

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
              energyKcal: Number(parsedRaw.nutritionPerUnit.energyKcal) || 0,
              fat: Number(parsedRaw.nutritionPerUnit.fat) || 0,
              saturatedFat: Number(parsedRaw.nutritionPerUnit.saturatedFat) || 0,
              carbs: Number(parsedRaw.nutritionPerUnit.carbs) || 0,
              sugar: Number(parsedRaw.nutritionPerUnit.sugar) || 0,
              protein: Number(parsedRaw.nutritionPerUnit.protein) || 0,
              salt: Number(parsedRaw.nutritionPerUnit.salt) || 0,
            }
          : null,
      dosageInstructions:
        typeof parsedRaw.dosageInstructions === "string"
          ? parsedRaw.dosageInstructions
          : null,
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
