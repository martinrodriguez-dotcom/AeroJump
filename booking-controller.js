/**
 * AeroJump Gualeguaychú - Booking Controller Module
 * Gestiona la agenda, lógica de cupos, medios de pago y diseño Bento.
 */

import { 
    onSnapshot, query, where, addDoc, updateDoc, deleteDoc, Timestamp 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getPublicCollection, getPublicDoc, auth } from "./firebase-config.js";
import { openModal, closeModals, showMessage } from "./ui-controller.js";

// --- ESTADO INTERNO ---
let allMonthBookings = [];
let currentMonthDate = new Date();
const MAX_CAPACITY = 30;
const OPERATING_HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];

/**
 * Sincroniza las reservas del mes actual desde Firestore.
 */
export function syncBookings() {
    const y = currentMonthDate.getFullYear();
    const m = String(currentMonthDate.getMonth() + 1).padStart(2, '0');
    const monthYear = `${y}-${m}`;
    
    const q = query(getPublicCollection("bookings"), where("monthYear", "==", monthYear));
    
    onSnapshot(q, (snapshot) => {
        allMonthBookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderCalendar();
    }, (error) => {
        console.error("Error AeroJump Sync:", error);
    });
}

/**
 * Renderiza el grid del calendario con indicadores visuales.
 */
export function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const [y, m] = [currentMonthDate.getFullYear(), currentMonthDate.getMonth()];
    const firstDay = new Date(y, m, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const lastDate = new Date(y, m + 1, 0).getDate();

    const monthName = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(currentMonthDate);
    document.getElementById('current-month-year').textContent = monthName.toUpperCase();

    // Celdas vacías mes anterior
    for (let i = 0; i < offset; i++) {
        const empty = document.createElement('div');
        empty.className = 'day-cell opacity-10 bg-slate-100 border-dashed';
        grid.appendChild(empty);
    }

    // Celdas de días activos
    for (let i = 1; i <= lastDate; i++) {
        const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const dayBookings = allMonthBookings.filter(b => b.day === dateStr);
        const hasEvent = dayBookings.some(b => b.type === 'event');
        
        const cell = document.createElement('div');
        cell.className = `day-cell bg-white border-slate-100 shadow-sm ${hasEvent ? 'border-orange-500' : ''}`;
        cell.innerHTML = `<span class="font-black ${hasEvent ? 'text-orange-600' : 'text-slate-300'} text-lg">${i}</span>`;
        
        if (dayBookings.length > 0) {
            const badgeContainer = document.createElement('div');
            badgeContainer.className = 'flex flex-wrap gap-1 justify-end';
            dayBookings.forEach(b => {
                const badge = document.createElement('span');
                badge.className = `booking-badge ${b.type === 'event' ? 'event' : ''}`;
                badge.textContent = b.type === 'event' ? 'E' : 'S';
                badgeContainer.appendChild(badge);
            });
            cell.appendChild(badgeContainer);
        }

        cell.onclick = () => openBookingForm(dateStr);
        grid.appendChild(cell);
    }
}

/**
 * Abre el formulario unificado de reserva.
 */
function openBookingForm(dateStr) {
    // Reset del esqueleto
    const form = document.getElementById('booking-form');
    if (form) form.reset();

    document.getElementById('booking-date').value = dateStr;
    document.getElementById('booking-id').value = "";
    document.getElementById('booking-type').value = "court"; // Por defecto Salto
    document.getElementById('booking-total').textContent = "$0";
    
    // El precio lo tomamos de un valor por defecto o configuración
    document.getElementById('costPerHour').value = "5000"; 
    
    renderTimeSlots();
    openModal('booking-modal');
}

/**
 * Inyecta los slots de tiempo con lógica de capacidad.
 */
