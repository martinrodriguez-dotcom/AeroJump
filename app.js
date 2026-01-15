// =================================================================
// AeroJump Gualeguaychú - Sistema de Gestión v2026 (Logic Core)
// =================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    setPersistence, 
    browserLocalPersistence,
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,      
    signOut                          
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    addDoc,
    updateDoc,
    deleteDoc, 
    collection, 
    query, 
    where, 
    onSnapshot,
    getDocs,
    documentId,
    Timestamp, 
    orderBy, 
    getDoc,
    writeBatch 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// -----------------------------------------------------------------
// 1. CONFIGURACIÓN DE FIREBASE
// -----------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyC2dY3i0LqcfmUx4Qx91Cgs66-a-dXSLbk",
  authDomain: "reserva-futsal.firebaseapp.com",
  projectId: "reserva-futsal",
  storageBucket: "reserva-futsal.firebasestorage.app",
  messagingSenderId: "285845706235",
  appId: "1:285845706235:web:9355804aea8181b030275e"
};

// --- RUTAS DE COLECCIONES ---
const bookingsCollectionPath = "bookings"; 
const customersCollectionPath = "customers";
const logCollectionPath = "booking_log"; 
const settingsDocPath = "app_settings/prices"; 
const productsCollectionPath = "products";
const salesCollectionPath = "sales";
const transactionsCollectionPath = "product_transactions";

// --- CONSTANTES DE LA APP ---
const OPERATING_HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]; 
const WEEKDAYS_ES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

// --- VARIABLES GLOBALES DE ESTADO ---
let db, auth, userId = null, userEmail = null; 
let currentMonthDate = new Date();
let currentBookingsUnsubscribe = null;
let allMonthBookings = []; 
let allProducts = []; 
let currentSelectedProduct = null;

let appSettings = { 
    court1Price: 5000, 
    court2Price: 5000, 
    grillPrice: 2000, 
    eventPrice: 10000 
};
let recurringSettings = { dayOfWeek: null, months: [] };

// --- REFERENCIAS AL DOM ---
const loginView = document.getElementById('login-view');
const registerView = document.getElementById('register-view');
const appContainer = document.getElementById('app-container');

const views = {
    calendar: document.getElementById('calendar-view'),
    caja: document.getElementById('caja-view'),
    stats: document.getElementById('stats-view'),
    historial: document.getElementById('historial-view'),
    configuracion: document.getElementById('config-view'),
    productos: document.getElementById('productos-view') 
};

const calendarGrid = document.getElementById('calendar-grid');
const currentMonthYearEl = document.getElementById('current-month-year');
const menuBtn = document.getElementById('menu-btn');
const mainMenu = document.getElementById('main-menu');
const menuOverlay = document.getElementById('menu-overlay');
const userEmailDisplay = document.getElementById('user-email-display'); 
const logoutBtn = document.getElementById('logout-btn'); 

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

const cajaDailyList = document.getElementById('caja-daily-list');
const cajaTotalCombined = document.getElementById('caja-total-combined');
const cajaTotalBookings = document.getElementById('caja-total-bookings');
const cajaTotalSales = document.getElementById('caja-total-sales');
const cajaDateFrom = document.getElementById('caja-date-from');
const cajaDateTo = document.getElementById('caja-date-to');
const cajaFilterBtn = document.getElementById('caja-filter-btn');

const statsList = document.getElementById('stats-list');
const historialList = document.getElementById('historial-list');

const typeModal = document.getElementById('type-modal'); 
const bookingModal = document.getElementById('booking-modal');
const eventModal = document.getElementById('event-modal'); 
const optionsModal = document.getElementById('options-modal');
const viewModal = document.getElementById('view-modal');
const cajaDetailModal = document.getElementById('caja-detail-modal');
const deleteReasonModal = document.getElementById('delete-reason-modal'); 
const recurringModal = document.getElementById('recurring-modal'); 
const messageOverlay = document.getElementById('message-overlay');

const bookingForm = document.getElementById('booking-form');
const teamNameInput = document.getElementById('teamName');
const teamNameSuggestions = document.getElementById('teamName-suggestions');
const costPerHourInput = document.getElementById('costPerHour');
const grillCostInput = document.getElementById('grillCost');
const rentGrillCheckbox = document.getElementById('rentGrill');
const grillHoursSection = document.getElementById('grill-hours-section');
const courtHoursList = document.getElementById('court-hours-list');
const grillHoursList = document.getElementById('grill-hours-list');
const bookingTotal = document.getElementById('booking-total');
const recurringToggle = document.getElementById('recurring-toggle'); 
const recurringSummary = document.getElementById('recurring-summary'); 

const eventForm = document.getElementById('event-form');
const eventBookingIdInput = document.getElementById('event-booking-id'); 
const eventDateInput = document.getElementById('event-date'); 
const eventNameInput = document.getElementById('eventName');
const contactPersonInput = document.getElementById('contactPerson');
const contactPhoneInput = document.getElementById('contactPhone');
const eventCostPerHourInput = document.getElementById('eventCostPerHour');
const eventHoursList = document.getElementById('event-hours-list');
const eventTotal = document.getElementById('event-total');

