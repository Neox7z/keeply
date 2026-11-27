"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Camera, Upload, ArrowLeft, CheckCircle, Loader2 } from "lucide-react";

type Step = "capture" | "processing" | "review" | "error" | "manual";

export default function ScanPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("capture");
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [manual, setManual] = useState({ brand: "", model: "", name: "", serial: "" });

  const processImage = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setPreview(dataUrl);
      setStep("processing");
      setErrorMsg("");

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 55000);
        const res = await fetch("/api/identify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: dataUrl }),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        const data = await res.json();
        if (!res.ok) {
          const msg = [data.error, data.detail, data.hint].filter(Boolean).join("\n\n");
          setErrorMsg(msg || "Error al identificar");
          setStep("error");
          return;
        }
        setResult(data);
        setStep("review");
      } catch (e: any) {
        setErrorMsg(
          e?.name === "AbortError"
            ? "Tardó demasiado. Prueba otra foto o introduce los datos a mano."
            : e.message || "No se pudo identificar"
        );
        setStep("error");
      }
    };
    reader.readAsDataURL(file);
  };

  const saveResult = (r: any) => {
    try {
      const items = JSON.parse(localStorage.getItem("keeply_items") || "[]");
      items.unshift({
        id: String(Date.now()),
        name: r.suggestedName,
        brand: r.brand,
        model: r.model,
        serialNumber: r.serialNumber,
        category: r.category,
        deviceType: r.deviceType,
        photo: preview,
        maintenance: r.suggestedMaintenance || [],
        commonFailures: r.commonFailures || [],
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem("keeply_items", JSON.stringify(items));
    } catch {}
    router.push("/dashboard");
  };

  const saveManual = () => {
    const name =
      manual.name ||
      [manual.brand, manual.model].filter(Boolean).join(" ") ||
      "Objeto sin nombre";
    saveResult({
      suggestedName: name,
      brand: manual.brand || null,
      model: manual.model || null,
      serialNumber: manual.serial || null,
      category: "other",
      suggestedMaintenance: [
        {
          title: "Revisión general",
          frequencyDays: 180,
          estimatedMinutes: 20,
          isCritical: false,
          why: "Mantenimiento preventivo básico",
        },
      ],
      commonFailures: [],
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="container mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/dashboard" className="p-2 -ml-2 rounded-lg hover:bg-slate-100">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="font-semibold">Escanear objeto</span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-lg">
        {step === "capture" && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-xl font-bold mb-2">Foto de la etiqueta</h1>
              <p className="text-sm text-slate-500">
                Acerca bien la etiqueta (marca, modelo, serie). Buena luz.
              </p>
            </div>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-blue-300 rounded-2xl p-12 bg-white cursor-pointer">
              <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                <Camera className="w-8 h-8 text-blue-600" />
              </div>
              <span className="font-semibold text-lg">Tomar o subir foto</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && processImage(e.target.files[0])}
              />
            </label>
            <label className="flex items-center justify-center gap-2 text-blue-600 font-medium cursor-pointer">
              <Upload className="w-4 h-4" /> Elegir de la galería
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && processImage(e.target.files[0])}
              />
            </label>
          </div>
        )}

        {step === "processing" && (
          <div className="text-center py-16 space-y-4">
            {preview && (
              <img src={preview} alt="preview" className="w-40 h-40 object-cover rounded-xl mx-auto opacity-70" />
            )}
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
            <p className="font-semibold">Identificando objeto...</p>
            <p className="text-sm text-slate-500">Puede tardar hasta 30–40 s si Gemini está ocupado</p>
          </div>
        )}

        {step === "error" && (
          <div className="py-8 space-y-4">
            <p className="text-red-600 font-medium text-sm whitespace-pre-wrap px-2 text-center">
              {errorMsg}
            </p>
            <div className="flex flex-col gap-3 px-2">
              <button
                onClick={() => {
                  setStep("capture");
                  setPreview(null);
                }}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold"
              >
                Reintentar con otra foto
              </button>
              <button
                onClick={() => setStep("manual")}
                className="border border-slate-300 px-6 py-3 rounded-xl font-semibold"
              >
                Introducir datos a mano
              </button>
            </div>
          </div>
        )}

        {step === "manual" && (
          <div className="space-y-4">
            {preview && (
              <img src={preview} alt="preview" className="w-full h-36 object-cover rounded-xl" />
            )}
            <h2 className="font-bold text-lg">Datos del aparato</h2>
            {(
              [
                ["name", "Nombre (ej. Nevera cocina)"],
                ["brand", "Marca"],
                ["model", "Modelo"],
                ["serial", "Nº de serie (opcional)"],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <label className="text-xs text-slate-500">{label}</label>
                <input
                  className="w-full mt-1 border rounded-xl px-3 py-2.5 text-sm"
                  value={manual[key]}
                  onChange={(e) => setManual((m) => ({ ...m, [key]: e.target.value }))}
                />
              </div>
            ))}
            <button
              onClick={saveManual}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold"
            >
              Guardar objeto
            </button>
          </div>
        )}

        {step === "review" && result && (
          <div className="space-y-6">
            {preview && (
              <img src={preview} alt="preview" className="w-full h-40 object-cover rounded-xl" />
            )}
            <div className="bg-white border rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                <CheckCircle className="w-5 h-5" />
                Identificado ({Math.round((result.confidence || 0) * 100)}%)
                {result.modelUsed ? ` · ${result.modelUsed}` : ""}
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-400">Nombre</p>
                  <p className="font-semibold">{result.suggestedName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Marca / Modelo</p>
                  <p className="font-semibold">
                    {result.brand || "—"} {result.model || ""}
                  </p>
                </div>
                {result.deviceType && (
                  <div>
                    <p className="text-xs text-slate-400">Tipo</p>
                    <p className="font-semibold">{result.deviceType}</p>
                  </div>
                )}
                {result.serialNumber && (
                  <div>
                    <p className="text-xs text-slate-400">Serie</p>
                    <p className="font-semibold">{result.serialNumber}</p>
                  </div>
                )}
              </div>
              {result.suggestedMaintenance?.length > 0 && (
                <div className="pt-3 border-t">
                  <p className="text-sm font-semibold mb-2">Mantenimiento sugerido</p>
                  {result.suggestedMaintenance.map((m: any, i: number) => (
                    <p key={i} className="text-sm text-slate-600 mb-1">
                      • {m.title}
                      {m.why ? ` — ${m.why}` : ""}
                    </p>
                  ))}
                </div>
              )}
              {result.commonFailures?.length > 0 && (
                <div className="pt-3 border-t">
                  <p className="text-sm font-semibold mb-2">Fallos frecuentes</p>
                  {result.commonFailures.map((f: any, i: number) => (
                    <div key={i} className="text-sm text-slate-600 mb-2">
                      <p className="font-medium">{f.issue}</p>
                      {f.symptoms && <p className="text-xs">Síntomas: {f.symptoms}</p>}
                      {f.prevention && <p className="text-xs">Prevención: {f.prevention}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setStep("capture");
                  setPreview(null);
                  setResult(null);
                }}
                className="flex-1 border rounded-xl py-3 font-semibold"
              >
                Reintentar
              </button>
              <button
                onClick={() => saveResult(result)}
                className="flex-1 bg-blue-600 text-white rounded-xl py-3 font-semibold"
              >
                Guardar objeto
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
