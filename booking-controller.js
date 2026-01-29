/**
 * AeroJump Gualeguaychú - Booking & Event Controller
 * Gestiona la agenda, saltos normales, eventos exclusivos y lógica de bloqueo.
 */

import { 
    onSnapshot, query, where, addDoc, updateDoc, deleteDoc, Timestamp 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { auth, getPublicCollection, getPublicDoc } from "./firebase-config.js";
import { showMessage, hideMessage, openModal, closeModals } from "./ui-controller.js";

// --- ESTADO INTERNO ---
let allMonthBookings = [];
let currentMonthDate = new Date();
const MAX_CAPACITY = 30;
const OPERATING_HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

// --- REFERENCIAS DOM ---
const calendarGrid = document.getElementById('calendar-grid');
const currentMonthYearEl = document.getElementById('current-month-year');
const courtHoursList = document.getElementById('court-hours-list');
const eventHoursList = document.getElementById('event-hours-list');

/**
 * Inicializa la escucha de datos del mes actual.
 */
export function syncBookings() {
    const monthYear = `${currentMonthDate.getFullYear()}-${String(currentMonthDate.getMonth() + 1).padStart(2, '0')}`;
    const q = query(getPublicCollection("bookings"), where("monthYear", "==", monthYear));

    onSnapshot(q, (snapshot) => {
        allMonthBookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderCalendar();
    }, (error) => {
        console.error("Error AeroJump Sync:", error);
    });
}

/**
 * Renderiza el calendario con lógica de EXCLUSIVIDAD.
 */
export function renderCalendar() {
    if (!calendarGrid) return;
    calendarGrid.innerHTML = '';
    
    currentMonthYearEl.textContent = `${monthNames[currentMonthDate.getMonth()]} ${currentMonthDate.getFullYear()}`;
    
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        const d = document.createElement('div');
        d.className = 'day-cell opacity-0 pointer-events-none';
        calendarGrid.appendChild(d);
    }

    for (let i = 1; i <= lastDate; i++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const dayBookings = allMonthBookings.filter(b => b.day === dateStr);
        const hasEvent = dayBookings.some(b => b.type === 'event');
        
        const cell = document.createElement('div');
        cell.className = `day-cell p-4 flex flex-col justify-between ${hasEvent ? 'has-event' : ''}`;
        
        cell.innerHTML = `
            <span class="font-black italic ${hasEvent ? 'text-orange-700' : 'text-slate-900'} text-xl">${i}</span>
        `;
        
        if (dayBookings.length > 0) {
            const badge = document.createElement('div');
            badge.className = `booking-count ${hasEvent ? 'event' : ''}`;
            badge.textContent = hasEvent ? "EVENTO" : dayBookings.length;
            cell.appendChild(badge);
        }

        cell.onclick = () => {
            if (dayBookings.length > 0) {
                showDayOptions(dateStr, dayBookings);
            } else {
                window.showBookingModal(dateStr);
            }
        };
        calendarGrid.appendChild(cell);
    }
}

/**
 * Calcula ocupación por hora.
 */
function getOccupancyForDay(dateStr) {
    const occupancy = {};
    OPERATING_HOURS.forEach(h => occupancy[h] = 0);
    allMonthBookings.filter(b => b.day === dateStr && b.type === 'court').forEach(b => {
        const count = parseInt(b.peopleCount) || 0;
        b.courtHours.forEach(h => { if (occupancy[h] !== undefined) occupancy[h] += count; });
    });
    return occupancy;
}

/**
 * Renderiza slots de tiempo para saltos.
 */
function renderTimeSlots(container, selected = []) {
    container.innerHTML = '';
    const dateStr = document.getElementById('booking-date').value;
    const occupancy = getOccupancyForDay(dateStr);

    OPERATING_HOURS.forEach(h => {
        const used = occupancy[h];
        const free = MAX_CAPACITY - used;
        const isFull = free <= 0;
        
        const btn = document.createElement('button');
        btn.type = "button";
        btn.className = `time-slot ${isFull ? 'disabled' : ''} ${selected.includes(h) ? 'selected' : ''}`;
        btn.innerHTML = `
            <span class="font-black text-sm">${h}:00</span>
            <span class="capacity-info">${free} libres</span>
        `;
        if (!isFull) {
            btn.onclick = () => { btn.classList.toggle('selected'); updateBookingTotal(); };
        }
        container.appendChild(btn);
    });
}

