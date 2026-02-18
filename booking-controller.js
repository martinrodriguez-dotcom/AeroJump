/**
 * AeroJump Gualeguaychú - Booking Controller Module
 * Gestión de agenda, lógica de cupos por hora, medios de pago y diseño Bento.
 */

import { 
    onSnapshot, query, where, addDoc, updateDoc, Timestamp 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getPublicCollection, getPublicDoc, auth } from "./firebase-config.js";
import { openModal, closeModals, showMessage } from "./ui-controller.js";

// --- ESTADO INTERNO ---
let allMonthBookings = [];
let currentMonthDate = new Date();
const MAX_CAPACITY = 30; // Cupo máximo de personas por hora
const OPERATING_HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];

/**
 * Sincroniza las reservas del mes visualizado actualmente desde Firestore.
 */
export function syncBookings() {
    const y = currentMonthDate.getFullYear();
    const m = String(currentMonthDate.getMonth() + 1).padStart(2, '0');
    const monthYear = `${y}-${m}`;
    
    // Consulta simple a la colección de reservas filtrando por mes/año
    const q = query(getPublicCollection("bookings"), where("monthYear", "==", monthYear));
    
    onSnapshot(q, (snapshot) => {
        allMonthBookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderCalendar();
    }, (error) => {
        console.error("AeroJump Agenda Sync Error:", error);
    });
}

/**
 * Renderiza el grid del calendario en el index.html.
 */
export function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const [y, m] = [currentMonthDate.getFullYear(), currentMonthDate.getMonth()];
    const firstDay = new Date(y, m, 1).getDay();
    // Ajuste para que la semana empiece en Lunes (0=Dom, 1=Lun...)
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const lastDate = new Date(y, m + 1, 0).getDate();

    // Actualizar título del mes
    const monthName = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(currentMonthDate);
    document.getElementById('current-month-year').textContent = monthName.toUpperCase();

    // Celdas vacías para el desfase del inicio de mes
    for (let i = 0; i < offset; i++) {
        const empty = document.createElement('div');
        empty.className = 'day-cell opacity-20 pointer-events-none';
        grid.appendChild(empty);
    }

    // Celdas de los días del mes
    for (let i = 1; i <= lastDate; i++) {
        const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const dayBookings = allMonthBookings.filter(b => b.day === dateStr);
        
        const cell = document.createElement('div');
        cell.className = 'day-cell';
        cell.innerHTML = `<span class="font-black text-slate-300">${i}</span>`;
        
        // Si hay reservas, añadimos un indicador visual
        if (dayBookings.length > 0) {
            const badgeContainer = document.createElement('div');
            badgeContainer.className = 'flex gap-1 justify-end';
            // Mostramos la cantidad de turnos como un badge tipo inventario
            badgeContainer.innerHTML = `<span class="badge-type" style="font-size:10px">${dayBookings.length}</span>`;
            cell.appendChild(badgeContainer);
        }

        cell.onclick = () => openBookingForm(dateStr);
        grid.appendChild(cell);
    }
}

/**
 * Prepara y abre el formulario compacto tipo "ficha de stock".
 * @param {string} dateStr - Fecha seleccionada en formato YYYY-MM-DD
 */
function openBookingForm(dateStr) {
    const form = document.getElementById('booking-form');
    if (form) form.reset();

    document.getElementById('booking-date').value = dateStr;
    document.getElementById('booking-id').value = "";
    document.getElementById('booking-type').value = "court"; 
    document.getElementById('peopleCount').value = 1;
    
    // El precio se carga de un valor base (puede ser dinámico en el futuro)
    document.getElementById('costPerHour').value = 5000; 
    
    renderTimeSlots();
    updateBookingTotal();
    openModal('booking-modal');
}

/**
 * Inyecta los botones de horario calculando disponibilidad real.
 * @param {Array} selected - Horas previamente seleccionadas (para edición).
 */
