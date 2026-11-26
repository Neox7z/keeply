"use client";
import Link from "next/link";
import { Camera, Package, AlertTriangle, Calendar, Plus, Bell } from "lucide-react";

const ITEMS = [
  { id: "1", name: "Aire Acondicionado Sala", brand: "Daikin", model: "FTXC35C", location: "Sala", days: 12 },
  { id: "2", name: "Lavadora", brand: "Samsung", model: "WW90T554DAN", location: "Lavandería", days: 4 },
  { id: "3", name: "Router WiFi", brand: "TP-Link", model: "Archer AX73", location: "Escritorio", days: 81 },
  { id: "4", name: "Cafetera", brand: "DeLonghi", model: "Magnifica S", location: "Cocina", days: -4 },
];
const ALERTS = [
  { id: "a1", title: "Descalcificación pendiente", item: "Cafetera", days: -4 },
  { id: "a2", title: "Limpieza de filtro", item: "Lavadora", days: 4 },
];

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-600" />
            <span className="font-bold text-lg">Keeply</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium">CR</div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold">Hola</h1>
            <p className="text-slate-500">Tus objetos y alertas de mantenimiento</p>
          </div>
          <Link href="/scan" className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-xl font-semibold">
            <Camera className="w-5 h-5" /> Agregar objeto
          </Link>
        </div>
        <section className="mb-8">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" /> Atención requerida
          </h2>
          <div className="space-y-2">
            {ALERTS.map((a) => (
              <div key={a.id} className={`flex items-center justify-between p-4 rounded-xl border ${a.days < 0 ? "bg-red-50 border-red-200" : "bg-orange-50 border-orange-200"}`}>
                <div>
                  <p className="font-medium text-sm">{a.title}</p>
                  <p className="text-xs text-slate-500">{a.item}</p>
                </div>
                <p className={`text-sm font-semibold ${a.days < 0 ? "text-red-600" : "text-orange-600"}`}>
                  {a.days < 0 ? `Hace ${Math.abs(a.days)} días` : `En ${a.days} días`}
                </p>
              </div>
            ))}
          </div>
        </section>
        <section>
          <h2 className="font-semibold mb-4">Mis objetos ({ITEMS.length})</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {ITEMS.map((item) => (
              <Link key={item.id} href={`/items/${item.id}`} className="bg-white border rounded-xl p-4 hover:shadow-md transition">
                <div className="flex gap-4">
                  <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Package className="w-7 h-7 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{item.name}</h3>
                    <p className="text-sm text-slate-500 truncate">{item.brand} · {item.model}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">{item.location}</span>
                      {item.days <= 14 && (
                        <span className={`text-xs px-2 py-0.5 rounded ${item.days < 0 ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}`}>
                          {item.days < 0 ? "Atrasado" : `${item.days}d`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
            <Link href="/scan" className="border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-slate-400 min-h-[112px]">
              <Plus className="w-6 h-6" />
              <span className="text-sm font-medium">Agregar objeto</span>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
