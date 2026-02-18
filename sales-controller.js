/**
 * AeroJump Gualeguaychú - Sales Controller Module
 * Motor del Punto de Venta (POS). Gestiona el carrito, ticket detallado
 * y cierre de ventas con actualización atómica de stock.
 */

import { 
    writeBatch, Timestamp 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { auth, db, getPublicDoc } from "./firebase-config.js";
import { showMessage, hideMessage, closeModals, openModal } from "./ui-controller.js";
import { getProductList } from "./kiosco-controller.js";

// --- ESTADO INTERNO ---
let saleCart = []; // Array de objetos { id, name, salePrice, qty, stockMax }

/**
 * Abre el Punto de Venta y resetea el estado.
 */
export function openSaleModal() {
    saleCart = [];
    const filterInput = document.getElementById('sale-catalog-filter');
    if (filterInput) filterInput.value = '';
    
    renderSaleCatalog();
    renderSaleCart();
    openModal('sale-modal');
}

/**
 * Renderiza el catálogo de productos (Lado Izquierdo).
 */
export function renderSaleCatalog(filter = "") {
    const list = document.getElementById('sale-catalog-list');
    if (!list) return;
    list.innerHTML = '';
    
    const allProducts = getProductList();
    const filtered = allProducts.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()));

    if (filtered.length === 0) {
        list.innerHTML = `<div class="py-20 text-center opacity-20 font-black uppercase italic">Sin productos</div>`;
        return;
    }

    filtered.forEach(p => {
        const itemInCart = saleCart.find(i => i.id === p.id);
        const currentQty = itemInCart ? itemInCart.qty : 0;

        const row = document.createElement('div');
        // Clase definida en style.css para el look Bento
        row.className = 'pos-item-list bg-white border-2 border-slate-100 shadow-sm';
        
        row.innerHTML = `
            <div class="flex-grow text-left leading-none">
                <p class="text-lg font-black uppercase italic text-slate-900 mb-1">${p.name}</p>
                <div class="flex items-center gap-2">
                    <span class="text-[9px] font-black uppercase bg-slate-100 px-2 py-1 rounded text-slate-500">Stock: ${p.stock}</span>
                    <strong class="text-xl font-black text-violet-600 font-mono">$${p.salePrice}</strong>
                </div>
            </div>
            <div class="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                <button class="w-10 h-10 bg-white border-2 border-slate-200 rounded-xl font-black text-xl hover:bg-red-500 hover:text-white transition-all active:scale-90" onclick="window.updCatalogQty('${p.id}', -1)">-</button>
                <span class="font-black text-2xl font-mono w-8 text-center">${currentQty}</span>
                <button class="w-10 h-10 bg-white border-2 border-slate-200 rounded-xl font-black text-xl hover:bg-green-500 hover:text-white transition-all active:scale-90" onclick="window.updCatalogQty('${p.id}', 1)">+</button>
            </div>
        `;
        list.appendChild(row);
    });
}

/**
 * Actualiza las cantidades del carrito (Exportada para main.js).
 */
export function updCatalogQty(productId, delta) {
    const allProducts = getProductList();
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    const existingIndex = saleCart.findIndex(i => i.id === productId);

    if (existingIndex > -1) {
        saleCart[existingIndex].qty += delta;
        if (saleCart[existingIndex].qty <= 0) {
            saleCart.splice(existingIndex, 1);
        } else if (saleCart[existingIndex].qty > product.stock) {
            saleCart[existingIndex].qty = product.stock;
            showMessage("Stock máximo alcanzado", true);
        }
    } else {
        if (delta > 0) {
            if (product.stock > 0) {
                saleCart.push({
                    id: product.id,
                    name: product.name,
                    salePrice: product.salePrice,
                    qty: 1,
                    stockMax: product.stock
                });
            } else {
                showMessage("Sin stock disponible", true);
            }
        }
    }

    renderSaleCatalog(document.getElementById('sale-catalog-filter')?.value || "");
    renderSaleCart();
}

/**
 * Renderiza el ticket de venta (Lado Derecho).
 */
function renderSaleCart() {
    const list = document.getElementById('sale-cart-list');
    const display = document.getElementById('sale-total-display');
    const btn = document.getElementById('confirm-sale-btn');
    const emptyMsg = document.getElementById('empty-cart-msg');

    if (!list || !display || !btn) return;

    list.innerHTML = '';
    let total = 0;

    if (saleCart.length === 0) {
        emptyMsg.classList.remove('is-hidden');
        display.textContent = "0";
        btn.disabled = true;
        return;
    }

    emptyMsg.classList.add('is-hidden');
    
    saleCart.forEach(item => {
        const subtotal = item.salePrice * item.qty;
        total += subtotal;

        const row = document.createElement('div');
        row.className = 'bg-white p-4 rounded-2xl border-2 border-slate-100 flex justify-between items-center mb-3 italic font-black shadow-sm';
        row.innerHTML = `
            <div class="text-left">
                <p class="text-xs uppercase text-slate-400">ITEM</p>
                <p class="text-sm uppercase">${item.name} x${item.qty}</p>
            </div>
            <p class="text-lg font-mono">$${subtotal.toLocaleString('es-AR')}</p>
        `;
        list.appendChild(row);
    });

    display.textContent = total.toLocaleString('es-AR');
    btn.disabled = false;
}

/**
 * Cierre de venta atómico.
 */
export async function handleConfirmSale() {
    if (saleCart.length === 0) return;

    const confirmBtn = document.getElementById('confirm-sale-btn');
    confirmBtn.disabled = true;
    showMessage("Procesando cobro...");

    try {
        const batch = writeBatch(db);
        const now = new Date();
        const day = now.toISOString().split('T')[0];

        saleCart.forEach(item => {
            // 1. Registro de venta
            const saleRef = getPublicDoc("sales", `${Date.now()}_${item.id}`);
            batch.set(saleRef, {
                productId: item.id,
                name: item.name,
                qty: item.qty,
                price: item.salePrice,
                total: item.salePrice * item.qty,
                day: day,
                timestamp: Timestamp.now(),
                adminEmail: auth.currentUser?.email || "admin@aerojump.com"
            });

            // 2. Descuento de stock
            const productRef = getPublicDoc("products", item.id);
            batch.update(productRef, {
                stock: item.stockMax - item.qty
            });
        });

        await batch.commit();
        
        showMessage("VENTA EXITOSA! 🚀");
        setTimeout(() => {
            hideMessage();
            closeModals();
        }, 1500);

    } catch (error) {
        console.error("Error POS AeroJump:", error);
        showMessage("Error al cobrar", true);
        confirmBtn.disabled = false;
    }
}

// Escuchar el filtro de búsqueda
document.addEventListener('input', (e) => {
    if (e.target.id === 'sale-catalog-filter') {
        renderSaleCatalog(e.target.value);
    }
});

// Vincular a window para que los onclick del catálogo funcionen
window.updCatalogQty = updCatalogQty;
window.renderSaleCatalog = renderSaleCatalog;
