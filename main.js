/**
 * AeroJump Gualeguaychú - Main Entry Point
 * El "Pegamento" del sistema. Une todos los módulos y activa la interfaz.
 */

// 1. Importación de Controladores
import { initAuthListener, handleLogin, handleRegister, handleLogout } from "./auth-controller.js";
import { initUI, showView, toggleMenu, closeModals } from "./ui-controller.js";
import { syncBookings, saveBooking, prevMonth, nextMonth, updateBookingTotal } from "./booking-controller.js";
import { syncProducts, calculateProductPrices, saveProduct, handleEditProduct, handleRestock } from "./kiosco-controller.js";
import { openSaleModal, handleConfirmSale } from "./sales-controller.js";
import { loadCajaData, loadStatsData } from "./finance-controller.js";
import { getPublicDoc } from "./firebase-config.js";
import { getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// 2. Inicialización Global
document.addEventListener('DOMContentLoaded', () => {
    // Iniciar funciones básicas de UI (clicks fuera de modales, etc)
    initUI();
    
    // Iniciar el Vigilante de Autenticación
    // Pasamos un callback que se ejecutará solo cuando el admin entre con éxito
    initAuthListener(async (user) => {
        console.log("AeroJump: Cargando base de datos para", user.email);
        
        // Cargar ajustes globales (precios) en el objeto window para que todos los módulos lo vean
        await loadGlobalSettings();
        
        // Iniciar sincronización en tiempo real
        syncBookings();
        syncProducts();
        
        // Cargar vista inicial
        showView('calendar');
    });

    // 3. Vinculación de Eventos (Botones y Formularios)
    attachEventListeners();
});

/**
 * Carga los precios maestros de la base de datos
 */
async function loadGlobalSettings() {
    try {
        const snap = await getDoc(getPublicDoc("app_settings", "prices"));
        if (snap.exists()) {
            window.appSettings = snap.data();
        } else {
            window.appSettings = { court1Price: 5000 };
        }
    } catch (e) {
        console.error("Error cargando ajustes:", e);
    }
}

/**
 * Conecta los IDs del HTML con las funciones de los controladores
 */
function attachEventListeners() {
    // --- Autenticación ---
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.onsubmit = (e) => {
            e.preventDefault();
            handleLogin(e.target[0].value, e.target[1].value);
        };
    }

    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.onsubmit = (e) => {
            e.preventDefault();
            handleRegister(e.target[0].value, e.target[1].value);
        };
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.onclick = handleLogout;

    // --- Navegación ---
    document.getElementById('menu-btn').onclick = toggleMenu;
    document.getElementById('menu-overlay').onclick = toggleMenu;

    // Botones del menú lateral
    document.querySelectorAll('.menu-item').forEach(btn => {
        btn.onclick = () => showView(btn.dataset.view);
    });

    // --- Reservas ---
    const bookingForm = document.getElementById('booking-form');
    if (bookingForm) bookingForm.onsubmit = saveBooking;
    
    document.getElementById('prev-month-btn').onclick = prevMonth;
    document.getElementById('next-month-btn').onclick = nextMonth;
    
    // El input de personas afecta el precio en tiempo real
    document.getElementById('peopleCount').oninput = updateBookingTotal;

    // --- Kiosco / Stock ---
    document.getElementById('add-product-btn').onclick = () => {
        document.getElementById('product-form-container').classList.toggle('is-hidden');
    };

    document.getElementById('cancel-product-btn').onclick = () => {
        document.getElementById('product-form-container').classList.add('is-hidden');
    };

    const productForm = document.getElementById('product-form');
    if (productForm) productForm.onsubmit = saveProduct;

    // Cálculo de precios en alta de productos
    ['prod-batch-cost', 'prod-batch-qty', 'prod-profit-pct'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.oninput = calculateProductPrices;
    });

    // Modales de edición y reposición
    const editForm = document.getElementById('edit-product-form');
    if (editForm) editForm.onsubmit = handleEditProduct;

    const restockForm = document.getElementById('restock-form');
    if (restockForm) restockForm.onsubmit = handleRestock;

    // --- Ventas ---
    document.getElementById('header-sale-btn').onclick = openSaleModal;
    
    const confirmSaleBtn = document.getElementById('confirm-sale-btn');
    if (confirmSaleBtn) confirmSaleBtn.onclick = handleConfirmSale;

    // --- Ajustes ---
    const configForm = document.getElementById('config-form');
    if (configForm) {
        configForm.onsubmit = async (e) => {
            e.preventDefault();
            const newPrice = parseFloat(document.getElementById('config-court1-price').value);
            // Guardar directamente aquí o crear un mini-controller de settings
            const { setDoc } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
            await setDoc(getPublicDoc("app_settings", "prices"), { court1Price: newPrice });
            window.appSettings.court1Price = newPrice;
            alert("Precios actualizados.");
        };
    }
}

// Globalización de funciones de cierre para el botón "X" del HTML
window.closeModals = closeModals;
