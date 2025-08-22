import React from 'react';

import { useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// --- Datos del horario (usar hora en formato 24h y mostrar en 12h) ---
const scheduleData = [
    // Lunes
    { day: "Lunes", start: "18:00", end: "20:00", subject: "Procesamiento Avanzado de Señales e Imágenes (Teoría)", color: "bg-amber-600", mode: "Presencial", campus: "Monterrico" },

    // Martes
    { day: "Martes", start: "09:00", end: "12:00", subject: "Proyecto de Investigación", color: "bg-blue-400", mode: "Virtual", campus: "Online" },

    // Miércoles
    { day: "Miércoles", start: "07:00", end: "09:00", subject: "Diseño de Circuitos Electrónicos (Teoría)", color: "bg-green-400", mode: "Presencial", campus: "San Miguel" },

    // Jueves
    { day: "Jueves", start: "09:00", end: "11:00", subject: "Diseño de Circuitos Electrónicos (Laboratorio)", color: "bg-purple-400", mode: "Presencial", campus: "San Miguel" },
    { day: "Jueves", start: "16:00", end: "18:00", subject: "Procesamiento Avanzado de Señales e Imágenes (Teoría)", color: "bg-amber-600", mode: "Presencial", campus: "Monterrico" },
    { day: "Jueves", start: "19:00", end: "22:00", subject: "Sistemas Embebidos (Teoría)", color: "bg-cyan-400", mode: "Presencial", campus: "Monterrico" },

    // Viernes
    { day: "Viernes", start: "19:00", end: "21:00", subject: "Sistemas Embebidos (Laboratorio)", color: "bg-green-600", mode: "Presencial", campus: "Monterrico" },

    // Sábado
    { day: "Sábado", start: "16:00", end: "18:00", subject: "Hardware en IoT (Teoría)", color: "bg-sky-400", mode: "Presencial", campus: "Monterrico" },
    { day: "Sábado", start: "18:00", end: "20:00", subject: "Hardware en IoT (Laboratorio)", color: "bg-pink-400", mode: "Presencial", campus: "Monterrico" },
];

const days = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]; // Domingo no aparece en la imagen

// Rango de horas mostrado (7:00 a 22:00 según la captura)
const START_HOUR = 7;
const END_HOUR = 22;

function to12h(hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    const suffix = h >= 12 ? "PM" : "AM";
    const h12 = ((h + 11) % 12) + 1;
    return `${h12}:${m.toString().padStart(2, "0")} ${suffix}`;
}

function diffInHours(a, b) {
    const [ha, ma] = a.split(":").map(Number);
    const [hb, mb] = b.split(":").map(Number);
    return (hb + mb / 60) - (ha + ma / 60);
}

function hourToPct(hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    const fromStart = (h + m / 60) - START_HOUR;
    const total = END_HOUR - START_HOUR;
    return (fromStart / total) * 100;
}

