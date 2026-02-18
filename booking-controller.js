/**
 * AeroJump Gualeguaychú - Booking Controller
 * Gestiona la agenda, lógica de cupos y el flujo de navegación entre turnos.
 * Incluye el nuevo flujo de "Opciones del Día" para ver/editar/borrar.
 */

import { 
    onSnapshot, query, where, addDoc, updateDoc, deleteDoc, Timestamp 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { auth, getPublicCollection, getPublicDoc } from "./firebase-config.js";
import { openModal, closeModals, showMessage } from "./ui-controller.js";

// --- ESTADO INTERNO ---
let allMonthBookings = [];
let currentMonthDate = new Date();
const MAX_CAPACITY = 30; // Cupo máximo de saltadores por hora
const OPERATING_HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];

/**
 * Escucha cambios en las reservas del mes actual en tiempo real.
 */
export function syncBookings() {
    const y = currentMonthDate.getFullYear();
    const m = String(currentMonthDate.getMonth() + 1).padStart(2, '0');
    const monthYear = `${y}-${m}`;
    
    const q = query(getPublicCollection("bookings"), where("monthYear", "==", monthYear));
    
    onSnapshot(q, (snapshot) => {
        allMonthBookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderCalendar();
    }, (error) => console.error("AeroJump Agenda Sync Error:", error));
}

/**
 * Dibuja el calendario mensual y asigna los disparadores de clics.
 */
export function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const [y, m] = [currentMonthDate.getFullYear(), currentMonthDate.getMonth()];
    const firstDay = new Date(y, m, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1; // Ajuste para que lunes sea 0
    const lastDate = new Date(y, m + 1, 0).getDate();

    document.getElementById('current-month-year').textContent = 
        new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(currentMonthDate).toUpperCase();

    // Relleno de días del mes anterior
    for (let i = 0; i < offset; i++) {
        const empty = document.createElement('div');
        empty.className = 'day-cell opacity-20 pointer-events-none';
        grid.appendChild(empty);
    }

    // Creación de días del mes actual
    for (let i = 1; i <= lastDate; i++) {
        const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const dayBookings = allMonthBookings.filter(b => b.day === dateStr);
        
        const cell = document.createElement('div');
        cell.className = 'day-cell';
        cell.innerHTML = `<span class="font-black text-slate-300 text-lg">${i}</span>`;
        
        if (dayBookings.length > 0) {
            const badge = document.createElement('div');
            badge.className = 'flex justify-end';
            badge.innerHTML = `<span class="badge-type" style="font-size:10px">${dayBookings.length} Turnos</span>`;
            cell.appendChild(badge);
        }

        // Lógica de navegación solicitada:
        cell.onclick = () => {
            if (dayBookings.length > 0) {
                openDayOptions(dateStr, dayBookings);
            } else {
                openBookingForm(dateStr);
            }
        };
        grid.appendChild(cell);
    }
}

/**
 * Abre el modal intermedio de gestión para ver, editar o borrar turnos.
 */
function openDayOptions(dateStr, dayBookings) {
    const list = document.getElementById('day-bookings-list');
    document.getElementById('options-modal-date').textContent = dateStr;
    list.innerHTML = '';

    // Renderizado simple de cada turno del día
    dayBookings.forEach(b => {
        const hoursText = b.courtHours.sort((a,b) => a-b).map(h => `${h}:00`).join(', ');
        
        const card = document.createElement('div');
        card.className = 'booking-option-card flex justify-between items-center p-4 bg-white border border-slate-100 rounded-2xl mb-2 hover:border-violet-400 transition-all';
        card.innerHTML = `
            <div class="text-left leading-tight">
                <p class="font-black text-sm uppercase text-slate-900">${b.teamName}</p>
                <p class="text-[10px] font-bold text-slate-400 italic">${hoursText}</p>
                <p class="text-[9px] font-black text-violet-600 mt-1">${b.peopleCount} personas</p>
            </div>
            <div class="flex gap-2">
                <button onclick="window.editBooking('${b.id}')" title="Ver/Editar" class="p-2 bg-slate-100 rounded-lg hover:bg-black hover:text-white transition-all">✏️</button>
                <button onclick="window.deleteBooking('${b.id}')" title="Eliminar" class="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all">🗑️</button>
            </div>
        `;
        list.appendChild(card);
    });

    // Botón para agregar una nueva reserva en este mismo día
    document.getElementById('add-new-from-options').onclick = () => {
        closeModals();
        openBookingForm(dateStr);
    };

    openModal('day-options-modal');
}

/**
 * Prepara y abre el formulario de reserva (Nueva o Edición).
 */
export function openBookingForm(dateStr, booking = null) {
    const form = document.getElementById('booking-form');
    form.reset();

    // Poblado de datos base
    document.getElementById('booking-date').value = dateStr;
    document.getElementById('booking-id').value = booking ? booking.id : "";
    document.getElementById('teamName').value = booking ? booking.teamName : "";
    document.getElementById('peopleCount').value = booking ? booking.peopleCount : 1;
    document.getElementById('costPerHour').value = booking ? booking.unitPrice : 5000;
    document.getElementById('booking-payment-method').value = booking ? booking.paymentMethod : "efectivo";
    
    // Si es edición, mostramos el badge correcto
    const label = document.getElementById('booking-type-label');
    if (label) label.textContent = booking ? "Editando Turno" : "Nueva Reserva";

    renderTimeSlots(booking ? booking.courtHours : []);
    updateBookingTotal();
    openModal('booking-modal');
}