const deleteReasonForm = document.getElementById('delete-reason-form');
const deleteReasonText = document.getElementById('delete-reason-text');
const deleteBookingIdInput = document.getElementById('delete-booking-id');

const configForm = document.getElementById('config-form');
const configCourt1Price = document.getElementById('config-court1-price');
const configCourt2Price = document.getElementById('config-court2-price');

const productForm = document.getElementById('product-form');
const productList = document.getElementById('product-list');
const inventorySearchInput = document.getElementById('inventory-search-input');
const restockForm = document.getElementById('restock-form');
const saleModal = document.getElementById('sale-modal');
const saleSearchInput = document.getElementById('sale-search-input');
const saleSearchResults = document.getElementById('sale-search-results');
const selectedProductInfo = document.getElementById('selected-product-info');
const confirmSaleBtn = document.getElementById('confirm-sale-btn');

// --- INICIALIZACIÓN ---

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Cargado. Iniciando AeroJump v2026...");
    setupEventListeners();
    firebaseInit();
});

async function firebaseInit() {
    try {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        await setPersistence(auth, browserLocalPersistence); 

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                console.log("Acceso autorizado:", user.email);
                userId = user.uid;
                userEmail = user.email;
                await loadAppSettings(); 
                
                if (appContainer) appContainer.classList.remove('is-hidden');
                if (loginView) loginView.classList.add('is-hidden');
                if (registerView) registerView.classList.add('is-hidden');
                if (userEmailDisplay) userEmailDisplay.textContent = userEmail;
                
                await loadBookingsForMonth(); 
                syncProducts();
            } else {
                userId = null;
                userEmail = null;
                if (appContainer) appContainer.classList.add('is-hidden');
                if (loginView) loginView.classList.remove('is-hidden');
                if (registerView) registerView.classList.add('is-hidden');
                if (currentBookingsUnsubscribe) {
                    currentBookingsUnsubscribe();
                    currentBookingsUnsubscribe = null;
                }
                allMonthBookings = [];
            }
        });
    } catch (error) {
        console.error("Fallo Firebase:", error);
        showMessage(`Error de conexión: ${error.message}`, true);
    }
}

// -----------------------------------------------------------------
// 2. CONFIGURACIÓN DE EVENT LISTENERS
// -----------------------------------------------------------------

