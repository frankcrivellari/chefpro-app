import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY ist nicht konfiguriert" },
      { status: 500 }
    );
  }

  try {
    const { url } = (await request.json()) as { url?: string };

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URL ist erforderlich" },
        { status: 400 }
      );
    }

    // 1. Web Scraping
    let htmlContent = "";
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      htmlContent = await response.text();
    } catch (fetchError) {
      console.error("Error fetching URL:", fetchError);
      return NextResponse.json(
        {
          error: `Fehler beim Abrufen der URL: ${
            fetchError instanceof Error ? fetchError.message : "Unbekannter Fehler"
          }`,
        },
        { status: 400 }
      );
    }

    // 2. Simple text extraction (stripping HTML)
    // Remove scripts and styles
    let textContent = htmlContent.replace(
      /<script\b[^>]*>[\s\S]*?<\/script>/gim,
      ""
    );
    textContent = textContent.replace(
      /<style\b[^>]*>[\s\S]*?<\/style>/gim,
      ""
    );
    // Remove HTML tags
    textContent = textContent.replace(/<[^>]+>/g, "\n");
    // Decode HTML entities (basic ones)
    textContent = textContent
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"');
    // Normalize whitespace
    textContent = textContent.replace(/\s+/g, " ").trim();

    // Limit text length to avoid token limits (e.g., 15000 chars should be enough for product details)
    const limitedText = textContent.slice(0, 15000);

    // 3. Generic AI Extraction
    const systemPrompt = `
Du bist ein Experte für Lebensmittdaten und Inventur.
Deine Aufgabe ist es, den Inhalt einer Webseite zu analysieren und alle Informationen zu extrahieren, die zu den Stammdaten-Feldern eines Lebensmittel-Artikels passen.

Extrahiere so viele relevante Informationen wie möglich.
Gib der KI keine feste Liste an Feldern vor, aber orientiere dich an typischen Feldern wie:
- Artikelbezeichnung (name) - OHNE Aggregatzustände wie 'Pulver', 'Granulat' etc., es sei denn Teil des offiziellen Namens.
- Marke (brand)
- Menge/Einheit (quantity, unit)
- Einkaufspreis (purchase_price)
- Nährwerte pro 100g (nutrition_per_100: { energy_kcal, fat, saturated_fat, carbs, sugar, protein, salt })
- Allergene (allergens: string[])
- Zutaten (ingredients: string)
- Dosierung (dosage_instructions, standard_preparation)
- Hersteller-Info (manufacturer_article_number, ean)
- Boolean Flags (is_bio, is_vegan, is_gluten_free, is_lactose_free, etc.)
- Warengruppe (warengruppe)
- Lagerbereich (storageArea)

Antworte ausschließlich mit einem validen JSON-Objekt.
Strukturiere das JSON flach wo möglich, aber nutze verschachtelte Objekte für 'nutrition_per_100' oder 'standard_preparation' wenn sinnvoll.
Versuche, die Keys so zu benennen, wie sie in einer Datenbank üblich wären (snake_case oder camelCase).
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
              content: `URL: ${url}\n\nWebseiten-Inhalt:\n${limitedText}`,
            },
          ],
        }),
      }
    );

    if (!completionResponse.ok) {
      throw new Error(`OpenAI API error: ${completionResponse.statusText}`);
    }

    const completionJson = await completionResponse.json();
    const content = completionJson.choices[0]?.message?.content;

    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    const extractedData = JSON.parse(content);

    return NextResponse.json({ extracted: extractedData });
  } catch (error) {
    console.error("AI Web Scan Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Ein unerwarteter Fehler ist aufgetreten.",
      },
      { status: 500 }
    );
  }
}
