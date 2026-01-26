import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import pdfParse from "pdf-parse";

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY ist nicht konfiguriert" },
      { status: 500 }
    );
  }

  const client = getSupabaseServerClient();
  const STORAGE_BUCKET = "product-documents";

  try {
    const { url } = (await request.json()) as { url?: string };

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URL ist erforderlich" },
        { status: 400 }
      );
    }

    // 1. Fetch URL
    let fetchResponse: Response;
    try {
      fetchResponse = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });
      if (!fetchResponse.ok) {
        throw new Error(`HTTP error! status: ${fetchResponse.status}`);
      }
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

    const contentType = fetchResponse.headers.get("content-type") || "";
    let extractedText = "";
    let publicFileUrl: string | null = null;

    // 2. Handle Content Type
    if (contentType.includes("application/pdf")) {
      // PDF Handling
      const arrayBuffer = await fetchResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Upload to Supabase Storage if client is available
      if (client) {
        const filename = `web-scan-${Date.now()}.pdf`;
        const { data, error: uploadError } = await client.storage
          .from(STORAGE_BUCKET)
          .upload(filename, buffer, {
            contentType: "application/pdf",
            upsert: false,
          });

        if (!uploadError) {
          const { data: publicUrlData } = client.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(filename);
          publicFileUrl = publicUrlData.publicUrl;
        } else {
          console.error("Supabase Upload Error:", uploadError);
        }
      }

      // Extract text from PDF
      try {
        const pdfData = await pdfParse(buffer);
        extractedText = pdfData.text;
      } catch (pdfError) {
        console.error("PDF Parse Error:", pdfError);
        return NextResponse.json(
          { error: "Fehler beim Lesen der PDF-Datei" },
          { status: 500 }
        );
      }
    } else {
      // HTML Handling
      const htmlContent = await fetchResponse.text();

      // Improve HTML text extraction
      let textContent = htmlContent
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gim, "")
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gim, "")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n")
        .replace(/<\/div>/gi, "\n")
        .replace(/<\/tr>/gi, "\n")
        .replace(/<\/li>/gi, "\n")
        .replace(/<td[^>]*>/gi, " | ")
        .replace(/<\/td>/gi, "")
        .replace(/<[^>]+>/g, " ");

      // Decode entities
      textContent = textContent
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"');

      // Normalize whitespace
      extractedText = textContent.replace(/\s+/g, " ").trim();
    }

    // Limit text length
    const limitedText = extractedText.slice(0, 25000); // Increased limit for better context

    // 3. AI Extraction
    const systemPrompt = `
Du bist ein Experte für Lebensmitteldaten und Inventur.
Deine Aufgabe ist es, den Inhalt eines Dokuments (Webseite oder PDF-Text) zu analysieren und strukturierte Daten für einen Lebensmittel-Artikel zu extrahieren.

Antworte immer als JSON-Objekt.

WICHTIG: Das Feld 'name' ist das allerwichtigste Feld. Es MUSS immer einen Wert enthalten (String). Wenn du den exakten Namen nicht findest, generiere einen passenden Namen basierend auf dem Inhalt.
Füge ein Feld 'debug_reasoning' (string) hinzu, in dem du beschreibst, welche Hinweise du im Text gefunden hast, die auf Eigenschaften wie Bio, Vegan, Glutenfrei etc. hinweisen. Begründe kurz deine Entscheidung für jedes Boolean-Flag.

Ordne das Produkt zwingend einer 'warengruppe' (Obst & Gemüse, Molkerei & Eier, Trockensortiment, Getränke, Zusatz- & Hilfsstoffe) und einem 'storageArea' (Frischwaren, Kühlwaren, Tiefkühlwaren, Trockenwaren, Non Food) zu. NULL ist NICHT ERLAUBT. Falls unsicher, nutze 'Trockensortiment' / 'Trockenwaren'.
Bestimme auch den Aggregatzustand des Produkts (Pulver, Granulat, Paste, Flüssigkeit).

Die erwarteten Felder sind:
- name (PFLICHT!)
- brand (string)
- unit (string) - WICHTIG: Muss Menge UND Einheit enthalten (z.B. '500g', '1kg', '10 Liter'). Suche explizit nach Nettofüllmengen oder Abtropfgewichten und verwende diese (z.B. '400g Abtropfgewicht').
- purchase_price (number)
- allergens (array of strings)
- ingredients (string)
- dosage_instructions (string) - Mischverhältnisse/Basismengen
- standard_preparation (object) - Strukturierte Dosierung: { components: [{ name: string, quantity: number, unit: string }] }
- yield_info (string) - Ergiebigkeit
- preparation_steps (string)
- nutrition_per_100 (object) - { energy_kcal, fat, saturated_fat, carbs, sugar, protein, salt, fiber, sodium, bread_units, cholesterol }
- manufacturer_article_number (string)
- ean (string)
- is_bio (boolean)
- bio_control_number (string)
- is_deklarationsfrei, is_allergenfrei, is_cook_chill, is_freeze_thaw_stable, is_palm_oil_free, is_yeast_free, is_lactose_free, is_gluten_free, is_vegan, is_vegetarian, is_fairtrade (booleans)
- is_powder, is_granulate, is_paste, is_liquid (booleans)
- warengruppe (string)
- storageArea (string)

WICHTIG: Das Feld 'name' muss die reine Artikelbezeichnung sein und darf KEINE Zusätze wie 'Pulver', 'Granulat', 'Paste' oder 'Flüssigkeit' enthalten, es sei denn, sie sind fester Bestandteil des offiziellen Produktnamens.
nutrition_per_100 beschreibt die Nährwerte pro 100 g bzw. 100 ml.
Für die erste Komponente der 'standard_preparation' (die das Produkt selbst darstellt), verwende immer den Artikelnamen plus Aggregatzustand (z.B. 'Mousse au Chocolat Pulver').
VERBOTEN: {name: 'Produkt', ...} -> KORREKT: {name: 'Mousse au Chocolat Pulver', ...}
Das Wort 'Produkt' ist als Komponenten-Name STRENGSTENS VERBOTEN.
Suche explizit nach ALLEN weiteren Zutaten für die Zubereitung (z.B. Milch, Sahne, Wasser) und füge diese als eigene Komponenten hinzu. Es dürfen keine Zutaten fehlen!
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
          model: "gpt-4o",
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: `Analysiere diesen Text und extrahiere die Daten:\n\nURL: ${url}\n\nInhalt:\n${limitedText}`,
            },
          ],
        }),
      }
    );

    if (!completionResponse.ok) {
      const errorText = await completionResponse.text();
      throw new Error(`OpenAI API error: ${completionResponse.status} ${completionResponse.statusText} - ${errorText}`);
    }

    const completionJson = await completionResponse.json();
    let content = completionJson.choices[0]?.message?.content;

    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    // Markdown Cleanup (analog zu document-vision-upload)
    content = content.replace(/```json\s*/g, "").replace(/```\s*$/g, "");

    let extractedData;
    try {
      extractedData = JSON.parse(content);
      if (!extractedData.warengruppe) extractedData.warengruppe = "Trockensortiment";
      if (!extractedData.storageArea) extractedData.storageArea = "Trockenwaren";
    } catch (e) {
      console.error("JSON Parse Error:", e);
      console.error("Raw Content:", content);
      throw new Error("Fehler beim Verarbeiten der KI-Antwort (ungültiges JSON).");
    }

    return NextResponse.json({
      extracted: extractedData,
      fileUrl: publicFileUrl,
    });
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
