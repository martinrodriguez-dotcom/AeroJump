/**
 * AeroJump Gualeguaychú - Sales Controller Module
 * Motor del Punto de Venta (POS). Gestiona el catálogo en lista alfabética, 
 * el ticket en tiempo real y el cobro con múltiples medios de pago.
 */

import { 
    writeBatch, Timestamp 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { auth, db, getPublicDoc } from "./firebase-config.js";
import { showMessage, hideMessage, closeModals, openModal } from "./ui-controller.js";
import { getProductList } from "./kiosco-controller.js";

// --- ESTADO INTERNO ---
let saleCart = []; // Array de { id, name, price, qty, stockMax }

/**
 * Abre el Punto de Venta y limpia sesiones anteriores.
 */
export function openSaleModal() {
    saleCart = [];
    const filterInput = document.getElementById('sale-catalog-filter');
    if (filterInput) filterInput.value = '';
    
    // Resetear medio de pago a efectivo por defecto
    const payMethod = document.getElementById('sale-payment-method');
    if (payMethod) payMethod.value = 'efectivo';

    renderSaleCatalog();
    renderSaleCart();
    openModal('sale-modal');
}

/**
 * Renderiza el catálogo en formato de filas ordenadas alfabéticamente.
 */
export function renderSaleCatalog(filter = "") {
    const list = document.getElementById('sale-catalog-list');
    if (!list) return;
    list.innerHTML = '';
    
    const allProducts = getProductList();
    
    // 1. Orden Alfabético estricto
    const sorted = [...allProducts].sort((a, b) => a.name.localeCompare(b.name));
    
    // 2. Filtrado por búsqueda
    const filtered = sorted.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()));

    if (filtered.length === 0) {
        list.innerHTML = `<div class="py-20 text-center opacity-20 font-black uppercase italic">No se encontraron productos</div>`;
        return;
    }

    // Cabecera de columnas (Visible solo en desktop para guía)
    const header = document.createElement('div');
    header.className = 'hidden md:flex px-6 py-2 border-b border-slate-100 text-[9px] font-black uppercase text-slate-400 italic bg-slate-50';
    header.innerHTML = `
        <div class="flex-grow">Producto</div>
        <div class="w-24 text-center">Stock</div>
        <div class="w-24 text-center">Precio</div>
        <div class="w-32 text-right">Cant. Venta</div>
    `;
    list.appendChild(header);

    filtered.forEach(p => {
        const itemInCart = saleCart.find(i => i.id === p.id);
        const currentQty = itemInCart ? itemInCart.qty : 0;

        const row = document.createElement('div');
        row.className = 'pos-item-row px-6 py-4 flex flex-col md:flex-row items-center gap-4 bg-white hover:bg-slate-50 transition-all';
        
        row.innerHTML = `
            <!-- Columna Nombre -->
            <div class="flex-grow text-left leading-none w-full md:w-auto">
                <p class="text-sm font-black uppercase italic text-slate-900">${p.name}</p>
            </div>

            <!-- Datos y Controles -->
            <div class="flex items-center justify-between w-full md:w-auto gap-8">
                <!-- Columna Stock -->
                <div class="w-16 text-center">
                    <span class="text-[9px] font-black uppercase ${p.stock < 5 ? 'text-red-500 bg-red-50' : 'text-slate-400 bg-slate-100'} px-2 py-1 rounded-lg">
                        ${p.stock} un.
                    </span>
                </div>

                <!-- Columna Precio -->
                <div class="w-20 text-center">
                    <strong class="text-lg font-black text-slate-900 font-mono tracking-tighter">$${p.salePrice}</strong>
                </div>

                <!-- Columna Selector +/- -->
                <div class="w-32 flex items-center justify-end gap-3">
                    <button class="w-9 h-9 bg-slate-100 hover:bg-black hover:text-white rounded-xl font-black text-xl transition-all active:scale-90" onclick="window.updCatalogQty('${p.id}', -1)">-</button>
                    <span class="font-black text-xl font-mono w-6 text-center ${currentQty > 0 ? 'text-violet-600' : 'text-slate-200'}">${currentQty}</span>
                    <button class="w-9 h-9 bg-slate-100 hover:bg-black hover:text-white rounded-xl font-black text-xl transition-all active:scale-90" onclick="window.updCatalogQty('${p.id}', 1)">+</button>
                </div>
            </div>
        `;
        list.appendChild(row);
    });
}

/**
 * Gestiona las cantidades del carrito (Sincronizado con el Ticket).
 */
