/**
 * AeroJump Gualeguaychú - Kiosco Controller Module
 * Gestiona el inventario, alta de productos, reposiciones y edición de fichas.
 */

import { 
    onSnapshot, addDoc, updateDoc, deleteDoc, Timestamp 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { auth, getPublicCollection, getPublicDoc } from "./firebase-config.js";
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
        renderProducts();
        
        // Si el modal de ventas está abierto, actualizamos su catálogo también
        if (typeof window.renderSaleCatalog === 'function') {
            window.renderSaleCatalog(document.getElementById('sale-catalog-filter')?.value || "");
        }
    }, (error) => {
        console.error("Error en sincronización de stock AeroJump:", error);
    });
}

/**
 * Renderiza las tarjetas de inventario con un diseño compacto y profesional.
 */
export function renderProducts(filter = "") {
    if (!productList) return;
    productList.innerHTML = '';

    const filtered = allProducts.filter(p => 
        p.name.toLowerCase().includes(filter.toLowerCase())
    );

    filtered.forEach(p => {
        const card = document.createElement('div');
        // Usamos la clase de diseño armonico definida en el CSS
        card.className = 'bg-white p-6 rounded-[2rem] border-2 border-slate-100 flex flex-col gap-4 shadow-sm hover:shadow-md transition-all text-left';
        
        card.innerHTML = `
            <div class="flex justify-between items-start leading-none">
                <div class="flex-grow pr-2">
                    <h4 class="font-black italic uppercase text-slate-900 text-lg leading-tight mb-1">${p.name}</h4>
                    <span class="text-[9px] font-black uppercase text-violet-600 bg-violet-50 px-2 py-1 rounded-lg">Stock: ${p.stock} un.</span>
                </div>
                <strong class="text-3xl font-black text-slate-900 italic tracking-tighter leading-none">$${p.salePrice}</strong>
            </div>
            
            <div class="grid grid-cols-2 gap-2 mt-2">
                <button class="btn-restock p-3 bg-slate-50 hover:bg-violet-600 hover:text-white rounded-xl font-black text-[9px] uppercase transition-all italic border border-slate-200">Reposición</button>
                <button class="btn-edit p-3 bg-slate-50 hover:bg-slate-900 hover:text-white rounded-xl font-black text-[9px] uppercase transition-all italic border border-slate-200">Ficha</button>
                <button class="btn-delete col-span-2 p-3 bg-orange-50 hover:bg-orange-600 hover:text-white text-orange-700 rounded-xl font-black text-[9px] uppercase transition-all italic border border-orange-100">Eliminar de Sistema</button>
            </div>
        `;

        // Asignación de eventos manual para evitar errores de scope
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
export async function handleSaveProduct(event) {
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
        showMessage("Producto Cargado!");
        setTimeout(hideMessage, 1500);
    } catch (e) {
        alert("Error al cargar ficha: " + e.message);
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
 * Confirmación de cambios manuales en la ficha
 */
export async function handleConfirmEditProduct(event) {
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
        showMessage("Cambios guardados!");
        setTimeout(hideMessage, 1500);
    } catch (e) { alert(e.message); }
}

/**
 * Procesa la reposición de stock (Cálculo automático de nuevo costo)
 */
export async function handleConfirmRestock(event) {
    event.preventDefault();
    const id = document.getElementById('restock-prod-id').value;
    const addQty = parseInt(document.getElementById('restock-qty').value);
    const batchCost = parseFloat(document.getElementById('restock-batch-cost').value);
    
    const product = allProducts.find(p => p.id === id);
    if (!product) return;

    const newUnitCost = batchCost / addQty;
    // Mantenemos margen del 40% por defecto en repo rápida
    const newSalePrice = Math.ceil(newUnitCost * 1.4); 

    try {
        await updateDoc(getPublicDoc("products", id), {
            stock: product.stock + addQty,
            unitCost: newUnitCost,
            salePrice: newSalePrice
        });
        closeModals();
        showMessage("Stock Repuesto!");
        setTimeout(hideMessage, 1500);
    } catch (e) { alert(e.message); }
}

async function deleteProduct(id) {
    if (confirm("¿Confirmas la baja definitiva del artículo?")) {
        try {
            await deleteDoc(getPublicDoc("products", id));
            showMessage("Baja completada.");
            setTimeout(hideMessage, 1500);
        } catch (e) { alert(e.message); }
    }
}

// Facilitar acceso a datos para otros módulos
export const getProductList = () => allProducts;

// Globalización para botones internos
window.openRestock = (id) => { const p = allProducts.find(x => x.id === id); openRestockModal(p); };
window.openEditProduct = (id) => { const p = allProducts.find(x => x.id === id); openEditModal(p); };
window.deleteProduct = deleteProduct;
