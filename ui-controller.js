/**
 * AeroJump Gualeguaychú - UI Controller Module
 * Maneja la visibilidad de vistas, modales y el sistema de notificaciones.
 * Optimizado para la nueva animación de trampolín y respuesta rápida.
 */

/**
 * Cambia la vista activa del sistema (SPA Logic).
 * @param {string} viewId - ID de la sección (ej: 'calendar', 'firmas').
 */
export function showView(viewId) {
    // 1. Ocultar todas las vistas de forma masiva
    const allViews = document.querySelectorAll('.view-container');
    allViews.forEach(v => v.classList.add('is-hidden'));
    
    // 2. Mostrar la vista solicitada
    const target = document.getElementById(`${viewId}-view`);
    if (target) {
        target.classList.remove('is-hidden');
        
        // Resetear el scroll del área principal para que el usuario empiece desde arriba
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.scrollTop = 0;
        }
    }
    
    // 3. Cerrar el menú lateral automáticamente al navegar (UX Mobile)
    const menu = document.getElementById('main-menu');
    const overlay = document.getElementById('menu-overlay');
    if (menu) menu.classList.add('-translate-x-full');
    if (overlay) overlay.classList.add('hidden');
    
    console.log(`Navegando a: ${viewId}`);
}

/**
 * Abre un modal específico y bloquea el scroll de fondo.
 * @param {string} id - ID del elemento modal en el HTML.
 */
export function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('is-open');
        // Asegurar que el body no haga scroll mientras el modal está abierto
        document.body.style.overflow = 'hidden';
    }
}

/**
 * Cierra todos los modales abiertos en el sistema.
 */
export function closeModals() {
    const allModals = document.querySelectorAll('.modal');
    allModals.forEach(m => {
        m.classList.remove('is-open');
    });
    // Mantenemos overflow hidden por la estructura general de la app, 
    // pero si se deseara scroll se habilitaría aquí.
}

/**
 * Muestra el overlay de confirmación con la persona saltando.
 * El tiempo de cierre es veloz para no interrumpir el flujo de trabajo.
 * @param {string} text - Mensaje de éxito o error.
 * @param {boolean} isError - Si es true, el texto se pone en rojo.
 */
export function showMessage(text, isError = false) {
    const overlay = document.getElementById('message-overlay');
    const textEl = document.getElementById('message-text');
    
    if (!overlay || !textEl) return;

    // 1. Configurar el contenido y color
    textEl.textContent = text;
    textEl.style.color = isError ? '#ef4444' : '#ffffff';

    // 2. Activar la visibilidad (Trigger de animación CSS)
    overlay.style.display = 'flex';
    
    // Pequeño retardo para que el navegador registre el cambio de display y anime la opacidad
    setTimeout(() => {
        overlay.classList.add('is-open');
    }, 10);

    // 3. AUTO-CIERRE ÁGIL (1.5 segundos)
    // Este tiempo es suficiente para ver la animación y el texto, pero corto
    // para que puedas seguir trabajando rápidamente.
    setTimeout(() => {
        hideMessage();
    }, 1500); 
}

/**
 * Oculta el mensaje de notificación de forma suave.
 */
export function hideMessage() {
    const overlay = document.getElementById('message-overlay');
    if (overlay) {
        overlay.classList.remove('is-open');
        
        // Esperamos a que la transición de CSS (300ms) termine para quitar el display
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 300);
    }
}

// Vinculación global para que se pueda llamar desde cualquier parte del sistema
window.hideMessage = hideMessage;
window.showMessage = showMessage;