/**
 * Calcula disponibilidad y dibuja los slots de horarios.
 */
function renderTimeSlots(selected = []) {
    const list = document.getElementById('court-hours-list');
    if (!list) return;
    list.innerHTML = '';
    
    const date = document.getElementById('booking-date').value;
    const editingId = document.getElementById('booking-id').value;
    const jumpers = parseInt(document.getElementById('peopleCount').value) || 1;

    OPERATING_HOURS.forEach(h => {
        // Cálculo de ocupación real sumando jumpers de otros turnos en esa hora
        const occupied = allMonthBookings
            .filter(b => b.day === date && b.id !== editingId && b.courtHours.includes(h))
            .reduce((acc, curr) => acc + (parseInt(curr.peopleCount) || 0), 0);

        const free = MAX_CAPACITY - occupied;
        const canFit = free >= jumpers;

        const btn = document.createElement('div');
        btn.className = `time-slot ${!canFit ? 'disabled' : ''} ${selected.includes(h) ? 'selected' : ''}`;
        btn.innerHTML = `<strong>${h}:00</strong><br><small>${free} libres</small>`;

        if (canFit) {
            btn.onclick = () => {
                btn.classList.toggle('selected');
                updateBookingTotal();
            };
        }
        list.appendChild(btn);
    });
}

/**
 * Procesa el guardado (Alta o Modificación) en Firestore.
 */
export async function handleSaveBooking(e) {
    e.preventDefault();
    const hrs = Array.from(document.querySelectorAll('.time-slot.selected'))
                     .map(el => parseInt(el.querySelector('strong').innerText));

    if (hrs.length === 0) return showMessage("Seleccioná al menos un horario");

    const data = {
        teamName: document.getElementById('teamName').value.trim().toUpperCase(),
        peopleCount: parseInt(document.getElementById('peopleCount').value),
        unitPrice: parseFloat(document.getElementById('costPerHour').value),
        paymentMethod: document.getElementById('booking-payment-method').value,
        day: document.getElementById('booking-date').value,
        monthYear: document.getElementById('booking-date').value.substring(0, 7),
        courtHours: hrs,
        type: 'court',
        totalPrice: hrs.length * parseFloat(document.getElementById('costPerHour').value) * parseInt(document.getElementById('peopleCount').value),
        timestamp: Timestamp.now(),
        adminEmail: auth.currentUser?.email || "admin@aerojump.com"
    };

    try {
        const id = document.getElementById('booking-id').value;
        if (id) {
            await updateDoc(getPublicDoc("bookings", id), data);
            showMessage("¡TURNO EDITADO! ✅");
        } else {
            await addDoc(getPublicCollection("bookings"), data);
            showMessage("¡RESERVA GUARDADA! ✅");
        }
        
        closeModals();
    } catch (err) {
        console.error(err);
        showMessage("Error al guardar", true);
    }
}

/**
 * Vinculación Global: Edición (Llamada desde el listado de opciones)
 */
window.editBooking = (id) => {
    const b = allMonthBookings.find(x => x.id === id);
    if (!b) return;
    closeModals(); // Cerramos el modal de opciones
    openBookingForm(b.day, b); // Abrimos el formulario con los datos cargados
};

/**
 * Vinculación Global: Eliminación (Llamada desde el listado de opciones)
 */
window.deleteBooking = async (id) => {
    if (confirm("¿Confirmás la eliminación definitiva de esta reserva?")) {
        try {
            await deleteDoc(getPublicDoc("bookings", id));
            closeModals();
            showMessage("Reserva eliminada.");
        } catch (e) {
            console.error(e);
            showMessage("Error al eliminar", true);
        }
    }
};

/**
 * Control de cantidad de saltadores (Ajuste rápido +/-)
 */
export function adjustJumpers(delta) {
    const input = document.getElementById('peopleCount');
    let val = (parseInt(input.value) || 1) + delta;
    if (val < 1) val = 1; 
    if (val > MAX_CAPACITY) val = MAX_CAPACITY;
    input.value = val;
    
    // Refrescamos disponibilidad de slots según el nuevo número de gente
    renderTimeSlots(Array.from(document.querySelectorAll('.time-slot.selected'))
                         .map(el => parseInt(el.querySelector('strong').innerText)));
    updateBookingTotal();
}

/**
 * Cálculo visual del total acumulado.
 */
export function updateBookingTotal() {
    const hrs = document.querySelectorAll('.time-slot.selected').length;
    const price = parseFloat(document.getElementById('costPerHour').value) || 0;
    const people = parseInt(document.getElementById('peopleCount').value) || 1;
    const total = hrs * price * people;
    document.getElementById('booking-total').textContent = `$${total.toLocaleString('es-AR')}`;
}

// Navegación de meses
export function prevMonth() { currentMonthDate.setMonth(currentMonthDate.getMonth() - 1); syncBookings(); }
export function nextMonth() { currentMonthDate.setMonth(currentMonthDate.getMonth() + 1); syncBookings(); }
