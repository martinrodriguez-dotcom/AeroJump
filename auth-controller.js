/**
 * AeroJump Gualeguaychú - Auth Controller Module
 * Gestiona el acceso de administradores y la persistencia de la sesión.
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
import { showMessage } from "./ui-controller.js";

// Referencias a los contenedores principales de acceso
const loginView = document.getElementById('login-view');
const registerView = document.getElementById('register-view');
const appContainer = document.getElementById('app-container');
const userEmailDisplay = document.getElementById('user-email-display');

/**
 * Inicializa el vigilante de estado de autenticación.
 * @param {Function} onUserAuthenticated - Función a ejecutar cuando el usuario entra (ej: cargar datos).
 */
export function initAuthListener(onUserAuthenticated) {
    // Aseguramos que la sesión se mantenga abierta al recargar la página
    setPersistence(auth, browserLocalPersistence);

    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("AeroJump: Administrador detectado ->", user.email);
            
            // UI: Mostrar App, ocultar Login
            if (loginView) loginView.classList.add('is-hidden');
            if (registerView) registerView.classList.add('is-hidden');
            if (appContainer) appContainer.classList.remove('is-hidden');
            
            // Mostrar email en el menú
            if (userEmailDisplay) userEmailDisplay.textContent = user.email;
            
            // Ejecutar callback de carga de datos
            if (onUserAuthenticated) onUserAuthenticated(user);
        } else {
            console.log("AeroJump: No hay sesión activa.");
            
            // UI: Ocultar App, mostrar Login
            if (appContainer) appContainer.classList.add('is-hidden');
            if (loginView) loginView.classList.remove('is-hidden');
            if (userEmailDisplay) userEmailDisplay.textContent = "";
        }
    });
}

/**
 * Procesa el intento de login.
 */
export async function handleLogin(email, password) {
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        console.error("Error en Login:", error.code);
        let mensajeError = "Acceso denegado. Verifique sus credenciales.";
        
        if (error.code === 'auth/invalid-credential') {
            mensajeError = "Email o contraseña incorrectos.";
        } else if (error.code === 'auth/user-not-found') {
            mensajeError = "El usuario no existe.";
        }
        
        showMessage(mensajeError, true);
    }
}

/**
 * Procesa el registro de un nuevo administrador.
 */
export async function handleRegister(email, password) {
    try {
        await createUserWithEmailAndPassword(auth, email, password);
        showMessage("Cuenta admin creada con éxito.");
    } catch (error) {
        console.error("Error en Registro:", error);
        showMessage("Error al crear cuenta: " + error.message, true);
    }
}

/**
 * Cierra la sesión de forma segura.
 */
export async function handleLogout() {
    try {
        await signOut(auth);
    } catch (error) {
        showMessage("Error al intentar salir del sistema.", true);
    }
}
