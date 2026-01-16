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
    return NextResponse.json(
      { error: "OPENAI_API_KEY ist nicht konfiguriert" },
      { status: 500 }
    );
  }

  const body = (await request.json()) as {
    text: string;
  };

  if (!body.text || !body.text.trim()) {
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
    return NextResponse.json(
      { error: "Fehler bei der Kommunikation mit OpenAI" },
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
    return NextResponse.json(
      { error: "Leere Antwort von OpenAI" },
      { status: 500 }
    );
  }

  let parsed: ParsedItem;

  try {
    parsed = JSON.parse(content) as ParsedItem;
  } catch {
    return NextResponse.json(
      { error: "Antwort von OpenAI konnte nicht als JSON gelesen werden" },
      { status: 500 }
    );
  }

  if (
    !parsed.name ||
    !parsed.unit ||
    typeof parsed.quantity !== "number" ||
    typeof parsed.purchase_price !== "number"
  ) {
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
}

