/**
 * AeroJump Gualeguaychú - Sales Controller Module
 * Gestiona el carrito de compras, el catálogo visual de ventas,
 * el cálculo de totales y el procesamiento de cobros.
 */

import { 
    doc, collection, writeBatch, Timestamp 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db, getPublicCollection, getPublicDoc, auth } from "./firebase-config.js";
import { showMessage, hideMessage, openModal, closeModals } from "./ui-controller.js";
import { getProductList } from "./kiosco-controller.js";

// --- ESTADO INTERNO DEL CARRITO ---
let cartItems = {}; // Estructura: { productId: quantity }

// --- REFERENCIAS DOM ---
const saleCatalogGrid = document.getElementById('sale-catalog-grid');
const saleTotalDisplay = document.getElementById('sale-total-display');
const confirmSaleBtn = document.getElementById('confirm-sale-btn');
const saleCatalogFilter = document.getElementById('sale-catalog-filter');

/**
 * Abre el punto de venta y reinicia el estado.
 */
export function openSaleModal() {
    cartItems = {};
    if (saleCatalogFilter) saleCatalogFilter.value = '';
    renderSaleCatalog();
    openModal('sale-modal');
}

/**
 * Renderiza la grilla visual de productos para la venta.
 * @param {string} filter - Texto de búsqueda.
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
            <div class="col-span-full py-20 text-center">
                <p class="text-2xl font-black text-slate-300 uppercase italic">No se encontraron productos</p>
            </div>
        `;
        return;
    }

    filtered.forEach(p => {
        const qty = cartItems[p.id] || 0;
        const card = document.createElement('div');
        card.className = 'product-sale-card';
        card.innerHTML = `
            <div class="text-left mb-6 leading-none">
                <p class="font-black text-sm uppercase text-slate-950 leading-tight mb-2 italic">${p.name}</p>
                <span class="text-[10px] font-black px-3 py-1.5 bg-violet-100 text-violet-800 rounded-xl uppercase leading-none shadow-inner italic border-2 border-violet-200">Stock: ${p.stock} un.</span>
            </div>
            <div class="flex justify-between items-center bg-slate-950 p-3 rounded-[1.5rem] shadow-2xl">
                <strong class="text-3xl font-black text-white italic tracking-tighter leading-none ml-2">$${p.salePrice}</strong>
                <div class="flex items-center gap-2">
                    <button class="btn-minus w-10 h-10 bg-white/10 rounded-2xl font-black text-white hover:bg-red-600 transition-all text-2xl active:scale-90">-</button>
                    <span class="qty-display w-8 text-center font-black text-3xl italic ${qty > 0 ? 'text-orange-400' : 'text-white/20'}">${qty}</span>
                    <button class="btn-plus w-10 h-10 bg-white/10 rounded-2xl font-black text-white hover:bg-green-600 transition-all text-2xl active:scale-90" ${qty >= p.stock ? 'disabled' : ''}>+</button>
                </div>
            </div>
        `;

        // Listeners de botones
        card.querySelector('.btn-minus').onclick = () => updateCartQty(p.id, -1);
        card.querySelector('.btn-plus').onclick = () => updateCartQty(p.id, 1);

        saleCatalogGrid.appendChild(card);
    });
    
    calculateSaleTotal();
}

/**
 * Actualiza la cantidad de un producto en el carrito.
 */
function updateCartQty(id, delta) {
    const allProducts = getProductList();
    const product = allProducts.find(p => p.id === id);
    if (!product) return;

    let currentQty = cartItems[id] || 0;
    currentQty += delta;

    if (currentQty <= 0) {
        delete cartItems[id];
    } else if (currentQty > product.stock) {
        currentQty = product.stock;
        showMessage("Límite de stock alcanzado", true);
        setTimeout(hideMessage, 1000);
    } else {
        cartItems[id] = currentQty;
    }

    renderSaleCatalog(saleCatalogFilter?.value || "");
}

/**
 * Calcula el total acumulado y habilita/deshabilita el botón de cobro.
 */
function calculateSaleTotal() {
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

    if (confirmSaleBtn) {
        confirmSaleBtn.disabled = total <= 0;
    }
}

/**
 * Procesa la venta final.
 */
export async function handleConfirmSale() {
    const total = parseFloat(saleTotalDisplay.textContent.replace(/\./g, ''));
    if (total <= 0) return;

    const methodEl = document.querySelector('input[name="salePaymentMethod"]:checked');
    const paymentMethod = methodEl ? methodEl.value : 'efectivo';

    confirmSaleBtn.disabled = true;
    showMessage("Procesando cobro...");

    try {
        const batch = writeBatch(db);
        const allProducts = getProductList();
        const now = new Date();
        const dayStr = now.toISOString().split('T')[0];
        const monthYear = dayStr.substring(0, 7);

        for (const id of Object.keys(cartItems)) {
            const product = allProducts.find(p => p.id === id);
            const qty = cartItems[id];
            const itemTotal = product.salePrice * qty;

            // 1. Registrar el ticket de venta
            const saleRef = doc(collection(db, 'artifacts', 'aerojump-gchu', 'public', 'data', 'sales'));
            batch.set(saleRef, {
                productId: id,
                name: product.name,
                qty: qty,
                unitPrice: product.salePrice,
                total: itemTotal,
                paymentMethod: paymentMethod,
                day: dayStr,
                monthYear: monthYear,
                timestamp: Timestamp.now(),
                adminEmail: auth.currentUser.email
            });

            // 2. Actualizar el stock del producto
            const productRef = getPublicDoc("products", id);
            batch.update(productRef, {
                stock: product.stock - qty
            });
        }

        await batch.commit();
        
        showMessage("¡Venta exitosa!");
        setTimeout(() => {
            hideMessage();
            closeModals();
        }, 1500);

    } catch (error) {
        console.error("Error en transacción de venta:", error);
        showMessage("Fallo al procesar la venta", true);
        confirmSaleBtn.disabled = false;
    }
}

/**
 * Filtro dinámico del catálogo.
 */
if (saleCatalogFilter) {
    saleCatalogFilter.oninput = (e) => renderSaleCatalog(e.target.value);
}

// Globalización para que el index.html pueda llamar a renderSaleCatalog cuando el stock cambie
window.renderSaleCatalog = renderSaleCatalog;
