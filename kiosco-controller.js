/**
 * AeroJump Gualeguaychú - Kiosco Controller Module
 * Gestiona el inventario, alta de productos, reposiciones y edición de fichas.
 */

import { 
    onSnapshot, addDoc, updateDoc, deleteDoc, Timestamp, collection 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db, getPublicCollection, getPublicDoc, auth } from "./firebase-config.js";
import { showMessage, hideMessage, openModal, closeModals } from "./ui-controller.js";

// --- ESTADO INTERNO ---
let allProducts = [];

// --- REFERENCIAS DOM ---
const productList = document.getElementById('product-list');
const prodSuggestedPrice = document.getElementById('prod-suggested-price');
const prodUnitCostHidden = document.getElementById('prod-unit-cost');

/**
 * Sincroniza la lista de productos en tiempo real.
 */
export function syncProducts() {
    onSnapshot(getPublicCollection("products"), (snapshot) => {
        allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderInventory();
        
        // Si el modal de ventas está abierto, actualizamos su catálogo también
        // Esto se comunicará con el sales-controller más adelante
        if (typeof window.renderSaleCatalog === 'function') {
            window.renderSaleCatalog(document.getElementById('sale-catalog-filter')?.value || "");
        }
    }, (error) => {
        console.error("Error en sincronización de stock:", error);
    });
}

/**
 * Renderiza las tarjetas de inventario con botones de acción (Ficha, Reponer, Borrar).
 */
export function renderInventory(filter = "") {
    if (!productList) return;
    productList.innerHTML = '';

    const filtered = allProducts.filter(p => 
        p.name.toLowerCase().includes(filter.toLowerCase())
    );

    filtered.forEach(p => {
        const card = document.createElement('div');
        card.className = 'inventory-card flex flex-col gap-6 text-left relative overflow-hidden group';
        card.innerHTML = `
            <div class="flex justify-between items-start leading-none relative z-10">
                <div class="text-left">
                    <h4 class="font-black italic uppercase text-slate-950 text-2xl mb-2 tracking-tighter leading-tight">${p.name}</h4>
                    <span class="text-[11px] font-black uppercase text-violet-700 bg-violet-100 px-3 py-1.5 rounded-xl border-2 border-violet-200 leading-none shadow-inner">Stock: ${p.stock} un.</span>
                </div>
                <strong class="text-5xl font-black text-slate-950 italic tracking-tighter leading-none">$${p.salePrice}</strong>
            </div>
            <div class="grid grid-cols-2 gap-3 relative z-10">
                <button class="btn-edit bg-slate-100 text-slate-700 py-4 rounded-2xl font-black text-[10px] uppercase hover:bg-slate-950 hover:text-white transition-all italic tracking-widest border-2 border-slate-200 leading-none">Ficha</button>
                <button class="btn-restock bg-violet-100 text-violet-700 py-4 rounded-2xl font-black text-[10px] uppercase hover:bg-violet-700 hover:text-white transition-all italic tracking-widest border-2 border-violet-200 leading-none">Reponer</button>
                <button class="btn-delete col-span-2 bg-orange-100 text-orange-700 py-4 rounded-2xl font-black text-[10px] uppercase hover:bg-orange-600 hover:text-white transition-all italic tracking-widest border-2 border-orange-200 shadow-xl leading-none">Borrar Producto</button>
            </div>
        `;

        // Asignación de eventos manual para evitar "null" o errores de scope
        card.querySelector('.btn-edit').onclick = () => openEditModal(p);
        card.querySelector('.btn-restock').onclick = () => openRestockModal(p);
        card.querySelector('.btn-delete').onclick = () => deleteProduct(p.id);

        productList.appendChild(card);
    });
}

/**
 * Lógica de cálculo de precios (Costo bulto -> Precio sugerido)
 */