function renderTimeSlots(selected = []) {
    const list = document.getElementById('court-hours-list');
    if (!list) return;
    list.innerHTML = '';
    
    const date = document.getElementById('booking-date').value;
    const editingId = document.getElementById('booking-id').value;
    const jumpers = parseInt(document.getElementById('peopleCount').value) || 1;

    OPERATING_HOURS.forEach(h => {
        // Calculamos cuánta gente ya hay agendada en esta hora específica
        const occupied = allMonthBookings
            .filter(b => b.day === date && b.id !== editingId && b.courtHours.includes(h))
            .reduce((acc, curr) => acc + (parseInt(curr.peopleCount) || 0), 0);

        const free = MAX_CAPACITY - occupied;
        const canFit = free >= jumpers;

        const btn = document.createElement('div');
        // Clase time-slot definida en el style.css maestro
        btn.className = `time-slot ${!canFit ? 'disabled' : ''} ${selected.includes(h) ? 'selected' : ''}`;
        btn.innerHTML = `<strong>${h}:00</strong><br><small>${free} Libres</small>`;

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
 * Recolecta los datos del formulario y los guarda en Firebase.
 * Esta función es llamada por el main.js en el evento submit.
 */
export async function handleSaveBooking(event) {
    event.preventDefault();
    
    // Obtener horas seleccionadas del DOM
    const selectedElements = document.querySelectorAll('.time-slot.selected');
    const hrs = Array.from(selectedElements).map(el => {
        // Extraemos la hora del texto (ej: "9:00" -> 9)
        return parseInt(el.querySelector('strong').innerText);
    });

    if (hrs.length === 0) {
        showMessage("⚠️ Elegí al menos un horario.");
        return;
    }

    const teamName = document.getElementById('teamName').value.trim().toUpperCase();
    const peopleCount = parseInt(document.getElementById('peopleCount').value);
    const unitPrice = parseFloat(document.getElementById('costPerHour').value);
    const paymentMethod = document.getElementById('booking-payment-method').value;
    const day = document.getElementById('booking-date').value;

    const data = {
        teamName,
        peopleCount,
        unitPrice,
        paymentMethod,
        day,
        monthYear: day.substring(0, 7),
        courtHours: hrs,
        type: 'court',
        totalPrice: hrs.length * unitPrice * peopleCount,
        timestamp: Timestamp.now(),
        adminEmail: auth.currentUser?.email || "admin@aerojump.com"
    };

    try {
        const id = document.getElementById('booking-id').value;
        if (id) {
            // Actualización de reserva existente
            await updateDoc(getPublicDoc("bookings", id), data);
        } else {
            // Nueva reserva
            await addDoc(getPublicCollection("bookings"), data);
        }
        
        closeModals();
        showMessage("¡TURNO AGENDADO! ✅");
    } catch (error) {
        console.error("Error al guardar reserva AeroJump:", error);
        alert("Error al procesar: " + error.message);
    }
}

/**
 * Incrementa o decrementa la cantidad de saltadores.
 * Actualiza la disponibilidad de horarios en tiempo real.
 */
export function adjustJumpers(delta) {
    const input = document.getElementById('peopleCount');
    if (!input) return;

    let val = (parseInt(input.value) || 1) + delta;
    
    // Límites de seguridad
    if (val < 1) val = 1;
    if (val > MAX_CAPACITY) val = MAX_CAPACITY;
    
    input.value = val;
    
    // Al cambiar la gente, algunos horarios pueden quedar inhabilitados (si no hay cupo)
    const currentSelected = Array.from(document.querySelectorAll('.time-slot.selected')).map(el => {
        return parseInt(el.querySelector('strong').innerText);
    });
    
    renderTimeSlots(currentSelected);
    updateBookingTotal();
}

/**
 * Calcula y muestra el total monetario en el pie del modal.
 */
export function updateBookingTotal() {
    const hrsCount = document.querySelectorAll('.time-slot.selected').length;
    const price = parseFloat(document.getElementById('costPerHour').value) || 0;
    const people = parseInt(document.getElementById('peopleCount').value) || 1;
    
    const total = hrsCount * price * people;
    const totalDisplay = document.getElementById('booking-total');
    
    if (totalDisplay) {
        totalDisplay.textContent = `$${total.toLocaleString('es-AR')}`;
    }
}

// --- NAVEGACIÓN MENSUAL ---
export function prevMonth() {
    currentMonthDate.setMonth(currentMonthDate.getMonth() - 1);
    syncBookings();
}

export function nextMonth() {
    currentMonthDate.setMonth(currentMonthDate.getMonth() + 1);
    syncBookings();
}
