/**
 * AeroJump Gualeguaychú - Finance Controller Module
 * Gestiona el arqueo de caja unificado y las estadísticas de fidelidad.
 */

import { 
    query, getDocs, orderBy 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getPublicCollection } from "./firebase-config.js";
import { showMessage, hideMessage } from "./ui-controller.js";

// --- REFERENCIAS DOM ---
const cajaTotalCombined = document.getElementById('caja-total-combined');
const cajaDailyList = document.getElementById('caja-daily-list');
const statsList = document.getElementById('stats-list');

/**
 * Carga y procesa todos los movimientos para el arqueo de caja.
 * Cruza datos de la colección 'sales' y 'bookings'.
 */
export async function loadCajaData() {
    showMessage("Calculando arqueo...");
    
    try {
        // Obtenemos los datos (Regla 2: Sin filtros complejos para evitar errores de índice)
        const qSales = query(getPublicCollection("sales"), orderBy("timestamp", "desc"));
        const qBookings = query(getPublicCollection("bookings"), orderBy("timestamp", "desc"));

        const [salesSnap, bookingsSnap] = await Promise.all([
            getDocs(qSales),
            getDocs(qBookings)
        ]);

        let totalGeneral = 0;
        const dailySummary = {};

        // 1. Procesar ingresos por Kiosco
        salesSnap.forEach(doc => {
            const data = doc.data();
            const monto = parseFloat(data.total) || 0;
            totalGeneral += monto;
            
            if (!dailySummary[data.day]) {
                dailySummary[data.day] = { bookings: 0, sales: 0 };
            }
            dailySummary[data.day].sales += monto;
        });

        // 2. Procesar ingresos por Saltos/Eventos
        bookingsSnap.forEach(doc => {
            const data = doc.data();
            const monto = parseFloat(data.totalPrice) || 0;
            totalGeneral += monto;
            
            if (!dailySummary[data.day]) {
                dailySummary[data.day] = { bookings: 0, sales: 0 };
            }
            dailySummary[data.day].bookings += monto;
        });

        // Actualizamos el total destacado en la UI
        if (cajaTotalCombined) {
            cajaTotalCombined.textContent = `$${totalGeneral.toLocaleString('es-AR')}`;
        }

        renderCajaSummary(dailySummary);
        hideMessage();
        
    } catch (error) {
        console.error("AeroJump Finance Error:", error);
        showMessage("Error al procesar arqueo", true);
    }
}

/**
 * Renderiza la lista de balances diarios con diseño de alto contraste.
 */
function renderCajaSummary(summary) {
    if (!cajaDailyList) return;
    cajaDailyList.innerHTML = '';

    // Ordenamos los días de forma descendente (más reciente arriba)
    const sortedDays = Object.keys(summary).sort((a, b) => b.localeCompare(a));

    if (sortedDays.length === 0) {
        cajaDailyList.innerHTML = `
            <div class="py-10 text-center opacity-20 italic uppercase font-black">
                Sin movimientos registrados
            </div>
        `;
        return;
    }

    sortedDays.forEach(day => {
        const data = summary[day];
        const [y, m, d] = day.split('-');
        const totalDia = data.bookings + data.sales;
        
        const item = document.createElement('div');
        // Estilo armónico: fondo blanco, borde suave, acento en violeta
        item.className = 'bg-white p-6 rounded-[2rem] border-2 border-slate-100 flex justify-between items-center mb-4 transition-all hover:border-violet-300 shadow-sm';
        
        item.innerHTML = `
            <div class="text-left leading-none">
                <p class="font-black text-xl text-slate-900 mb-2 italic">${d}/${m}/${y}</p>
                <div class="flex gap-2">
                    <span class="text-[8px] font-black px-2 py-1 bg-violet-50 text-violet-700 rounded-lg uppercase">Saltos: $${data.bookings.toLocaleString()}</span>
                    <span class="text-[8px] font-black px-2 py-1 bg-orange-50 text-orange-700 rounded-lg uppercase">Kiosco: $${data.sales.toLocaleString()}</span>
                </div>
            </div>
            <div class="text-right">
                <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Total Neto</p>
                <strong class="text-2xl font-black text-slate-900 tracking-tighter">
                    $${totalDia.toLocaleString()}
                </strong>
            </div>
        `;
        cajaDailyList.appendChild(item);
    });
}

/**
 * Genera el ranking de mejores clientes basado en volumen de reservas.
 */
export async function loadStatsData() {
    if (!statsList) return;
    
    try {
        const q = query(getPublicCollection("bookings"));
        const snap = await getDocs(q);
        
        const ranking = {};
        snap.forEach(doc => {
            const name = doc.data().teamName;
            if (name) {
                ranking[name] = (ranking[name] || 0) + 1;
            }
        });

        // Convertimos a array y ordenamos por cantidad de saltos
        const sorted = Object.entries(ranking)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10); // Top 10

        if (sorted.length === 0) {
            statsList.innerHTML = '<p class="py-10 text-center opacity-30 font-black italic">Sin datos acumulados</p>';
            return;
        }

        statsList.innerHTML = sorted.map(([name, count], idx) => `
            <div class="bg-white p-6 rounded-[2.5rem] border-2 border-slate-100 flex justify-between items-center mb-4 italic font-black uppercase shadow-sm">
                <div class="flex items-center gap-4">
                    <span class="w-8 h-8 flex items-center justify-center bg-violet-600 text-white rounded-full text-xs">#${idx + 1}</span>
                    <div class="text-left">
                        <p class="text-xl text-slate-900 tracking-tighter">${name}</p>
                        <p class="text-[9px] text-slate-400 tracking-widest leading-none">Cliente Destacado AeroJump</p>
                    </div>
                </div>
                <div class="bg-slate-900 text-white px-5 py-2 rounded-2xl shadow-lg">
                    <span class="text-lg">${count}</span> <small class="text-[9px]">Saltos</small>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error("Stats Error:", error);
    }
}
