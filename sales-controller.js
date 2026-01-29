/**
 * AeroJump Gualeguaychú - Sales Controller Module
 * Gestiona el carrito de compras, el catálogo visual del POS y
 * el procesamiento de cobros con actualización masiva de stock.
 */

import { 
    writeBatch, Timestamp 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { auth, db, getPublicCollection, getPublicDoc } from "./firebase-config.js";
import { showMessage, hideMessage, closeModals } from "./ui-controller.js";
import { getProductList } from "./kiosco-controller.js";

// --- ESTADO INTERNO DEL CARRITO ---
let cartItems = {}; // Estructura: { productId: quantity }

// --- REFERENCIAS DOM ---
const saleCatalogGrid = document.getElementById('sale-catalog-grid');
const saleTotalDisplay = document.getElementById('sale-total-display');
const confirmSaleBtn = document.getElementById('confirm-sale-btn');
const saleCatalogFilter = document.getElementById('sale-catalog-filter');

/**
 * Abre el punto de venta y reinicia el estado del pedido actual.
 */
export function openSaleModal() {
    cartItems = {}; // Limpiar carrito anterior
    if (saleCatalogFilter) saleCatalogFilter.value = '';
    renderSaleCatalog();
    // El modal se abre desde el main.js llamando a openModal('sale-modal')
}

/**
 * Renderiza la grilla de productos optimizada para el punto de venta.
 * @param {string} filter - Texto para búsqueda dinámica.
 */
export function renderSaleCatalog(filter = "") {
    if (!saleCatalogGrid) return;
    saleCatalogGrid.innerHTML = '';
    
    const allProducts = getProductList();
    const filtered = allProducts.filter(p => 
        p.name.toLowerCase().includes(filter.toLowerCase())
    );

    if (filtered.length === 0) {
        saleCatalogGrid.innerHTML = `
            <div class="col-span-full py-20 text-center opacity-30">
                <p class="text-xl font-black uppercase italic">Sin productos en catálogo</p>
            </div>
        `;
        return;
    }

    filtered.forEach(p => {
        const qty = cartItems[p.id] || 0;
        const card = document.createElement('div');
        card.className = 'product-sale-card'; // Estilo definido en style.css
        
        card.innerHTML = `
            <div class="text-left mb-4 leading-none">
                <p class="font-black text-xs uppercase text-slate-900 leading-tight mb-1 italic">${p.name}</p>
                <div class="flex justify-between items-center">
                    <span class="text-[8px] font-black px-2 py-0.5 bg-slate-100 text-slate-500 rounded uppercase">Stock: ${p.stock}</span>
                    <strong class="text-lg font-black text-violet-700 italic tracking-tighter">$${p.salePrice}</strong>
                </div>
            </div>
            
            <div class="flex items-center justify-between bg-slate-900 p-2 rounded-xl border-2 border-slate-800">
                <button class="btn-minus w-8 h-8 flex items-center justify-center bg-white/10 text-white rounded-lg font-black hover:bg-red-600 transition-all">-</button>
                <span class="qty-val font-black text-xl italic ${qty > 0 ? 'text-orange-400' : 'text-white/20'}">${qty}</span>
                <button class="btn-plus w-8 h-8 flex items-center justify-center bg-white/10 text-white rounded-lg font-black hover:bg-green-600 transition-all" ${qty >= p.stock ? 'disabled opacity-20' : ''}>+</button>
            </div>
        `;

        // Vinculación de eventos a los botones de la tarjeta
        card.querySelector('.btn-minus').onclick = () => updateCartQuantity(p.id, -1);
        card.querySelector('.btn-plus').onclick = () => updateCartQuantity(p.id, 1);

        saleCatalogGrid.appendChild(card);
    });
    
    updateVisualTotal();
}

/**
 * Actualiza la cantidad de un artículo en el carrito.
 */
function updateCartQuantity(id, delta) {
    const allProducts = getProductList();
    const product = allProducts.find(p => p.id === id);
    if (!product) return;

    let current = cartItems[id] || 0;
    current += delta;

    if (current <= 0) {
        delete cartItems[id];
    } else if (current > product.stock) {
        current = product.stock;
    } else {
        cartItems[id] = current;
    }

    renderSaleCatalog(saleCatalogFilter?.value || "");
}

/**
 * Calcula el total del pedido y actualiza la UI del pie de página.
 */
function updateVisualTotal() {
    let total = 0;
    const allProducts = getProductList();

    Object.keys(cartItems).forEach(id => {
        const product = allProducts.find(p => p.id === id);
        if (product) {
            total += (product.salePrice * cartItems[id]);
        }
    });

    if (saleTotalDisplay) {
        saleTotalDisplay.textContent = total.toLocaleString('es-AR');
    }

    // El botón de cobro solo se activa si hay dinero a cobrar
    if (confirmSaleBtn) {
        confirmSaleBtn.disabled = total <= 0;
    }
}

/**
 * Procesa el cobro final, guarda el ticket y descuenta stock.
 */
export async function handleConfirmSale() {
    const totalRaw = saleTotalDisplay.textContent.replace(/\./g, '');
    const total = parseFloat(totalRaw);
    
    if (total <= 0) return;

    const methodEl = document.querySelector('input[name="salePaymentMethod"]:checked');
    const paymentMethod = methodEl ? methodEl.value : 'efectivo';

    confirmSaleBtn.disabled = true;
    showMessage("Liquidando Venta...");

    try {
        const batch = writeBatch(db);
        const allProducts = getProductList();
        const now = new Date();
        const dayStr = now.toISOString().split('T')[0];
        const monthYear = dayStr.substring(0, 7);

        for (const id of Object.keys(cartItems)) {
            const product = allProducts.find(p => p.id === id);
            const qty = cartItems[id];

            // 1. Registro de la venta individual
            const saleRef = getPublicDoc("sales", `${Date.now()}_${id}`);
            batch.set(saleRef, {
                name: product.name,
                qty: qty,
                unitPrice: product.salePrice,
                total: product.salePrice * qty,
                paymentMethod: paymentMethod,
                day: dayStr,
                monthYear: monthYear,
                timestamp: Timestamp.now(),
                adminEmail: auth.currentUser.email
            });

            // 2. Descuento automático de stock
            const productRef = getPublicDoc("products", id);
            batch.update(productRef, {
                stock: product.stock - qty
            });
        }

        // Ejecución atómica de todas las operaciones
        await batch.commit();
        
        showMessage("¡Venta Cerrada!");
        setTimeout(() => {
            hideMessage();
            closeModals();
        }, 1500);

    } catch (error) {
        console.error("AeroJump POS Error:", error);
        showMessage("Error al procesar cobro", true);
        confirmSaleBtn.disabled = false;
    }
}

// Globalización para que el buscador del HTML funcione directamente
window.renderSaleCatalog = renderSaleCatalog;
