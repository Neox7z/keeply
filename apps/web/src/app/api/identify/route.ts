import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image } = body;

    if (!image) {
      return NextResponse.json(
        { error: "Se requiere la imagen en base64" },
        { status: 400 }
      );
    }

    const result = {
      success: true,
      brand: "Daikin",
      model: "FTXC35C",
      serialNumber: "A123456789",
      category: "hvac",
      confidence: 0.91,
      suggestedName: "Aire Acondicionado Daikin FTXC35C",
      suggestedConsumables: [
        {
          name: "Filtro de aire lavable",
          estimatedLifespanDays: 90,
          notes: "Limpiar cada 2-3 meses. Reemplazar si está dañado.",
        },
      ],
      suggestedMaintenance: [
        {
          title: "Limpiar filtros de aire",
          frequencyDays: 90,
          estimatedMinutes: 10,
          isCritical: true,
          steps: [
            "Apaga y desconecta el equipo de la corriente",
            "Abre la tapa frontal del equipo interior",
            "Retira los filtros con cuidado",
            "Aspira o lava con agua tibia (sin jabón agresivo)",
            "Deja secar completamente a la sombra",
            "Vuelve a colocar los filtros y cierra la tapa",
          ],
        },
      ],
      manualSearchQuery: "Daikin FTXC35C user manual PDF",
      rawText:
        "DAIKIN\nMODEL: FTXC35C\nSERIAL NO: A123456789\n220-240V~ 50/60Hz\nREFRIGERANT: R32",
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("[identify]", error);
    return NextResponse.json(
      { error: "Error al procesar la imagen" },
      { status: 500 }
    );
  }
}