function setupEventListeners() {
    if (menuBtn) menuBtn.onclick = toggleMenu;
    if (menuOverlay) menuOverlay.onclick = toggleMenu;
    if (logoutBtn) logoutBtn.onclick = handleLogout; 
    
    document.querySelectorAll('.menu-item').forEach(item => {
        item.onclick = (e) => {
            e.preventDefault();
            const viewName = e.currentTarget.dataset.view;
            showView(viewName);
            toggleMenu();
        };
    });
    
    if (loginForm) loginForm.onsubmit = handleLogin;
    if (registerForm) registerForm.onsubmit = handleRegister;
    
    const showRegisterLink = document.getElementById('show-register');
    if (showRegisterLink) {
        showRegisterLink.onclick = (e) => {
            e.preventDefault();
            if (loginView) loginView.classList.add('is-hidden');
            if (registerView) registerView.classList.remove('is-hidden');
        };
    }
    
    const showLoginLink = document.getElementById('show-login');
    if (showLoginLink) {
        showLoginLink.onclick = (e) => {
            e.preventDefault();
            if (registerView) registerView.classList.add('is-hidden');
            if (loginView) loginView.classList.remove('is-hidden');
        };
    }
    
    const prevBtn = document.getElementById('prev-month-btn');
    if (prevBtn) prevBtn.onclick = prevMonth;
    
    const nextBtn = document.getElementById('next-month-btn');
    if (nextBtn) nextBtn.onclick = nextMonth;
    
    if (bookingForm) bookingForm.onsubmit = handleSaveBooking;
    if (eventForm) eventForm.onsubmit = handleSaveEvent; 
    if (configForm) configForm.onsubmit = handleSaveConfig;

    const cancelBookingBtn = document.getElementById('cancel-booking-btn');
    if (cancelBookingBtn) cancelBookingBtn.onclick = closeModals;

    const addNewBookingBtn = document.getElementById('add-new-booking-btn');
    if (addNewBookingBtn) {
        addNewBookingBtn.onclick = () => {
            const ds = optionsModal.dataset.date;
            closeModals();
            showBookingModal(ds); 
        };
    }

    const typeBtnCourt = document.getElementById('type-btn-court');
    if (typeBtnCourt) {
        typeBtnCourt.onclick = () => {
            const ds = typeModal.dataset.date;
            closeModals();
            showBookingModal(ds);
        };
    }

    const typeBtnEvent = document.getElementById('type-btn-event');
    if (typeBtnEvent) {
        typeBtnEvent.onclick = () => {
            const ds = typeModal.dataset.date;
            closeModals();
            showEventModal(ds);
        };
    }

    const typeBtnCancel = document.getElementById('type-btn-cancel');
    if (typeBtnCancel) typeBtnCancel.onclick = closeModals;

    if (cajaFilterBtn) cajaFilterBtn.onclick = loadCajaData;

    if (teamNameInput) {
        teamNameInput.oninput = handleTeamNameInput;
        teamNameInput.onblur = () => { setTimeout(() => { if(teamNameSuggestions) teamNameSuggestions.style.display = 'none'; }, 200); };
        teamNameInput.onfocus = handleTeamNameInput;
    }
    
    document.querySelectorAll('input[name="courtSelection"]').forEach(radio => {
        radio.onchange = () => updateCourtAvailability();
    });

    if (rentGrillCheckbox) {
        rentGrillCheckbox.onchange = () => {
            if(grillHoursSection) grillHoursSection.classList.toggle('is-hidden', !rentGrillCheckbox.checked);
            updateTotalPrice();
        };
    }
    
    if (costPerHourInput) costPerHourInput.oninput = updateTotalPrice;
    if (grillCostInput) grillCostInput.oninput = updateTotalPrice;
    if (eventCostPerHourInput) eventCostPerHourInput.oninput = updateEventTotalPrice;
    
    if (deleteReasonForm) deleteReasonForm.onsubmit = handleConfirmDelete;
    
    if (recurringToggle) recurringToggle.onchange = openRecurringModal;
    
    const confirmRecurBtn = document.getElementById('confirm-recurring-btn');
    if (confirmRecurBtn) confirmRecurBtn.onclick = saveRecurringSettings;

    const cancelRecurBtn = document.getElementById('cancel-recurring-btn');
    if (cancelRecurBtn) {
        cancelRecurBtn.onclick = () => {
            if (recurringModal) recurringModal.classList.remove('is-open');
            if (recurringToggle) recurringToggle.checked = false;
            if (recurringSummary) recurringSummary.classList.add('is-hidden');
            recurringSettings = { dayOfWeek: null, months: [] };
        };
    }
    
    const dayGrid = document.querySelector('.day-selector-grid');
    if (dayGrid) {
        dayGrid.querySelectorAll('.day-toggle-btn').forEach(btn => {
            btn.onclick = (e) => selectRecurringDay(e.currentTarget);
        });
    }

    const addProductBtn = document.getElementById('add-product-btn');
    if (addProductBtn) {
        addProductBtn.onclick = () => {
            const container = document.getElementById('product-form-container');
            if(container) container.classList.toggle('is-hidden');
        };
    }

    if (productForm) productForm.onsubmit = handleSaveProduct;
    if (inventorySearchInput) inventorySearchInput.oninput = (e) => renderProducts(e.target.value);
    
    if (document.getElementById('prod-batch-cost')) document.getElementById('prod-batch-cost').oninput = calculateProductPrices;
    if (document.getElementById('prod-batch-qty')) document.getElementById('prod-batch-qty').oninput = calculateProductPrices;
    if (document.getElementById('prod-profit-pct')) document.getElementById('prod-profit-pct').oninput = calculateProductPrices;

    const headerSaleBtn = document.getElementById('header-sale-btn');
    if (headerSaleBtn) headerSaleBtn.onclick = openSaleModal;
    if (saleSearchInput) saleSearchInput.oninput = handleSaleSearch;
    
    const qtyMinusBtn = document.getElementById('sale-qty-minus');
    if (qtyMinusBtn) qtyMinusBtn.onclick = () => updateSaleQty(-1);
    const qtyPlusBtn = document.getElementById('sale-qty-plus');
    if (qtyPlusBtn) qtyPlusBtn.onclick = () => updateSaleQty(1);
    if (confirmSaleBtn) confirmSaleBtn.onclick = handleConfirmSale;

    if (restockForm) restockForm.onsubmit = handleConfirmRestock;
    const editFormEl = document.getElementById('edit-product-form');
    if (editFormEl) editFormEl.onsubmit = handleConfirmEditProduct;

    // Cierre de modales al clickear fuera
    const modalsList = [typeModal, bookingModal, eventModal, optionsModal, viewModal, cajaDetailModal, deleteReasonModal, recurringModal, saleModal, document.getElementById('restock-modal'), document.getElementById('edit-product-modal'), document.getElementById('product-history-modal')];
    modalsList.forEach(m => {
        if(m) { m.onclick = (e) => { if (e.target === m) closeModals(); }; }
    });
}

// -----------------------------------------------------------------
// 3. LÓGICA DE VISTAS Y NAVEGACIÓN
// -----------------------------------------------------------------

function toggleMenu() {
    if (mainMenu) mainMenu.classList.toggle('is-open');
    if (menuOverlay) menuOverlay.classList.toggle('hidden');
}

function showView(viewName) {
    for (const key in views) {
        if (views[key]) views[key].classList.add('is-hidden');
    }
    const viewToShow = views[viewName];
    if (viewToShow) {
        viewToShow.classList.remove('is-hidden');
        if (viewName === 'caja') loadCajaData();
        else if (viewName === 'stats') loadStatsData();
        else if (viewName === 'historial') loadHistorialData();
        else if (viewName === 'configuracion') loadConfigDataIntoForm(); 
        else if (viewName === 'productos') syncProducts();
    }
}

// -----------------------------------------------------------------
// 4. AUTENTICACIÓN
// -----------------------------------------------------------------

