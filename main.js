/**
 * AeroJump Gualeguaychú - Sistema v2026
 * MAIN MODULE (main.js)
 * Conecta la lógica de los controladores con el esqueleto HTML y el diseño CSS.
 * Gestiona el flujo de navegación y la exposición global de funciones.
 */

import { auth } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// 1. Importación de Controladores
import { showView, openModal, closeModals, showMessage } from "./ui-controller.js";
import { initAuthListener, handleLogin } from "./auth-controller.js";
import { syncBookings, prevMonth, nextMonth, handleSaveBooking, adjustJumpers, updateBookingTotal } from "./booking-controller.js";
import { syncProducts, handleSaveProduct, calculateProductPrices, handleConfirmRestock, handleConfirmEditProduct } from "./kiosco-controller.js";
import { loadCajaData, loadStatsData } from "./finance-controller.js";
import { openSaleModal, handleConfirmSale, updCatalogQty } from "./sales-controller.js";

document.addEventListener('DOMContentLoaded', () => {

    // --- 2. INICIALIZACIÓN DE SEGURIDAD ---
    initAuthListener((user) => {
        // Al detectar sesión activa, sincronizamos datos y mostramos la agenda
        syncBookings();
        syncProducts();
        showView('calendar');
    });

    // --- 3. EVENTOS DE NAVEGACIÓN Y MENÚ ---
    const menuBtn = document.getElementById('menu-btn');
    if (menuBtn) {
        menuBtn.onclick = () => {
            const menu = document.getElementById('main-menu');
            const overlay = document.getElementById('menu-overlay');
            if (menu) menu.classList.toggle('is-open');
            if (overlay) overlay.classList.toggle('hidden');
        };
    }

    const menuOverlay = document.getElementById('menu-overlay');
    if (menuOverlay) {
        menuOverlay.onclick = () => {
            const menu = document.getElementById('main-menu');
            if (menu) menu.classList.remove('is-open');
            menuOverlay.classList.add('hidden');
        };
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.onclick = () => signOut(auth);
    }

    // Vinculación de los botones del menú lateral mediante data-view
    document.querySelectorAll('.menu-item').forEach(btn => {
        btn.onclick = () => {
            const viewId = btn.dataset.view;
            showView(viewId);
            
            // Cargas específicas según la vista
            if (viewId === 'caja') loadCajaData();
            if (viewId === 'stats') loadStatsData();
        };
    });

    // --- 4. GESTIÓN DE FORMULARIOS ---

    // Login Form
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

    // Formulario de Reserva (Bento Layout)
    const bookingForm = document.getElementById('booking-form');
    if (bookingForm) {
        bookingForm.onsubmit = (e) => handleSaveBooking(e);
    }

    // Formulario de Carga de Productos
    const productForm = document.getElementById('product-form');
    if (productForm) {
        productForm.onsubmit = (e) => handleSaveProduct(e);
    }

    // --- 5. ACCIONES DE COMPONENTES ---

    // Botón Venta Kiosco (Header)
    const saleBtn = document.getElementById('header-sale-btn');
    if (saleBtn) {
        saleBtn.onclick = () => openSaleModal();
    }

    // Botón Agregar Producto (Stock)
    const addProductBtn = document.getElementById('add-product-btn');
    if (addProductBtn) {
        addProductBtn.onclick = () => {
            const container = document.getElementById('product-form-container');
            if (container) {
                container.classList.toggle('is-hidden');
                calculateProductPrices(); // Recalcular al abrir
            }
        };
    }

    // Navegación Calendario
    const prevMonthBtn = document.getElementById('prev-month-btn');
    if (prevMonthBtn) prevMonthBtn.onclick = () => prevMonth();

    const nextMonthBtn = document.getElementById('next-month-btn');
    if (nextMonthBtn) nextMonthBtn.onclick = () => nextMonth();

    // Listeners para cálculos de precios en tiempo real (Kiosco)
    ['prod-batch-cost', 'prod-batch-qty', 'prod-profit-pct'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', calculateProductPrices);
    });

    // --- 6. EXPOSICIÓN GLOBAL (DIRECTIVA DE INTEROPERABILIDAD) ---
    /**
     * IMPORTANTE: Al usar type="module", las funciones no son visibles para el HTML.
     * Aquí las exponemos al objeto window para que los "onclick" del index.html funcionen.
     */
    window.showView = showView;
    window.closeModals = closeModals;
    window.openModal = openModal;
    window.adjustJumpers = adjustJumpers;
    window.updateBookingVisualTotal = updateBookingTotal;
    window.handleConfirmRestock = handleConfirmRestock;
    window.handleConfirmEditProduct = handleConfirmEditProduct;
    window.handleConfirmSale = handleConfirmSale;
    window.updCatalogQty = updCatalogQty;
    window.openSaleModal = openSaleModal;
});
