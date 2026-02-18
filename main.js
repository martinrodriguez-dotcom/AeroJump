/**
 * AeroJump Gualeguaychú - Sistema v2026
 * MAIN MODULE (main.js)
 * * Este es el "cerebro" que une el esqueleto (index.html) con el diseño (style.css).
 * Importa la lógica de cada controlador y la vincula a los eventos del DOM.
 */

import { auth } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// Importación de Controladores (Asegúrate de que estos archivos existan)
import { showView, openModal, closeModals, showMessage } from "./ui-controller.js";
import { initAuthListener, handleLogin } from "./auth-controller.js";
import { syncBookings, prevMonth, nextMonth, handleSaveBooking, adjustJumpers, updateBookingTotal } from "./booking-controller.js";
import { syncProducts, handleSaveProduct, calculateProductPrices, handleConfirmRestock, handleConfirmEditProduct } from "./kiosco-controller.js";
import { loadCajaData, loadStatsData } from "./finance-controller.js";
// import { openSaleModal, handleConfirmSale } from "./sales-controller.js"; // Descomentar al tener sales-controller listo

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. INICIALIZACIÓN DE SEGURIDAD ---
    initAuthListener((user) => {
        // Al detectar usuario, sincronizamos datos y mostramos la agenda por defecto
        syncBookings();
        syncProducts();
        showView('calendar');
    });

    // --- 2. VINCULACIÓN DE EVENTOS DEL MENÚ Y NAVEGACIÓN ---
    const menuBtn = document.getElementById('menu-btn');
    if (menuBtn) {
        menuBtn.onclick = () => {
            const menu = document.getElementById('main-menu');
            const overlay = document.getElementById('menu-overlay');
            menu.classList.toggle('is-open');
            overlay.classList.toggle('hidden');
        };
    }

    const menuOverlay = document.getElementById('menu-overlay');
    if (menuOverlay) {
        menuOverlay.onclick = () => {
            document.getElementById('main-menu').classList.remove('is-open');
            menuOverlay.classList.add('hidden');
        };
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.onclick = () => signOut(auth);
    }

    // Navegación entre vistas (Bento Cards del Sidebar)
    document.querySelectorAll('.menu-item').forEach(btn => {
        btn.onclick = () => {
            const viewId = btn.dataset.view;
            showView(viewId);
            
            // Cargas bajo demanda para no saturar Firebase
            if (viewId === 'caja') loadCajaData();
            if (viewId === 'stats') loadStatsData();
        };
    });

    // --- 3. GESTIÓN DE FORMULARIOS ---
    
    // Login
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.onsubmit = (e) => {
            e.preventDefault();
            handleLogin(
                document.getElementById('login-email').value,
                document.getElementById('login-password').value
            );
        };
    }

    // Reserva (El formulario con estilo Bento e Inventario)
    const bookingForm = document.getElementById('booking-form');
    if (bookingForm) {
        bookingForm.onsubmit = (e) => handleSaveBooking(e);
    }

    // Carga de Productos
    const productForm = document.getElementById('product-form');
    if (productForm) {
        productForm.onsubmit = (e) => handleSaveProduct(e);
    }

    // --- 4. ACCIONES DE COMPONENTES ---

    // Calendario: Navegación de meses
    const btnPrev = document.getElementById('prev-month-btn');
    if (btnPrev) btnPrev.onclick = () => prevMonth();

    const btnNext = document.getElementById('next-month-btn');
    if (btnNext) btnNext.onclick = () => nextMonth();

    // Inventario: Abrir formulario y calcular precios
    const addProductBtn = document.getElementById('add-product-btn');
    if (addProductBtn) {
        addProductBtn.onclick = () => {
            document.getElementById('product-form-container').classList.toggle('is-hidden');
            calculateProductPrices();
        };
    }

    // Listeners para el cálculo automático de ganancia en productos
    ['prod-batch-cost', 'prod-batch-qty', 'prod-profit-pct'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', calculateProductPrices);
    });

    // --- 5. GLOBALIZACIÓN (SOPORTE PARA ONCLICK EN INDEX.HTML) ---
    /**
     * Dado que este script es un MODULO, sus funciones son privadas.
     * Para que los botones del index.html funcionen (onclick="window.closeModals()"),
     * debemos exponer las funciones necesarias al objeto global window.
     */
    window.showView = showView;
    window.closeModals = closeModals;
    window.openModal = openModal;
    window.adjustJumpers = adjustJumpers;
    window.updateBookingVisualTotal = updateBookingTotal;
    window.handleConfirmRestock = handleConfirmRestock;
    window.handleConfirmEditProduct = handleConfirmEditProduct;
    // window.handleConfirmSale = handleConfirmSale; // Activar al tener el controlador de ventas
    // window.openSaleModal = openSaleModal;         // Activar al tener el controlador de ventas

});