async function handleLogin(e) {
    e.preventDefault();
    showMessage("Validando acceso...");
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    try {
        await signInWithEmailAndPassword(auth, email, password);
        hideMessage();
    } catch (error) {
        showMessage(`Error: ${error.message}`, true);
        setTimeout(hideMessage, 3000);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    showMessage("Registrando administrador...");
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    try {
        await createUserWithEmailAndPassword(auth, email, password);
        hideMessage();
    } catch (error) {
        showMessage(`Error: ${error.message}`, true);
        setTimeout(hideMessage, 3000);
    }
}

async function handleLogout() {
    try { await signOut(auth); } catch (error) { console.error(error); }
}

// -----------------------------------------------------------------
// 5. CONFIGURACIÓN Y PRECIOS
// -----------------------------------------------------------------

async function loadAppSettings() {
    try {
        const docRef = doc(db, settingsDocPath);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) { appSettings = docSnap.data(); } 
        else { await setDoc(docRef, appSettings); }
    } catch (error) { console.error(error); }
}

function loadConfigDataIntoForm() {
    if (configCourt1Price) configCourt1Price.value = appSettings.court1Price;
    if (configCourt2Price) configCourt2Price.value = appSettings.court2Price;
    const grillEl = document.getElementById('config-grill-price');
    if(grillEl) grillEl.value = appSettings.grillPrice;
    const eventEl = document.getElementById('config-event-price');
    if(eventEl) eventEl.value = appSettings.eventPrice;
}

async function handleSaveConfig(e) {
    e.preventDefault();
    showMessage("Sincronizando tarifas...");
    const newSettings = {
        court1Price: parseFloat(configCourt1Price.value) || 0,
        court2Price: parseFloat(configCourt2Price.value) || 0,
        grillPrice: parseFloat(document.getElementById('config-grill-price').value) || 0,
        eventPrice: parseFloat(document.getElementById('config-event-price').value) || 0
    };
    try {
        await setDoc(doc(db, settingsDocPath), newSettings);
        appSettings = newSettings;
        showMessage("¡Precios actualizados!");
        setTimeout(hideMessage, 1500);
    } catch (error) { showMessage(`Error: ${error.message}`, true); }
}

// -----------------------------------------------------------------
// 6. FORMULARIOS DE RESERVA Y EVENTOS
// -----------------------------------------------------------------

async function showBookingModal(dateStr, bookingToEdit = null) {
    closeModals();
    if(bookingForm) bookingForm.reset();
    document.getElementById('booking-date').value = dateStr;
    const title = document.getElementById('booking-modal-title');
    
    if (bookingToEdit) {
        title.textContent = "Editar Salto";
        document.getElementById('booking-id').value = bookingToEdit.id;
        document.getElementById('teamName').value = bookingToEdit.teamName;
        document.getElementById('peopleCount').value = bookingToEdit.peopleCount;
        costPerHourInput.value = bookingToEdit.costPerHour;
        rentGrillCheckbox.checked = bookingToEdit.rentGrill;
        grillCostInput.value = bookingToEdit.grillCost;
        if(recurringToggle) recurringToggle.disabled = true;
    } else {
        title.textContent = `Reservar Cama (${dateStr})`;
        document.getElementById('booking-id').value = '';
        costPerHourInput.value = appSettings.court1Price;
        grillCostInput.value = appSettings.grillPrice;
        if(recurringToggle) recurringToggle.disabled = false;
    }
    
    updateCourtAvailability();
    if(bookingModal) bookingModal.classList.add('is-open');
}

async function showEventModal(dateStr, eventToEdit = null) {
    closeModals();
    if(eventForm) eventForm.reset();
    if(document.getElementById('event-date')) document.getElementById('event-date').value = dateStr;
    const title = document.getElementById('event-modal-title');

    if (eventToEdit) {
        if(title) title.textContent = "Editar Evento";
        if(document.getElementById('event-booking-id')) document.getElementById('event-booking-id').value = eventToEdit.id;
        if(eventNameInput) eventNameInput.value = eventToEdit.teamName;
        if(contactPersonInput) contactPersonInput.value = eventToEdit.contactPerson;
        if(contactPhoneInput) contactPhoneInput.value = eventToEdit.contactPhone;
        if(eventCostPerHourInput) eventCostPerHourInput.value = eventToEdit.costPerHour;
    } else {
        if(title) title.textContent = `Reservar Evento (${dateStr})`;
        if(document.getElementById('event-booking-id')) document.getElementById('event-booking-id').value = '';
        if(eventCostPerHourInput) eventCostPerHourInput.value = appSettings.eventPrice;
    }
    
    renderTimeSlots(eventHoursList, new Set(), eventToEdit ? eventToEdit.courtHours : []);
    if(eventModal) eventModal.classList.add('is-open');
}

function updateCourtAvailability() {
    const ds = document.getElementById('booking-date').value;
    const selCourt = document.querySelector('input[name="courtSelection"]:checked')?.value || 'cancha1';
    const editingId = document.getElementById('booking-id').value;
    
    const occupied = new Set();
    allMonthBookings
        .filter(b => b.day === ds && b.courtId === selCourt && b.id !== editingId)
        .forEach(b => { if(b.courtHours) b.courtHours.forEach(h => occupied.add(h)); });
    
    const currentBooking = allMonthBookings.find(b => b.id === editingId);
    renderTimeSlots(courtHoursList, occupied, currentBooking ? currentBooking.courtHours : []);
    
    const grillOccupied = new Set();
    allMonthBookings
        .filter(b => b.day === ds && b.rentGrill && b.id !== editingId)
        .forEach(b => { if(b.grillHours) b.grillHours.forEach(h => grillOccupied.add(h)); });
    
    renderTimeSlots(grillHoursList, grillOccupied, currentBooking ? currentBooking.grillHours : []);
    updateTotalPrice();
}

