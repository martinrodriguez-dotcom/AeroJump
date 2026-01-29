/**
 * AeroJump Gualeguaychú - Main Entry Point
 * El "pegamento" modular que une la lógica con la interfaz de usuario.
 */

// 1. Importación de módulos controladores
import { auth, getPublicDoc } from "./firebase-config.js";
import { getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { initUI, showView, toggleMenu, closeModals, showMessage, hideMessage } from "./ui-controller.js";
import { initAuthListener, handleLogin, handleRegister, handleLogout } from "./auth-controller.js";
import { syncBookings, handleSaveBooking, handleSaveEvent, prevMonth, nextMonth, updateBookingTotal } from "./booking-controller.js";
import { syncProducts, handleSaveProduct, handleConfirmEditProduct, handleConfirmRestock, calculateProductPrices } from "./kiosco-controller.js";
import { openSaleModal, handleConfirmSale } from "./sales-controller.js";
import { loadCajaData, loadStatsData } from "./finance-controller.js";

// 2. Inicialización cuando el DOM está listo
document.addEventListener('DOMContentLoaded', () => {
    // Iniciar listeners básicos de UI (clics fuera de modales, etc.)
    initUI();
    
    // Iniciar el Vigilante de Autenticación
    // Pasamos una función que se ejecuta SOLO cuando el usuario se loguea con éxito
    initAuthListener(async (user) => {
        console.log("AeroJump: Sistema operativo para", user.email);
        
        // Cargar ajustes globales (precios)
        await loadGlobalSettings();
        
        // Iniciar sincronización en tiempo real de datos
        syncBookings();
        syncProducts();
        
        // Mostrar la vista principal por defecto
        showView('calendar');
    });

    // Vincular todos los eventos de la interfaz
    attachGlobalEventListeners();
});

/**
 * Carga las tarifas maestras desde la base de datos
 */
async function loadGlobalSettings() {
    try {
        const snap = await getDoc(getPublicDoc("app_settings", "prices"));
        if (snap.exists()) {
            window.appSettings = snap.data();
        } else {
            // Valores por defecto si no existen en DB
            window.appSettings = { 
                court1Price: 5000, 
                eventPrice: 15000 
            };
        }
    } catch (e) {
        console.error("Error cargando configuración:", e);
    }
}

/**
 * Conecta los IDs del HTML con las funciones de los controladores
 */
function attachGlobalEventListeners() {
    
    // --- AUTENTICACIÓN ---
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.onsubmit = (e) => {
            e.preventDefault();
            const email = e.target.querySelector('input[type="email"]').value;
            const pass = e.target.querySelector('input[type="password"]').value;
            handleLogin(email, pass);
        };
    }

    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.onsubmit = (e) => {
            e.preventDefault();
            const email = e.target.querySelector('input[type="email"]').value;
            const pass = e.target.querySelector('input[type="password"]').value;
            handleRegister(email, pass);
        };
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.onclick = handleLogout;

    // --- NAVEGACIÓN ---
    document.getElementById('menu-btn').onclick = toggleMenu;
    document.getElementById('menu-overlay').onclick = toggleMenu;

    // Botones del Menú Lateral
    document.querySelectorAll('.menu-item').forEach(btn => {
        btn.onclick = () => {
            const target = btn.dataset.view;
            showView(target);
            
            // Cargas específicas según la vista
            if (target === 'caja') loadCajaData();
            if (target === 'stats') loadStatsData();
            if (target === 'configuracion') {
                document.getElementById('config-court1-price').value = window.appSettings.court1Price;
            }
        };
    });

    // --- AGENDA Y RESERVAS ---
    const bookingForm = document.getElementById('booking-form');
    if (bookingForm) bookingForm.onsubmit = handleSaveBooking;

    const eventForm = document.getElementById('event-form');
    if (eventForm) eventForm.onsubmit = handleSaveEvent;
    
    document.getElementById('prev-month-btn').onclick = prevMonth;
    document.getElementById('next-month-btn').onclick = nextMonth;
    
    // El input de personas actualiza el total en tiempo real
    const peopleInput = document.getElementById('peopleCount');
    if (peopleInput) peopleInput.oninput = () => window.adjustJumpers(0);

    // --- INVENTARIO (KIOSCO) ---
    document.getElementById('add-product-btn').onclick = () => {
        document.getElementById('product-form-container').classList.toggle('is-hidden');
    };

    document.getElementById('cancel-product-btn').onclick = () => {
        document.getElementById('product-form-container').classList.add('is-hidden');
    };

    const productForm = document.getElementById('product-form');
    if (productForm) productForm.onsubmit = handleSaveProduct;

    // Escuchadores para cálculos de precios automáticos
    ['prod-batch-cost', 'prod-batch-qty', 'prod-profit-pct'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.oninput = calculateProductPrices;
    });

    const editProdForm = document.getElementById('edit-product-form');
    if (editProdForm) editProdForm.onsubmit = handleConfirmEditProduct;

    const restockForm = document.getElementById('restock-form');
    if (restockForm) restockForm.onsubmit = handleConfirmRestock;

    // --- VENTAS (POS) ---
    document.getElementById('header-sale-btn').onclick = openSaleModal;
    
    const confirmSaleBtn = document.getElementById('confirm-sale-btn');
    if (confirmSaleBtn) confirmSaleBtn.onclick = handleConfirmSale;

    // --- CONFIGURACIÓN DE TARIFAS ---
    const configForm = document.getElementById('config-form');
    if (configForm) {
        configForm.onsubmit = async (e) => {
            e.preventDefault();
            const newPrice = parseFloat(document.getElementById('config-court1-price').value);
            
            showMessage("Actualizando tarifas...");
            try {
                await setDoc(getPublicDoc("app_settings", "prices"), { court1Price: newPrice }, { merge: true });
                window.appSettings.court1Price = newPrice;
                showMessage("Tarifas actualizadas!");
                setTimeout(hideMessage, 1500);
            } catch (err) {
                showMessage("Error al guardar", true);
            }
        };
    }
}

// Globalización de funciones de cierre para que los botones "X" del HTML funcionen
window.closeModals = closeModals;