/**
 * Renderiza slots para EVENTOS.
 */
function renderEventSlots(container, selected = []) {
    container.innerHTML = '';
    OPERATING_HOURS.forEach(h => {
        const btn = document.createElement('button');
        btn.type = "button";
        btn.className = `time-slot ${selected.includes(h) ? 'selected' : ''}`;
        btn.innerHTML = `<span class="font-black text-sm">${h}:00</span><span class="capacity-info">EXCLUSIVO</span>`;
        btn.onclick = () => { btn.classList.toggle('selected'); updateEventTotal(); };
        container.appendChild(btn);
    });
}

/**
 * Abre el modal de Saltos.
 */
window.showBookingModal = function(dateStr, booking = null) {
    const form = document.getElementById('booking-form');
    if(form) form.reset();
    document.getElementById('booking-date').value = dateStr;
    document.getElementById('booking-id').value = booking ? booking.id : '';
    document.getElementById('teamName').value = booking ? booking.teamName : '';
    document.getElementById('peopleCount').value = booking ? booking.peopleCount : 1;
    document.getElementById('costPerHour').value = window.appSettings?.court1Price || 5000;
    
    renderTimeSlots(courtHoursList, booking ? booking.courtHours : []);
    updateBookingTotal();
    openModal('booking-modal');
};

/**
 * Abre el modal de Eventos.
 */
window.showEventModal = function(dateStr, eventToEdit = null) {
    const form = document.getElementById('event-form');
    if(form) form.reset();
    document.getElementById('event-date').value = dateStr;
    document.getElementById('event-booking-id').value = eventToEdit ? eventToEdit.id : '';
    document.getElementById('eventName').value = eventToEdit ? eventToEdit.teamName : '';
    
    renderEventSlots(eventHoursList, eventToEdit ? eventToEdit.courtHours : []);
    updateEventTotal();
    openModal('event-modal');
};

/**
 * Muestra opciones del día.
 */
function showDayOptions(dateStr, dayBookings) {
    const list = document.getElementById('daily-bookings-list');
    list.innerHTML = '';
    const hasEvent = dayBookings.some(b => b.type === 'event');
    
    dayBookings.forEach(b => {
        const item = document.createElement('div');
        item.className = `p-4 rounded-2xl border-2 mb-3 flex justify-between items-center ${b.type === 'event' ? 'border-orange-500 bg-orange-50' : 'border-slate-100 bg-slate-50'}`;
        item.innerHTML = `
            <div class="text-left">
                <p class="font-black text-xs uppercase">${b.teamName}</p>
                <p class="text-[9px] font-bold text-slate-400">${b.type === 'event' ? '★ EVENTO EXCLUSIVO' : b.peopleCount + ' saltadores'}</p>
            </div>
            <button class="text-red-500 font-black text-[10px] uppercase p-2">Anular</button>
        `;
        item.querySelector('button').onclick = (e) => { e.stopPropagation(); deleteBooking(b.id); };
        item.onclick = () => b.type === 'event' ? window.showEventModal(dateStr, b) : window.showBookingModal(dateStr, b);
        list.appendChild(item);
    });

    const addJumpBtn = document.getElementById('add-new-booking-btn');
    if (hasEvent) {
        addJumpBtn.classList.add('is-hidden');
    } else {
        addJumpBtn.classList.remove('is-hidden');
        addJumpBtn.onclick = () => { closeModals(); window.showBookingModal(dateStr); };
    }

    document.getElementById('add-new-event-btn').onclick = () => { closeModals(); window.showEventModal(dateStr); };
    openModal('options-modal');
}

