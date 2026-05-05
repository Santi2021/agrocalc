/* ─────────────────────────────────────────
   AGROCALC — js/mercado.js
   Módulo: Precios live vía Yahoo Finance
   
   Fuentes:
   - Yahoo Finance (via allorigins.win proxy CORS)
     ZS=F  → Soja CBOT (USD/bushel → USD/t)
     ZC=F  → Maíz CBOT
     ZW=F  → Trigo CBOT
     ARS=X → USD/ARS tipo de cambio
   
   Conversiones bushel → tonelada:
     Soja:  1 bushel = 0.02722 t → × 36.74
     Maíz:  1 bushel = 0.02540 t → × 39.37
     Trigo: 1 bushel = 0.02722 t → × 36.74
     
   Expone: window.Mercado
───────────────────────────────────────── */

const Mercado = (() => {

  const PROXY = 'https://corsproxy.io/?';
  const YF    = 'https://query1.finance.yahoo.com/v8/finance/chart/';

  const SIMBOLOS = {
    soja:    { yf: 'ZS=F',  factor: 36.74, label: 'Soja',    fallback: 280 },
    maiz:    { yf: 'ZC=F',  factor: 39.37, label: 'Maíz',    fallback: 165 },
    trigo:   { yf: 'ZW=F',  factor: 36.74, label: 'Trigo',   fallback: 210 },
    girasol: { yf: null,    factor: 1,     label: 'Girasol', fallback: 340 },
  };

  let precios     = {};
  let tcUsdArs    = null;
  let ultimaAct   = null;

  // ── INIT ─────────────────────────────────
  async function init() {
    console.log('📈 Mercado: cargando Yahoo Finance...');
    usarFallback(); // mostrar fallback inmediato mientras carga

    await Promise.all([
      fetchTC(),
      fetchCommodities(),
    ]);

    actualizarHeader();
    actualizarCalculadora();
    ultimaAct = new Date();
    console.log('✅ Mercado: datos live cargados', precios);

    // Refresh cada 5 minutos
    setInterval(async () => {
      await Promise.all([fetchTC(), fetchCommodities()]);
      actualizarHeader();
      actualizarCalculadora();
      ultimaAct = new Date();
    }, 5 * 60 * 1000);
  }

  // ── FETCH YAHOO FINANCE ──────────────────
  async function fetchYahoo(simbolo) {
    const yfUrl    = `${YF}${simbolo}?interval=1d&range=1d`;
    const proxyUrl = `${PROXY}${encodeURIComponent(yfUrl)}`;
    const res      = await fetch(proxyUrl);
    const data     = await res.json();
    const precio   = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    if (!precio) throw new Error(`Sin precio para ${simbolo}`);
    return precio;
  }

  // ── COMMODITIES ──────────────────────────
  async function fetchCommodities() {
    const entries = Object.entries(SIMBOLOS).filter(([_, d]) => d.yf);

    const results = await Promise.allSettled(
      entries.map(async ([cultivo, d]) => {
        const bushel = await fetchYahoo(d.yf);
        // Convertir centavos/bushel a USD/tonelada
        // Yahoo devuelve en cents para granos → dividir por 100 primero
        const usdBushel = bushel > 1000 ? bushel / 100 : bushel;
        const usdTon    = Math.round(usdBushel * d.factor);
        return { cultivo, precio: usdTon };
      })
    );

    let alguno = false;
    results.forEach(r => {
      if (r.status === 'fulfilled') {
        precios[r.value.cultivo] = r.value.precio;
        alguno = true;
      }
    });

    // Girasol: no hay futuro líquido en CBOT → precio referencia BCR
    // Se mantiene el fallback actualizado manualmente
    if (!precios.girasol) precios.girasol = SIMBOLOS.girasol.fallback;

    if (!alguno) usarFallback();
  }

  // ── TIPO DE CAMBIO ───────────────────────
  async function fetchTC() {
    try {
      // ARS=X en Yahoo Finance = USD/ARS oficial
      const tc = await fetchYahoo('ARS=X');
      tcUsdArs  = Math.round(tc);
      actualizarTCDisplay();
    } catch (e) {
      console.warn('TC Yahoo falló, usando Bluelytics:', e);
      await fetchTCBluelytics();
    }
  }

  async function fetchTCBluelytics() {
    try {
      const res  = await fetch('https://api.bluelytics.com.ar/v2/latest');
      const data = await res.json();
      tcUsdArs   = Math.round(data.oficial?.value_sell || 1500);
    } catch {
      tcUsdArs = 1500;
    }
    actualizarTCDisplay();
  }

  // ── FALLBACK ─────────────────────────────
  function usarFallback() {
    precios = {
      soja:    280,
      maiz:    165,
      trigo:   210,
      girasol: 340,
    };
    if (!tcUsdArs) tcUsdArs = 1500;
  }

  // ── UI ───────────────────────────────────
  function actualizarHeader() {
    Object.entries(SIMBOLOS).forEach(([key]) => {
      const el = document.getElementById(`h-${key}`);
      if (el && precios[key]) {
        el.textContent = `$${precios[key]}`;
        // Flash verde para indicar dato live
        el.style.transition = 'color 0.3s';
        el.style.color = '#69f0ae';
        setTimeout(() => el.style.color = '', 1500);
      }
    });
  }

  function actualizarTCDisplay() {
    const el = document.getElementById('tc-display');
    if (!el) return;
    const tc = tcUsdArs || 1500;
    el.textContent = `TC $${tc.toLocaleString('es-AR')}`;
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

  // ── API PÚBLICA ──────────────────────────
  function getPrecio(cultivo) { return precios[cultivo] || SIMBOLOS[cultivo]?.fallback || 0; }
  function getTC()            { return tcUsdArs || 1500; }

  return { init, getPrecio, getTC, precios: () => precios };

})();

window.Mercado = Mercado;
