/**
 * AeroJump Gualeguaychú - Sales Controller Module
 * Motor del Punto de Venta (POS). Gestiona el carrito, cálculos de total
 * y el cierre de ventas con actualización de stock en tiempo real.
 */

import { 
    writeBatch, Timestamp 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { auth, db, getPublicDoc } from "./firebase-config.js";
import { showMessage, hideMessage, closeModals } from "./ui-controller.js";
import { getProductList } from "./kiosco-controller.js";

// --- ESTADO INTERNO DEL PEDIDO ---
let cartItems = {}; // Estructura: { productId: { quantity, price, name } }

// --- REFERENCIAS AL DOM ---
const saleCatalogGrid = document.getElementById('sale-catalog-grid');
const saleTotalDisplay = document.getElementById('sale-total-display');
const confirmSaleBtn = document.getElementById('confirm-sale-btn');
const saleCatalogFilter = document.getElementById('sale-catalog-filter');

/**
 * Inicia una nueva sesión de venta y limpia el carrito anterior.
 */
export function openSaleModal() {
    cartItems = {}; 
    if (saleCatalogFilter) saleCatalogFilter.value = '';
    renderSaleCatalog();
    updateVisualTotal();
    // El modal se abre desde main.js llamando a openModal('sale-modal')
}

/**
 * Dibuja el catálogo de productos con sus controles de cantidad.
 * @param {string} filter - Texto para búsqueda dinámica de productos.
 */
export function renderSaleCatalog(filter = "") {
    if (!saleCatalogGrid) return;
    saleCatalogGrid.innerHTML = '';
    
    const allProducts = getProductList(); // Obtenemos productos del kiosco-controller
    const filtered = allProducts.filter(p => 
        p.name.toLowerCase().includes(filter.toLowerCase())
    );

    if (filtered.length === 0) {
        saleCatalogGrid.innerHTML = `
            <div class="col-span-full py-20 text-center opacity-30">
                <p class="text-xl font-black uppercase italic">Sin productos en inventario</p>
            </div>
        `;
        return;
    }

    filtered.forEach(p => {
        const itemInCart = cartItems[p.id] || { quantity: 0 };
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
                <button class="qty-btn-minus w-8 h-8 flex items-center justify-center bg-white/10 text-white rounded-lg font-black hover:bg-red-600 transition-all">-</button>
                <input type="number" class="qty-input w-12 text-center bg-transparent font-black text-xl italic text-orange-400 outline-none" value="${itemInCart.quantity}" min="0" max="${p.stock}">
                <button class="qty-btn-plus w-8 h-8 flex items-center justify-center bg-white/10 text-white rounded-lg font-black hover:bg-green-600 transition-all" ${itemInCart.quantity >= p.stock ? 'disabled opacity-20' : ''}>+</button>
            </div>
        `;

        // Lógica de botones y entrada manual
        const input = card.querySelector('.qty-input');
        
        card.querySelector('.qty-btn-minus').onclick = () => updateCartQuantity(p, -1);
        card.querySelector('.qty-btn-plus').onclick = () => updateCartQuantity(p, 1);
        
        input.onchange = (e) => {
            let val = parseInt(e.target.value) || 0;
            if (val < 0) val = 0;
            if (val > p.stock) {
                val = p.stock;
                showMessage("Límite de stock alcanzado", true);
                setTimeout(hideMessage, 1500);
            }
            setCartQuantity(p, val);
        };

        saleCatalogGrid.appendChild(card);
    });
}

/**
 * Modifica la cantidad de un ítem en el carrito (Suma/Resta).
 */
function updateCartQuantity(product, delta) {
    let currentQty = cartItems[product.id]?.quantity || 0;
    let newQty = currentQty + delta;
    
    if (newQty < 0) newQty = 0;
    if (newQty > product.stock) newQty = product.stock;
    
    setCartQuantity(product, newQty);
}

/**
 * Establece una cantidad fija para un ítem.
 */
function setCartQuantity(product, qty) {
    if (qty === 0) {
        delete cartItems[product.id];
    } else {
        cartItems[product.id] = {
            id: product.id,
            name: product.name,
            price: product.salePrice,
            quantity: qty,
            stockMax: product.stock
        };
    }
    
    renderSaleCatalog(saleCatalogFilter?.value || "");
    updateVisualTotal();
}

/**
 * Calcula el importe total y habilita/deshabilita el botón de cobro.
 */
function updateVisualTotal() {
    let total = 0;
    Object.values(cartItems).forEach(item => {
        total += (item.price * item.quantity);
    });

    if (saleTotalDisplay) {
        saleTotalDisplay.textContent = total.toLocaleString('es-AR');
    }

    if (confirmSaleBtn) {
        confirmSaleBtn.disabled = total <= 0;
    }
}

/**
 * Procesa el cobro definitivo, guarda tickets y actualiza stock.
 */
export async function handleConfirmSale() {
    const total = parseFloat(saleTotalDisplay.textContent.replace(/\./g, ''));
    if (total <= 0) return;

    // Obtener medio de pago
    const methodEl = document.querySelector('input[name="salePaymentMethod"]:checked');
    const paymentMethod = methodEl ? methodEl.value : 'efectivo';

    confirmSaleBtn.disabled = true;
    showMessage("Cerrando Venta...");

    try {
        const batch = writeBatch(db);
        const now = new Date();
        const dayStr = now.toISOString().split('T')[0];
        const monthYear = dayStr.substring(0, 7);

        // Procesar cada ítem del carrito
        for (const item of Object.values(cartItems)) {
            // 1. Crear el ticket de venta
            const saleRef = getPublicDoc("sales", `${Date.now()}_${item.id}`);
            batch.set(saleRef, {
                productId: item.id,
                name: item.name,
                qty: item.quantity,
                unitPrice: item.price,
                total: item.price * item.quantity,
                paymentMethod: paymentMethod,
                day: dayStr,
                monthYear: monthYear,
                timestamp: Timestamp.now(),
                adminEmail: auth.currentUser.email
            });

            // 2. Descontar del stock real del producto
            const productRef = getPublicDoc("products", item.id);
            batch.update(productRef, {
                stock: item.stockMax - item.quantity
            });
        }

        // Ejecución atómica de todas las transacciones
        await batch.commit();
        
        showMessage("¡Venta Exitosa!");
        setTimeout(() => {
            hideMessage();
            closeModals();
        }, 1500);

    } catch (error) {
        console.error("Error en Transacción AeroJump:", error);
        showMessage("Error al procesar venta", true);
        confirmSaleBtn.disabled = false;
    }
}

// Vinculación para que el buscador funcione inmediatamente
window.renderSaleCatalog = renderSaleCatalog;