function renderTimeSlots(container, occupied, selected) {
    if(!container) return;
    container.innerHTML = '';
    OPERATING_HOURS.forEach(h => {
        const btn = document.createElement('button');
        btn.type = "button"; 
        btn.className = `time-slot ${occupied.has(h) ? 'disabled' : ''} ${selected.includes(h) ? 'selected' : ''}`;
        btn.textContent = `${h}:00`; btn.dataset.hour = h;
        if (!occupied.has(h)) {
            btn.onclick = () => { 
                btn.classList.toggle('selected'); 
                updateTotalPrice(); 
                updateEventTotalPrice(); 
            };
        }
        container.appendChild(btn);
    });
}

// -----------------------------------------------------------------
// 7. PERSISTENCIA DE RESERVAS
// -----------------------------------------------------------------

async function loadBookingsForMonth() {
    if (!db || !userId) return; 
    showMessage("Sincronizando saltos...");
    if (currentBookingsUnsubscribe) currentBookingsUnsubscribe(); 
    const monthYear = `${currentMonthDate.getFullYear()}-${String(currentMonthDate.getMonth() + 1).padStart(2, '0')}`;
    const q = query(collection(db, bookingsCollectionPath), where("monthYear", "==", monthYear));
    currentBookingsUnsubscribe = onSnapshot(q, (snapshot) => {
        allMonthBookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderCalendar();
        hideMessage();
    }, (error) => { console.error(error); hideMessage(); });
}

async function handleSaveBooking(event) {
    event.preventDefault();
    if (recurringToggle && recurringToggle.checked && recurringSettings.dayOfWeek !== null && recurringSettings.months.length > 0) {
        await handleSaveRecurringBooking(event);
    } else {
        await handleSaveSingleBooking(event);
    }
}

async function handleSaveSingleBooking(event) {
    const saveButton = bookingForm.querySelector('button[type="submit"]');
    saveButton.disabled = true;
    showMessage("Procesando AeroJump...");

    const bookingId = document.getElementById('booking-id').value;
    const dateStr = document.getElementById('booking-date').value;
    const teamName = document.getElementById('teamName').value.trim();
    const selectedHours = Array.from(courtHoursList.querySelectorAll('.time-slot.selected')).map(el => parseInt(el.dataset.hour, 10));

    if (selectedHours.length === 0) {
        showMessage("Debes marcar horarios.", true);
        setTimeout(hideMessage, 2000); 
        saveButton.disabled = false;
        return;
    }

    const data = {
        type: 'court', teamName, 
        courtId: document.querySelector('input[name="courtSelection"]:checked')?.value || 'cancha1', 
        peopleCount: parseInt(document.getElementById('peopleCount').value, 10),
        costPerHour: parseFloat(costPerHourInput.value),
        rentGrill: rentGrillCheckbox.checked,
        grillCost: parseFloat(grillCostInput.value),
        day: dateStr, monthYear: dateStr.substring(0, 7),
        paymentMethod: document.querySelector('input[name="paymentMethod"]:checked')?.value || 'efectivo',
        courtHours: selectedHours,
        grillHours: (rentGrillCheckbox && rentGrillCheckbox.checked) ? Array.from(grillHoursList.querySelectorAll('.time-slot.selected')).map(el => parseInt(el.dataset.hour, 10)) : [],
        totalPrice: updateTotalPrice(),
        timestamp: Timestamp.now(), adminId: userId, adminEmail: userEmail
    };

    try {
        if (bookingId) { await setDoc(doc(db, bookingsCollectionPath, bookingId), data, { merge: true }); } 
        else { await addDoc(collection(db, bookingsCollectionPath), data); }
        await saveCustomer(teamName); 
        showMessage("¡Salto guardado!"); closeModals(); setTimeout(hideMessage, 1500); 
    } catch (error) { showMessage(error.message, true); } finally { saveButton.disabled = false; }
}

async function handleSaveEvent(event) {
    event.preventDefault();
    const saveButton = eventForm.querySelector('button[type="submit"]');
    saveButton.disabled = true;
    showMessage("Guardando evento...");
    const bookingId = eventBookingIdInput.value;
    const dateStr = eventDateInput.value;
    const selectedHours = Array.from(eventHoursList.querySelectorAll('.time-slot.selected')).map(el => parseInt(el.dataset.hour, 10));

    if (selectedHours.length === 0) { showMessage("Elige horarios.", true); saveButton.disabled = false; return; }

    const data = {
        type: 'event', teamName: eventNameInput.value.trim(), contactPerson: contactPersonInput.value.trim(), 
        contactPhone: contactPhoneInput.value.trim(), costPerHour: parseFloat(eventCostPerHourInput.value), 
        day: dateStr, monthYear: dateStr.substring(0, 7), 
        courtHours: selectedHours, totalPrice: updateEventTotalPrice(),
        timestamp: Timestamp.now(), adminId: userId, adminEmail: userEmail
    };

    try {
        if (bookingId) await setDoc(doc(db, bookingsCollectionPath, bookingId), data, { merge: true });
        else { await addDoc(collection(db, bookingsCollectionPath), data); }
        showMessage("¡Evento guardado!"); closeModals(); setTimeout(hideMessage, 1500);
    } catch (error) { showMessage(error.message, true); } finally { saveButton.disabled = false; }
}

