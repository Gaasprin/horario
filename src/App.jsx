import React, { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/* ========= HORARIO (corregido) ========= */
const scheduleData = [
    // Martes
    { day: "Martes", start: "09:00", end: "12:00", subject: "Proyecto de Investigación", type: "Proyecto", mode: "Virtual", campus: "Online", color: "bg-blue-500" },
    { day: "Martes", start: "18:00", end: "20:00", subject: "Procesamiento Avanzado de Señales e Imágenes (Teoría)", type: "Teoría", mode: "Presencial", campus: "Monterrico", color: "bg-amber-500" },
    // Miércoles
    { day: "Miércoles", start: "07:00", end: "09:00", subject: "Diseño de Circuitos Electrónicos (Teoría)", type: "Teoría", mode: "Presencial", campus: "San Miguel", color: "bg-green-500" },
    // Jueves
    { day: "Jueves", start: "09:00", end: "11:00", subject: "Diseño de Circuitos Electrónicos (Laboratorio)", type: "Laboratorio", mode: "Presencial", campus: "San Miguel", color: "bg-violet-500" },
    { day: "Jueves", start: "16:00", end: "18:00", subject: "Procesamiento Avanzado de Señales e Imágenes (Teoría)", type: "Teoría", mode: "Presencial", campus: "Monterrico", color: "bg-amber-500" },
    { day: "Jueves", start: "19:00", end: "22:00", subject: "Sistemas Embebidos (Teoría)", type: "Teoría", mode: "Presencial", campus: "Monterrico", color: "bg-cyan-500" },
    // Viernes
    { day: "Viernes", start: "19:00", end: "21:00", subject: "Sistemas Embebidos (Laboratorio)", type: "Laboratorio", mode: "Presencial", campus: "Monterrico", color: "bg-emerald-600" },
    // Sábado
    { day: "Sábado", start: "16:00", end: "18:00", subject: "Hardware en IoT (Teoría)", type: "Teoría", mode: "Presencial", campus: "Monterrico", color: "bg-sky-500" },
    { day: "Sábado", start: "18:00", end: "20:00", subject: "Hardware en IoT (Laboratorio)", type: "Laboratorio", mode: "Presencial", campus: "Monterrico", color: "bg-pink-500" },
];

const days = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const START_HOUR = 7;
const END_HOUR = 22;

/* ========= HELPERS ========= */
const dayIndex = { Lunes: 1, Martes: 2, Miércoles: 3, Jueves: 4, Viernes: 5, Sábado: 6 };

function to12h(hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    const suf = h >= 12 ? "PM" : "AM";
    const h12 = ((h + 11) % 12) + 1;
    return `${h12}:${m.toString().padStart(2, "0")} ${suf}`;
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
const clamp = (x, a = 0, b = 100) => Math.max(a, Math.min(b, x));

function startOfWeekMonday(d = new Date()) {
    const x = new Date(d);
    const diff = (x.getDay() + 6) % 7; // 0 => lunes
    x.setHours(0, 0, 0, 0);
    x.setDate(x.getDate() - diff);
    return x;
}
function concreteDateForEvent(ev, baseMonday) {
    const dt = new Date(baseMonday);
    const [hh, mm] = ev.start.split(":").map(Number);
    dt.setDate(dt.getDate() + (dayIndex[ev.day] - 1));
    dt.setHours(hh, mm, 0, 0);
    const end = new Date(dt);
    const [eh, em] = ev.end.split(":").map(Number);
    end.setHours(eh, em, 0, 0);
    return { start: dt, end };
}
function fmtDiff(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = s % 60;
    if (h) return `${h}h ${m}m`;
    if (m >= 2) return `${m}m`;
    return `${m}m ${r}s`;
}

/* Compactar tarjetas según duración (para que no se corten) */
function classesForDuration(hours) {
    if (hours >= 2.5) {
        return { card: "p-2.5", title: "text-xs sm:text-sm md:text-[15px]", meta: "text-[11px] sm:text-xs md:text-sm" };
    } else if (hours >= 1.5) {
        return { card: "p-2", title: "text-[11px] sm:text-xs md:text-sm", meta: "text-[10px] sm:text-[11px] md:text-xs" };
    } else {
        return { card: "p-1.5", title: "text-[10px] sm:text-[11px] md:text-xs", meta: "text-[9px] sm:text-[10px] md:text-[11px]" };
    }
}

/* ========= APP ========= */
export default function App() {
    const [view, setView] = useState("week");
    const [selectedDay, setSelectedDay] = useState("Martes");

    // Responsive
    const wrapperRef = useRef(null);
    const weeklyRef = useRef(null);
    const [containerW, setContainerW] = useState(0);

    // Altura por hora FIJA (sin slider)
    const HOUR_H_DESKTOP = 90; // px por hora en PC (grande)
    const HOUR_H_MOBILE = 70; // px por hora en móvil (alto, para que quepa todo)
    const hoursColW = 90;
    const MIN_DAY_COL = 200;

    // Tiempo en vivo
    const [now, setNow] = useState(new Date());
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 30000);
        return () => clearInterval(t);
    }, []);

    // Observadores
    useEffect(() => {
        if (!wrapperRef.current) return;
        const obs = new ResizeObserver((e) => setContainerW(e[0].contentRect.width));
        obs.observe(wrapperRef.current);
        return () => obs.disconnect();
    }, []);

    // Agrupar por día
    const byDay = useMemo(() => {
        const map = Object.fromEntries(days.map((d) => [d, []]));
        for (const ev of scheduleData) (map[ev.day] ||= []).push(ev);
        for (const d of days) map[d].sort((a, b) => (a.start > b.start ? 1 : -1));
        return map;
    }, []);

    // Tamaños
    const isDesktop = containerW >= 1024;
    const contentPadding = 32;
    let dayColW;
    if (isDesktop) {
        const usable = Math.max(containerW - contentPadding, 0);
        dayColW = Math.max(MIN_DAY_COL, Math.floor((usable - hoursColW) / days.length));
    } else if (containerW >= 640) dayColW = 170;
    else dayColW = 160;

    const hourBase = isDesktop ? HOUR_H_DESKTOP : HOUR_H_MOBILE;
    const gridH = (END_HOUR - START_HOUR) * hourBase;

    const minWidthMobile = hoursColW + dayColW * days.length;
    const gridTemplate = `${hoursColW}px repeat(${days.length}, ${dayColW}px)`;

    // Eventos de esta semana + actual/próxima
    const baseMonday = startOfWeekMonday(now);
    const eventsThisWeek = scheduleData.map((ev) => ({ ev, ...concreteDateForEvent(ev, baseMonday) }));
    const current = eventsThisWeek.find(({ start, end }) => now >= start && now < end);
    let next = eventsThisWeek.filter(({ start }) => start > now).sort((a, b) => a.start - b.start)[0];
    if (!next) {
        const nextMon = new Date(baseMonday); nextMon.setDate(nextMon.getDate() + 7);
        next = scheduleData.map((ev) => ({ ev, ...concreteDateForEvent(ev, nextMon) })).sort((a, b) => a.start - b.start)[0];
    }

    // Notificación 10 min antes (mientras la página está abierta)
    const [notifOn, setNotifOn] = useState(false);
    const notifTimer = useRef(null);
    useEffect(() => {
        if (!notifOn || !next) return;
        if (!("Notification" in window) || Notification.permission !== "granted") return;
        const ms = next.start - now - 10 * 60 * 1000;
        if (ms <= 0) return;
        clearTimeout(notifTimer.current);
        notifTimer.current = setTimeout(() => {
            new Notification("¡Clase en 10 minutos!", {
                body: `${next.ev.subject} • ${next.ev.day} ${to12h(next.ev.start)} (${next.ev.campus})`,
            });
        }, ms);
        return () => clearTimeout(notifTimer.current);
    }, [notifOn, next, now]);
    const askPermission = async () => {
        if (!("Notification" in window)) return alert("Tu navegador no soporta notificaciones.");
        const res = await Notification.requestPermission();
        if (res !== "granted") alert("No se concedieron notificaciones.");
    };

    // PDF
    const downloadPDF = async () => {
        if (!weeklyRef.current) return;
        const canvas = await html2canvas(weeklyRef.current, { scale: 2, backgroundColor: "#fff" });
        const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const imgW = pageW - 40;
        const imgH = (canvas.height * imgW) / canvas.width;
        const y = Math.max(20, (pageH - imgH) / 2);
        pdf.addImage(canvas.toDataURL("image/png"), "PNG", 20, y, imgW, imgH);
        pdf.save("Horario_Semanal.pdf");
    };

    // Línea roja “ahora”
    const nowPct = (() => {
        const hh = now.getHours();
        const mm = now.getMinutes();
        const fromStart = hh + mm / 60 - START_HOUR;
        return (fromStart / (END_HOUR - START_HOUR)) * 100;
    })();

    const filtered = byDay[selectedDay] || [];

    return (
        <div className="mx-auto max-w-screen-2xl p-4 sm:p-6">
            <h1 className="text-3xl md:text-4xl font-bold mb-3">Horario Interactivo</h1>

            {/* Controles + estado */}
            <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between mb-3">
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => setView("day")} className={`px-4 h-11 rounded-xl shadow ${view === "day" ? "bg-gray-300" : "bg-gray-200"}`}>Vista por día</button>
                    <button onClick={() => setView("week")} className={`px-4 h-11 rounded-xl shadow ${view === "week" ? "bg-blue-700 text-white" : "bg-blue-600 text-white"}`}>Vista semanal</button>
                    {view === "week" && <button onClick={downloadPDF} className="px-4 h-11 rounded-xl shadow bg-emerald-600 text-white">Descargar PDF</button>}
                </div>

                <div className="flex items-center gap-3">
                    {current ? (
                        <span className="text-sm bg-orange-50 border rounded-xl px-3 py-2">
                            🔴 En curso: <b>{current.ev.subject}</b> — {current.ev.day} {to12h(current.ev.start)}–{to12h(current.ev.end)} • {current.ev.campus}
                        </span>
                    ) : next ? (
                        <span className="text-sm bg-blue-50 border rounded-xl px-3 py-2">
                            🕒 Próxima en <b>{fmtDiff(next.start - now)}</b>: {next.ev.subject} — {next.ev.day} {to12h(next.ev.start)} • {next.ev.campus}
                        </span>
                    ) : null}
                    <label className="text-sm flex items-center gap-2">
                        Avisarme 10 min
                        <input type="checkbox" checked={notifOn}
                            onChange={async (e) => { if (e.target.checked && (!("Notification" in window) || Notification.permission !== "granted")) await askPermission(); setNotifOn(e.target.checked); }} />
                    </label>
                </div>
            </div>

            {/* ===== VISTA POR DÍA ===== */}
            {view === "day" && (
                <div>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {days.map((d) => (
                            <button key={d} onClick={() => setSelectedDay(d)} className={`px-4 h-11 rounded-xl shadow ${selectedDay === d ? "bg-blue-600 text-white" : "bg-gray-200"}`}>{d}</button>
                        ))}
                    </div>
                    <div className="space-y-3">
                        {filtered.length ? filtered.map((it, i) => (
                            <div key={i} className={`p-4 rounded-2xl shadow text-white ${it.color}`}>
                                <h2 className="text-base sm:text-lg md:text-xl font-semibold break-words">{it.subject}</h2>
                                <p className="text-sm md:text-base">{to12h(it.start)} – {to12h(it.end)}</p>
                                <p className="text-sm md:text-base">{it.type} • {it.mode} • {it.campus}</p>
                            </div>
                        )) : <p className="text-gray-500">No hay clases este día.</p>}
                    </div>
                </div>
            )}

            {/* ===== VISTA SEMANAL ===== */}
            {view === "week" && (
                <div className="overflow-x-auto">
                    <div ref={wrapperRef} className="w-full">
                        <div
                            ref={weeklyRef}
                            className="bg-white rounded-2xl p-4 pt-5 shadow border mx-auto overflow-hidden" /* overflow-hidden recorta cualquier sangrado */
                            style={isDesktop ? { width: "100%" } : { minWidth: minWidthMobile }}
                        >
                            {/* Cabecera */}
                            <div className="grid sticky top-0 z-10 bg-white" style={{ gridTemplateColumns: gridTemplate }}>
                                <div />
                                {days.map((d) => (
                                    <div key={d} className="py-2 text-center font-semibold text-xs sm:text-sm md:text-base">{d}</div>
                                ))}
                            </div>

                            {/* Rejilla */}
                            <div className="relative" style={{ height: gridH }}>
                                {/* Líneas de hora */}
                                {Array.from({ length: END_HOUR - START_HOUR + 1 }).map((_, i) => {
                                    const hour = START_HOUR + i;
                                    const pct = (i / (END_HOUR - START_HOUR)) * 100;
                                    const label = to12h(`${String(hour).padStart(2, "0")}:00`);
                                    const labelCls = "text-[10px] sm:text-xs md:text-sm text-gray-500 pr-2 text-right" + (i === 0 ? "" : " -translate-y-1/2");
                                    return (
                                        <div key={hour} className="absolute left-0 right-0" style={{ top: `${pct}%` }}>
                                            <div className="grid items-start" style={{ gridTemplateColumns: gridTemplate }}>
                                                <div className={labelCls}>{label}</div>
                                                {days.map((d) => <div key={d} className="border-t border-gray-200" />)}
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Línea “ahora” */}
                                {nowPct >= 0 && nowPct <= 100 && (
                                    <div className="absolute left-0 right-0 pointer-events-none" style={{ top: `${nowPct}%` }}>
                                        <div className="grid" style={{ gridTemplateColumns: gridTemplate }}>
                                            <div />
                                            <div className="col-span-6 border-t-2 border-red-500"></div>
                                        </div>
                                    </div>
                                )}

                                {/* Columnas */}
                                {days.map((d, colIdx) => {
                                    const left = hoursColW + colIdx * dayColW;
                                    return (
                                        <div key={d} className="absolute top-0 bottom-0 overflow-hidden" style={{ left, width: dayColW }}>
                                            {(byDay[d] || []).map((ev, i) => {
                                                const startPct = clamp(hourToPct(ev.start));
                                                const endPct = clamp(hourToPct(ev.end));
                                                const rawTop = startPct;

                                                // Altura mínima en píxeles (para que siempre quepa el texto)
                                                const minPx = isDesktop ? 120 : 110;
                                                const minPct = (minPx / gridH) * 100;

                                                let rawH = Math.max(endPct - startPct, minPct);
                                                if (rawTop + rawH > 100) rawH = 100 - rawTop;

                                                const dur = diffInHours(ev.start, ev.end);
                                                const sz = classesForDuration(dur);

                                                const { start, end } = concreteDateForEvent(ev, baseMonday);
                                                const live = now >= start && now < end;

                                                return (
                                                    <div
                                                        key={i}
                                                        className={[
                                                            "absolute left-1 right-1 rounded-xl shadow text-white break-words whitespace-normal box-border",
                                                            "flex flex-col justify-start overflow-hidden",
                                                            ev.color, sz.card,
                                                            live ? "ring-4 ring-inset ring-red-400 ring-offset-2 ring-offset-white" : "",
                                                        ].join(" ")}
                                                        style={{ top: `${rawTop}%`, height: `${rawH}%`, lineHeight: 1.08 }}
                                                    >
                                                        <div className={["font-semibold leading-[1.1] tracking-tight", sz.title].join(" ")}>
                                                            {ev.subject}
                                                        </div>
                                                        <div className={["opacity-95 leading-[1.1]", sz.meta].join(" ")}>
                                                            {to12h(ev.start)} – {to12h(ev.end)}
                                                        </div>
                                                        <div className={["opacity-90 leading-[1.1]", sz.meta].join(" ")}>
                                                            {ev.type} • {ev.mode} • {ev.campus}
                                                        </div>
                                                        {live && <div className="mt-0.5 text-[10px] font-bold">EN CURSO</div>}
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
                En móvil puedes deslizar horizontalmente; en PC ocupa todo el ancho. Los bloques no se
                salen de la grilla y tienen altura mínima para que el texto siempre quepa.
            </p>
        </div>
    );
}
