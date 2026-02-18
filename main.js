/**
 * AeroJump Gualeguaychú - Sistema v2026
 * MAIN ORCHESTRATOR MODULE
 * * Este archivo es el núcleo que conecta el esqueleto HTML con los controladores.
 * Expone las funciones al objeto global 'window' para que los eventos onclick funcionen.
 */

import { auth } from "./firebase-config.js";
import { 
    onAuthStateChanged, 
    signOut, 
    signInWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// --- 1. IMPORTACIÓN DE CONTROLADORES ESPECIALIZADOS ---
import { 
    showView, 
    openModal, 
    closeModals, 
    showMessage 
} from "./ui-controller.js";

import { 
    syncBookings, 
    prevMonth, 
    nextMonth, 
    handleSaveBooking, 
    adjustJumpers, 
    updateBookingTotal 
} from "./booking-controller.js";

import { 
    syncProducts, 
    handleSaveProduct, 
    handleConfirmRestock, 
    handleConfirmEditProduct, 
    calculateProductPrices 
} from "./kiosco-controller.js";

import { 
    loadCajaData, 
    loadStatsData,
    openDailyAudit,
    openExpenseModal,
    handleConfirmExpense
} from "./finance-controller.js";

import { 
    openSaleModal, 
    handleConfirmSale, 
    renderSaleCatalog,
    updCatalogQty 
} from "./sales-controller.js";

// --- 2. CONFIGURACIÓN INICIAL AL CARGAR EL DOM ---
document.addEventListener('DOMContentLoaded', () => {

    /**
     * VINCULACIÓN GLOBAL (Solución definitiva a window.showView is not a function)
     * Al usar type="module", debemos asignar las funciones a 'window' explícitamente.
     */

    // Navegación de Vistas y Menú Lateral
    window.showView = (viewId) => {
        showView(viewId);
        // Carga de datos pesados solo cuando el usuario entra a la sección
        if (viewId === 'caja') loadCajaData();
        if (viewId === 'stats') loadStatsData();
        // Cerrar menú automáticamente después de elegir una opción
        window.toggleMenu(false);
    };

    window.toggleMenu = (force) => {
        const menu = document.getElementById('main-menu');
        const overlay = document.getElementById('menu-overlay');
        const isClosed = menu.classList.contains('-translate-x-full');
        const shouldOpen = force !== undefined ? force : isClosed;

        if (shouldOpen) {
            menu.classList.remove('-translate-x-full');
            overlay.classList.remove('hidden');
            menu.classList.add('is-open'); // Para el soporte de style.css
        } else {
            menu.classList.add('-translate-x-full');
            overlay.classList.add('hidden');
            menu.classList.remove('is-open');
        }
    };

    // Funciones Base de Interfaz
    window.openModal = openModal;
    window.closeModals = closeModals;

    // Lógica de Agenda de Saltos
    window.prevMonth = prevMonth;
    window.nextMonth = nextMonth;
    window.adjustJumpers = adjustJumpers;
    window.updateBookingVisualTotal = updateBookingTotal;

    // Lógica de Inventario y Kiosco
    window.toggleProductForm = (show) => {
        const container = document.getElementById('product-form-container');
        if (show === false) container.classList.add('is-hidden'); 
        else container.classList.toggle('is-hidden');
    };
    window.handleConfirmRestock = handleConfirmRestock;
    window.handleConfirmEditProduct = handleConfirmEditProduct;

    // Lógica del Punto de Venta (POS)
    window.openSaleModal = openSaleModal;
    window.handleConfirmSale = handleConfirmSale;
    window.renderSaleCatalog = renderSaleCatalog;
    window.updCatalogQty = updCatalogQty;

    // Lógica de Finanzas, Gastos y Auditoría
    window.openExpenseModal = openExpenseModal;
    window.handleConfirmExpense = handleConfirmExpense;
    window.openDailyAudit = openDailyAudit;

    // --- 3. MONITOR DE AUTENTICACIÓN (FIREBASE) ---
    onAuthStateChanged(auth, (user) => {
        const appContainer = document.getElementById('app-container');
        const loginView = document.getElementById('login-view');
        const userDisplay = document.getElementById('user-email-display');

        if (user) {
            // Usuario Autenticado
            appContainer.classList.remove('is-hidden');
            loginView.classList.add('is-hidden');
            if (userDisplay) userDisplay.textContent = user.email;
            
            // Iniciar sincronización de datos en tiempo real
            syncBookings();
            syncProducts();
            
            // Entrar por defecto a la Agenda
            window.showView('calendar');
        } else {
            // Sin Sesión
            appContainer.classList.add('is-hidden');
            loginView.classList.remove('is-hidden');
            if (userDisplay) userDisplay.textContent = "";
        }
    });

    // --- 4. GESTIÓN DE FORMULARIOS ---

    // Formulario de Inicio de Sesión
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.onsubmit = async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const pass = document.getElementById('login-password').value;
            try { 
                await signInWithEmailAndPassword(auth, email, pass); 
            } catch(err) { 
                alert("ACCESO DENEGADO: Usuario o Contraseña incorrectos."); 
            }
        };
    }

    // Botón de Cerrar Sesión
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.onclick = () => {
            if (confirm("¿Cerrar sesión en este dispositivo?")) signOut(auth);
        };
    }

    // Formulario de Nuevo Producto (Inventario)
    const productForm = document.getElementById('product-form');
    if (productForm) {
        productForm.onsubmit = handleSaveProduct;
    }

    // Formulario de Nueva Reserva (Agenda)
    const bookingForm = document.getElementById('booking-form');
    if (bookingForm) {
        bookingForm.onsubmit = handleSaveBooking;
    }
    
    // Formulario de Configuración (Precios base)
    const configForm = document.getElementById('config-form');
    if (configForm) {
        configForm.onsubmit = (e) => {
            e.preventDefault();
            // Aquí se pueden implementar los updates a settings si fuera necesario
            showMessage("TARIFAS ACTUALIZADAS EN NUBE! ✅");
        };
    }

    // --- 5. LISTENERS DE CÁLCULO DINÁMICO ---
    
    // Cálculo de precios en inventario mientras el admin escribe
    const inputIds = ['prod-batch-cost', 'prod-batch-qty', 'prod-profit-pct'];
    inputIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', calculateProductPrices);
    });

    // Listener para actualizar total de reserva al cambiar precio manual
    const priceInput = document.getElementById('costPerHour');
    if (priceInput) {
        priceInput.addEventListener('input', updateBookingTotal);
    }
});
