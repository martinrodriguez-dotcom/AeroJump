/**
 * AeroJump Gualeguaychú - UI Controller Module
 * Maneja la navegación, el control de modales y los mensajes del sistema.
 */

// Elementos de navegación y estructura
const mainMenu = document.getElementById('main-menu');
const menuOverlay = document.getElementById('menu-overlay');
const viewContainers = document.querySelectorAll('.view-container');
const messageOverlay = document.getElementById('message-overlay');
const messageText = document.getElementById('message-text');

/**
 * Cambia la vista activa de la aplicación.
 * @param {string} viewId - El nombre de la vista (ej: 'calendar', 'productos').
 */
export function showView(viewId) {
    // Ocultar todas las vistas
    viewContainers.forEach(container => container.classList.add('is-hidden'));
    
    // Mostrar la vista solicitada
    const targetView = document.getElementById(`${viewId}-view`);
    if (targetView) {
        targetView.classList.remove('is-hidden');
    }
    
    // Cerrar menú si está abierto
    closeMenu();
}

/**
 * Control del Menú Lateral (Hamburguesa)
 */
export function toggleMenu() {
    if (mainMenu && menuOverlay) {
        mainMenu.classList.toggle('is-open');
        menuOverlay.classList.toggle('hidden');
    }
}

export function closeMenu() {
    if (mainMenu && menuOverlay) {
        mainMenu.classList.remove('is-open');
        menuOverlay.classList.add('hidden');
    }
}

/**
 * Control Global de Modales (Ventanas Extra)
 */
export function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('is-open');
    }
}

export function closeModals() {
    const openModals = document.querySelectorAll('.modal.is-open');
    openModals.forEach(modal => {
        // No cerramos el overlay de mensajes aquí para evitar conflictos
        if (modal.id !== 'message-overlay') {
            modal.classList.remove('is-open');
        }
    });
}

/**
 * Sistema de Notificaciones Visuales
 * @param {string} text - El mensaje a mostrar.
 * @param {boolean} isError - Si es un mensaje de error (rojo).
 */
export function showMessage(text, isError = false) {
    if (messageOverlay && messageText) {
        messageText.textContent = text;
        messageText.className = isError 
            ? 'text-3xl font-black text-red-600 uppercase italic tracking-tighter' 
            : 'text-3xl font-black text-slate-900 uppercase italic tracking-tighter';
        
        messageOverlay.classList.add('is-open');
    }
}

export function hideMessage() {
    if (messageOverlay) {
        messageOverlay.classList.remove('is-open');
    }
}

/**
 * Inicialización de listeners básicos de UI
 */
export function initUI() {
    // Cerrar modales al hacer clic fuera del contenido
    const allModals = document.querySelectorAll('.modal');
    allModals.forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal && modal.id !== 'message-overlay') {
                closeModals();
            }
        });
    });
}
