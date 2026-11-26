import Link from "next/link";
import { Camera, Calendar, MessageSquare, Package, Zap } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl">Keeply</span>
          </div>
          <Link href="/dashboard" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
            Empezar gratis
          </Link>
        </div>
      </header>
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium mb-6">
          <Zap className="w-4 h-4" /> El Shazam de tus cosas
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight max-w-2xl mx-auto mb-6">
          Tus cosas, <span className="text-blue-600">cuidadas automáticamente</span>
        </h1>
        <p className="text-lg text-slate-600 max-w-xl mx-auto mb-10">
          Registra cualquier aparato con una foto. Keeply lee la etiqueta, genera el calendario de mantenimiento y responde preguntas del manual exacto.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/scan" className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold shadow-lg shadow-blue-600/20">
            <Camera className="w-5 h-5" /> Escanear mi primer objeto
          </Link>
          <Link href="/dashboard" className="inline-flex items-center justify-center gap-2 border px-8 py-4 rounded-xl text-lg font-semibold">
            Ver demo
          </Link>
        </div>
      </section>
      <section className="container mx-auto px-4 py-16 grid md:grid-cols-3 gap-8">
        {[
          { icon: Camera, title: "1. Foto de la etiqueta", desc: "Apunta a la etiqueta. Keeply lee marca, modelo y número de serie." },
          { icon: Calendar, title: "2. Calendario inteligente", desc: "Alertas cuando toca limpiar filtros o cambiar piezas." },
          { icon: MessageSquare, title: "3. Pregúntale al objeto", desc: "Error E4, ¿qué hago? Responde con el manual de tu modelo." },
        ].map((f) => (
          <div key={f.title} className="bg-white border rounded-2xl p-6">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <f.icon className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
            <p className="text-slate-600 text-sm">{f.desc}</p>
          </div>
        ))}
      </section>
      <footer className="border-t py-8 text-center text-sm text-slate-500">
        © 2026 Keeply
      </footer>
    </div>
  );
}
