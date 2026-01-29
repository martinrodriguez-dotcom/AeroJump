/**
 * AeroJump Gualeguaychú - Firebase Service Initializer
 * This module handles the connection to Firebase services and 
 * exports common database path helpers to ensure Rule 1 compliance.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, doc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Hardcoded configuration for AeroJump Project
const firebaseConfig = {
    apiKey: "AIzaSyBz0V2ieSXehafKWRNQprb951NVN5FvBD4",
    authDomain: "aerojump-841fb.firebaseapp.com",
    projectId: "aerojump-841fb",
    storageBucket: "aerojump-841fb.firebasestorage.app",
    messagingSenderId: "68080726646",
    appId: "1:68080726646:web:a830613a1278871d416557"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Global Identifier for the Artifact (Rule 1 Compliance)
const appIdGlobal = "aerojump-gchu";

/**
 * Firestore Path Helpers
 * These ensure all queries point to /artifacts/aerojump-gchu/public/data/...
 */
const getPublicCollection = (name) => collection(db, 'artifacts', appIdGlobal, 'public', 'data', name);
const getPublicDoc = (name, id) => doc(db, 'artifacts', appIdGlobal, 'public', 'data', name, id);

export { auth, db, getPublicCollection, getPublicDoc };
