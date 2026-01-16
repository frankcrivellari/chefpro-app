import { NextResponse } from "next/server";

type ParsedItem = {
  name: string;
  unit: string;
  quantity: number;
  purchase_price: number;
  calculated_price_per_unit: number;
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
              content:
                "Du extrahierst strukturierte Einkaufsdaten für eine Küchen-Software. Antworte immer als JSON-Objekt mit den Feldern: name (string), unit (string), quantity (number), purchase_price (number), calculated_price_per_unit (number). Die Währung ist immer EUR und muss nicht angegeben werden. quantity ist die Menge in unit, für die der Gesamtpreis gilt. purchase_price ist der Gesamtpreis. calculated_price_per_unit ist purchase_price / quantity, auf zwei Nachkommastellen gerundet.",
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

    let parsed: ParsedItem;

    try {
      parsed = JSON.parse(content) as ParsedItem;
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
      !parsed.name ||
      !parsed.unit ||
      typeof parsed.quantity !== "number" ||
      typeof parsed.purchase_price !== "number"
    ) {
      console.error("Antwort von OpenAI ist unvollständig", parsed);
      return NextResponse.json(
        { error: "Antwort von OpenAI ist unvollständig" },
        { status: 500 }
      );
    }

    const quantity =
      parsed.quantity > 0 ? parsed.quantity : 1;

    const purchasePrice =
      parsed.purchase_price >= 0 ? parsed.purchase_price : 0;

    const calculated =
      quantity > 0 ? purchasePrice / quantity : 0;

    const normalized: ParsedItem = {
      name: parsed.name,
      unit: parsed.unit,
      quantity,
      purchase_price: purchasePrice,
      calculated_price_per_unit: Number(
        calculated.toFixed(2)
      ),
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
