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
Deine Aufgabe ist es, den Inhalt eines Dokuments (Webseite oder PDF) zu analysieren und strukturierte Daten für einen Lebensmittel-Artikel zu extrahieren.

Extrahiere ALLE relevanten Informationen. Sei gründlich.
Suche gezielt nach:
- Artikelbezeichnung (name) - OHNE 'Pulver', 'Granulat' etc. im Namen (außer fester Bestandteil).
- Marke (brand)
- Menge/Einheit (quantity, unit) - z.B. "1 kg", "500 ml".
- Einkaufspreis (purchase_price) - Falls verfügbar.
- Nährwerte (nutrition_per_100) - SEHR WICHTIG! Suche nach Tabellen oder Listen mit Energy, Fat, Carbs, Protein, Salt etc.
- Allergene (allergens) - Liste aller Allergene.
- Zutaten (ingredients) - Vollständige Zutatenliste.
- Dosierung (dosage_instructions, standard_preparation) - z.B. "50g auf 1L Wasser".
- Hersteller-Info (manufacturer_article_number, ean).
- Boolean Flags (is_bio, is_vegan, is_gluten_free, etc.) - Suche nach Hinweisen im Text.
- Warengruppe & Lagerbereich.

Antworte ausschließlich mit einem validen JSON-Objekt.
JSON Struktur:
{
  "name": string,
  "brand": string,
  "unit": string, // z.B. "kg", "l", "stk"
  "purchase_price": number,
  "manufacturer_article_number": string,
  "ean": string,
  "ingredients": string,
  "allergens": string[],
  "dosage_instructions": string,
  "standard_preparation": string | object,
  "warengruppe": string, // "Obst & Gemüse", "Molkerei & Eier", "Trockensortiment", "Getränke", "Zusatz- & Hilfsstoffe"
  "storageArea": string, // "Frischwaren", "Kühlwaren", "Tiefkühlwaren", "Trockenwaren"
  "is_bio": boolean,
  "is_vegan": boolean,
  "is_gluten_free": boolean,
  "is_lactose_free": boolean,
  "is_vegetarian": boolean,
  "is_powder": boolean,
  "is_granulate": boolean,
  "is_paste": boolean,
  "is_liquid": boolean,
  "nutrition_per_100": {
    "energy_kcal": number,
    "fat": number,
    "saturated_fat": number,
    "carbs": number,
    "sugar": number,
    "protein": number,
    "salt": number,
    "fiber": number,
    "sodium": number
  }
}
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
              content: `URL: ${url}\n\nInhalt:\n${limitedText}`,
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

    return NextResponse.json({ 
      extracted: extractedData,
      fileUrl: publicFileUrl 
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
