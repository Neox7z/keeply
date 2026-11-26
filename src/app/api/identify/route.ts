import { NextRequest, NextResponse } from "next/server";

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

    const xaiKey = process.env.XAI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!xaiKey && !openaiKey) {
      return NextResponse.json(demoResult());
    }

    try {
      const result = await identifyWithVision(image, xaiKey, openaiKey);
      return NextResponse.json(result);
    } catch (apiErr: any) {
      console.error("[identify] API error:", apiErr?.message || apiErr);
      return NextResponse.json(
        {
          error: "Error al procesar la imagen",
          detail: String(apiErr?.message || apiErr).slice(0, 400),
          hint:
            "Revisa que XAI_API_KEY sea una API key válida de console.x.ai (suele empezar por xai-), que haya crédito y Redeploy tras guardar.",
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

async function identifyWithVision(
  image: string,
  xaiKey?: string,
  openaiKey?: string
) {
  const systemPrompt = `Eres un experto en identificar electrodomésticos y equipos a partir de la etiqueta del fabricante.
Analiza la imagen de la etiqueta y extrae TODOS los datos visibles.
Responde SOLO con un JSON válido, sin markdown ni texto extra:
{
  "success": true,
  "brand": "marca o null",
  "model": "modelo o null",
  "serialNumber": "número de serie o null",
  "category": "hvac|appliance|electronics|tool|other",
  "confidence": 0.0 a 1.0,
  "suggestedName": "nombre corto para el inventario",
  "rawText": "texto completo leído de la etiqueta",
  "suggestedMaintenance": [
    { "title": "...", "frequencyDays": 90, "estimatedMinutes": 10, "isCritical": true }
  ],
  "suggestedConsumables": [
    { "name": "...", "estimatedLifespanDays": 90, "notes": "..." }
  ]
}
Si no puedes leer algo, usa null. Sé preciso con marca y modelo.`;

  const imageUrl = image.startsWith("data:")
    ? image
    : `data:image/jpeg;base64,${image}`;

  const userContent = [
    {
      type: "text",
      text: "Identifica este aparato a partir de la foto de su etiqueta. Extrae marca, modelo y número de serie.",
    },
    { type: "image_url", image_url: { url: imageUrl } },
  ];

  if (xaiKey) {
    const models = ["grok-4.7", "grok-2-vision-1212", "grok-2-vision"];
    let lastErr = "";

    for (const model of models) {
      try {
        const res = await fetch("https://api.x.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${xaiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userContent },
            ],
            temperature: 0.1,
            max_tokens: 1500,
          }),
        });

        const textBody = await res.text();
        if (!res.ok) {
          lastErr = `${model}: HTTP ${res.status} ${textBody.slice(0, 200)}`;
          console.error(lastErr);
          continue;
        }

        const data = JSON.parse(textBody);
        const content = data.choices?.[0]?.message?.content || "";
        const parsed = parseModelJson(content);
        return { ...parsed, source: "vision", modelUsed: model };
      } catch (e: any) {
        lastErr = `${model}: ${e.message}`;
        continue;
      }
    }

    throw new Error(lastErr || "Ningún modelo de visión de xAI respondió");
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      temperature: 0.1,
      max_tokens: 1500,
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }

  const data = await res.json();
  return {
    ...parseModelJson(data.choices?.[0]?.message?.content || ""),
    source: "vision",
    modelUsed: "gpt-4o",
  };
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
      confidence:
        typeof parsed.confidence === "number" ? parsed.confidence : 0.7,
      suggestedName:
        parsed.suggestedName ||
        [parsed.brand, parsed.model].filter(Boolean).join(" ") ||
        "Objeto identificado",
      rawText: parsed.rawText || "",
      suggestedMaintenance: Array.isArray(parsed.suggestedMaintenance)
        ? parsed.suggestedMaintenance
        : defaultMaintenance(parsed.category),
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
      suggestedMaintenance: defaultMaintenance("other"),
      suggestedConsumables: [],
    };
  }
}

function defaultMaintenance(category?: string) {
  if (category === "hvac") {
    return [
      {
        title: "Limpiar filtros de aire",
        frequencyDays: 90,
        estimatedMinutes: 10,
        isCritical: true,
      },
    ];
  }
  if (category === "appliance") {
    return [
      {
        title: "Limpieza / descalcificación",
        frequencyDays: 90,
        estimatedMinutes: 20,
        isCritical: true,
      },
    ];
  }
  return [
    {
      title: "Revisión general",
      frequencyDays: 180,
      estimatedMinutes: 15,
      isCritical: false,
    },
  ];
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
    rawText: "DAIKIN MODEL: FTXC35C SERIAL NO: A123456789",
    suggestedMaintenance: [
      {
        title: "Limpiar filtros de aire",
        frequencyDays: 90,
        estimatedMinutes: 10,
        isCritical: true,
      },
    ],
    suggestedConsumables: [
      {
        name: "Filtro de aire lavable",
        estimatedLifespanDays: 90,
        notes: "Limpiar cada 2-3 meses",
      },
    ],
    source: "demo",
    note: "Modo demo: añade XAI_API_KEY válida en Vercel y haz Redeploy.",
  };
}
