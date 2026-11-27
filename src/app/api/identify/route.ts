import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image } = body;

    if (!image || typeof image !== "string") {
      return NextResponse.json(
        { error: "Se requiere la imagen en base64 (campo image)" },
        { status: 400 }
      );
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json(demoResult());
    }

    try {
      const result = await identifyWithGemini(image, geminiKey);
      return NextResponse.json(result);
    } catch (apiErr: any) {
      console.error("[identify] API error:", apiErr?.message || apiErr);
      return NextResponse.json(
        {
          error: "Error al procesar la imagen",
          detail: String(apiErr?.message || apiErr).slice(0, 500),
          hint:
            "Revisa GEMINI_API_KEY en Vercel (aistudio.google.com/apikey) y Redeploy.",
        },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("[identify]", error);
    return NextResponse.json(
      { error: "Error al procesar la imagen", detail: String(error) },
      { status: 500 }
    );
  }
}

function extractBase64(image: string): { mime: string; data: string } {
  const m = image.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
  if (m) return { mime: m[1], data: m[2] };
  return { mime: "image/jpeg", data: image.replace(/^data:.*?;base64,/, "") };
}

async function identifyWithGemini(image: string, apiKey: string) {
  const { mime, data } = extractBase64(image);

  if (data.length > 4_000_000) {
    throw new Error("Imagen demasiado grande. Usa una foto más cercana/ligera.");
  }

  const prompt = `Eres un experto en identificar electrodomésticos a partir de la etiqueta.
Responde SOLO con JSON válido (sin markdown):
{"success":true,"brand":"marca o null","model":"modelo o null","serialNumber":"serie o null","category":"hvac|appliance|electronics|tool|other","confidence":0.0,"suggestedName":"nombre corto","rawText":"texto leído","suggestedMaintenance":[{"title":"...","frequencyDays":90,"estimatedMinutes":10,"isCritical":true}],"suggestedConsumables":[{"name":"...","estimatedLifespanDays":90,"notes":"..."}]}
Si no lees algo usa null.`;

  const models = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-3.8-flash"];
  let lastErr = "";

  for (const model of models) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 18000);
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  { inline_data: { mime_type: mime, data } },
                ],
              },
            ],
            generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
          }),
          signal: controller.signal,
        }
      );
      clearTimeout(timer);

      const textBody = await res.text();
      if (!res.ok) {
        lastErr = `${model}: HTTP ${res.status} ${textBody.slice(0, 250)}`;
        continue;
      }

      const json = JSON.parse(textBody);
      const content =
        json.candidates?.[0]?.content?.parts
          ?.map((p: any) => p.text || "")
          .join("") || "";
      if (!content) {
        lastErr = `${model}: respuesta vacía`;
        continue;
      }
      return {
        ...parseModelJson(content),
        source: "vision",
        modelUsed: model,
        provider: "gemini",
      };
    } catch (e: any) {
      clearTimeout(timer);
      lastErr =
        e?.name === "AbortError"
          ? `${model}: timeout (18s)`
          : `${model}: ${e.message}`;
      continue;
    }
  }

  throw new Error(lastErr || "Gemini no respondió");
}

function parseModelJson(text: string) {
  try {
    const cleaned = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const parsed = JSON.parse(cleaned);
    return {
      success: true,
      brand: parsed.brand || null,
      model: parsed.model || "Desconocido",
      serialNumber: parsed.serialNumber || null,
      category: parsed.category || "other",
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.7,
      suggestedName:
        parsed.suggestedName ||
        [parsed.brand, parsed.model].filter(Boolean).join(" ") ||
        "Objeto identificado",
      rawText: parsed.rawText || "",
      suggestedMaintenance: Array.isArray(parsed.suggestedMaintenance)
        ? parsed.suggestedMaintenance
        : [
            {
              title: "Revisión general",
              frequencyDays: 180,
              estimatedMinutes: 15,
              isCritical: false,
            },
          ],
      suggestedConsumables: Array.isArray(parsed.suggestedConsumables)
        ? parsed.suggestedConsumables
        : [],
    };
  } catch {
    return {
      success: true,
      brand: null,
      model: "Desconocido",
      serialNumber: null,
      category: "other",
      confidence: 0.3,
      suggestedName: "Objeto (revisar manualmente)",
      rawText: text.slice(0, 500),
      suggestedMaintenance: [],
      suggestedConsumables: [],
    };
  }
}

function demoResult() {
  return {
    success: true,
    brand: "Daikin",
    model: "FTXC35C",
    serialNumber: "A123456789",
    category: "hvac",
    confidence: 0.91,
    suggestedName: "Aire Acondicionado Daikin FTXC35C",
    rawText: "DAIKIN MODEL: FTXC35C",
    suggestedMaintenance: [
      {
        title: "Limpiar filtros",
        frequencyDays: 90,
        estimatedMinutes: 10,
        isCritical: true,
      },
    ],
    suggestedConsumables: [],
    source: "demo",
    note: "Modo demo: falta GEMINI_API_KEY en Vercel.",
  };
}