function renderTimeSlots(selected = []) {
    const list = document.getElementById('court-hours-list');
    if (!list) return;
    list.innerHTML = '';
    
    const date = document.getElementById('booking-date').value;
    const editingId = document.getElementById('booking-id').value;
    const currentJumpers = parseInt(document.getElementById('peopleCount').value) || 1;

    OPERATING_HOURS.forEach(h => {
        // Cálculo de ocupación
        const occupied = allMonthBookings
            .filter(b => b.day === date && b.id !== editingId && b.courtHours.includes(h))
            .reduce((acc, curr) => acc + (parseInt(curr.peopleCount) || 0), 0);

        const free = MAX_CAPACITY - occupied;
        const canFit = free >= currentJumpers;

        const btn = document.createElement('div');
        btn.className = `time-slot ${!canFit ? 'disabled' : ''} ${selected.includes(h) ? 'selected' : ''}`;
        btn.dataset.hour = h;
        btn.innerHTML = `
            <p class="font-black text-lg">${h}:00</p>
            <small class="text-[8px] opacity-60 uppercase">${free} Libres</small>
        `;

        if (canFit) {
            btn.onclick = () => {
                btn.classList.toggle('selected');
                updateBookingTotal();
            };
        }
        list.appendChild(btn);
    });
}

// --- EXPORTS REQUERIDOS POR MAIN.JS ---

export async function handleSaveBooking(event) {
    event.preventDefault();
    const hrs = Array.from(document.querySelectorAll('.time-slot.selected')).map(el => parseInt(el.dataset.hour));
    
    if (hrs.length === 0) {
        showMessage("Elegí al menos una hora.");
        return;
    }

    const totalStr = document.getElementById('booking-total').textContent.replace('$', '').replace(/\./g, '').replace(/,/g, '');
    
    const data = {
        teamName: document.getElementById('teamName').value.trim().toUpperCase(),
        peopleCount: parseInt(document.getElementById('peopleCount').value),
        unitPrice: parseFloat(document.getElementById('costPerHour').value) || 0,
        paymentMethod: document.getElementById('booking-payment-method').value,
        day: document.getElementById('booking-date').value,
        monthYear: document.getElementById('booking-date').value.substring(0, 7),
        courtHours: hrs,
        type: document.getElementById('booking-type').value,
        totalPrice: parseFloat(totalStr),
        timestamp: Timestamp.now(),
        adminEmail: auth.currentUser?.email || "admin@aerojump.com"
    };

    const id = document.getElementById('booking-id').value;

    try {
        if (id) {
            await updateDoc(getPublicDoc("bookings", id), data);
        } else {
            await addDoc(getPublicCollection("bookings"), data);
        }
        closeModals();
        showMessage("RESERVA GUARDADA! ✅");
    } catch (e) {
        console.error("AeroJump Save Error:", e);
    }
}

export function adjustJumpers(delta) {
    const input = document.getElementById('peopleCount');
    if (!input) return;
    let val = (parseInt(input.value) || 0) + delta;
    if (val < 1) val = 1;
    if (val > MAX_CAPACITY) val = MAX_CAPACITY;
    input.value = val;
    
    // Refrescamos disponibilidad para el nuevo número de personas
    const currentSelected = Array.from(document.querySelectorAll('.time-slot.selected')).map(el => parseInt(el.dataset.hour));
    renderTimeSlots(currentSelected);
    updateBookingTotal();
}

export function updateBookingTotal() {
    const hrs = document.querySelectorAll('.time-slot.selected').length;
    const price = parseFloat(document.getElementById('costPerHour').value) || 0;
    const people = parseInt(document.getElementById('peopleCount').value) || 1;
    
    const total = hrs * price * people;
    const totalDisplay = document.getElementById('booking-total');
    if (totalDisplay) {
        totalDisplay.textContent = `$${total.toLocaleString('es-AR')}`;
    }
}

export function prevMonth() {
    currentMonthDate.setMonth(currentMonthDate.getMonth() - 1);
    syncBookings();
}

export function nextMonth() {
    currentMonthDate.setMonth(currentMonthDate.getMonth() + 1);
    syncBookings();
}
