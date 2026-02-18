/* ============================================= */
/* 1. VARIABLES - IDENTIDAD VISUAL Y TOKENS     */
/* ============================================= */
:root {
    /* Fondos y Superficies */
    --bg-main: #f8fafc;
    --bg-card: #ffffff;
    --border-color: #e2e8f0;
    
    /* Paleta Oficial AeroJump (Gamas Completas) */
    --violet: #7c3aed;        
    --violet-dark: #6d28d9;
    --violet-soft: #f5f3ff;
    --violet-glow: rgba(124, 58, 237, 0.2);
    
    --orange: #f97316;        
    --orange-dark: #ea580c;
    --orange-soft: #fff7ed;
    --orange-glow: rgba(249, 115, 22, 0.2);
    
    --red: #ef4444;
    --green: #22c55e;
    --black: #0f172a;
    --slate-400: #94a3b8;
    
    /* Tipografía y Estructura */
    --font-main: 'Outfit', sans-serif;
    --font-mono: 'JetBrains Mono', monospace;
    --radius-xl: 2.5rem;      /* El radio de las fichas de stock */
    --radius-lg: 1.5rem;
    --radius-md: 1rem;
    --shadow-sm: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    --shadow-md: 0 10px 25px -5px rgba(0, 0, 0, 0.08);
}

/* ============================================= */
/* 2. RESET Y COMPORTAMIENTO DE PANTALLA        */
/* ============================================= */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    -webkit-tap-highlight-color: transparent;
}

body {
    font-family: var(--font-main);
    background-color: var(--bg-main);
    color: var(--black);
    line-height: 1.2;
    font-weight: 700;
    height: 100vh;
    width: 100vw;
    overflow: hidden; /* El scroll es interno por módulo */
}

.font-mono { font-family: var(--font-mono); font-weight: 500; }

/* FIX CRÍTICO: Los elementos ocultos no deben bloquear clics */
.is-hidden { 
    display: none !important; 
    pointer-events: none; 
    visibility: hidden;
}

/* Scrollbar Estilo Moderno */
.custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
.custom-scrollbar::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--violet); }

/* ============================================= */
/* 3. COMPONENTES BENTO (ESTILO STOCK)          */
/* ============================================= */

/* Tarjetas principales */
.bento-card, .data-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: 1.5rem;
    box-shadow: var(--shadow-sm);
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.bento-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-md);
    border-color: var(--violet);
}

/* Botones con estilo Premium */
.btn-premium {
    border-radius: var(--radius-md);
    font-weight: 800;
    text-transform: uppercase;
    padding: 0.8rem 1.5rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
    gap: 0.5rem;
}

.btn-premium:active { transform: scale(0.96); }
.btn-premium:disabled { opacity: 0.5; cursor: not-allowed; }

/* Variantes de color */
.bg-violet-primary {
    background-color: var(--violet) !important;
    color: white !important;
    box-shadow: 0 6px 15px var(--violet-glow);
}

.bg-orange-primary {
    background-color: var(--orange) !important;
    color: white !important;
    box-shadow: 0 6px 15px var(--orange-glow);
}

.bg-green-primary { background-color: var(--green) !important; color: white !important; }
.bg-red-primary { background-color: var(--red) !important; color: white !important; }

/* ============================================= */
/* 4. MODALES INTELIGENTES (FIX NOTEBOOKS)      */
/* ============================================= */
.modal {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.7);
    backdrop-filter: blur(8px);
    z-index: 2000;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    pointer-events: auto;
}

.modal.is-open { display: flex; }

.modal-content {
    background: white;
    width: 100%;
    max-width: 850px;
    max-height: 94vh;
    border-radius: var(--radius-xl); /* Radio igual a inventario */
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.modal-header {
    padding: 1.5rem 2rem;
    border-bottom: 2px solid var(--bg-main);
    background: white;
    flex-shrink: 0;
}

.modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
    background: var(--bg-main); /* Fondo gris suave igual que vistas */
    -webkit-overflow-scrolling: touch;
}

.modal-footer {
    padding: 1.5rem 2rem;
    border-top: 2px solid var(--bg-main);
    background: white;
    flex-shrink: 0;
}

/* Inputs Estilo AeroJump */
input, select, textarea {
    border: 1px solid var(--border-color) !important;
    border-radius: var(--radius-md) !important;
    padding: 0.8rem 1.2rem !important;
    font-size: 1rem !important;
    font-weight: 700 !important;
    background: white !important;
    color: var(--black) !important;
    width: 100%;
    transition: all 0.2s;
}

