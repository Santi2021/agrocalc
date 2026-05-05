/* ─────────────────────────────────────────
   AGROCALC — js/app.js
   Orquestador principal
   
   Responsabilidades:
   - Inicializar módulos en orden
   - Manejar navegación futura entre secciones
   - Estado global compartido entre módulos
   
   Módulos disponibles:
   ✅ Rindes    → js/rindes.js
   🔜 Mapa      → js/mapa.js       (Sprint 2)
   🔜 Clima     → js/clima.js      (Sprint 3)
   🔜 Mercado   → js/mercado.js    (Sprint 4)
───────────────────────────────────────── */

const App = (() => {

  // ── ESTADO GLOBAL ────────────────────────
  // Acá van datos que varios módulos necesitan
  const state = {
    cultivoActual: 'soja',
    zonaActual:    'nucleo',
    // Sprint 2: coordenadas del campo
    // Sprint 3: datos de lluvia
  };

  // ── INIT ─────────────────────────────────
  function init() {
    console.log('🌾 AgroCalc iniciando...');

    // Sprint 1: solo Rindes
    if (window.Rindes) {
      Rindes.init();
      console.log('✅ Módulo Rindes cargado');
    }

    // Sprint 2: descomentar cuando esté listo
    // if (window.Mapa) {
    //   Mapa.init();
    //   console.log('✅ Módulo Mapa cargado');
    // }

    // Sprint 3:
    // if (window.Clima) {
    //   Clima.init();
    //   console.log('✅ Módulo Clima cargado');
    // }

    console.log('🚀 AgroCalc listo');
  }

  return { init, state };

})();

// Arrancar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', App.init);