async function handleSaveRecurringBooking(event) {
    const saveButton = bookingForm.querySelector('button[type="submit"]');
    saveButton.disabled = true;
    showMessage("Generando serie...");

    const teamName = document.getElementById('teamName').value.trim();
    const courtId = document.querySelector('input[name="courtSelection"]:checked')?.value || 'cancha1';
    const selectedHours = Array.from(courtHoursList.querySelectorAll('.time-slot.selected')).map(el => parseInt(el.dataset.hour, 10));

    const { dayOfWeek, months } = recurringSettings;
    let dates = [];
    months.forEach(m => {
        const y = parseInt(m.year, 10), mon = parseInt(m.month, 10);
        const lastDay = new Date(y, mon + 1, 0).getDate();
        for (let d = 1; d <= lastDay; d++) {
            const date = new Date(y, mon, d);
            if (date.getDay() == dayOfWeek) dates.push(date.toISOString().split('T')[0]);
        }
    });

    try {
        const batch = writeBatch(db);
        for (const d of dates) {
            const docRef = doc(collection(db, bookingsCollectionPath));
            const data = { 
                type: 'court', teamName, courtId, day: d, monthYear: d.substring(0, 7), 
                courtHours: selectedHours, totalPrice: updateTotalPrice(), 
                paymentMethod: 'efectivo', timestamp: Timestamp.now(), adminId: userId, adminEmail: userEmail,
                peopleCount: 10, costPerHour: parseFloat(costPerHourInput.value), rentGrill: false, grillCost: 0, grillHours: []
            };
            batch.set(docRef, data);
        }
        await batch.commit();
        showMessage(`¡Serie creada! (${dates.length} saltos)`);
        closeModals(); setTimeout(hideMessage, 2000);
    } catch (e) { showMessage(e.message, true); } finally { saveButton.disabled = false; }
}

async function handleConfirmDelete(event) {
    event.preventDefault();
    const id = deleteBookingIdInput.value;
    const reason = deleteReasonText.value.trim();
    if (!reason) return alert("Motivo obligatorio.");
    showMessage("Eliminando...");
    try {
        const ref = doc(db, bookingsCollectionPath, id);
        await deleteDoc(ref);
        showMessage("Salto anulado.");
        closeModals(); setTimeout(hideMessage, 1500); 
    } catch (error) { showMessage(error.message, true); }
}

// -----------------------------------------------------------------
// 8. KIOSCO: PRODUCTOS Y VENTAS
// -----------------------------------------------------------------

async function handleConfirmSale() {
    if(!currentSelectedProduct) return;
    const qty = parseInt(document.getElementById('sale-qty-input').value);
    const method = document.querySelector('input[name="salePaymentMethod"]:checked')?.value || 'efectivo';
    try {
        showMessage("Procesando cobro...");
        await addDoc(collection(db, salesCollectionPath), { 
            name: currentSelectedProduct.name, qty, total: qty * currentSelectedProduct.salePrice, 
            paymentMethod: method, day: new Date().toISOString().split('T')[0], 
            monthYear: new Date().toISOString().substring(0, 7), timestamp: Timestamp.now(),
            adminId: userId, adminEmail: userEmail
        });
        await updateDoc(doc(db, productsCollectionPath, currentSelectedProduct.id), { stock: currentSelectedProduct.stock - qty });
        closeModals(); showMessage("¡Venta AeroJump!"); setTimeout(hideMessage, 1500);
    } catch (e) { alert(e.message); }
}

function calculateProductPrices() {
    const cost = parseFloat(document.getElementById('prod-batch-cost').value) || 0;
    const qty = parseInt(document.getElementById('prod-batch-qty').value) || 1;
    const margin = parseFloat(document.getElementById('prod-profit-pct').value) || 40;
    const u = cost / qty;
    const s = Math.ceil(u * (1 + (margin / 100)));
    document.getElementById('prod-suggested-price').textContent = `$${s}`;
    document.getElementById('prod-unit-cost').value = u;
}

function syncProducts() {
    onSnapshot(collection(db, productsCollectionPath), (snap) => {
        allProducts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderProducts();
    });
}

