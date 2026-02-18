/**
 * AeroJump Gualeguaychú - Kiosco Controller Module
 * Gestión de inventario, cálculos de precios y acciones sobre fichas.
 */

import { 
    onSnapshot, addDoc, updateDoc, deleteDoc, Timestamp 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { auth, getPublicCollection, getPublicDoc } from "./firebase-config.js";
import { showMessage, hideMessage, openModal, closeModals } from "./ui-controller.js";

// --- ESTADO INTERNO ---
let allProducts = [];

/**
 * Sincroniza la lista de productos en tiempo real.
 */
export function syncProducts() {
    onSnapshot(getPublicCollection("products"), (snapshot) => {
        allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderProducts();
        
        // Sincronizar catálogo del POS si está abierto
        if (typeof window.renderSaleCatalog === 'function') {
            window.renderSaleCatalog(document.getElementById('sale-catalog-filter')?.value || "");
        }
    }, (error) => {
        console.error("Error en inventario:", error);
    });
}

/**
 * Renderiza las tarjetas de stock con los botones funcionales.
 */
export function renderProducts(filter = "") {
    const container = document.getElementById('product-list');
    if (!container) return;
    container.innerHTML = '';

    const filtered = allProducts.filter(p => 
        p.name.toLowerCase().includes(filter.toLowerCase())
    );

    filtered.forEach(p => {
        const card = document.createElement('div');
        card.className = 'bg-white p-6 rounded-[2rem] border-2 border-slate-100 flex flex-col gap-4 shadow-sm hover:border-violet-200 transition-all text-left';
        
        card.innerHTML = `
            <div class="flex justify-between items-start leading-none">
                <div class="flex-grow pr-2">
                    <h4 class="font-black italic uppercase text-slate-900 text-lg leading-tight mb-1">${p.name}</h4>
                    <span class="text-[9px] font-black uppercase text-violet-600 bg-violet-50 px-2 py-1 rounded-lg">Stock: ${p.stock} un.</span>
                </div>
                <strong class="text-3xl font-black text-slate-900 italic tracking-tighter leading-none">$${p.salePrice}</strong>
            </div>
            
            <div class="grid grid-cols-2 gap-2 mt-2">
                <button class="btn-restock p-3 bg-slate-50 hover:bg-violet-600 hover:text-white rounded-xl font-black text-[9px] uppercase transition-all italic border border-slate-200" onclick="window.openRestock('${p.id}')">Reposición</button>
                <button class="btn-edit p-3 bg-slate-50 hover:bg-slate-900 hover:text-white rounded-xl font-black text-[9px] uppercase transition-all italic border border-slate-200" onclick="window.openEditProduct('${p.id}')">Ficha</button>
                <button class="btn-delete col-span-2 p-3 bg-orange-50 hover:bg-orange-600 hover:text-white text-orange-700 rounded-xl font-black text-[9px] uppercase transition-all italic border border-orange-100" onclick="window.deleteProduct('${p.id}')">Eliminar del Sistema</button>
            </div>
        `;
        container.appendChild(card);
    });
}

/**
 * Lógica matemática de precios (Costo -> Margen -> Sugerido)
 */
export function calculateProductPrices() {
    const costBatch = parseFloat(document.getElementById('prod-batch-cost').value) || 0;
    const qtyBatch = parseInt(document.getElementById('prod-batch-qty').value) || 1;
    const margin = parseFloat(document.getElementById('prod-profit-pct').value) || 0;

    const unitCost = costBatch / qtyBatch;
    const suggested = Math.ceil(unitCost * (1 + (margin / 100)));

    const suggestedEl = document.getElementById('prod-suggested-price');
    const costHidden = document.getElementById('prod-unit-cost');
    const realPriceInput = document.getElementById('prod-real-price');

    if (suggestedEl) suggestedEl.textContent = `$${suggested}`;
    if (costHidden) costHidden.value = unitCost;
    
    // Auto-completamos el precio real si está vacío para facilitar la carga
    if (realPriceInput && !realPriceInput.value) {
        realPriceInput.placeholder = suggested;
    }
}

/**
 * Guarda el nuevo producto con el "Precio Real" cargado.
 */
export async function handleSaveProduct(event) {
    event.preventDefault();
    
    const realPrice = parseFloat(document.getElementById('prod-real-price').value);
    if (!realPrice || realPrice <= 0) {
        alert("Debes definir un Precio Real de Venta.");
        return;
    }

    const data = {
        name: document.getElementById('prod-name').value.trim().toUpperCase(),
        stock: parseInt(document.getElementById('prod-stock').value),
        unitCost: parseFloat(document.getElementById('prod-unit-cost').value) || 0,
        salePrice: realPrice,
        createdAt: Timestamp.now(),
        adminEmail: auth.currentUser?.email || "admin@aerojump.com"
    };

    try {
        await addDoc(getPublicCollection("products"), data);
        event.target.reset();
        document.getElementById('prod-suggested-price').textContent = "$0";
        window.toggleProductForm(false);
        showMessage("PRODUCTO CARGADO! ✅");
    } catch (e) { console.error(e); }
}

/**
 * Gestión de Modales (Acciones de botones)
 */
export function openEditModal(product) {
    document.getElementById('edit-prod-id').value = product.id;
    document.getElementById('edit-prod-name').value = product.name;
    document.getElementById('edit-prod-cost').value = product.unitCost || 0;
    document.getElementById('edit-prod-price').value = product.salePrice;
    document.getElementById('edit-prod-stock').value = product.stock;
    openModal('edit-product-modal');
}

export function openRestockModal(product) {
    document.getElementById('restock-prod-id').value = product.id;
    document.getElementById('restock-name').textContent = product.name;
    document.getElementById('restock-current-stock').textContent = product.stock;
    document.getElementById('restock-qty').value = "";
    document.getElementById('restock-batch-cost').value = "";
    openModal('restock-modal');
}

export async function handleConfirmEditProduct(event) {
    event.preventDefault();
    const id = document.getElementById('edit-prod-id').value;
    const data = {
        name: document.getElementById('edit-prod-name').value.trim().toUpperCase(),
        unitCost: parseFloat(document.getElementById('edit-prod-cost').value),
        salePrice: parseFloat(document.getElementById('edit-prod-price').value),
        stock: parseInt(document.getElementById('edit-prod-stock').value)
    };
    try {
        await updateDoc(getPublicDoc("products", id), data);
        closeModals();
        showMessage("FICHA ACTUALIZADA! ✅");
    } catch (e) { console.error(e); }
}

export async function handleConfirmRestock(event) {
    event.preventDefault();
    const id = document.getElementById('restock-prod-id').value;
    const addQty = parseInt(document.getElementById('restock-qty').value);
    const batchCost = parseFloat(document.getElementById('restock-batch-cost').value);
    
    const product = allProducts.find(p => p.id === id);
    if (!product) return;

    const newUnitCost = batchCost / addQty;
    // Mantenemos el último precio de venta, pero actualizamos el costo y stock
    try {
        await updateDoc(getPublicDoc("products", id), {
            stock: product.stock + addQty,
            unitCost: newUnitCost
        });
        closeModals();
        showMessage("STOCK REPUESTO! 🥤");
    } catch (e) { console.error(e); }
}

export async function deleteProduct(id) {
    if (confirm("¿Confirmas la BAJA DEFINITIVA de este artículo?")) {
        try {
            await deleteDoc(getPublicDoc("products", id));
            showMessage("Producto eliminado.");
        } catch (e) { console.error(e); }
    }
}

// Globalización
export const getProductList = () => allProducts;
window.openRestock = (id) => openRestockModal(allProducts.find(x => x.id === id));
window.openEditProduct = (id) => openEditModal(allProducts.find(x => x.id === id));
window.deleteProduct = (id) => deleteProduct(id);
window.handleConfirmRestock = handleConfirmRestock;
window.handleConfirmEditProduct = handleConfirmEditProduct;
