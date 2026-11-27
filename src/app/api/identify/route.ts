import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image } = body;

    if (!image || typeof image !== "string") {
      return NextResponse.json(
        { error: "Se requiere la imagen" },
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
      const detail = String(apiErr?.message || apiErr).slice(0, 600);
      console.error("[identify]", detail);
      return NextResponse.json(
        {
          error: "No se pudo leer la etiqueta con IA ahora",
          detail,
          allowManual: true,
          hint: "Gemini está saturado o lento. Puedes Reintentar en 1 min o introducir marca y modelo a mano.",
        },
        { status: 502 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Error interno", detail: String(error), allowManual: true },
      { status: 500 }
    );
  }
}

function extractBase64(image: string): { mime: string; data: string } {
  const m = image.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
  if (m) return { mime: m[1], data: m[2] };
  return { mime: "image/jpeg", data: image.replace(/^data:.*?;base64,/, "") };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function identifyWithGemini(image: string, apiKey: string) {
  const { mime, data } = extractBase64(image);
  if (data.length > 3_000_000) {
    throw new Error("Foto muy pesada. Acerca más a la etiqueta y vuelve a intentar.");
  }

  const prompt = `Analiza esta etiqueta de electrodoméstico. Responde SOLO JSON válido sin markdown:
{"success":true,"brand":"marca o null","model":"modelo o null","serialNumber":"serie o null","category":"hvac|appliance|electronics|tool|other","confidence":0.85,"suggestedName":"nombre corto","rawText":"texto de la etiqueta","deviceType":"tipo de aparato","suggestedMaintenance":[{"title":"tarea","frequencyDays":90,"estimatedMinutes":15,"isCritical":true,"why":"motivo"}],"commonFailures":[{"issue":"fallo típico","symptoms":"síntomas","prevention":"prevención"}],"suggestedConsumables":[{"name":"repuesto","estimatedLifespanDays":90,"notes":"nota"}]}
Sé preciso con marca y modelo legibles en la foto.`;

  // Solo modelos flash estables; varios reintentos ante 503
  const models = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.0-flash-lite"];
  let lastErr = "";

  for (const model of models) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20000);
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
        });
        clearTimeout(timer);
        const textBody = await res.text();

        if (res.status === 503 || res.status === 429) {
          lastErr = `${model} intento ${attempt}: HTTP ${res.status} saturado`;
          await sleep(1500 * attempt);
          continue;
        }
        if (!res.ok) {
          lastErr = `${model}: HTTP ${res.status} ${textBody.slice(0, 200)}`;
          break;
        }

        const json = JSON.parse(textBody);
        const content =
          json.candidates?.[0]?.content?.parts
            ?.map((p: any) => p.text || "")
            .join("") || "";
        if (!content) {
          lastErr = `${model}: vacío`;
          break;
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
            ? `${model}: timeout`
            : `${model}: ${e.message}`;
        await sleep(1000 * attempt);
      }
    }
  }
  throw new Error(lastErr || "Gemini no disponible");
}

function parseModelJson(text: string) {
  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
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
      deviceType: parsed.deviceType || null,
      suggestedMaintenance: Array.isArray(parsed.suggestedMaintenance)
        ? parsed.suggestedMaintenance
        : [],
      commonFailures: Array.isArray(parsed.commonFailures)
        ? parsed.commonFailures
        : [],
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
      confidence: 0.25,
      suggestedName: "Objeto (revisar)",
      rawText: text.slice(0, 400),
      deviceType: null,
      suggestedMaintenance: [],
      commonFailures: [],
      suggestedConsumables: [],
    };
  }
}

function demoResult() {
  return {
    success: true,
    brand: "Demo",
    model: "N/A",
    serialNumber: null,
    category: "other",
    confidence: 0.5,
    suggestedName: "Objeto de demostración",
    rawText: "",
    deviceType: null,
    suggestedMaintenance: [],
    commonFailures: [],
    suggestedConsumables: [],
    source: "demo",
    note: "Falta GEMINI_API_KEY",
  };
}
