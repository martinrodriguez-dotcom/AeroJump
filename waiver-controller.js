/**
 * AeroJump Gualeguaychú - Waiver Controller Module
 * Gestiona el lienzo de firma digital, el almacenamiento de deslindes
 * y la visualización de certificados legales.
 */

import { 
    addDoc, query, onSnapshot, orderBy, Timestamp 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { auth, getPublicCollection } from "./firebase-config.js";
import { openModal, closeModals, showMessage } from "./ui-controller.js";

// --- ESTADO INTERNO DEL CONTROLADOR ---
let allWaivers = [];
let canvas = null;
let ctx = null;
let isDrawing = false;
let lastX = 0;
let lastY = 0;

/**
 * Escucha en tiempo real la colección de firmas para el panel administrativo.
 */
export function syncWaivers() {
    // Solo procedemos si el usuario está autenticado
    if (!auth.currentUser) return;

    const q = query(getPublicCollection("waivers"), orderBy("timestamp", "desc"));
    
    onSnapshot(q, (snapshot) => {
        allWaivers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Si estamos en la vista de firmas, refrescamos el listado
        const view = document.getElementById('firmas-view');
        if (view && !view.classList.contains('is-hidden')) {
            renderWaiverList();
        }
    }, (error) => {
        console.error("Error al sincronizar firmas:", error);
    });
}

/**
 * Prepara y abre el modal para capturar una nueva firma.
 * Inicializa el lienzo de dibujo.
 */
export function openWaiverModal() {
    const form = document.getElementById('waiver-form');
    if (form) form.reset();
    
    openModal('waiver-modal');
    
    // El canvas necesita que el modal sea visible para calcular sus dimensiones
    setTimeout(initSignaturePad, 300);
}

/**
 * Configura el elemento Canvas para capturar trazos suaves.
 */
function initSignaturePad() {
    canvas = document.getElementById('signature-pad');
    if (!canvas) return;

    // Ajustar resolución del canvas al tamaño visual (evita firmas pixeladas)
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#000000'; // Firma en negro
    ctx.lineWidth = 3;           // Grosor del trazo
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // --- EVENTOS DE MOUSE (PC) ---
    canvas.onmousedown = (e) => {
        isDrawing = true;
        [lastX, lastY] = [e.offsetX, e.offsetY];
    };

    canvas.onmousemove = (e) => {
        if (!isDrawing) return;
        drawStroke(e.offsetX, e.offsetY);
    };

    window.addEventListener('mouseup', () => isDrawing = false);

    // --- EVENTOS DE TOUCH (CELULAR/TABLET) ---
    canvas.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent("mousedown", {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent);
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        const touch = e.touches[0];
        const r = canvas.getBoundingClientRect();
        if (isDrawing) {
            drawStroke(touch.clientX - r.left, touch.clientY - r.top);
        }
        e.preventDefault(); // Evita que la pantalla se mueva mientras firmas
    }, { passive: false });

    canvas.addEventListener('touchend', () => {
        isDrawing = false;
    }, { passive: false });
}

/**
 * Dibuja una línea entre el último punto y el actual.
 */
function drawStroke(x, y) {
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
    [lastX, lastY] = [x, y];
}

/**
 * Limpia el lienzo en caso de error en la firma.
 */