function renderProducts(f = "") {
    if (!productList) return;
    productList.innerHTML = '';
    allProducts.filter(p => p.name.toLowerCase().includes(f.toLowerCase())).forEach(p => {
        const d = document.createElement('div');
        d.className = 'bg-white p-6 rounded-3xl border shadow-sm flex flex-col gap-4';
        d.innerHTML = `<div><h4 class="font-black italic uppercase text-slate-800">${p.name}</h4><span class="text-[9px] font-black uppercase text-violet-500">Stock: ${p.stock} un.</span></div>
                       <strong class="text-3xl font-black text-violet-600">$${p.salePrice}</strong>
                       <div class="grid grid-cols-2 gap-2">
                           <button onclick="window.openRestock('${p.id}')" class="bg-slate-50 p-3 rounded-xl text-[9px] font-black">📦 REPONER</button>
                           <button onclick="window.openEditProduct('${p.id}')" class="bg-slate-50 p-3 rounded-xl text-[9px] font-black">✏️ EDITAR</button>
                       </div>`;
        productList.appendChild(d);
    });
}

async function handleConfirmRestock(e) {
    e.preventDefault();
    const id = document.getElementById('restock-prod-id').value;
    const addQ = parseInt(document.getElementById('restock-qty').value);
    const bCost = parseFloat(document.getElementById('restock-batch-cost').value);
    const nUnit = bCost / addQ;
    const p = allProducts.find(x => x.id === id);
    const nSale = Math.ceil(nUnit * 1.40);

    try {
        showMessage("Actualizando...");
        await updateDoc(doc(db, productsCollectionPath, id), { stock: p.stock + addQ, unitCost: nUnit, salePrice: nSale });
        closeModals(); showMessage("¡Stock al día!"); setTimeout(hideMessage, 1500);
    } catch (err) { alert(err.message); }
}

async function handleSaveProduct(e) {
    e.preventDefault();
    const n = document.getElementById('prod-name').value.trim();
    const s = parseInt(document.getElementById('prod-stock').value);
    const uc = parseFloat(document.getElementById('prod-unit-cost').value);
    const sp = parseFloat(document.getElementById('prod-suggested-price').textContent.replace('$', ''));
    try {
        await addDoc(collection(db, productsCollectionPath), { name: n, stock: s, unitCost: uc, salePrice: sp, createdAt: Timestamp.now() });
        e.target.reset(); document.getElementById('product-form-container')?.classList.add('is-hidden');
        showMessage("Ficha creada."); setTimeout(hideMessage, 1500);
    } catch (err) { alert(err.message); }
}

// -----------------------------------------------------------------
// 9. CAJA Y ARQUEO
// -----------------------------------------------------------------

async function loadCajaData() {
    const from = cajaDateFrom.value || new Date().toISOString().split('T')[0];
    const to = cajaDateTo.value || from;
    showMessage("Generando arqueo...");
    try {
        const qB = query(collection(db, bookingsCollectionPath), where("day", ">=", from), where("day", "<=", to));
        const qS = query(collection(db, salesCollectionPath), where("day", ">=", from), where("day", "<=", to));
        const [snapB, snapS] = await Promise.all([getDocs(qB), getDocs(qS)]);
        
        let tB = 0, tS = 0; const daily = {};
        snapB.docs.forEach(doc => { const b = doc.data(); tB += (b.totalPrice || 0); if(!daily[b.day]) daily[b.day] = {t:0, b:[], s:[]}; daily[b.day].t += (b.totalPrice || 0); daily[b.day].b.push({id: doc.id, ...b}); });
        snapS.docs.forEach(doc => { const s = doc.data(); tS += (s.total || 0); if(!daily[s.day]) daily[s.day] = {t:0, b:[], s:[]}; daily[s.day].t += (s.total || 0); daily[s.day].s.push({id: doc.id, ...s}); });

        cajaTotalBookings.textContent = `$${tB.toLocaleString()}`;
        cajaTotalSales.textContent = `$${tS.toLocaleString()}`;
        cajaTotalCombined.textContent = `$${(tB + tS).toLocaleString()}`;
        renderCajaList(daily); hideMessage();
    } catch (e) { console.error(e); hideMessage(); }
}

function showCajaDetail(date, data) {
    if(!cajaDetailModal) return;
    cajaDetailModal.classList.add('is-open'); 
    document.getElementById('caja-detail-title').textContent = date;
    const list = document.getElementById('caja-detail-booking-list');
    list.innerHTML = '';
    data.b.forEach(b => { list.innerHTML += `<div class="p-3 bg-slate-50 rounded-xl mb-2 flex justify-between items-center text-xs"><span>📅 ${b.teamName}</span><strong>$${(b.totalPrice || 0).toLocaleString()}</strong></div>`; });
    data.s.forEach(s => { list.innerHTML += `<div class="p-3 bg-violet-50 rounded-xl mb-2 flex justify-between items-center text-xs"><span>🥤 ${s.name}</span><strong>$${(s.total || 0).toLocaleString()}</strong></div>`; });
}

// -----------------------------------------------------------------
// 10. CALENDARIO UI
// -----------------------------------------------------------------

