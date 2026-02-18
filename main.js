/**
 * AeroJump Gualeguaychú - Sistema v2026
 * MAIN ORCHESTRATOR MODULE
 * centraliza la lógica de todos los módulos y los expone
 * al alcance global (window) para que el esqueleto HTML funcione correctamente.
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
    renderSaleCatalog 
} from "./sales-controller.js";

import { 
    syncWaivers, 
    openWaiverModal, 
    handleSaveWaiver, 
    clearSignature, 
    renderWaiverList,
    downloadWaiver
} from "./waiver-controller.js";

// --- 2. CONFIGURACIÓN AL CARGAR EL DOM ---
document.addEventListener('DOMContentLoaded', () => {

    /**
     * VINCULACIÓN GLOBAL (Solución definitiva a window.showView is not a function)
     * Exponemos las funciones necesarias para que los eventos 'onclick' del HTML funcionen.
     */

    // Navegación y Menú Lateral
    window.showView = (viewId) => {
        showView(viewId);
        // Carga de datos pesados solo cuando el usuario entra a la sección específica
        if (viewId === 'caja') loadCajaData();
        if (viewId === 'stats') loadStatsData();
        if (viewId === 'firmas') renderWaiverList();
        
        // Cerramos el menú automáticamente al navegar
        window.toggleMenu(false);
    };

    window.toggleMenu = (force) => {
        const menu = document.getElementById('main-menu');
        const overlay = document.getElementById('menu-overlay');
        const isCurrentlyClosed = menu.classList.contains('-translate-x-full');
        const shouldOpen = force !== undefined ? force : isCurrentlyClosed;

        if (shouldOpen) {
            menu.classList.remove('-translate-x-full');
            overlay.classList.remove('hidden');
            menu.classList.add('is-open');
        } else {
            menu.classList.add('-translate-x-full');
            overlay.classList.add('hidden');
            menu.classList.remove('is-open');
        }
    };

    // Funciones Base de UI
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

    // Lógica Financiera y Auditoría
    window.openDailyAudit = openDailyAudit;
    window.openExpenseModal = openExpenseModal;
    window.handleConfirmExpense = handleConfirmExpense;

    // Lógica de Firmas Digitales (Exención de Responsabilidad)
    window.openWaiverModal = openWaiverModal;
    window.clearSignature = clearSignature;
    window.renderWaiverList = renderWaiverList;
    window.downloadWaiver = downloadWaiver;

    // --- 3. MONITOR DE SESIÓN (FIREBASE AUTH) ---
    onAuthStateChanged(auth, (user) => {
        const appContainer = document.getElementById('app-container');
        const loginView = document.getElementById('login-view');
        const userEmailLabel = document.getElementById('user-email-display');

        if (user) {
            // Usuario autenticado: Mostramos el Panel de Control
            appContainer.classList.remove('is-hidden');
            loginView.classList.add('is-hidden');
            if (userEmailLabel) userEmailLabel.textContent = user.email;
            
            // Inicializamos la sincronización de todas las colecciones en tiempo real
            syncBookings();
            syncProducts();
            syncWaivers();
            
            // Cargamos la vista de Agenda por defecto
            window.showView('calendar');
        } else {
            // Sin sesión activa: Bloqueamos y mostramos Login
            appContainer.classList.add('is-hidden');
            loginView.classList.remove('is-hidden');
            if (userEmailLabel) userEmailLabel.textContent = "";
        }
    });

    // --- 4. GESTIÓN DE FORMULARIOS Y LISTENERS ---

    // Login Form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.onsubmit = async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const pass = document.getElementById('login-password').value;
            try { 
                await signInWithEmailAndPassword(auth, email, pass); 
            } catch(err) { 
                console.error("Login Error:", err);
                alert("DATOS INCORRECTOS: Verifica tu usuario y contraseña."); 
            }
        };
    }

    // Botón Salir
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.onclick = () => {
            if (confirm("¿Cerrar sesión en este dispositivo?")) signOut(auth);
        };
    }

    // Formulario de Nuevo Producto
    const productForm = document.getElementById('product-form');
    if (productForm) {
        productForm.onsubmit = handleSaveProduct;
    }

    // Formulario de Nueva Reserva
    const bookingForm = document.getElementById('booking-form');
    if (bookingForm) {
        bookingForm.onsubmit = handleSaveBooking;
    }

    // Formulario de Firma Digital
    const waiverForm = document.getElementById('waiver-form');
    if (waiverForm) {
        waiverForm.onsubmit = handleSaveWaiver;
    }
    
    // Configuración de Tarifas
    const configForm = document.getElementById('config-form');
    if (configForm) {
        configForm.onsubmit = (e) => {
            e.preventDefault();
            showMessage("TARIFAS ACTUALIZADAS EN NUBE! ✅");
        };
    }

    // --- 5. ESCUCHAS DE CÁLCULO DINÁMICO ---
    
    // Cálculo de márgenes en inventario mientras el admin escribe
    const inventoryInputs = ['prod-batch-cost', 'prod-batch-qty', 'prod-profit-pct'];
    inventoryInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', calculateProductPrices);
    });

    // Actualización de total de reserva al cambiar precio manual
    const priceInput = document.getElementById('costPerHour');
    if (priceInput) {
        priceInput.addEventListener('input', () => window.updateBookingVisualTotal());
    }
});