export function updCatalogQty(productId, delta) {
    const allProducts = getProductList();
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    const existingIndex = saleCart.findIndex(i => i.id === productId);

    if (existingIndex > -1) {
        saleCart[existingIndex].qty += delta;
        
        // Reglas de límites
        if (saleCart[existingIndex].qty <= 0) {
            saleCart.splice(existingIndex, 1);
        } else if (saleCart[existingIndex].qty > product.stock) {
            saleCart[existingIndex].qty = product.stock;
            showMessage("Límite de stock alcanzado", true);
        }
    } else {
        if (delta > 0) {
            if (product.stock > 0) {
                saleCart.push({
                    id: product.id,
                    name: product.name,
                    price: product.salePrice,
                    qty: 1,
                    stockMax: product.stock
                });
            } else {
                showMessage("Sin unidades disponibles", true);
            }
        }
    }

    // Actualizar visuales inmediatamente
    renderSaleCatalog(document.getElementById('sale-catalog-filter')?.value || "");
    renderSaleCart();
}

/**
 * Dibuja el ticket de la derecha y calcula el total final.
 */
function renderSaleCart() {
    const list = document.getElementById('sale-cart-list');
    const display = document.getElementById('sale-total-display');
    const confirmBtn = document.getElementById('confirm-sale-btn');
    const emptyMsg = document.getElementById('empty-cart-msg');

    if (!list || !display) return;

    list.innerHTML = '';
    let total = 0;

    if (saleCart.length === 0) {
        if (emptyMsg) emptyMsg.classList.remove('is-hidden');
        display.textContent = "$0";
        confirmBtn.disabled = true;
        return;
    }

    if (emptyMsg) emptyMsg.classList.add('is-hidden');
    
    saleCart.forEach(item => {
        const subtotal = item.price * item.qty;
        total += subtotal;

        const ticketItem = document.createElement('div');
        ticketItem.className = 'bg-white p-3 rounded-xl border border-slate-100 flex justify-between items-center mb-2 shadow-sm italic';
        ticketItem.innerHTML = `
            <div class="text-left leading-tight">
                <p class="text-[10px] font-black uppercase text-slate-800">${item.name}</p>
                <p class="text-[9px] text-slate-400 font-bold">CANT: ${item.qty} x $${item.price}</p>
            </div>
            <span class="font-black text-sm font-mono text-violet-600">$${subtotal.toLocaleString('es-AR')}</span>
        `;
        list.appendChild(ticketItem);
    });

    display.textContent = `$${total.toLocaleString('es-AR')}`;
    confirmBtn.disabled = false;
}

/**
 * Procesa el cobro atómico: registra venta y descuenta stock.
 */
export async function handleConfirmSale() {
    if (saleCart.length === 0) return;

    const confirmBtn = document.getElementById('confirm-sale-btn');
    const paymentMethod = document.getElementById('sale-payment-method').value;
    
    confirmBtn.disabled = true;
    showMessage("PROCESANDO COBRO...");

    try {
        const batch = writeBatch(db);
        const now = new Date();
        const dayStr = now.toISOString().split('T')[0];
        const monthYear = dayStr.substring(0, 7);

        saleCart.forEach(item => {
            // 1. Registro de la venta
            const saleRef = getPublicDoc("sales", `${Date.now()}_${item.id}`);
            batch.set(saleRef, {
                productId: item.id,
                name: item.name,
                qty: item.qty,
                unitPrice: item.price,
                total: item.price * item.qty,
                paymentMethod: paymentMethod,
                day: dayStr,
                monthYear: monthYear,
                timestamp: Timestamp.now(),
                adminEmail: auth.currentUser?.email || "admin@aerojump.com"
            });

            // 2. Descuento del stock real del producto
            const productRef = getPublicDoc("products", item.id);
            batch.update(productRef, {
                stock: item.stockMax - item.qty
            });
        });

        // Ejecutar todas las operaciones juntas
        await batch.commit();
        
        showMessage("¡COBRO EXITOSO! ✅");
        setTimeout(() => {
            hideMessage();
            closeModals();
        }, 1500);

    } catch (error) {
        console.error("Error POS AeroJump:", error);
        showMessage("Error al procesar", true);
        confirmBtn.disabled = false;
    }
}

// Vinculación para que el buscador y los botones funcionen desde el HTML
window.updCatalogQty = updCatalogQty;
window.handleConfirmSale = handleConfirmSale;
window.renderSaleCatalog = renderSaleCatalog;
