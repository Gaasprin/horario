import React, { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/* ========= DATOS ========= */
const scheduleData = [
    // Lunes
    {
        day: "Lunes",
        start: "18:00",
        end: "20:00",
        subject: "Procesamiento Avanzado de Señales e Imágenes (Teoría)",
        type: "Teoría",
        mode: "Presencial",
        campus: "Monterrico",
        color: "bg-amber-500",
    },
    // Martes
    {
        day: "Martes",
        start: "09:00",
        end: "12:00",
        subject: "Proyecto de Investigación",
        type: "Proyecto",
        mode: "Virtual",
        campus: "Online",
        color: "bg-blue-500",
    },
    // Miércoles
    {
        day: "Miércoles",
        start: "07:00",
        end: "09:00",
        subject: "Diseño de Circuitos Electrónicos (Teoría)",
        type: "Teoría",
        mode: "Presencial",
        campus: "San Miguel",
        color: "bg-green-500",
    },
    // Jueves
    {
        day: "Jueves",
        start: "09:00",
        end: "11:00",
        subject: "Diseño de Circuitos Electrónicos (Laboratorio)",
        type: "Laboratorio",
        mode: "Presencial",
        campus: "San Miguel",
        color: "bg-violet-500",
    },
    {
        day: "Jueves",
        start: "16:00",
        end: "18:00",
        subject: "Procesamiento Avanzado de Señales e Imágenes (Teoría)",
        type: "Teoría",
        mode: "Presencial",
        campus: "Monterrico",
        color: "bg-amber-500",
    },
    {
        day: "Jueves",
        start: "19:00",
        end: "22:00",
        subject: "Sistemas Embebidos (Teoría)",
        type: "Teoría",
        mode: "Presencial",
        campus: "Monterrico",
        color: "bg-cyan-500",
    },
    // Viernes
    {
        day: "Viernes",
        start: "19:00",
        end: "21:00",
        subject: "Sistemas Embebidos (Laboratorio)",
        type: "Laboratorio",
        mode: "Presencial",
        campus: "Monterrico",
        color: "bg-emerald-600",
    },
    // Sábado
    {
        day: "Sábado",
        start: "16:00",
        end: "18:00",
        subject: "Hardware en IoT (Teoría)",
        type: "Teoría",
        mode: "Presencial",
        campus: "Monterrico",
        color: "bg-sky-500",
    },
    {
        day: "Sábado",
        start: "18:00",
        end: "20:00",
        subject: "Hardware en IoT (Laboratorio)",
        type: "Laboratorio",
        mode: "Presencial",
        campus: "Monterrico",
        color: "bg-pink-500",
    },
];

const days = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const START_HOUR = 7;
const END_HOUR = 22;

/* ========= HELPERS ========= */
function to12h(hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    const suffix = h >= 12 ? "PM" : "AM";
    const h12 = ((h + 11) % 12) + 1;
    return `${h12}:${m.toString().padStart(2, "0")} ${suffix}`;
}
function diffInHours(a, b) {
    const [ha, ma] = a.split(":").map(Number);
    const [hb, mb] = b.split(":").map(Number);
    return hb + mb / 60 - (ha + ma / 60);
}
function hourToPct(hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    const fromStart = h + m / 60 - START_HOUR;
    return (fromStart / (END_HOUR - START_HOUR)) * 100;
}

/* ========= APP ========= */
export default function App() {
    const [view, setView] = useState("week"); // "day" | "week"
    const [selectedDay, setSelectedDay] = useState("Martes");

    // Anchos/alto dinámicos
    const wrapperRef = useRef(null);      // mide el ancho disponible
    const weeklyRef = useRef(null);       // captura PDF
    const [containerW, setContainerW] = useState(0);
    const [gridH, setGridH] = useState(700);

    // Columna fija de horas
    const hoursColW = 90;

    // Limites de ancho por día (para PC/tablet)
    const MIN_DAY_COL = 180;
    const MAX_DAY_COL = 260;

    // Observa tamaño del contenedor y de la ventana
    useEffect(() => {
        const resize = () => {
            const h = Math.max(560, Math.min(1100, Math.floor(window.innerHeight * 0.85)));
            setGridH(h);
        };
        resize();
        window.addEventListener("resize", resize);
        return () => window.removeEventListener("resize", resize);
    }, []);

    useEffect(() => {
        if (!wrapperRef.current) return;
        const obs = new ResizeObserver((entries) => {
            const { width } = entries[0].contentRect;
            setContainerW(width);
        });
        obs.observe(wrapperRef.current);
        return () => obs.disconnect();
    }, []);

    // Agrupa por día
    const byDay = useMemo(() => {
        const map = Object.fromEntries(days.map((d) => [d, []]));
        for (const ev of scheduleData) (map[ev.day] ||= []).push(ev);
        for (const d of days) map[d].sort((a, b) => (a.start > b.start ? 1 : -1));
        return map;
    }, []);

    // Calcula ancho por día según el ancho disponible
    //   - En PC llena todo sin scroll
    //   - En móvil usa valores mínimos con scroll horizontal
    const isDesktop = containerW >= 1024;
    const contentPadding = 32; // p-4 (16) * 2 lados
    let dayColW;
    if (isDesktop) {
        const usable = Math.max(containerW - contentPadding, 0);
        dayColW = Math.max(
            MIN_DAY_COL,
            Math.min(MAX_DAY_COL, Math.floor((usable - hoursColW) / days.length))
        );
    } else if (containerW >= 640) {
        dayColW = 170;
    } else {
        dayColW = 160;
    }

    const minWidthMobile = hoursColW + dayColW * days.length; // para móvil
    const gridTemplate = `${hoursColW}px repeat(${days.length}, ${dayColW}px)`;

    // PDF
    const downloadPDF = async () => {
        if (!weeklyRef.current) return;
        const canvas = await html2canvas(weeklyRef.current, {
            scale: 2,
            backgroundColor: "#ffffff",
        });
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const imgW = pageW - 40;
        const imgH = (canvas.height * imgW) / canvas.width;
        const y = Math.max(20, (pageH - imgH) / 2);
        pdf.addImage(imgData, "PNG", 20, y, imgW, imgH);
        pdf.save("Horario_Semanal.pdf");
    };

    const filtered = byDay[selectedDay] || [];

    return (
        <div className="max-w-[1400px] mx-auto p-4 sm:p-6">
            <h1 className="text-3xl font-bold mb-4">Horario Interactivo</h1>

            {/* Controles */}
            <div className="flex flex-wrap gap-2 mb-4">
                <button
                    onClick={() => setView("day")}
                    className={`px-4 h-11 rounded-xl shadow ${view === "day" ? "bg-blue-600 text-white" : "bg-gray-200"
                        }`}
                >
                    Vista por día
                </button>
                <button
                    onClick={() => setView("week")}
                    className={`px-4 h-11 rounded-xl shadow ${view === "week" ? "bg-blue-600 text-white" : "bg-gray-200"
                        }`}
                >
                    Vista semanal
                </button>
                {view === "week" && (
                    <button onClick={downloadPDF} className="px-4 h-11 rounded-xl shadow bg-emerald-600 text-white">
                        Descargar PDF
                    </button>
                )}
            </div>

            {/* ===== Vista por día ===== */}
            {view === "day" && (
                <div>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {days.map((d) => (
                            <button
                                key={d}
                                onClick={() => setSelectedDay(d)}
                                className={`px-4 h-11 rounded-xl shadow ${selectedDay === d ? "bg-blue-600 text-white" : "bg-gray-200"
                                    }`}
                            >
                                {d}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-3">
                        {filtered.length ? (
                            filtered.map((item, i) => (
                                <div key={i} className={`p-4 rounded-2xl shadow text-white ${item.color}`}>
                                    <div className="flex items-center justify-between gap-3 flex-wrap">
                                        <div>
                                            <h2 className="text-base sm:text-lg font-semibold break-words">{item.subject}</h2>
                                            <p className="text-sm">{to12h(item.start)} – {to12h(item.end)}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="px-2 py-1 rounded-full text-xs sm:text-sm bg-black/20">{item.type}</span>
                                            <span className="px-2 py-1 rounded-full text-xs sm:text-sm bg-black/20">{item.mode}</span>
                                            <span className="px-2 py-1 rounded-full text-xs sm:text-sm bg-black/20">{item.campus}</span>
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

            {/* ===== Vista semanal (móvil con scroll; PC llena el ancho) ===== */}
            {view === "week" && (
                <div className="overflow-x-auto">
                    {/* wrapper mide el ancho disponible para calcular dayColW */}
                    <div ref={wrapperRef} className="w-full">
                        <div
                            ref={weeklyRef}
                            className="bg-white rounded-2xl p-4 shadow border mx-auto"
                            style={isDesktop ? { width: "100%" } : { minWidth: minWidthMobile }}
                        >
                            {/* Cabecera: columna de horas + columnas de días */}
                            <div
                                className="grid sticky top-0 z-10 bg-white"
                                style={{ gridTemplateColumns: gridTemplate }}
                            >
                                <div />{/* columna de horas */}
                                {days.map((d) => (
                                    <div key={d} className="py-2 text-center font-semibold text-xs sm:text-sm md:text-base">
                                        {d}
                                    </div>
                                ))}
                            </div>

                            {/* Rejilla de líneas y eventos */}
                            <div className="relative" style={{ height: gridH }}>
                                {/* Líneas de horas */}
                                {Array.from({ length: END_HOUR - START_HOUR + 1 }).map((_, i) => {
                                    const hour = START_HOUR + i;
                                    const pct = (i / (END_HOUR - START_HOUR)) * 100;
                                    const label = to12h(`${String(hour).padStart(2, "0")}:00`);
                                    return (
                                        <div key={hour} className="absolute left-0 right-0" style={{ top: `${pct}%` }}>
                                            <div className="grid items-start" style={{ gridTemplateColumns: gridTemplate }}>
                                                <div className="text-[10px] sm:text-xs text-gray-500 -translate-y-1/2 pr-2 text-right">
                                                    {label}
                                                </div>
                                                {days.map((d) => (
                                                    <div key={d} className="border-t border-gray-200" />
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Eventos por día */}
                                {days.map((d, colIdx) => {
                                    const left = hoursColW + colIdx * dayColW;
                                    return (
                                        <div key={d} className="absolute top-0 bottom-0" style={{ left, width: dayColW }}>
                                            {(byDay[d] || []).map((ev, i) => {
                                                const top = hourToPct(ev.start);
                                                const height = (diffInHours(ev.start, ev.end) / (END_HOUR - START_HOUR)) * 100;
                                                return (
                                                    <div
                                                        key={i}
                                                        className={`absolute mx-1 rounded-xl p-2 shadow text-white ${ev.color} break-words`}
                                                        style={{ top: `${top}%`, height: `${height}%` }}
                                                    >
                                                        <div className="text-[11px] sm:text-xs md:text-sm font-semibold leading-tight">
                                                            {ev.subject}
                                                        </div>
                                                        <div className="text-[10px] sm:text-xs leading-tight opacity-95">
                                                            {to12h(ev.start)} – {to12h(ev.end)}
                                                        </div>
                                                        <div className="text-[10px] sm:text-xs leading-tight opacity-90">
                                                            {ev.type} • {ev.mode} • {ev.campus}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <p className="mt-4 text-xs text-gray-500">
                En móvil puedes deslizar; en PC la grilla se expande para ocupar todo el ancho.
            </p>
        </div>
    );
}
