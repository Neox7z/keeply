"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Package, MessageSquare, Wrench, Info } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

const ITEM = {
  name: "Aire Acondicionado Sala",
  brand: "Daikin",
  model: "FTXC35C",
  serialNumber: "A123456789",
  location: "Sala",
  condition: "good",
  maintenance: [
    {
      id: "m1",
      title: "Limpiar filtros de aire",
      nextDue: "2026-12-08",
      minutes: 10,
      critical: true,
      steps: [
        "Apaga y desconecta el equipo",
        "Abre la tapa frontal",
        "Retira los filtros",
        "Lava con agua tibia y deja secar",
        "Vuelve a colocar",
      ],
    },
  ],
  consumables: [
    { name: "Filtro de aire lavable", notes: "Limpiar cada 90 días." },
  ],
};

type Tab = "overview" | "maintenance" | "chat";

export default function ItemPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Hola. Soy el asistente de tu Aire Acondicionado Daikin FTXC35C. ¿En qué te ayudo?",
    },
  ]);

  const send = () => {
    if (!chatInput.trim()) return;
    const q = chatInput.trim();
    setChatInput("");
    setMessages((m) => [...m, { role: "user", content: q }]);
    setTimeout(() => {
      let answer = "Consulta el manual de tu modelo para más detalles.";
      if (q.toLowerCase().includes("filtro")) {
        answer =
          "Para limpiar los filtros:\n\n1. Apaga y desconecta.\n2. Abre la tapa frontal.\n3. Retira los filtros.\n4. Lava con agua tibia (máx 40°C).\n5. Deja secar a la sombra.\n6. Vuelve a colocar.\n\nCada 2-3 meses.";
      }
      setMessages((m) => [...m, { role: "assistant", content: answer }]);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="container mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/dashboard" className="p-2 -ml-2 rounded-lg hover:bg-slate-100">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="font-semibold truncate">{ITEM.name}</span>
        </div>
      </header>

      <div className="h-28 bg-blue-100 flex items-center justify-center">
        <Package className="w-12 h-12 text-blue-400" />
      </div>

      <div className="bg-white border-b flex">
        {(
          [
            { id: "overview" as const, label: "Resumen", icon: Info },
            { id: "maintenance" as const, label: "Cuidado", icon: Wrench },
            { id: "chat" as const, label: "Preguntar", icon: MessageSquare },
          ]
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium border-b-2 ${
              tab === t.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-400"
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="p-4 space-y-4">
          <div className="bg-white border rounded-xl p-4 space-y-3">
            <div>
              <p className="text-xs text-slate-400">Nº de serie</p>
              <p className="font-semibold">{ITEM.serialNumber}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Ubicación</p>
              <p className="font-semibold">{ITEM.location}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Marca / Modelo</p>
              <p className="font-semibold">
                {ITEM.brand} {ITEM.model}
              </p>
            </div>
          </div>
          <h2 className="font-semibold">Consumibles / Repuestos</h2>
          {ITEM.consumables.map((c, i) => (
            <div key={i} className="bg-white border rounded-xl p-4">
              <p className="font-semibold">{c.name}</p>
              <p className="text-sm text-slate-500 mt-1">{c.notes}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "maintenance" && (
        <div className="p-4 space-y-3">
          {ITEM.maintenance.map((task) => (
            <div key={task.id} className="bg-white border rounded-xl p-4">
              <p className="font-semibold">
                {task.title}
                {task.critical && (
                  <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">
                    Importante
                  </span>
                )}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Próximo: {task.nextDue} · {task.minutes} min
              </p>
              {task.steps.length > 0 && (
                <ol className="mt-3 pt-3 border-t space-y-1 text-sm text-slate-600">
                  {task.steps.map((s, i) => (
                    <li key={i}>
                      {i + 1}. {s}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "chat" && (
        <div className="flex-1 flex flex-col">
          <div className="flex-1 p-4 space-y-3 overflow-y-auto">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-blue-600 text-white ml-auto rounded-br-sm"
                    : "bg-white border rounded-bl-sm"
                }`}
              >
                {m.content}
              </div>
            ))}
          </div>
          <div className="p-3 bg-white border-t flex gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ej: ¿Cómo limpio los filtros?"
              className="flex-1 bg-slate-100 rounded-xl px-4 py-2.5 text-sm outline-none"
            />
            <button
              onClick={send}
              className="bg-blue-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold"
            >
              Enviar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