export function clearSignature() {
    if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

/**
 * Procesa el formulario y guarda la firma (imagen) en Firestore.
 */
export async function handleSaveWaiver(e) {
    e.preventDefault();

    // Convertimos el dibujo del canvas a una imagen de texto (Base64)
    const signatureBase64 = canvas.toDataURL("image/png");

    // Datos del formulario
    const data = {
        adultName: document.getElementById('waiver-adult-name').value.trim().toUpperCase(),
        dni: document.getElementById('waiver-dni').value.trim(),
        minorName: document.getElementById('waiver-minor-name').value.trim().toUpperCase() || "N/A",
        signature: signatureBase64,
        timestamp: Timestamp.now(),
        dateDisplay: new Date().toLocaleDateString('es-AR'),
        hourDisplay: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
        adminEmail: auth.currentUser?.email || "recepcion@aerojump.com"
    };

    try {
        showMessage("GUARDANDO CERTIFICADO... ✍️");
        
        await addDoc(getPublicCollection("waivers"), data);
        
        closeModals();
        showMessage("FIRMA REGISTRADA CON ÉXITO! ✅");
        
        // Refrescar lista si estamos en la vista de firmas
        renderWaiverList();
        
    } catch (err) {
        console.error("Error al guardar firma:", err);
        showMessage("Error de conexión", true);
    }
}

/**
 * Renderiza las tarjetas de firmas en el panel de administración.
 */
export function renderWaiverList(filter = "") {
    const container = document.getElementById('waiver-list');
    if (!container) return;
    container.innerHTML = '';

    const filtered = allWaivers.filter(w => 
        w.adultName.toLowerCase().includes(filter.toLowerCase()) || 
        w.dni.includes(filter)
    );

    if (filtered.length === 0) {
        container.innerHTML = `<div class="col-span-full py-20 text-center opacity-20 font-black uppercase italic">No hay documentos que coincidan</div>`;
        return;
    }

    filtered.forEach(w => {
        const card = document.createElement('div');
        card.className = 'bento-card bg-white p-6 border-2 border-slate-100 flex flex-col justify-between hover:border-violet-500 hover:shadow-xl cursor-pointer transition-all active:scale-95 group';
        card.onclick = () => window.viewWaiver(w.id);

        card.innerHTML = `
            <div class="text-left leading-tight">
                <div class="flex justify-between items-start mb-4">
                    <span class="text-[8px] font-black bg-slate-900 text-white px-2 py-1 rounded-lg uppercase tracking-widest italic">Certificado Digital</span>
                    <span class="text-[8px] font-black text-slate-300 font-mono">${w.dateDisplay}</span>
                </div>
                <h4 class="font-black text-xl italic uppercase text-slate-900 group-hover:text-violet-600 transition-colors">${w.adultName}</h4>
                <p class="text-xs font-bold text-slate-400 mt-1">DNI: ${w.dni}</p>
                ${w.minorName !== "N/A" ? `
                    <div class="mt-4 p-2 bg-violet-50 rounded-xl border border-violet-100">
                        <p class="text-[7px] font-black text-violet-400 uppercase italic">A cargo de:</p>
                        <p class="text-[10px] font-black text-violet-700 uppercase">${w.minorName}</p>
                    </div>
                ` : ''}
            </div>
            <div class="mt-6 flex justify-end">
                <span class="text-[10px] font-black uppercase text-slate-300 italic group-hover:text-black transition-all">Ver Detalle 📄</span>
            </div>
        `;
        container.appendChild(card);
    });
}

/**
 * Abre el modal para visualizar la firma y los datos.
 */
window.viewWaiver = (id) => {
    const w = allWaivers.find(x => x.id === id);
    if (!w) return;

    const details = document.getElementById('view-waiver-details');
    details.innerHTML = `
        <div class="grid grid-cols-2 gap-4 leading-tight">
            <div>
                <p class="label-tiny">Responsable Adulto:</p>
                <p class="font-black text-lg uppercase italic text-slate-900">${w.adultName}</p>
            </div>
            <div>
                <p class="label-tiny">Documento (DNI):</p>
                <p class="font-black text-lg text-slate-900 font-mono">${w.dni}</p>
            </div>
            ${w.minorName !== "N/A" ? `
                <div class="col-span-2 mt-2 p-3 bg-violet-600 text-white rounded-2xl">
                    <p class="text-[8px] font-black uppercase opacity-70">Menor Autorizado:</p>
                    <p class="font-black text-lg uppercase italic">${w.minorName}</p>
                </div>
            ` : ''}
            <div class="col-span-2 pt-2">
                <p class="label-tiny">Fecha y Hora de Firma:</p>
                <p class="font-bold text-slate-500 uppercase text-xs italic">${w.dateDisplay} a las ${w.hourDisplay}hs</p>
            </div>
        </div>
    `;

    const img = document.getElementById('view-waiver-img');
    img.src = w.signature;

    openModal('view-waiver-modal');
};

/**
 * Permite descargar la firma como una imagen o abrirla para impresión.
 */
export function downloadWaiver() {
    const imgData = document.getElementById('view-waiver-img').src;
    const adultName = document.getElementById('view-waiver-details').querySelector('p.font-black').innerText;
    
    const link = document.createElement('a');
    link.href = imgData;
    link.download = `AeroJump_Firma_${adultName.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showMessage("CERTIFICADO DESCARGADO! 📄");
}

// Exportación global para vinculación con main.js y HTML
window.renderWaiverList = renderWaiverList;
window.downloadWaiver = downloadWaiver;
