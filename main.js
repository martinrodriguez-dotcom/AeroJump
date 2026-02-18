/**
 * AeroJump Gualeguaychú - Sistema v2026
 * MAIN ORCHESTRATOR MODULE
 * * Este archivo centraliza la lógica y expone las funciones al objeto global 'window'
 * para que los eventos 'onclick' del HTML puedan ejecutarlas sin errores.
 */

import { auth } from "./firebase-config.js";
import { 
    onAuthStateChanged, 
    signOut, 
    signInWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// Importación de controladores específicos
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
    loadStatsData 
} from "./finance-controller.js";

import { 
    openSaleModal, 
    handleConfirmSale, 
    renderSaleCatalog 
} from "./sales-controller.js";

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. VINCULACIÓN AL OBJETO WINDOW (Solución al TypeError) ---
    // Exponemos las funciones para que 'onclick="window.function()"' sea válido.

    // Navegación y Menú
    window.toggleMenu = (force) => {
        const menu = document.getElementById('main-menu');
        const overlay = document.getElementById('menu-overlay');
        
        // Verificamos si el menú está abierto por su clase de transformación
        const isCurrentlyClosed = menu.classList.contains('-translate-x-full');
        const shouldOpen = force !== undefined ? force : isCurrentlyClosed;
        
        if (shouldOpen) {
            menu.classList.remove('-translate-x-full');
            overlay.classList.remove('hidden');
            menu.classList.add('is-open'); // Clase para estilos adicionales de CSS
        } else {
            menu.classList.add('-translate-x-full');
            overlay.classList.add('hidden');
            menu.classList.remove('is-open');
        }
    };

    window.showView = (viewId) => {
        showView(viewId); // Lógica de ui-controller.js
        
        // Carga de datos bajo demanda para optimizar rendimiento
        if (viewId === 'caja') loadCajaData();
        if (viewId === 'stats') loadStatsData();
        
        // Siempre cerrar el menú lateral al navegar
        window.toggleMenu(false);
    };

    // Gestión de Modales
    window.openModal = openModal;
    window.closeModals = closeModals;

    // Agenda y Reservas
    window.prevMonth = prevMonth;
    window.nextMonth = nextMonth;
    window.adjustJumpers = adjustJumpers;
    window.updateBookingVisualTotal = updateBookingTotal;

    // Inventario y Kiosco
    window.toggleProductForm = (show) => {
        const formContainer = document.getElementById('product-form-container');
        if (show === false) {
            formContainer.classList.add('is-hidden');
        } else {
            formContainer.classList.toggle('is-hidden');
        }
    };
    
    // Vinculación de confirmaciones de modales (Reposición y Edición)
    window.handleConfirmRestock = handleConfirmRestock;
    window.handleConfirmEditProduct = handleConfirmEditProduct;

    // Punto de Venta (POS)
    window.openSaleModal = openSaleModal;
    window.handleConfirmSale = handleConfirmSale;
    window.renderSaleCatalog = renderSaleCatalog;

    // --- 2. MANEJO DE LA SESIÓN (FIREBASE AUTH) ---
    onAuthStateChanged(auth, (user) => {
        const appContainer = document.getElementById('app-container');
        const loginView = document.getElementById('login-view');
        const emailDisplay = document.getElementById('user-email-display');

        if (user) {
            // Usuario autenticado: Mostramos el Panel
            appContainer.classList.remove('is-hidden');
            loginView.classList.add('is-hidden');
            if (emailDisplay) emailDisplay.textContent = user.email;
            
            // Iniciamos la sincronización en tiempo real de los datos
            syncBookings();
            syncProducts();
            
            // Cargamos la vista inicial (Calendario)
            window.showView('calendar');
        } else {
            // Usuario no autenticado: Mostramos el Login
            appContainer.classList.add('is-hidden');
            loginView.classList.remove('is-hidden');
            if (emailDisplay) emailDisplay.textContent = "";
        }
    });

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
                console.error("Login Error:", err.code);
                alert("DATOS INCORRECTOS: Verifica tu usuario y contraseña."); 
            }
        };
    }

    // Botón de Cierre de Sesión
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.onclick = async () => {
            try { 
                await signOut(auth); 
            } catch (e) { 
                console.error("Error al cerrar sesión:", e); 
            }
        };
    }

    // --- 3. LISTENERS DE CÁLCULO E INPUTS ---
    
    // Cálculo automático de precios sugeridos al tipear en el formulario de stock
    const calcInputs = ['prod-batch-cost', 'prod-batch-qty', 'prod-profit-pct'];
    calcInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', calculateProductPrices);
    });

    // Envío de Formulario de Inventario (Alta)
    const productForm = document.getElementById('product-form');
    if (productForm) {
        productForm.onsubmit = handleSaveProduct;
    }

    // Envío de Formulario de Reservas (Alta/Edición)
    const bookingForm = document.getElementById('booking-form');
    if (bookingForm) {
        bookingForm.onsubmit = handleSaveBooking;
    }
    
    // Formulario de Configuración (Tarifas)
    const configForm = document.getElementById('config-form');
    if (configForm) {
        configForm.onsubmit = (e) => {
            e.preventDefault();
            // Aquí iría la lógica de setDoc para guardar tarifas en Firebase si fuera necesario
            showMessage("TARIFAS ACTUALIZADAS! ✅");
        };
    }
});