function renderCalendar() {
    if(!calendarGrid) return;
    calendarGrid.innerHTML = '';
    const year = currentMonthDate.getFullYear(), month = currentMonthDate.getMonth();
    currentMonthYearEl.textContent = `${monthNames[month]} ${year}`;
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        const d = document.createElement('div'); d.className = 'other-month-day h-20 sm:h-28 opacity-20'; calendarGrid.appendChild(d);
    }
    for (let i = 1; i <= lastDate; i++) {
        const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const bks = allMonthBookings.filter(b => b.day === ds);
        const cell = document.createElement('div');
        cell.className = `day-cell h-20 sm:h-28 bg-white p-3 cursor-pointer relative shadow-sm`;
        cell.innerHTML = `<span class='font-black italic text-slate-800'>${i}</span>`;
        if (bks.length > 0) {
            const badge = document.createElement('span'); badge.className = `booking-count ${bks.some(b => b.type === 'event') ? 'event' : ''}`;
            badge.textContent = bks.length; cell.appendChild(badge);
        }
        cell.onclick = () => {
            if (bks.length > 0) { showOptionsModal(ds, bks); } 
            else { typeModal.dataset.date = ds; typeModal.classList.add('is-open'); }
        };
        calendarGrid.appendChild(cell);
    }
}

function showOptionsModal(dateStr, bks) {
    optionsModal.dataset.date = dateStr;
    const list = document.getElementById('daily-bookings-list');
    list.innerHTML = '';
    bks.forEach(b => {
        const item = document.createElement('div');
        item.className = 'flex justify-between items-center p-4 bg-slate-50 rounded-2xl mb-2';
        item.innerHTML = `<div><p class="font-black text-sm uppercase italic">${b.teamName}</p><p class="text-[9px] font-bold text-slate-400">${b.courtHours ? b.courtHours.join(', ') : 'S/H'}hs</p></div>
                          <div class="flex gap-1">
                              <button class="bg-violet-600 text-white p-2 rounded-lg text-[8px] font-black" onclick="window.viewBookingDetail('${b.id}')">VER</button>
                              <button class="bg-orange-500 text-white p-2 rounded-lg text-[8px] font-black" onclick="window.editBooking('${b.id}')">EDIT</button>
                          </div>`;
        list.appendChild(item);
    });
    optionsModal.classList.add('is-open');
}

// -----------------------------------------------------------------
// 11. HELPERS FINALES
// -----------------------------------------------------------------

function showMessage(msg, isError = false) { 
    const t = document.getElementById('message-text'); 
    if(t) t.textContent = msg; 
    messageOverlay.classList.add('is-open'); 
}
function hideMessage() { messageOverlay.classList.remove('is-open'); }
function closeModals() { document.querySelectorAll('.modal').forEach(m => m.classList.remove('is-open')); }
function prevMonth() { currentMonthDate.setMonth(currentMonthDate.getMonth() - 1); loadBookingsForMonth(); }
function nextMonth() { currentMonthDate.setMonth(currentMonthDate.getMonth() + 1); loadBookingsForMonth(); }

function updateTotalPrice() {
    const h = courtHoursList?.querySelectorAll('.time-slot.selected').length || 0;
    const p = parseFloat(costPerHourInput?.value) || 0;
    const g = (rentGrillCheckbox && rentGrillCheckbox.checked) ? (parseFloat(grillCostInput?.value) || 0) : 0;
    const t = (h * p) + g;
    if(bookingTotal) bookingTotal.textContent = `$${t.toLocaleString()}`;
    return t;
}

function updateEventTotalPrice() {
    const h = eventHoursList?.querySelectorAll('.time-slot.selected').length || 0;
    const p = parseFloat(eventCostPerHourInput?.value) || 0;
    const t = h * p;
    if(eventTotal) eventTotal.textContent = `$${t.toLocaleString()}`;
    return t;
}

async function saveCustomer(name) { 
    if(!name) return; 
    try { await setDoc(doc(db, customersCollectionPath, name.trim().toLowerCase()), { name: name.trim(), lastBooked: new Date().toISOString() }, { merge: true }); } catch(e) {} 
}

// Globalización de funciones para el HTML
window.toggleMenu = toggleMenu;
window.hideMessage = hideMessage;
window.closeModals = closeModals;
window.openRestock = (id) => { /* Lógica similar a Edit */ };
window.openEditProduct = (id) => { /* Lógica similar a Edit */ };
window.viewBookingDetail = (id) => { 
    const b = allMonthBookings.find(x => x.id === id); 
    const det = document.getElementById('view-booking-details');
    det.innerHTML = `<h3 class="text-3xl font-black italic uppercase text-violet-800">${b.teamName}</h3><p class="text-sm mt-4 font-bold">Total: $${(b.totalPrice || 0).toLocaleString()}</p>`;
    viewModal.classList.add('is-open');
};
window.editBooking = (id) => { 
    const b = allMonthBookings.find(x => x.id === id); 
    closeModals(); 
    if(b.type === 'court') showBookingModal(b.day, b); else showEventModal(b.day, b); 
};

async function openRecurringModal() { if (recurringToggle && recurringToggle.checked) { renderRecurringModal(); recurringModal.classList.add('is-open'); } }

function renderRecurringModal() {
    recurringMonthList.innerHTML = ''; const now = new Date();
    for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const btn = document.createElement('button'); 
        btn.className = 'month-toggle-btn'; btn.textContent = d.toLocaleString('es-AR', { month: 'short', year: 'numeric' });
        btn.onclick = (e) => e.currentTarget.classList.toggle('selected');
        recurringMonthList.appendChild(btn);
    }
}

console.log("AeroJump Gualeguaychú v1.0 - Core Load complete.");