export default function InteractiveSchedule() {
    const [selectedDay, setSelectedDay] = useState("Martes");
    const [view, setView] = useState("day"); // "day" | "week"

    const weeklyRef = useRef(null);

    const byDay = useMemo(() => {
        const map = Object.fromEntries(days.map((d) => [d, []]));
        for (const ev of scheduleData) {
            if (!map[ev.day]) map[ev.day] = [];
            map[ev.day].push(ev);
        }
        // Ordenar por hora de inicio
        for (const d of days) {
            map[d].sort((a, b) => (a.start > b.start ? 1 : -1));
        }
        return map;
    }, []);

    const filteredSchedule = byDay[selectedDay] || [];

    const downloadPDF = async () => {
        if (!weeklyRef.current) return;
        const canvas = await html2canvas(weeklyRef.current, { scale: 2, backgroundColor: "#ffffff" });
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        // Ajuste para centrar y cubrir
        const imgWidth = pageWidth - 40;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const y = Math.max(20, (pageHeight - imgHeight) / 2);
        pdf.addImage(imgData, "PNG", 20, y, imgWidth, imgHeight);
        pdf.save("Horario_Semanal.pdf");
    };

    return (
        <div className="p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-bold">Horario Interactivo</h1>
                <div className="flex gap-2">
                    <button
                        onClick={() => setView("day")}
                        className={`px-3 py-2 rounded-xl shadow ${view === "day" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
                    >
                        Vista por día
                    </button>
                    <button
                        onClick={() => setView("week")}
                        className={`px-3 py-2 rounded-xl shadow ${view === "week" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
                    >
                        Vista semanal
                    </button>
                    {view === "week" && (
                        <button onClick={downloadPDF} className="px-3 py-2 rounded-xl shadow bg-emerald-600 text-white">
                            Descargar PDF
                        </button>
                    )}
                </div>
            </div>

            {/* -------- Vista por día -------- */}
            {view === "day" && (
                <div>
                    {/* Filtros por día */}
                    <div className="flex flex-wrap gap-2 mb-6">
                        {days.map((day) => (
                            <button
                                key={day}
                                onClick={() => setSelectedDay(day)}
                                className={`px-4 py-2 rounded-xl shadow transition ${selectedDay === day ? "bg-blue-600 text-white" : "bg-gray-200 hover:bg-gray-300"
                                    }`}
                            >
                                {day}
                            </button>
                        ))}
                    </div>

                    {/* Lista del día seleccionado */}
                    <div className="space-y-4">
                        {(filteredSchedule || []).length > 0 ? (
                            filteredSchedule.map((item, idx) => (
                                <div key={idx} className={`p-4 rounded-2xl shadow text-white ${item.color}`}>
                                    <div className="flex items-center justify-between gap-3 flex-wrap">
                                        <div>
                                            <h2 className="text-lg font-semibold">{item.subject}</h2>
                                            <p>
                                                {to12h(item.start)} – {to12h(item.end)}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="px-2 py-1 rounded-full text-sm bg-black/20 backdrop-blur">{item.mode}</span>
                                            <span className="px-2 py-1 rounded-full text-sm bg-black/20 backdrop-blur">{item.campus}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-500">No hay clases este día.</p>
                        )}
                    </div>
                </div>
            )}

            {/* -------- Vista semanal (grid) -------- */}
            {view === "week" && (
                <div ref={weeklyRef} className="bg-white rounded-2xl p-4 shadow border">
                    {/* Encabezados */}
                    <div className="grid" style={{ gridTemplateColumns: `100px repeat(${days.length}, 1fr)` }}>
                        <div></div>
                        {days.map((d) => (
                            <div key={d} className="text-center font-semibold py-2">{d}</div>
                        ))}
                    </div>

                    {/* Contenedor con líneas de horas y eventos */}
                    <div className="relative" style={{ height: 900 }}>
                        {/* Líneas y etiquetas de horas */}
                        {Array.from({ length: END_HOUR - START_HOUR + 1 }).map((_, i) => {
                            const hour = START_HOUR + i;
                            const hh = hour.toString().padStart(2, "0");
                            const pct = ((hour - START_HOUR) / (END_HOUR - START_HOUR)) * 100;
                            return (
                                <div key={hour} className="absolute left-0 right-0" style={{ top: `${pct}%` }}>
                                    <div className="grid items-start" style={{ gridTemplateColumns: `100px repeat(${days.length}, 1fr)` }}>
                                        <div className="text-xs text-gray-500 -translate-y-1/2 pr-2 text-right">{to12h(`${hh}:00`)}</div>
                                        {days.map((d) => (
                                            <div key={d} className="border-t border-gray-200"></div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Eventos colocados */}
                        {days.map((d, colIdx) => (
                            <div key={d} className="absolute" style={{ left: `${(colIdx + 1) * (100 / (days.length + 1))}%`, width: `${100 / (days.length + 1)}%`, top: 0, bottom: 0 }}>
                                {(byDay[d] || []).map((ev, i) => {
                                    const top = hourToPct(ev.start);
                                    const height = (diffInHours(ev.start, ev.end) / (END_HOUR - START_HOUR)) * 100;
                                    return (
                                        <div
                                            key={i}
                                            className={`absolute mx-1 rounded-xl text-white p-2 shadow ${ev.color}`}
                                            style={{ top: `${top}%`, height: `${height}%` }}
                                        >
                                            <div className="text-xs font-semibold leading-tight">{ev.subject}</div>
                                            <div className="text-[10px] leading-tight">{to12h(ev.start)} – {to12h(ev.end)}</div>
                                            <div className="text-[10px] leading-tight opacity-90">{ev.mode} • {ev.campus}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="text-sm text-gray-600">
                <p><strong>Formato de hora:</strong> 12 horas (AM/PM). Para cambiar horarios o agregar cursos, edita el arreglo <code>scheduleData</code>.</p>
            </div>
        </div>
    );
}

