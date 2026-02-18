/**
 * AeroJump Gualeguaychú - Finance Controller Module
 * Gestión de Arqueo de Caja Real, Registro de Gastos y Auditoría Detallada.
 */

import { 
    query, getDocs, orderBy, addDoc, Timestamp 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { auth, getPublicCollection } from "./firebase-config.js";
import { showMessage, hideMessage, openModal, closeModals } from "./ui-controller.js";

// --- ESTADO LOCAL ---
let groupedDailyData = {}; // Almacena el desglose de cada día para el modal de auditoría

/**
 * Carga y unifica todos los movimientos financieros.
 */
export async function loadCajaData() {
    const list = document.getElementById('caja-daily-list');
    const totalDisplay = document.getElementById('caja-total-combined');
    if (!list) return;

    showMessage("Sincronizando caja...");

    try {
        // Obtenemos los 3 pilares financieros
        const qSales = query(getPublicCollection("sales"), orderBy("timestamp", "desc"));
        const qBookings = query(getPublicCollection("bookings"), orderBy("timestamp", "desc"));
        const qExpenses = query(getPublicCollection("expenses"), orderBy("timestamp", "desc"));

        const [salesSnap, bookingsSnap, expensesSnap] = await Promise.all([
            getDocs(qSales),
            getDocs(qBookings),
            getDocs(qExpenses)
        ]);

        let totalNeto = 0;
        groupedDailyData = {}; // Reset de datos agrupados

        // 1. Procesar Ventas Kiosco (Ingresos)
        salesSnap.forEach(doc => {
            const data = doc.data();
            const monto = parseFloat(data.total) || 0;
            totalNeto += monto;
            ensureDayEntry(data.day);
            groupedDailyData[data.day].salesTotal += monto;
            groupedDailyData[data.day].items.push({ 
                type: 'venta', 
                label: data.name, 
                qty: data.qty, 
                amount: monto,
                method: data.paymentMethod 
            });
        });

        // 2. Procesar Reservas (Ingresos)
        bookingsSnap.forEach(doc => {
            const data = doc.data();
            const monto = parseFloat(data.totalPrice) || 0;
            totalNeto += monto;
            ensureDayEntry(data.day);
            groupedDailyData[data.day].bookingsTotal += monto;
            groupedDailyData[data.day].items.push({ 
                type: 'turno', 
                label: `Turno: ${data.teamName}`, 
                qty: data.peopleCount, 
                amount: monto,
                method: data.paymentMethod 
            });
        });

        // 3. Procesar Gastos (Egresos)
        expensesSnap.forEach(doc => {
            const data = doc.data();
            const monto = parseFloat(data.total) || 0;
            totalNeto -= monto; // El gasto resta del neto
            ensureDayEntry(data.day);
            groupedDailyData[data.day].expensesTotal += monto;
            groupedDailyData[data.day].items.push({ 
                type: 'gasto', 
                label: data.concept, 
                qty: 1, 
                amount: -monto, // Negativo visual
                method: 'efectivo' 
            });
        });

        // Actualizar visual de Caja Total
        if (totalDisplay) totalDisplay.textContent = `$${totalNeto.toLocaleString('es-AR')}`;

        renderCajaRows();
        hideMessage();

    } catch (error) {
        console.error("Finance Error:", error);
        showMessage("Error al cargar finanzas", true);
    }
}

/**
 * Auxiliar para inicializar la estructura de un día si no existe.
 */
function ensureDayEntry(day) {
    if (!groupedDailyData[day]) {
        groupedDailyData[day] = {
            salesTotal: 0,
            bookingsTotal: 0,
            expensesTotal: 0,
            items: []
        };
    }
}

/**
 * Dibuja las filas principales del arqueo (una por día).
 */
function renderCajaRows() {
    const container = document.getElementById('caja-daily-list');
    container.innerHTML = '';

    const sortedDays = Object.keys(groupedDailyData).sort((a, b) => b.localeCompare(a));

    if (sortedDays.length === 0) {
        container.innerHTML = '<div class="py-20 text-center opacity-20 font-black italic">Sin movimientos registrados</div>';
        return;
    }

    sortedDays.forEach(day => {
        const d = groupedDailyData[day];
        const [y, m, dayNum] = day.split('-');
        const netoDia = (d.salesTotal + d.bookingsTotal) - d.expensesTotal;

        const row = document.createElement('div');
        row.className = 'bg-white p-6 rounded-[2rem] border-2 border-slate-100 flex justify-between items-center mb-4 transition-all hover:border-violet-400 hover:shadow-xl cursor-pointer group active:scale-[0.98]';
        row.onclick = () => window.openDailyAudit(day);

        row.innerHTML = `
            <div class="text-left leading-none">
                <p class="font-black text-2xl text-slate-900 mb-2 italic">${dayNum}/${m}/${y}</p>
                <div class="flex gap-2">
                    <span class="text-[8px] font-black px-2 py-1 bg-violet-50 text-violet-700 rounded-lg uppercase">Saltos: $${d.bookingsTotal.toLocaleString()}</span>
                    <span class="text-[8px] font-black px-2 py-1 bg-orange-50 text-orange-700 rounded-lg uppercase">Kiosco: $${d.salesTotal.toLocaleString()}</span>
                    ${d.expensesTotal > 0 ? `<span class="text-[8px] font-black px-2 py-1 bg-red-50 text-red-600 rounded-lg uppercase">Gastos: -$${d.expensesTotal.toLocaleString()}</span>` : ''}
                </div>
            </div>
            <div class="text-right flex items-center gap-4">
                <div>
                    <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Neto Diario</p>
                    <strong class="text-3xl font-black text-slate-900 font-mono tracking-tighter">$${netoDia.toLocaleString()}</strong>
                </div>
                <span class="text-xl opacity-20 group-hover:opacity-100 transition-opacity">▶</span>
            </div>
        `;
        container.appendChild(row);
    });
}

/**
 * Abre el desglose detallado de un día específico.
 */
export function openDailyAudit(day) {
    const data = groupedDailyData[day];
    if (!data) return;

    const list = document.getElementById('audit-items-list');
    const dateLabel = document.getElementById('audit-modal-date');
    const totalLabel = document.getElementById('audit-modal-total');

    dateLabel.textContent = day;
    list.innerHTML = '';
    let neto = 0;

    data.items.forEach(item => {
        neto += item.amount;
        const row = document.createElement('div');
        row.className = 'flex justify-between items-center p-4 hover:bg-slate-50 transition-colors italic font-bold';
        
        const isIncome = item.amount > 0;
        const colorClass = isIncome ? (item.type === 'venta' ? 'text-orange-600' : 'text-violet-600') : 'text-red-500';
        const icon = item.type === 'venta' ? '🥤' : (item.type === 'turno' ? '🚀' : '💸');

        row.innerHTML = `
            <div class="flex items-center gap-4">
                <span class="text-xl">${icon}</span>
                <div class="leading-tight">
                    <p class="text-sm uppercase text-slate-800">${item.label}</p>
                    <p class="text-[9px] text-slate-400 uppercase tracking-widest">${item.qty} unidad/es • ${item.method}</p>
                </div>
            </div>
            <span class="font-mono text-lg ${colorClass}">${isIncome ? '+' : ''}$${item.amount.toLocaleString()}</span>
        `;
        list.appendChild(row);
    });

    totalLabel.textContent = `$${neto.toLocaleString()}`;
    openModal('daily-audit-modal');
}

/**
 * Manejo de Gastos Manuales.
 */
export function openExpenseModal() {
    document.getElementById('expense-form').reset();
    openModal('expense-modal');
}

export async function handleConfirmExpense(e) {
    e.preventDefault();
    const concept = document.getElementById('exp-name').value.trim().toUpperCase();
    const total = parseFloat(document.getElementById('exp-total').value);

    if (!concept || isNaN(total)) return;

    const now = new Date();
    const dayStr = now.toISOString().split('T')[0];

    try {
        showMessage("REGISTRANDO GASTO...");
        await addDoc(getPublicCollection("expenses"), {
            concept,
            total,
            day: dayStr,
            monthYear: dayStr.substring(0, 7),
            timestamp: Timestamp.now(),
            adminEmail: auth.currentUser?.email || "admin@aerojump.com"
        });

        closeModals();
        showMessage("GASTO ANOTADO! 💸");
        loadCajaData(); // Recargar datos
    } catch (err) {
        console.error(err);
        showMessage("Error al guardar gasto", true);
    }
}

/**
 * Rankings de Clientes.
 */
export async function loadStatsData() {
    const list = document.getElementById('stats-list');
    if (!list) return;

    try {
        const snap = await getDocs(getPublicCollection("bookings"));
        const stats = {};

        snap.forEach(doc => {
            const name = doc.data().teamName;
            if (name) stats[name] = (stats[name] || 0) + 1;
        });

        const sorted = Object.entries(stats).sort((a, b) => b[1] - a[1]).slice(0, 10);
        
        list.innerHTML = sorted.length ? sorted.map(([name, count], idx) => `
            <div class="bg-white p-6 rounded-[2.5rem] border-2 border-slate-100 flex justify-between items-center mb-4 italic font-black uppercase shadow-sm">
                <div class="flex items-center gap-4">
                    <span class="w-10 h-10 flex items-center justify-center bg-violet-600 text-white rounded-full text-xs shadow-lg">#${idx + 1}</span>
                    <div class="text-left leading-none">
                        <p class="text-xl text-slate-900 tracking-tighter">${name}</p>
                        <p class="text-[8px] text-slate-400 mt-1 uppercase tracking-widest">Cliente Platinum</p>
                    </div>
                </div>
                <div class="bg-slate-900 text-white px-6 py-2 rounded-2xl shadow-xl">
                    <span class="text-lg font-mono">${count}</span> <small class="text-[8px]">TURNOS</small>
                </div>
            </div>
        `).join('') : '<p class="py-10 text-center opacity-30 italic font-black">Sin datos registrados</p>';

    } catch (e) {
        console.error(e);
    }
}

// Vinculación global para que el HTML encuentre las funciones al hacer click
window.openDailyAudit = openDailyAudit;