export function calculateProductPrices() {
    const costBatch = parseFloat(document.getElementById('prod-batch-cost').value) || 0;
    const qtyBatch = parseInt(document.getElementById('prod-batch-qty').value) || 1;
    const margin = parseFloat(document.getElementById('prod-profit-pct').value) || 40;

    const unitCost = costBatch / qtyBatch;
    const suggested = Math.ceil(unitCost * (1 + (margin / 100)));

    if (prodSuggestedPrice) prodSuggestedPrice.textContent = `$${suggested}`;
    if (prodUnitCostHidden) prodUnitCostHidden.value = unitCost;
}

/**
 * Guarda un nuevo producto.
 */
export async function saveProduct(event) {
    event.preventDefault();
    const btn = event.target.querySelector('button[type="submit"]');
    btn.disabled = true;

    const data = {
        name: document.getElementById('prod-name').value.trim(),
        stock: parseInt(document.getElementById('prod-stock').value),
        salePrice: parseFloat(prodSuggestedPrice.textContent.replace('$', '')),
        unitCost: parseFloat(prodUnitCostHidden.value),
        createdAt: Timestamp.now(),
        adminEmail: auth.currentUser.email
    };

    try {
        await addDoc(getPublicCollection("products"), data);
        event.target.reset();
        document.getElementById('product-form-container').classList.add('is-hidden');
        showMessage("Producto registrado.");
        setTimeout(hideMessage, 1500);
    } catch (e) {
        alert("Error al crear producto: " + e.message);
    } finally {
        btn.disabled = false;
    }
}

/**
 * Modales de edición y reposición
 */
function openEditModal(product) {
    document.getElementById('edit-prod-id').value = product.id;
    document.getElementById('edit-prod-name').value = product.name;
    document.getElementById('edit-prod-cost').value = product.unitCost || 0;
    document.getElementById('edit-prod-price').value = product.salePrice;
    document.getElementById('edit-prod-stock').value = product.stock;
    openModal('edit-product-modal');
}

function openRestockModal(product) {
    document.getElementById('restock-prod-id').value = product.id;
    document.getElementById('restock-name').textContent = product.name;
    document.getElementById('restock-current-stock').textContent = product.stock;
    document.getElementById('restock-qty').value = "";
    document.getElementById('restock-batch-cost').value = "";
    openModal('restock-modal');
}

/**
 * Confirmación de cambios
 */
export async function handleEditProduct(event) {
    event.preventDefault();
    const id = document.getElementById('edit-prod-id').value;
    const data = {
        name: document.getElementById('edit-prod-name').value.trim(),
        unitCost: parseFloat(document.getElementById('edit-prod-cost').value),
        salePrice: parseFloat(document.getElementById('edit-prod-price').value),
        stock: parseInt(document.getElementById('edit-prod-stock').value)
    };

    try {
        await updateDoc(getPublicDoc("products", id), data);
        closeModals();
        showMessage("Ficha actualizada.");
        setTimeout(hideMessage, 1500);
    } catch (e) { alert(e.message); }
}

export async function handleRestock(event) {
    event.preventDefault();
    const id = document.getElementById('restock-prod-id').value;
    const addQty = parseInt(document.getElementById('restock-qty').value);
    const batchCost = parseFloat(document.getElementById('restock-batch-cost').value);
    
    const product = allProducts.find(p => p.id === id);
    if (!product) return;

    const newUnitCost = batchCost / addQty;
    const newSalePrice = Math.ceil(newUnitCost * 1.4); // Margen 40% auto en repo

    try {
        await updateDoc(getPublicDoc("products", id), {
            stock: product.stock + addQty,
            unitCost: newUnitCost,
            salePrice: newSalePrice
        });
        closeModals();
        showMessage("Stock actualizado!");
        setTimeout(hideMessage, 1500);
    } catch (e) { alert(e.message); }
}

async function deleteProduct(id) {
    if (confirm("¿Eliminar este producto del inventario AeroJump?")) {
        try {
            await deleteDoc(getPublicDoc("products", id));
            showMessage("Producto eliminado.");
            setTimeout(hideMessage, 1500);
        } catch (e) { alert(e.message); }
    }
}

// Facilitar acceso a datos para otros módulos
export const getProductList = () => allProducts;