input:focus, select:focus {
    border-color: var(--violet) !important;
    box-shadow: 0 0 0 4px var(--violet-glow) !important;
    outline: none;
}

/* ============================================= */
/* 5. DISEÑO DE FORMULARIOS BENTO (MODAL)       */
/* ============================================= */

/* Bloques internos del formulario que parecen tarjetas de stock */
#booking-form .bento-inner-card,
.modal-body .bento-card {
    background: white;
    border-radius: 2rem;
    padding: 1.5rem;
    border: 1px solid var(--border-color);
    box-shadow: var(--shadow-sm);
    margin-bottom: 1rem;
}

/* Grilla de horarios moderna */
.time-slot {
    background: white;
    border: 1px solid var(--border-color);
    border-radius: 1.25rem;
    padding: 0.8rem 0.5rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.time-slot:hover:not(.disabled) {
    border-color: var(--violet);
    background-color: var(--violet-soft);
    transform: translateY(-3px);
}

.time-slot.selected {
    background-color: var(--violet) !important;
    color: white !important;
    border-color: var(--violet-dark) !important;
    box-shadow: 0 4px 10px var(--violet-glow);
}

.time-slot.disabled {
    opacity: 0.3;
    background: #f1f5f9;
    border-style: dashed;
    cursor: not-allowed;
}

/* ============================================= */
/* 6. CALENDARIO Y AGENDA                       */
/* ============================================= */
.calendar-header-day {
    color: var(--violet);
    font-weight: 900;
    text-transform: uppercase;
    font-size: 0.75rem;
    text-align: center;
    padding-bottom: 10px;
}

.day-cell {
    background: white;
    border: 1px solid var(--border-color);
    border-radius: 1.25rem;
    aspect-ratio: 1/1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 0.6rem;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 2px 4px rgba(0,0,0,0.02);
}

.day-cell:hover {
    border-color: var(--violet);
    background-color: var(--violet-soft);
    transform: scale(1.05);
    z-index: 10;
    box-shadow: var(--shadow-md);
}

.booking-badge {
    font-size: 0.6rem;
    font-weight: 900;
    padding: 2px 5px;
    border-radius: 6px;
    background: var(--black);
    color: white;
}
.booking-badge.event { background: var(--orange); }

/* ============================================= */
/* 7. PUNTO DE VENTA (POS)                      */
/* ============================================= */
.pos-item-list {
    background: white;
    border: 1px solid var(--border-color);
    border-radius: 1.5rem;
    padding: 1.25rem;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    transition: all 0.2s;
}

.pos-item-list:hover {
    border-color: var(--orange);
    transform: translateX(6px);
    box-shadow: 0 4px 12px var(--orange-glow);
}

/* ============================================= */
/* 8. ADAPTACIÓN NOTEBOOK (1366x768)           */
/* ============================================= */
@media (max-height: 800px) {
    .modal-content { max-height: 98vh; }
    
    /* Escalar fuentes de totales gigantes para que no ocupen todo */
    .text-\[120px\], .text-\[100px\], .text-\[110px\] { 
        font-size: 4rem !important; 
        line-height: 1 !important; 
    }
    
    .text-6xl { font-size: 3rem !important; }
    .text-5xl { font-size: 2.5rem !important; }
    
    .modal-header, .modal-footer { padding: 0.8rem 1.5rem; }
    .modal-body { padding: 1rem; }
    
    #booking-form .bento-inner-card, .modal-body .bento-card { 
        padding: 1rem; 
        border-radius: 1.5rem; 
    }
    
    .bento-card { padding: 1.2rem; }
}

/* ============================================= */
/* 9. ADAPTACIÓN MÓVIL                         */
/* ============================================= */
@media (max-width: 640px) {
    .modal { padding: 0.5rem; }
    .modal-content { border-radius: 1.5rem; height: 100vh; max-height: 100vh; }
    
    .day-cell span { font-size: 0.9rem; }
    .time-slot p { font-size: 1.1rem; }
    
    header h1 { font-size: 1.25rem; }
    #main-menu { width: 100%; border-radius: 0; }
}

/* ============================================= */
/* 10. ANIMACIONES                              */
/* ============================================= */
@keyframes jump { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
.jumping-child { 
    animation: jump 1.2s ease-in-out infinite; 
    display: inline-block; 
}

/* Overlay de Mensajes */
#message-overlay {
    background: rgba(15, 23, 42, 0.95);
    z-index: 3000;
}
