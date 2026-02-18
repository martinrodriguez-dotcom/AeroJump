/**
 * AeroJump Gualeguaychú - Sales Controller Module
 * Motor del Punto de Venta (POS). Gestiona el catálogo en lista, 
 * el carrito y cierre de ventas con actualización de stock.
 */

import { 
    writeBatch, Timestamp 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { auth, db, getPublicDoc } from "./firebase-config.js";
import { showMessage, hideMessage, closeModals, openModal } from "./ui-controller.js";
import { getProductList } from "./kiosco-controller.js";

// --- ESTADO INTERNO ---
let saleCart = []; 

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
 * Renderiza el catálogo de productos en FILAS (Lista moderna).
 */
export function renderSaleCatalog(filter = "") {
    const list = document.getElementById('sale-catalog-list');
    if (!list) return;
    list.innerHTML = '';
    
    // Obtenemos lista y ORDENAMOS ALFABÉTICAMENTE
    const allProducts = getProductList();
    const sortedProducts = [...allProducts].sort((a, b) => a.name.localeCompare(b.name));
    
    const filtered = sortedProducts.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()));

    if (filtered.length === 0) {
        list.innerHTML = `<div class="py-20 text-center opacity-20 font-black uppercase italic">Sin coincidencias</div>`;
        return;
    }

    // Cabecera de la lista (Opcional, pero ayuda a la claridad)
    const header = document.createElement('div');
    header.className = 'hidden md:flex px-6 py-3 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 italic';
    header.innerHTML = `
        <div class="flex-grow">Producto</div>
        <div class="w-24 text-center">Stock</div>
        <div class="w-24 text-center">Precio</div>
        <div class="w-32 text-right">Cantidad</div>
    `;
    list.appendChild(header);

    filtered.forEach(p => {
        const itemInCart = saleCart.find(i => i.id === p.id);
        const currentQty = itemInCart ? itemInCart.qty : 0;

        const row = document.createElement('div');
        // Clase optimizada en style.css para formato lista
        row.className = 'pos-item-row bg-white hover:bg-slate-50 transition-all border-b border-slate-100 px-6 py-4 flex flex-col md:flex-row items-center gap-4';
        
        row.innerHTML = `
            <!-- Columna 1: Nombre -->
            <div class="flex-grow text-left leading-none w-full md:w-auto">
                <p class="text-sm font-black uppercase italic text-slate-900">${p.name}</p>
            </div>

            <div class="flex items-center justify-between w-full md:w-auto gap-8">
                <!-- Columna 2: Stock -->
                <div class="w-16 text-center">
                    <span class="text-[9px] font-black uppercase ${p.stock < 5 ? 'text-red-500 bg-red-50' : 'text-slate-400 bg-slate-100'} px-2 py-1 rounded-lg">${p.stock} un</span>
                </div>

                <!-- Columna 3: Precio -->
                <div class="w-20 text-center">
                    <strong class="text-lg font-black text-slate-900 font-mono tracking-tighter">$${p.salePrice}</strong>
                </div>

                <!-- Columna 4: Selector +/- -->
                <div class="w-32 flex items-center justify-end gap-3">
                    <button class="w-8 h-8 bg-slate-100 hover:bg-black hover:text-white rounded-lg font-black text-lg transition-all active:scale-90" onclick="window.updCatalogQty('${p.id}', -1)">-</button>
                    <span class="font-black text-xl font-mono w-6 text-center ${currentQty > 0 ? 'text-violet-600' : 'text-slate-300'}">${currentQty}</span>
                    <button class="w-8 h-8 bg-slate-100 hover:bg-black hover:text-white rounded-lg font-black text-lg transition-all active:scale-90" onclick="window.updCatalogQty('${p.id}', 1)">+</button>
                </div>
            </div>
        `;
        list.appendChild(row);
    });
}

/**
 * Actualiza las cantidades del carrito.
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
                showMessage("Sin stock", true);
            }
        }
    }

    // Refrescamos solo los valores visuales para no perder el scroll
    renderSaleCatalog(document.getElementById('sale-catalog-filter')?.value || "");
    renderSaleCart();
}

/**
 * Renderiza el ticket de venta (Derecha).
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
        row.className = 'bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center mb-2 italic font-black text-xs';
        row.innerHTML = `
            <div class="text-left">
                <p class="uppercase text-slate-400 text-[8px]">ITEM</p>
                <p class="uppercase">${item.name} x${item.qty}</p>
            </div>
            <p class="text-sm font-mono">$${subtotal.toLocaleString('es-AR')}</p>
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
    showMessage("Cobrando...");

    try {
        const batch = writeBatch(db);
        const now = new Date();
        const day = now.toISOString().split('T')[0];

        saleCart.forEach(item => {
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

            const productRef = getPublicDoc("products", item.id);
            batch.update(productRef, {
                stock: item.stockMax - item.qty
            });
        });

        await batch.commit();
        
        showMessage("COBRO EXITOSO! 🚀");
        setTimeout(() => {
            hideMessage();
            closeModals();
        }, 1500);

    } catch (error) {
        console.error("Error POS:", error);
        showMessage("Error al cobrar", true);
        confirmBtn.disabled = false;
    }
}

// Vincular a window
window.updCatalogQty = updCatalogQty;
window.renderSaleCatalog = renderSaleCatalog;
