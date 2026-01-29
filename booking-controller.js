/**
 * AeroJump Gualeguaychú - Booking Controller Module
 * Gestiona el calendario, la lógica de ocupación (max 30 pers/h) 
 * y la persistencia de reservas y eventos.
 */

import { 
    onSnapshot, query, where, addDoc, updateDoc, deleteDoc, Timestamp, writeBatch 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db, getPublicCollection, getPublicDoc } from "./firebase-config.js";
import { showMessage, hideMessage, openModal, closeModals } from "./ui-controller.js";

// --- ESTADO INTERNO DEL MÓDULO ---
let allMonthBookings = [];
let currentMonthDate = new Date();
const MAX_CAPACITY = 30;
const OPERATING_HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

// --- REFERENCIAS DOM ---
const calendarGrid = document.getElementById('calendar-grid');
const currentMonthYearEl = document.getElementById('current-month-year');
const courtHoursList = document.getElementById('court-hours-list');
const bookingTotalEl = document.getElementById('booking-total');

/**
 * Inicializa los escuchas de datos de Firestore para el mes actual.
 */
export function syncBookings() {
    const monthYear = `${currentMonthDate.getFullYear()}-${String(currentMonthDate.getMonth() + 1).padStart(2, '0')}`;
    const q = query(getPublicCollection("bookings"), where("monthYear", "==", monthYear));

    // Escuchador en tiempo real
    onSnapshot(q, (snapshot) => {
        allMonthBookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderCalendar();
    }, (error) => {
        console.error("Error al sincronizar saltos:", error);
    });
}

/**
 * Renderiza el calendario en base al estado de monthBookings.
 */
