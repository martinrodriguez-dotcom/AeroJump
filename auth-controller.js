/**
 * AeroJump Gualeguaychú - Auth Controller Module
 * Gestiona el acceso de administradores, la seguridad de la sesión 
 * y el bloqueo/desbloqueo del panel principal.
 */

import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { auth } from "./firebase-config.js";
import { showMessage, hideMessage } from "./ui-controller.js";

// Referencias a los contenedores de acceso para control de visibilidad
const loginView = document.getElementById('login-view');
const registerView = document.getElementById('register-view');
const appContainer = document.getElementById('app-container');
const userEmailDisplay = document.getElementById('user-email-display');

/**
 * Inicializa el observador de estado de autenticación.
 * Este es el corazón de la seguridad: decide qué se muestra y qué no.
 * @param {Function} onAuthenticated - Función a ejecutar cuando el acceso es exitoso (carga de datos).
 */
export function initAuthListener(onAuthenticated) {
    // Aseguramos que la sesión no se cierre al refrescar la página
    setPersistence(auth, browserLocalPersistence);

    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("AeroJump Auth: Sesión activa para", user.email);
            
            // 1. Desbloqueamos el panel principal (App)
            if (appContainer) appContainer.classList.remove('is-hidden');
            
            // 2. Ocultamos las pantallas de acceso (Login/Registro)
            if (loginView) loginView.classList.add('is-hidden');
            if (registerView) registerView.classList.add('is-hidden');
            
            // 3. Mostramos el email en la barra lateral
            if (userEmailDisplay) userEmailDisplay.textContent = user.email;
            
            // 4. Ejecutamos la carga de datos del sistema
            if (onAuthenticated) onAuthenticated(user);
            
        } else {
            console.log("AeroJump Auth: No hay usuario autenticado.");
            
            // 1. Bloqueamos el panel principal (App) por seguridad
            if (appContainer) appContainer.classList.add('is-hidden');
            
            // 2. Forzamos la vista de Login
            if (loginView) loginView.classList.remove('is-hidden');
            if (userEmailDisplay) userEmailDisplay.textContent = "";
        }
    });
}

/**
 * Procesa el formulario de ingreso.
 */
export async function handleLogin(email, password) {
    showMessage("Validando credenciales...");
    try {
        await signInWithEmailAndPassword(auth, email, password);
        hideMessage();
    } catch (error) {
        console.error("Error en Login:", error.code);
        let errorMsg = "Acceso denegado.";
        
        if (error.code === 'auth/invalid-credential') {
            errorMsg = "Email o contraseña incorrectos.";
        } else if (error.code === 'auth/user-not-found') {
            errorMsg = "El usuario no existe.";
        }
        
        showMessage(errorMsg, true);
        setTimeout(hideMessage, 2000);
    }
}

/**
 * Registra un nuevo administrador en el sistema.
 */
export async function handleRegister(email, password) {
    showMessage("Creando cuenta admin...");
    try {
        await createUserWithEmailAndPassword(auth, email, password);
        showMessage("Cuenta creada con éxito.");
        setTimeout(hideMessage, 1500);
    } catch (error) {
        console.error("Error en Registro:", error);
        showMessage("Error: " + error.message, true);
        setTimeout(hideMessage, 3000);
    }
}

/**
 * Cierra la sesión y limpia el estado visual.
 */
export async function handleLogout() {
    try {
        await signOut(auth);
        console.log("AeroJump Auth: Sesión cerrada.");
    } catch (error) {
        showMessage("Error al cerrar sesión.", true);
    }
}
