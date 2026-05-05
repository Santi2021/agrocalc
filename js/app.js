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
  let mapaInicializado = false;

  function navigate(vista, btnClickeado) {
    document.querySelectorAll('[id^="vista-"]').forEach(el => {
      el.style.display = 'none';
    });

    const target = document.getElementById(`vista-${vista}`);
    if (target) target.style.display = 'block';

    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    if (btnClickeado) btnClickeado.classList.add('active');

    // Lazy init mapa — contenedor visible primero, luego init
    if (vista === 'mapa' && window.Mapa) {
      if (!mapaInicializado) {
        setTimeout(() => {
          Mapa.init();
          mapaInicializado = true;
        }, 100);
      } else {
        setTimeout(() => Mapa.invalidar(), 100);
      }
    }

    state.vistaActual = vista;
  }

  // ── INIT ─────────────────────────────────
  function init() {
    console.log('🌾 AgroCalc V2 iniciando...');
    if (window.Rindes)   { Rindes.init();   console.log('✅ Rindes'); }
    if (window.Mercado)  { Mercado.init();  console.log('✅ Mercado'); }
    if (window.Noticias) { Noticias.init(); console.log('✅ Noticias'); }
    if (window.Mapa)     { console.log('✅ Mapa registrado (lazy)'); }
    console.log('🚀 AgroCalc V2 listo');
  }

  return { init, navigate, state };

})();

document.addEventListener('DOMContentLoaded', App.init);
