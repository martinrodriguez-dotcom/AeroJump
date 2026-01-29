/**
 * AeroJump Gualeguaychú - Finance Controller Module
 * Gestiona los arqueos de caja, el balance neto y las estadísticas de clientes.
 */

import { 
    query, getDocs, orderBy 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getPublicCollection } from "./firebase-config.js";
import { showMessage, hideMessage } from "./ui-controller.js";

// Referencias DOM
const cajaTotalCombined = document.getElementById('caja-total-combined');
const cajaDailyList = document.getElementById('caja-daily-list');
const statsList = document.getElementById('stats-list');

/**
 * Carga y procesa todos los movimientos de dinero para el arqueo.
 */
export async function loadCajaData() {
    showMessage("Calculando balance...");
    
    try {
        // Consultamos ventas y reservas (Regla 2: Sin filtros complejos para evitar errores de índice)
        const qSales = query(getPublicCollection("sales"), orderBy("timestamp", "desc"));
        const qBookings = query(getPublicCollection("bookings"), orderBy("timestamp", "desc"));

        const [salesSnap, bookingsSnap] = await Promise.all([
            getDocs(qSales),
            getDocs(qBookings)
        ]);

        let totalGeneral = 0;
        const dailySummary = {};

        // 1. Procesar Ventas de Kiosco
        salesSnap.forEach(doc => {
            const data = doc.data();
            const monto = parseFloat(data.total) || 0;
            totalGeneral += monto;
            
            if (!dailySummary[data.day]) {
                dailySummary[data.day] = { bookings: 0, sales: 0 };
            }
            dailySummary[data.day].sales += monto;
        });

        // 2. Procesar Cobros de Reservas
        bookingsSnap.forEach(doc => {
            const data = doc.data();
            const monto = parseFloat(data.totalPrice) || 0;
            totalGeneral += monto;
            
            if (!dailySummary[data.day]) {
                dailySummary[data.day] = { bookings: 0, sales: 0 };
            }
            dailySummary[data.day].bookings += monto;
        });

        // Actualizar el Total Gigante en pantalla
        if (cajaTotalCombined) {
            cajaTotalCombined.textContent = `$${totalGeneral.toLocaleString('es-AR')}`;
        }

        renderCajaList(dailySummary);
        hideMessage();
    } catch (error) {
        console.error("Error en arqueo:", error);
        showMessage("Error al cargar finanzas", true);
    }
}

/**
 * Renderiza la lista de balances diarios con diseño de alto contraste.
 */
function renderCajaList(summary) {
    if (!cajaDailyList) return;
    cajaDailyList.innerHTML = '';

    // Ordenar por fecha descendente
    const sortedDays = Object.keys(summary).sort((a, b) => b.localeCompare(a));

    if (sortedDays.length === 0) {
        cajaDailyList.innerHTML = `
            <p class="text-center py-10 text-slate-400 font-black uppercase italic">No hay movimientos registrados</p>
        `;
        return;
    }

    sortedDays.forEach(day => {
        const data = summary[day];
        const [y, m, d] = day.split('-');
        const totalDia = data.bookings + data.sales;
        
        const item = document.createElement('div');
        item.className = 'bg-white p-6 rounded-[2.5rem] shadow-sm border-2 border-slate-100 flex justify-between items-center mb-4 italic transition-all hover:border-violet-300';
        item.innerHTML = `
            <div class="text-left leading-none">
                <p class="font-black text-2xl text-slate-900 mb-2">${d}/${m}/${y}</p>
                <div class="flex gap-3">
                    <span class="text-[9px] font-black px-2 py-1 bg-violet-50 text-violet-700 rounded-lg uppercase">Saltos: $${data.bookings.toLocaleString()}</span>
                    <span class="text-[9px] font-black px-2 py-1 bg-orange-50 text-orange-700 rounded-lg uppercase">Kiosco: $${data.sales.toLocaleString()}</span>
                </div>
            </div>
            <div class="text-right">
                <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Día</p>
                <strong class="text-3xl font-black text-slate-900 tracking-tighter">
                    $${totalDia.toLocaleString()}
                </strong>
            </div>
        `;
        cajaDailyList.appendChild(item);
    });
}

/**
 * Genera el ranking de mejores clientes basado en cantidad de reservas.
 */
export async function loadStatsData() {
    if (!statsList) return;
    
    try {
        const q = query(getPublicCollection("bookings"));
        const snap = await getDocs(q);
        
        const ranking = {};
        snap.forEach(doc => {
            const team = doc.data().teamName;
            if (team) {
                ranking[team] = (ranking[team] || 0) + 1;
            }
        });

        // Convertir objeto a array, ordenar por saltos y tomar los 10 mejores
        const sorted = Object.entries(ranking)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        if (sorted.length === 0) {
            statsList.innerHTML = '<p class="text-center text-slate-400 font-black uppercase italic py-10">Sin datos de clientes</p>';
            return;
        }

        statsList.innerHTML = sorted.map(([name, count], index) => `
            <div class="bg-white p-7 rounded-[3rem] shadow-md border-2 border-slate-100 flex justify-between items-center mb-5 italic font-black uppercase relative overflow-hidden group">
                <div class="absolute top-0 left-0 w-2 h-full bg-violet-500"></div>
                <div class="text-left">
                    <div class="flex items-center gap-3">
                        <span class="text-violet-600 text-sm">#${index + 1}</span>
                        <span class="text-slate-900 text-2xl tracking-tighter">${name}</span>
                    </div>
                    <p class="text-[10px] text-slate-400 mt-1 tracking-widest leading-none">Miembro distinguido AeroJump</p>
                </div>
                <div class="text-right">
                    <span class="bg-violet-950 text-white px-6 py-3 rounded-2xl shadow-xl italic font-black text-xl">
                        ${count} Saltos
                    </span>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error("Error en estadísticas:", error);
    }
}
