import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error(
      "OpenAI API key missing: OPENAI_API_KEY is not set in environment (step-image)"
    );
    return NextResponse.json(
      {
        error:
          "OPENAI_API_KEY ist nicht konfiguriert (Bitte .env.local oder Vercel-Environment prüfen)",
      },
      { status: 500 }
    );
  }

  try {
    const body = (await request.json()) as {
      prompt?: string;
    };

    const prompt =
      typeof body.prompt === "string" ? body.prompt.trim() : "";

    if (!prompt) {
      return NextResponse.json(
        { error: "prompt ist erforderlich" },
        { status: 400 }
      );
    }

    const response = await fetch(
      "https://api.openai.com/v1/images/generations",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-image-1",
          prompt,
          size: "1024x1024",
          n: 1,
          response_format: "b64_json",
        }),
      }
    );

    if (!response.ok) {
      let details = "";
      try {
        details = await response.text();
      } catch {
        details = "";
      }
      console.error("OpenAI image generation failed", {
        status: response.status,
        statusText: response.statusText,
        details,
      });
      return NextResponse.json(
        {
          error: `OpenAI Bild-API Fehler: ${response.statusText} (Status: ${response.status})`,
        },
        { status: 500 }
      );
    }

    const payload = (await response.json()) as {
      data?: { url?: string; b64_json?: string }[];
    };

    const b64 = payload.data?.[0]?.b64_json;

    if (!b64) {
      console.error(
        "OpenAI image generation response missing b64_json",
        payload
      );
      return NextResponse.json(
        {
          error:
            "Antwort von OpenAI Bild-API enthielt keine Bild-Daten.",
        },
        { status: 500 }
      );
    }

    const imageUrl = `data:image/png;base64,${b64}`;

    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error("Unexpected error in /api/step-image POST", error);
    const message =
      error instanceof Error ? error.message : "Unbekannter Fehler";
    return NextResponse.json(
      {
        error: `Unerwarteter Fehler bei der KI-Bildgenerierung: ${message}`,
      },
      { status: 500 }
    );
  }
}
