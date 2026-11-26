import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { question, item, history = [] } = await req.json();

    if (!question || !item) {
      return NextResponse.json(
        { error: "Se requiere question e item" },
        { status: 400 }
      );
    }

    const q = question.toLowerCase();
    let answer =
      "Puedo ayudarte con filtros, códigos de error y mantenimiento de tu equipo.";

    if (q.includes("filtro")) {
      answer = `Para limpiar los filtros de tu ${item.brand || ""} ${item.model}:\n\n1. Apaga y desconecta el equipo.\n2. Abre la tapa frontal.\n3. Retira los filtros.\n4. Lava con agua tibia (máx 40°C).\n5. Deja secar a la sombra.\n6. Vuelve a colocar.\n\nSe recomienda cada 2-3 meses.`;
    } else if (q.includes("error") || /e\d+/i.test(q)) {
      answer = `Sobre códigos de error en tu ${item.model}:\n\n1. Anota el código exacto.\n2. Apaga 5-10 minutos y vuelve a encender.\n3. Si persiste, consulta el manual o servicio técnico autorizado.`;
    }

    return NextResponse.json({
      answer,
      confidence: 0.5,
      source: "fallback",
    });
  } catch (error) {
    console.error("[chat]", error);
    return NextResponse.json(
      { error: "Error al procesar la pregunta" },
      { status: 500 }
    );
  }
}