/**
 * Guarda SALTO NORMAL.
 */
export async function handleSaveBooking(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const selected = Array.from(courtHoursList.querySelectorAll('.time-slot.selected')).map(el => parseInt(el.querySelector('span').textContent));

    if (selected.length === 0) return alert("Selecciona horarios.");
    
    btn.disabled = true;
    const data = {
        type: 'court',
        teamName: document.getElementById('teamName').value.trim(),
        day: document.getElementById('booking-date').value,
        monthYear: document.getElementById('booking-date').value.substring(0, 7),
        peopleCount: parseInt(document.getElementById('peopleCount').value),
        costPerHour: parseFloat(document.getElementById('costPerHour').value),
        courtHours: selected,
        totalPrice: parseFloat(document.getElementById('booking-total').textContent.replace('$','').replace(/\./g,'')),
        timestamp: Timestamp.now(),
        adminEmail: auth.currentUser.email
    };

    try {
        const id = document.getElementById('booking-id').value;
        if (id) await updateDoc(getPublicDoc("bookings", id), data);
        else await addDoc(getPublicCollection("bookings"), data);
        closeModals();
        showMessage("Salto reservado!");
        setTimeout(hideMessage, 1500);
    } catch (err) { alert(err.message); } finally { btn.disabled = false; }
}

/**
 * Guarda EVENTO EXCLUSIVO.
 */
export async function handleSaveEvent(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const selected = Array.from(eventHoursList.querySelectorAll('.time-slot.selected')).map(el => parseInt(el.querySelector('span').textContent));

    if (selected.length === 0) return alert("Selecciona horarios.");

    btn.disabled = true;
    const data = {
        type: 'event',
        teamName: document.getElementById('eventName').value.trim(),
        day: document.getElementById('event-date').value,
        monthYear: document.getElementById('event-date').value.substring(0, 7),
        courtHours: selected,
        totalPrice: parseFloat(document.getElementById('event-total').textContent.replace('$','').replace(/\./g,'')),
        contactPerson: document.getElementById('contactPerson').value,
        contactPhone: document.getElementById('contactPhone').value,
        timestamp: Timestamp.now(),
        adminEmail: auth.currentUser.email
    };

    try {
        const id = document.getElementById('event-booking-id').value;
        if (id) await updateDoc(getPublicDoc("bookings", id), data);
        else await addDoc(getPublicCollection("bookings"), data);
        closeModals();
        showMessage("¡Evento Creado!");
        setTimeout(hideMessage, 1500);
    } catch (err) { alert(err.message); } finally { btn.disabled = false; }
}

async function deleteBooking(id) {
    if (confirm("¿Anular este turno/evento?")) {
        await deleteDoc(getPublicDoc("bookings", id));
        closeModals();
    }
}

/**
 * ACTUALIZA EL TOTAL VISUAL (EXPORTADA PARA MAIN.JS)
 */
export function updateBookingTotal() {
    const hours = courtHoursList.querySelectorAll('.time-slot.selected').length;
    const price = parseFloat(document.getElementById('costPerHour').value) || 0;
    const jumpers = parseInt(document.getElementById('peopleCount').value) || 1;
    document.getElementById('booking-total').textContent = `$${(hours * price * jumpers).toLocaleString('es-AR')}`;
}

function updateEventTotal() {
    const hours = eventHoursList.querySelectorAll('.time-slot.selected').length;
    const base = window.appSettings?.eventPrice || 15000;
    document.getElementById('event-total').textContent = `$${(hours * base).toLocaleString('es-AR')}`;
}

export function prevMonth() { currentMonthDate.setMonth(currentMonthDate.getMonth() - 1); syncBookings(); }
export function nextMonth() { currentMonthDate.setMonth(currentMonthDate.getMonth() + 1); syncBookings(); }

window.adjustJumpers = (val) => {
    const input = document.getElementById('peopleCount');
    let n = parseInt(input.value) + val;
    if (n < 1) n = 1; if (n > 30) n = 30;
    input.value = n;
    updateBookingTotal();
};
