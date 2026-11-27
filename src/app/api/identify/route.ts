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
          detail: String(apiErr?.message || apiErr).slice(0, 600),
          hint:
            "Gemini está saturado o la key no tiene cuota. Espera 1 minuto y reintenta, o genera otra key en aistudio.google.com/apikey.",
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

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function identifyWithGemini(image: string, apiKey: string) {
  const { mime, data } = extractBase64(image);

  if (data.length > 3_500_000) {
    throw new Error("Imagen demasiado grande. Acerca más la cámara a la etiqueta.");
  }

  const prompt = `Eres un técnico de mantenimiento. Analiza la FOTO DE LA ETIQUETA del electrodoméstico.
Extrae marca, modelo, serie y tipo de aparato.
Además, según el tipo de aparato, indica qué fallos son más comunes y qué revisiones conviene hacer YA.
Responde SOLO JSON válido sin markdown:
{
  "success": true,
  "brand": "marca o null",
  "model": "modelo o null",
  "serialNumber": "serie o null",
  "category": "hvac|appliance|electronics|tool|other",
  "confidence": 0.0,
  "suggestedName": "nombre corto",
  "rawText": "texto leído de la etiqueta",
  "deviceType": "ej: refrigerador, lavadora, aire acondicionado",
  "suggestedMaintenance": [
    {"title": "tarea", "frequencyDays": 90, "estimatedMinutes": 15, "isCritical": true, "why": "por qué importa"}
  ],
  "commonFailures": [
    {"issue": "fallo típico", "symptoms": "síntomas", "prevention": "cómo evitarlo"}
  ],
  "suggestedConsumables": [
    {"name": "repuesto", "estimatedLifespanDays": 90, "notes": "nota"}
  ]
}
Si no lees un campo usa null. Sé concreto con el texto de la etiqueta.`;

  // Modelos más estables primero; 3.8 al final (a menudo saturado)
  const models = [
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
    "gemini-3.8-flash",
  ];

  let lastErr = "";

  for (const model of models) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 16000);
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
              generationConfig: { temperature: 0.1, maxOutputTokens: 1200 },
            }),
            signal: controller.signal,
          }
        );
        clearTimeout(timer);

        const textBody = await res.text();

        if (res.status === 503 || res.status === 429) {
          lastErr = `${model}: HTTP ${res.status} (saturado/límite)`;
          await sleep(800 * attempt);
          continue;
        }

        if (!res.ok) {
          lastErr = `${model}: HTTP ${res.status} ${textBody.slice(0, 220)}`;
          break; // siguiente modelo
        }

        const json = JSON.parse(textBody);
        const content =
          json.candidates?.[0]?.content?.parts
            ?.map((p: any) => p.text || "")
            .join("") || "";

        if (!content) {
          lastErr = `${model}: respuesta vacía`;
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
        await sleep(400);
      }
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
      confidence: 0.3,
      suggestedName: "Objeto (revisar manualmente)",
      rawText: text.slice(0, 500),
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
    brand: "Daikin",
    model: "FTXC35C",
    serialNumber: "A123456789",
    category: "hvac",
    confidence: 0.91,
    suggestedName: "Aire Acondicionado Daikin FTXC35C",
    rawText: "DAIKIN MODEL: FTXC35C",
    deviceType: "aire acondicionado",
    suggestedMaintenance: [
      {
        title: "Limpiar filtros",
        frequencyDays: 90,
        estimatedMinutes: 10,
        isCritical: true,
        why: "Filtros sucios bajan eficiencia y pueden dañar el compresor",
      },
    ],
    commonFailures: [
      {
        issue: "No enfría bien",
        symptoms: "Aire tibio, hielo en tuberías",
        prevention: "Limpiar filtros y revisar gas",
      },
    ],
    suggestedConsumables: [],
    source: "demo",
    note: "Modo demo: falta GEMINI_API_KEY en Vercel.",
  };
}
