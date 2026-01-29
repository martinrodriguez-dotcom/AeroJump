/**
 * AeroJump Gualeguaychú - UI Controller Module
 * Gestiona la navegación, los estados de los modales y las notificaciones visuales.
 */

// Referencias a elementos estructurales
const mainMenu = document.getElementById('main-menu');
const menuOverlay = document.getElementById('menu-overlay');
const viewContainers = document.querySelectorAll('.view-container');
const messageOverlay = document.getElementById('message-overlay');
const messageText = document.getElementById('message-text');

/**
 * Cambia la vista activa del sistema.
 * @param {string} viewId - El ID de la vista (ej: 'calendar', 'productos', 'caja').
 */
export function showView(viewId) {
    // Ocultamos todas las vistas primero
    viewContainers.forEach(container => {
        container.classList.add('is-hidden');
    });

    // Mostramos la vista solicitada
    const targetView = document.getElementById(`${viewId}-view`);
    if (targetView) {
        targetView.classList.remove('is-hidden');
    }

    // Cerramos el menú lateral automáticamente al navegar
    closeMenu();
}

/**
 * Control del Menú Lateral (Hamburguesa)
 */
export function toggleMenu() {
    if (mainMenu && menuOverlay) {
        const isOpen = mainMenu.classList.contains('is-open');
        if (isOpen) {
            closeMenu();
        } else {
            mainMenu.classList.add('is-open');
            mainMenu.style.transform = "translateX(0)";
            menuOverlay.classList.remove('hidden');
        }
    }
}

export function closeMenu() {
    if (mainMenu && menuOverlay) {
        mainMenu.classList.remove('is-open');
        mainMenu.style.transform = "translateX(-100%)";
        menuOverlay.classList.add('hidden');
    }
}

/**
 * Control de Modales (Ventanas Extra)
 * Usa la clase 'is-open' definida en style.css
 */
export function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('is-open');
    }
}

export function closeModals() {
    // Cerramos todos los modales abiertos excepto el de mensajes críticos
    const modals = document.querySelectorAll('.modal.is-open');
    modals.forEach(modal => {
        if (modal.id !== 'message-overlay') {
            modal.classList.remove('is-open');
        }
    });
}

/**
 * Sistema de Notificaciones de Alto Impacto
 * @param {string} text - Mensaje a mostrar.
 * @param {boolean} isError - Si el estilo debe ser de error (naranja/rojo).
 */
export function showMessage(text, isError = false) {
    if (messageOverlay && messageText) {
        messageText.textContent = text;
        
        // Ajustamos color según tipo de mensaje
        if (isError) {
            messageText.classList.add('text-orange-600');
            messageText.classList.remove('text-slate-950');
        } else {
            messageText.classList.remove('text-orange-600');
            messageText.classList.add('text-slate-950');
        }
        
        messageOverlay.classList.add('is-open');
    }
}

export function hideMessage() {
    if (messageOverlay) {
        messageOverlay.classList.remove('is-open');
    }
}

/**
 * Inicialización de eventos básicos de la UI
 */
export function initUI() {
    // Cerrar modales si se hace clic en el fondo oscuro
    const allModals = document.querySelectorAll('.modal');
    allModals.forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal && modal.id !== 'message-overlay') {
                closeModals();
            }
        });
    });

    console.log("UI Controller: Sistema visual inicializado.");
}
