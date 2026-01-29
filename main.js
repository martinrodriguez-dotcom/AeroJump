/**
 * AeroJump Gualeguaychú - Main Entry Point
 * El "pegamento" modular que une la lógica con la interfaz de usuario.
 */

// 1. Importación de módulos controladores
import { auth, getPublicDoc } from "./firebase-config.js";
import { getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { initUI, showView, toggleMenu, closeModals, showMessage, hideMessage, openModal } from "./ui-controller.js";
import { initAuthListener, handleLogin, handleRegister, handleLogout } from "./auth-controller.js";
import { syncBookings, handleSaveBooking, handleSaveEvent, prevMonth, nextMonth, updateBookingTotal } from "./booking-controller.js";
import { syncProducts, handleSaveProduct, handleConfirmEditProduct, handleConfirmRestock, calculateProductPrices } from "./kiosco-controller.js";
import { openSaleModal, handleConfirmSale } from "./sales-controller.js";
import { loadCajaData, loadStatsData } from "./finance-controller.js";

// 2. Inicialización cuando el DOM está listo
document.addEventListener('DOMContentLoaded', () => {
    initUI();
    
    initAuthListener(async (user) => {
        console.log("AeroJump: Sistema operativo para", user.email);
        await loadGlobalSettings();
        syncBookings();
        syncProducts();
        showView('calendar');
    });

    attachGlobalEventListeners();
});

async function loadGlobalSettings() {
    try {
        const snap = await getDoc(getPublicDoc("app_settings", "prices"));
        if (snap.exists()) {
            window.appSettings = snap.data();
        } else {
            window.appSettings = { court1Price: 5000, eventPrice: 15000 };
        }
    } catch (e) {
        console.error("Error cargando configuración:", e);
    }
}

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

    document.querySelectorAll('.menu-item').forEach(btn => {
        btn.onclick = () => {
            const target = btn.dataset.view;
            showView(target);
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

    ['prod-batch-cost', 'prod-batch-qty', 'prod-profit-pct'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.oninput = calculateProductPrices;
    });

    const editProdForm = document.getElementById('edit-product-form');
    if (editProdForm) editProdForm.onsubmit = handleConfirmEditProduct;

    const restockForm = document.getElementById('restock-form');
    if (restockForm) restockForm.onsubmit = handleConfirmRestock;

    // --- VENTAS (POS) - CORRECCIÓN AQUÍ ---
    const saleBtn = document.getElementById('header-sale-btn');
    if (saleBtn) {
        saleBtn.onclick = () => {
            openSaleModal(); // Prepara el carrito
            openModal('sale-modal'); // Muestra la ventana
        };
    }
    
    const confirmSaleBtn = document.getElementById('confirm-sale-btn');
    if (confirmSaleBtn) confirmSaleBtn.onclick = handleConfirmSale;

    // --- CONFIGURACIÓN ---
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

window.closeModals = closeModals;
