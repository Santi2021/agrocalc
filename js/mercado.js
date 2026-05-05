/* ─────────────────────────────────────────
   AGROCALC — js/mercado.js
   Módulo: Precios live via Vercel API
   
   Llama a:
   GET /api/precios → commodities CBOT
   GET /api/tc      → USD/ARS oficial + blue
   
   Sin CORS, sin proxies, todo desde el servidor.
───────────────────────────────────────── */

const Mercado = (() => {

  let precios  = { soja: 280, maiz: 165, trigo: 210, girasol: 340 };
  let tcOficial = null;
  let tcBlue    = null;

  // ── INIT ─────────────────────────────────
  async function init() {
    console.log('📈 Mercado: iniciando...');

    // Mostrar fallback inmediato
    actualizarHeader();
    actualizarTCDisplay();

    // Fetch datos reales en paralelo
    await Promise.all([fetchPrecios(), fetchTC()]);

    // Refresh cada 5 minutos
    setInterval(() => Promise.all([fetchPrecios(), fetchTC()]), 5 * 60 * 1000);

    console.log('✅ Mercado cargado', precios);
  }

  // ── FETCH PRECIOS ────────────────────────
  async function fetchPrecios() {
    try {
      const res  = await fetch('/api/precios');
      const data = await res.json();
      if (data.ok && data.precios) {
        precios = data.precios;
        actualizarHeader();
        actualizarCalculadora();
      }
    } catch (e) {
      console.warn('Precios API falló:', e);
    }
  }

  // ── FETCH TC ─────────────────────────────
  async function fetchTC() {
    try {
      const res  = await fetch('/api/tc');
      const data = await res.json();
      if (data.oficial) tcOficial = data.oficial;
      if (data.blue)    tcBlue    = data.blue;
      actualizarTCDisplay();
    } catch (e) {
      console.warn('TC API falló:', e);
    }
  }

  // ── UI ───────────────────────────────────
  function actualizarHeader() {
    const claves = ['soja', 'maiz', 'trigo', 'girasol'];
    claves.forEach(key => {
      const el = document.getElementById(`h-${key}`);
      if (el && precios[key]) {
        el.textContent = `$${precios[key]}`;
        el.style.transition = 'color 0.4s';
        el.style.color = '#69f0ae';
        setTimeout(() => el.style.color = '', 1500);
      }
    });
  }

  function actualizarTCDisplay() {
    const el = document.getElementById('tc-display');
    if (!el) return;
    if (tcOficial) {
      el.textContent = `TC $${tcOficial.toLocaleString('es-AR')}`;
      el.title = tcBlue ? `Blue: $${tcBlue.toLocaleString('es-AR')}` : '';
    }
  }

  function actualizarCalculadora() {
    if (!window.Rindes) return;
    const cultivo = window.App?.state?.cultivoActual || 'soja';
    const precio  = precios[cultivo];
    if (!precio) return;
    const slider = document.getElementById('precio-slider');
    if (!slider) return;
    slider.value = precio;
    Rindes.updateSlider(slider);
    Rindes.calcular();
  }

  function getPrecio(cultivo) { return precios[cultivo] || 0; }
  function getTC()            { return tcOficial || 1500; }

  return { init, getPrecio, getTC, precios: () => precios };

})();

window.Mercado = Mercado;
