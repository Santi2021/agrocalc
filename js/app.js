/* ─────────────────────────────────────────
   AGROCALC — js/app.js
   Orquestador principal + Router
   
   Responsabilidades:
   - Inicializar módulos en orden
   - Manejar navegación entre vistas
   - Estado global compartido
   
   Módulos:
   ✅ Rindes    → js/rindes.js
   ✅ Mapa      → js/mapa.js
   🔜 Clima     → js/clima.js      (Sprint 3)
   🔜 Mercado   → js/mercado.js    (Sprint 4)
───────────────────────────────────────── */

const App = (() => {

  // ── ESTADO GLOBAL ────────────────────────
  const state = {
    cultivoActual: 'soja',
    zonaActual:    'nucleo',
    vistaActual:   'calculadora',
    // Sprint 3: datos clima por zona
    // Sprint 4: precios mercado en tiempo real
  };

  // ── NAVEGACIÓN ───────────────────────────
  function navigate(vista, btnClickeado) {
    // Ocultar todas las vistas
    document.querySelectorAll('[id^="vista-"]').forEach(el => {
      el.style.display = 'none';
    });

    // Mostrar vista target
    const target = document.getElementById(`vista-${vista}`);
    if (target) target.style.display = 'block';

    // Actualizar tabs nav
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    if (btnClickeado) btnClickeado.classList.add('active');

    // Lazy init del mapa cuando se abre por primera vez
    if (vista === 'mapa' && window.Mapa) {
      setTimeout(() => {
        Mapa.init();
        // Forzar resize para que Leaflet calcule bien el tamaño
        if (Mapa._map) Mapa._map.invalidateSize();
      }, 50);
    }

    state.vistaActual = vista;
  }

  // ── INIT ─────────────────────────────────
  function init() {
    console.log('🌾 AgroCalc V2 iniciando...');

    // Módulo Rindes
    if (window.Rindes) {
      Rindes.init();
      console.log('✅ Rindes cargado');
    }

    // Módulo Mapa — se inicializa lazy al navegar
    if (window.Mapa) {
      console.log('✅ Mapa registrado (lazy init)');
    }

    // Sprint 3:
    // if (window.Clima) { Clima.init(); }

    // Sprint 4:
    // if (window.Mercado) { Mercado.init(); }

    console.log('🚀 AgroCalc V2 listo');
  }

  return { init, navigate, state };

})();

document.addEventListener('DOMContentLoaded', App.init);
