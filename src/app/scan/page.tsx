"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Camera, Upload, ArrowLeft, CheckCircle, Loader2 } from "lucide-react";

type Step = "capture" | "processing" | "review" | "error";

export default function ScanPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("capture");
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const processImage = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setPreview(dataUrl);
      setStep("processing");
      setErrorMsg("");

      try {
        const res = await fetch("/api/identify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: dataUrl }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al identificar");
        setResult(data);
        setStep("review");
      } catch (e: any) {
        console.error(e);
        setErrorMsg(e.message || "No se pudo identificar");
        setStep("error");
      }
    };
    reader.readAsDataURL(file);
  };

  const save = () => {
    try {
      const items = JSON.parse(localStorage.getItem("keeply_items") || "[]");
      items.unshift({
        id: String(Date.now()),
        name: result.suggestedName,
        brand: result.brand,
        model: result.model,
        serialNumber: result.serialNumber,
        category: result.category,
        photo: preview,
        maintenance: result.suggestedMaintenance || [],
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem("keeply_items", JSON.stringify(items));
    } catch {}
    router.push("/dashboard");
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
                Apunta a la etiqueta trasera o inferior. Busca el número de modelo y serie.
              </p>
            </div>

            <label className="flex flex-col items-center justify-center border-2 border-dashed border-blue-300 rounded-2xl p-12 bg-white cursor-pointer active:border-blue-500">
              <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                <Camera className="w-8 h-8 text-blue-600" />
              </div>
              <span className="font-semibold text-lg">Tomar o subir foto</span>
              <span className="text-sm text-slate-400 mt-1">Abre la cámara del iPhone</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && processImage(e.target.files[0])}
              />
            </label>

            <label className="flex items-center justify-center gap-2 text-blue-600 font-medium cursor-pointer">
              <Upload className="w-4 h-4" />
              Elegir de la galería
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && processImage(e.target.files[0])}
              />
            </label>

            <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800">
              Tip: buena luz y etiqueta enfocada. Sin API key verás un resultado de demostración.
            </div>
          </div>
        )}

        {step === "processing" && (
          <div className="text-center py-16 space-y-4">
            {preview && (
              <img src={preview} alt="preview" className="w-40 h-40 object-cover rounded-xl mx-auto opacity-70" />
            )}
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
            <p className="font-semibold">Identificando objeto...</p>
            <p className="text-sm text-slate-500">Leyendo etiqueta con IA</p>
          </div>
        )}

        {step === "error" && (
          <div className="text-center py-12 space-y-4">
            <p className="text-red-600 font-medium">{errorMsg}</p>
            <button
              onClick={() => { setStep("capture"); setPreview(null); }}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold"
            >
              Reintentar
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
                {result.source === "demo"
                  ? "Resultado de demostración"
                  : `Identificado (${Math.round((result.confidence || 0) * 100)}%)`}
              </div>
              {result.note && (
                <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg">{result.note}</p>
              )}
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-400">Nombre</p>
                  <p className="font-semibold">{result.suggestedName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Marca</p>
                  <p className="font-semibold">{result.brand || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Modelo</p>
                  <p className="font-semibold">{result.model || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Nº de serie</p>
                  <p className="font-semibold">{result.serialNumber || "—"}</p>
                </div>
              </div>
              {result.suggestedMaintenance?.length > 0 && (
                <div className="pt-3 border-t">
                  <p className="text-sm font-semibold mb-2">Mantenimientos sugeridos</p>
                  {result.suggestedMaintenance.map((m: any, i: number) => (
                    <p key={i} className="text-sm text-slate-600">
                      • {m.title} (cada {m.frequencyDays} días)
                    </p>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setStep("capture"); setPreview(null); setResult(null); }}
                className="flex-1 border rounded-xl py-3 font-semibold"
              >
                Reintentar
              </button>
              <button
                onClick={save}
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
