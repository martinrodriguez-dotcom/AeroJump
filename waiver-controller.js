/**
 * AeroJump Gualeguaychú - Waiver Controller
 * Maneja la firma digital mediante Canvas y el almacenamiento de exenciones.
 */

import { 
    addDoc, query, onSnapshot, orderBy, Timestamp 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { auth, getPublicCollection } from "./firebase-config.js";
import { openModal, closeModals, showMessage } from "./ui-controller.js";

let allWaivers = [];
let canvas, ctx, isDrawing = false;
let lastX = 0, lastY = 0;

/**
 * Inicializa la escucha de firmas guardadas.
 */
export function syncWaivers() {
    const q = query(getPublicCollection("waivers"), orderBy("timestamp", "desc"));
    onSnapshot(q, (snapshot) => {
        allWaivers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderWaiverList();
    });
}

/**
 * Prepara el modal y el lienzo para firmar.
 */
export function openWaiverModal() {
    document.getElementById('waiver-form').reset();
    openModal('waiver-modal');
    
    // Configuración del Canvas (Firma)
    setTimeout(initCanvas, 300); // Esperar a que el modal se abra para tomar medidas
}

function initCanvas() {
    canvas = document.getElementById('signature-pad');
    if (!canvas) return;
    
    // Ajustar resolución del canvas a su tamaño visual
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // Eventos de Mouse
    canvas.onmousedown = (e) => startDrawing(e.offsetX, e.offsetY);
    canvas.onmousemove = (e) => draw(e.offsetX, e.offsetY);
    window.onmouseup = () => stopDrawing();

    // Eventos de Touch (Celular)
    canvas.ontouchstart = (e) => {
        const touch = e.touches[0];
        const r = canvas.getBoundingClientRect();
        startDrawing(touch.clientX - r.left, touch.clientY - r.top);
        e.preventDefault();
    };
    canvas.ontouchmove = (e) => {
        const touch = e.touches[0];
        const r = canvas.getBoundingClientRect();
        draw(touch.clientX - r.left, touch.clientY - r.top);
        e.preventDefault();
    };
    canvas.ontouchend = () => stopDrawing();
}

function startDrawing(x, y) {
    isDrawing = true;
    [lastX, lastY] = [x, y];
}

function draw(x, y) {
    if (!isDrawing) return;
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
    [lastX, lastY] = [x, y];
}

function stopDrawing() { isDrawing = false; }

export function clearSignature() {
    if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
}

/**
 * Guarda la exención con la firma en Base64.
 */
export async function handleSaveWaiver(e) {
    e.preventDefault();
    
    const signatureImg = canvas.toDataURL("image/png");
    
    // Verificación básica de que firmó (si el canvas está mayormente vacío)
    // Para simplificar, asumimos que si no limpió, firmó algo.

    const data = {
        adultName: document.getElementById('waiver-adult-name').value.trim().toUpperCase(),
        dni: document.getElementById('waiver-dni').value.trim(),
        minorName: document.getElementById('waiver-minor-name').value.trim().toUpperCase(),
        signature: signatureImg,
        timestamp: Timestamp.now(),
        dateStr: new Date().toLocaleDateString('es-AR'),
        adminEmail: auth.currentUser?.email || "admin@aerojump.com"
    };

    try {
        showMessage("GUARDANDO FIRMA... ✍️");
        await addDoc(getPublicCollection("waivers"), data);
        closeModals();
        showMessage("FIRMA REGISTRADA CON ÉXITO! ✅");
    } catch (err) {
        console.error(err);
        showMessage("Error al guardar", true);
    }
}

/**
 * Lista las firmas en la vista de administración.
 */
export function renderWaiverList(filter = "") {
    const container = document.getElementById('waiver-list');
    if (!container) return;
    container.innerHTML = '';

    const filtered = allWaivers.filter(w => 
        w.adultName.toLowerCase().includes(filter.toLowerCase()) || 
        w.dni.includes(filter) ||
        (w.minorName && w.minorName.toLowerCase().includes(filter.toLowerCase()))
    );

    filtered.forEach(w => {
        const card = document.createElement('div');
        card.className = 'bento-card bg-white p-6 flex flex-col justify-between hover:border-violet-500 cursor-pointer transition-all active:scale-95';
        card.onclick = () => window.viewWaiver(w.id);
        
        card.innerHTML = `
            <div class="text-left leading-tight">
                <p class="text-[8px] font-black text-violet-500 uppercase tracking-widest mb-1 italic">Certificado Digital</p>
                <h4 class="font-black text-lg italic uppercase text-slate-900">${w.adultName}</h4>
                <p class="text-xs font-bold text-slate-400">DNI: ${w.dni}</p>
                ${w.minorName ? `<p class="text-[10px] font-black text-orange-500 mt-2 uppercase italic">Menor: ${w.minorName}</p>` : ''}
            </div>
            <div class="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
                <span class="text-[9px] font-mono text-slate-300 font-bold">${w.dateStr}</span>
                <span class="text-xs">📄 Ver Detalle</span>
            </div>
        `;
        container.appendChild(card);
    });
}

/**
 * Visualiza una firma específica.
 */
window.viewWaiver = (id) => {
    const w = allWaivers.find(x => x.id === id);
    if (!w) return;

    document.getElementById('view-waiver-details').innerHTML = `
        <p class="label-tiny">Responsable:</p>
        <p class="font-black text-lg uppercase italic mb-3">${w.adultName}</p>
        <p class="label-tiny">Documento:</p>
        <p class="font-bold mb-3">${w.dni}</p>
        ${w.minorName ? `<p class="label-tiny">A cargo del menor:</p><p class="font-black text-orange-600 uppercase italic">${w.minorName}</p>` : ''}
        <p class="label-tiny mt-4">Fecha de Registro:</p>
        <p class="font-mono text-xs">${w.dateStr}</p>
    `;
    
    document.getElementById('view-waiver-img').src = w.signature;
    openModal('view-waiver-modal');
};

/**
 * Simulación de descarga.
 */
window.downloadWaiver = () => {
    // Aquí se podría integrar jsPDF, por ahora abrimos la imagen en nueva pestaña
    const img = document.getElementById('view-waiver-img').src;
    const win = window.open();
    win.document.write(`<iframe src="${img}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
};

// Vinculación global
window.renderWaiverList = renderWaiverList;
window.openWaiverModal = openWaiverModal;
window.clearSignature = clearSignature;
