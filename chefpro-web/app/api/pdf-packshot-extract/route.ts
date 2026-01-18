import { NextResponse } from "next/server";

export async function POST(request: Request) {
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
    const { dataUrl, width, height, strict } = (await request.json()) as {
      dataUrl?: string;
      width?: number;
      height?: number;
      strict?: boolean;
    };
    if (
      typeof dataUrl !== "string" ||
      !dataUrl.startsWith("data:image/") ||
      !Number.isFinite(width as number) ||
      !Number.isFinite(height as number)
    ) {
      return NextResponse.json(
        { error: "Ungültige Eingabe (dataUrl, width, height erforderlich)." },
        { status: 400 }
      );
    }
    const basePrompt =
      "Du bekommst eine Vorschau einer PDF-Seite eines Produktdatenblatts als Bild. Finde die deutlichste Produktabbildung (Packshot) und gib ein enges Rechteck (Bounding Box) dafür zurück. Antworte als JSON mit den Feldern: bbox: { x: number, y: number, w: number, h: number }, confidence: number zwischen 0 und 1. Koordinaten sind Pixel relativ zum gelieferten Bild (0,0 oben links). Bevorzuge fotografische Inhalte eines Packshots, nicht Logos oder Tabellen.";
    const strictPrompt =
      "Zusätzliche Bedingungen: Die Bounding Box darf nicht die ganze Seite umfassen und nicht kleiner als 5% der Seitenfläche sein. Zielbereich zwischen 5% und 60% der Gesamtfläche. Vermeide Textblöcke, Tabellen und reine Logos. Wenn kein Packshot sicher erkennbar ist, gib eine Bounding Box für das größte plausible Bild im Layout zurück.";
    const systemPrompt = strict ? `${basePrompt} ${strictPrompt}` : basePrompt;
    const userText = `Bildgröße: ${width}x${height} Pixel. Liefere nur bbox als JSON.`;
    const messages = [
      { role: "system" as const, content: systemPrompt },
      {
        role: "user" as const,
        content: [
          { type: "text" as const, text: userText },
          {
            type: "image_url" as const,
            image_url: { url: dataUrl },
          },
        ],
      },
    ];
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        temperature: 0.2,
        messages,
      }),
    });
    if (!response.ok) {
      let details = "";
      try {
        details = await response.text();
      } catch {
        details = "";
      }
      return NextResponse.json(
        { error: `OpenAI Vision Fehler: ${response.statusText}`, details },
        { status: 500 }
      );
    }
    const completion = (await response.json()) as {
      choices: { message: { content: string | null } }[];
    };
    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "Leere Antwort von OpenAI Vision." },
        { status: 500 }
      );
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: "Antwort konnte nicht als JSON gelesen werden." },
        { status: 500 }
      );
    }
    const bbox = (parsed as {
      bbox?: { x: number; y: number; w: number; h: number };
      confidence?: number;
    }).bbox;
    const confidence = (parsed as { confidence?: number }).confidence ?? 0.5;
    if (
      !bbox ||
      !Number.isFinite(bbox.x) ||
      !Number.isFinite(bbox.y) ||
      !Number.isFinite(bbox.w) ||
      !Number.isFinite(bbox.h)
    ) {
      return NextResponse.json(
        {
          bbox: { x: 0, y: 0, w: width as number, h: height as number },
        },
        { status: 200 }
      );
    }
    return NextResponse.json({ bbox, confidence }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unbekannter Fehler";
    return NextResponse.json(
      { error: `Unerwarteter Fehler: ${message}` },
      { status: 500 }
    );
  }
}
