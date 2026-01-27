import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API Key nicht konfiguriert" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { name, dosageInstructions, standardPreparation } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Produktname ist erforderlich" },
        { status: 400 }
      );
    }

    const systemPrompt = `Du bist ein erfahrener Küchenchef und Experte für Großküchentechnik und Prozessoptimierung.
Deine Aufgabe ist es, basierend auf einem Produktnamen und (falls vorhanden) Dosierungs-/Zubereitungsinformationen realistische Produktionsparameter zu schätzen.
Antworte IMMER als valides JSON-Objekt.

Du sollst folgende Werte für eine "Produktion & Ressourcen"-Matrix schätzen:
1. device: Ein geeignetes Gerät (z.B. "Rational iCombi Pro", "KitchenAid", "Kippbratpfanne", "Kochkessel").
2. settings: Programm oder Einstellung (z.B. "Dämpfen 100°C", "Rührwerk Stufe 2", "Anbraten").
3. time: Dauer in Minuten (als String, z.B. "15" oder "45-60").
4. energy: Geschätzter Energieverbrauch in kWh (als String, z.B. "0.5" oder "2.4").
5. water: Geschätzter Wasserverbrauch in Litern (als String, z.B. "0" oder "5").
6. outputYield: Geschätzte Reichweite/Ausbeute (z.B. "5 GN-Behälter", "ca. 50 Portionen").
7. cleaningEffort: Reinigungsaufwand (z.B. "Spülmaschine", "Manuelle Vorreinigung nötig").

Gib realistische Durchschnittswerte an. Wenn keine genauen Daten vorliegen, schätze basierend auf Standard-Prozessen für dieses Produkt.`;

    const userPrompt = `Produkt: ${name}
Dosierung: ${dosageInstructions || "Keine Angabe"}
Zubereitung: ${JSON.stringify(standardPreparation) || "Keine Angabe"}

Erstelle eine Prognose für die Produktionsparameter.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `OpenAI Fehler: ${response.statusText}`, details: errorText },
        { status: 500 }
      );
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const parsed = JSON.parse(content);

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Fehler bei der KI-Prognose:", error);
    return NextResponse.json(
      { error: "Interner Server-Fehler bei der KI-Verarbeitung" },
      { status: 500 }
    );
  }
}
