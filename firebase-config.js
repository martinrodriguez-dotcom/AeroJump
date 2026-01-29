/**
 * AeroJump Gualeguaychú - Firebase Service Initializer
 * Este módulo centraliza la conexión y los helpers de rutas de base de datos.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, doc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Configuración oficial del proyecto AeroJump
const firebaseConfig = {
    apiKey: "AIzaSyBz0V2ieSXehafKWRNQprb951NVN5FvBD4",
    authDomain: "aerojump-841fb.firebaseapp.com",
    projectId: "aerojump-841fb",
    storageBucket: "aerojump-841fb.firebasestorage.app",
    messagingSenderId: "68080726646",
    appId: "1:68080726646:web:a830613a1278871d416557"
};

// Inicialización de servicios
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Identificador global para cumplir con la Regla 1 de seguridad
const appIdGlobal = "aerojump-gchu";

/**
 * Helpers de Rutas de Firestore
 * Garantizan que todas las consultas apunten a /artifacts/aerojump-gchu/public/data/...
 * @param {string} name - Nombre de la colección (bookings, products, sales, etc.)
 */
export const getPublicCollection = (name) => collection(db, 'artifacts', appIdGlobal, 'public', 'data', name);

/**
 * Helper para documentos específicos
 * @param {string} name - Colección
 * @param {string} id - ID del documento
 */
export const getPublicDoc = (name, id) => doc(db, 'artifacts', appIdGlobal, 'public', 'data', name, id);

export { auth, db };