export function renderCalendar() {
    if (!calendarGrid) return;
    calendarGrid.innerHTML = '';
    
    currentMonthYearEl.textContent = `${monthNames[currentMonthDate.getMonth()]} ${currentMonthDate.getFullYear()}`;
    
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();

    // Días vacíos del mes anterior
    for (let i = 0; i < firstDay; i++) {
        const d = document.createElement('div');
        d.className = 'day-cell opacity-0 pointer-events-none';
        calendarGrid.appendChild(d);
    }

    // Días del mes actual
    for (let i = 1; i <= lastDate; i++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const dayBookings = allMonthBookings.filter(b => b.day === dateStr);
        
        const cell = document.createElement('div');
        cell.className = 'day-cell p-4 flex flex-col justify-between';
        cell.innerHTML = `<span class="font-black italic text-slate-900 text-2xl">${i}</span>`;
        
        if (dayBookings.length > 0) {
            const badge = document.createElement('div');
            badge.className = `booking-count ${dayBookings.some(b => b.type === 'event') ? 'event' : ''}`;
            badge.textContent = dayBookings.length;
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
 * Calcula la ocupación por hora para un día específico.
 */
function getOccupancyForDay(dateStr) {
    const occupancy = {};
    OPERATING_HOURS.forEach(h => occupancy[h] = 0);
    
    allMonthBookings.filter(b => b.day === dateStr).forEach(b => {
        const count = parseInt(b.peopleCount) || 0;
        b.courtHours.forEach(h => {
            if (occupancy[h] !== undefined) occupancy[h] += count;
        });
    });
    return occupancy;
}

/**
 * Renderiza los botones de selección de horario con info de capacidad.
 */
function renderTimeSlots(dateStr, editingId = null) {
    const occupancy = getOccupancyForDay(dateStr);
    const currentBooking = allMonthBookings.find(b => b.id === editingId);
    
    // Si editamos, restamos la ocupación actual de esta reserva para mostrar disponibilidad real
    if (currentBooking) {
        const myCount = parseInt(currentBooking.peopleCount) || 0;
        currentBooking.courtHours.forEach(h => occupancy[h] -= myCount);
    }

    courtHoursList.innerHTML = '';
    OPERATING_HOURS.forEach(h => {
        const used = occupancy[h];
        const free = MAX_CAPACITY - used;
        const isFull = free <= 0;
        
        const btn = document.createElement('button');
        btn.type = "button";
        const isSelected = currentBooking?.courtHours.includes(h);
        
        btn.className = `time-slot ${isFull ? 'disabled' : ''} ${isSelected ? 'selected' : ''}`;
        btn.innerHTML = `
            <span class="font-black text-lg">${h}:00</span>
            <span class="capacity-info ${free < 5 ? 'text-red-700' : 'text-slate-500'}">
                ${free} libres
            </span>
        `;

        if (!isFull) {
            btn.onclick = () => {
                btn.classList.toggle('selected');
                updateBookingTotal();
            };
        }
        courtHoursList.appendChild(btn);
    });
}

/**
 * Abre el formulario de reserva.
 */
window.showBookingModal = function(dateStr, booking = null) {
    const form = document.getElementById('booking-form');
    form.reset();
    
    document.getElementById('booking-date').value = dateStr;
    document.getElementById('booking-id').value = booking ? booking.id : '';
    document.getElementById('teamName').value = booking ? booking.teamName : '';
    document.getElementById('peopleCount').value = booking ? booking.peopleCount : 1;
    
    // El precio se toma de appSettings globales (se asume cargado)
    const basePrice = window.appSettings?.court1Price || 5000;
    document.getElementById('costPerHour').value = basePrice;
    
    renderTimeSlots(dateStr, booking?.id);
    updateBookingTotal();
    openModal('booking-modal');
};

/**
 * Actualiza el total visual del formulario.
 */
export function updateBookingTotal() {
    const selectedCount = courtHoursList.querySelectorAll('.time-slot.selected').length;
    const basePrice = parseFloat(document.getElementById('costPerHour').value) || 0;
    const jumpers = parseInt(document.getElementById('peopleCount').value) || 1;
    
    const total = selectedCount * basePrice * jumpers;
    bookingTotalEl.textContent = `$${total.toLocaleString('es-AR')}`;
}

/**
 * Muestra las opciones cuando ya hay reservas en un día.
 */
function showDayOptions(dateStr, dayBookings) {
    const list = document.getElementById('daily-bookings-list');
    list.innerHTML = '';
    
    dayBookings.forEach(b => {
        const item = document.createElement('div');
        item.className = 'p-5 bg-slate-50 rounded-3xl border-2 border-slate-100 flex justify-between items-center shadow-sm';
        item.innerHTML = `
            <div>
                <p class="font-black text-sm uppercase text-slate-900 leading-none mb-1">${b.teamName}</p>
                <p class="text-[9px] font-black text-slate-400 italic">${b.courtHours.join(', ')}hs | ${b.peopleCount} pers.</p>
            </div>
            <button class="bg-red-50 text-red-600 px-4 py-2 rounded-xl font-black text-[9px] uppercase hover:bg-red-600 hover:text-white transition-all">Anular</button>
        `;
        
        item.querySelector('button').onclick = (e) => {
            e.stopPropagation();
            deleteBooking(b.id);
        };
        
        item.onclick = () => window.showBookingModal(dateStr, b);
        list.appendChild(item);
    });

    // Configurar botón para añadir uno nuevo
    document.getElementById('add-new-booking-btn').onclick = () => {
        closeModals();
        window.showBookingModal(dateStr);
    };

    openModal('options-modal');
}

/**
 * Guarda o actualiza una reserva en Firestore.
 */
export async function saveBooking(event) {
    event.preventDefault();
    const btn = event.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    
    const selectedHours = Array.from(courtHoursList.querySelectorAll('.time-slot.selected'))
                               .map(el => parseInt(el.querySelector('span').textContent));

    if (selectedHours.length === 0) {
        alert("Selecciona al menos un horario para saltar.");
        btn.disabled = false;
        return;
    }

    const dateStr = document.getElementById('booking-date').value;
    const data = {
        teamName: document.getElementById('teamName').value.trim(),
        day: dateStr,
        monthYear: dateStr.substring(0, 7),
        peopleCount: parseInt(document.getElementById('peopleCount').value),
        costPerHour: parseFloat(document.getElementById('costPerHour').value),
        courtHours: selectedHours,
        totalPrice: parseFloat(bookingTotalEl.textContent.replace('$', '').replace(/\./g, '')),
        timestamp: Timestamp.now(),
        adminEmail: auth.currentUser.email,
        type: 'court'
    };

    try {
        const id = document.getElementById('booking-id').value;
        if (id) {
            await updateDoc(getPublicDoc("bookings", id), data);
        } else {
            await addDoc(getPublicCollection("bookings"), data);
        }
        closeModals();
        showMessage("Reserva guardada!");
        setTimeout(hideMessage, 1500);
    } catch (e) {
        alert("Error al guardar: " + e.message);
    } finally {
        btn.disabled = false;
    }
}

async function deleteBooking(id) {
    if (confirm("¿Confirmas la baja definitiva de este turno?")) {
        try {
            await deleteDoc(getPublicDoc("bookings", id));
            closeModals();
            showMessage("Turno eliminado.");
            setTimeout(hideMessage, 1500);
        } catch (e) {
            alert("Error al eliminar: " + e.message);
        }
    }
}

// Navegación de meses
export function prevMonth() { currentMonthDate.setMonth(currentMonthDate.getMonth() - 1); syncBookings(); }
export function nextMonth() { currentMonthDate.setMonth(currentMonthDate.getMonth() + 1); syncBookings(); }

// Globalización necesaria para botones +/- en HTML
window.adjustJumpers = (val) => {
    const input = document.getElementById('peopleCount');
    let n = parseInt(input.value) + val;
    if (n < 1) n = 1; if (n > 30) n = 30;
    input.value = n;
    renderTimeSlots(document.getElementById('booking-date').value, document.getElementById('booking-id').value);
    updateBookingTotal();
};
