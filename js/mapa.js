/* ─────────────────────────────────────────
   AGROCALC — js/mapa.js
   Sprint 4: Mapa de calor real
   
   - Imagen satelital Esri
   - Grilla de puntos sobre Argentina
   - Open-Meteo por cada punto → lluvia/temp/balance
   - Leaflet.heat → heatmap visual
   - Click → datos exactos del punto
   - Toggle: Lluvia / Temperatura / Balance hídrico
───────────────────────────────────────── */

const Mapa = (() => {

  let mapa           = null;
  let capaCalor      = null;
  let marcadorActivo = null;
  let datosPuntos    = []; // cache de datos ya fetcheados
  let modoActual     = 'lluvia';
  let cargando       = false;

  // ── GRILLA DE PUNTOS ARGENTINA ───────────
  // Cubre la zona agrícola principal (~22°S a ~42°S, ~57°O a ~68°O)
  // Cada punto ~80km separado para no saturar la API
  const GRILLA = generarGrilla();

  function generarGrilla() {
    const puntos = [];
    const paso   = 1.2; // grados (~130km)
    for (let lat = -42; lat <= -22; lat += paso) {
      for (let lng = -68; lng <= -57; lng += paso) {
        // Filtro muy básico para quedar dentro de Argentina
        if (dentroArgentina(lat, lng)) {
          puntos.push({ lat: +lat.toFixed(2), lng: +lng.toFixed(2) });
        }
      }
    }
    return puntos;
  }

  function dentroArgentina(lat, lng) {
    // Bounding box + exclusiones aproximadas de zonas marítimas/Chile
    if (lat < -55 || lat > -21) return false;
    if (lng < -73 || lng > -53) return false;
    // Excluir Chile (muy al oeste en latitudes intermedias)
    if (lat > -38 && lat < -28 && lng < -68) return false;
    if (lat > -28 && lng < -65) return false;
    // Excluir Atlántico (muy al este)
    if (lat > -40 && lat < -34 && lng > -56) return false;
    return true;
  }

  // ── INIT ─────────────────────────────────
  function init() {
    if (mapa) return;

    mapa = L.map('mapa-leaflet', {
      center: [-36.0, -63.5],
      zoom: 5,
      zoomControl: true,
      scrollWheelZoom: true,
      minZoom: 4,
      maxZoom: 14,
    });

    // Satélite Esri
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Esri · USGS · NOAA', maxZoom: 18 }
    ).addTo(mapa);

    // Labels encima del satélite
    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png',
      { attribution: '© CartoDB', opacity: 0.8, pane: 'overlayPane' }
    ).addTo(mapa);

    // Click en mapa → datos del punto
    mapa.on('click', onMapClick);

    // Arrancar carga del heatmap
    cargarHeatmap();
  }

  // ── CARGAR HEATMAP ───────────────────────
  async function cargarHeatmap() {
    if (cargando) return;
    cargando = true;

    mostrarProgreso(0);

    // Fetch en batches de 8 para no saturar
    const batch = 8;
    datosPuntos  = [];

    for (let i = 0; i < GRILLA.length; i += batch) {
      const slice   = GRILLA.slice(i, i + batch);
      const results = await Promise.allSettled(
        slice.map(p => fetchPunto(p.lat, p.lng))
      );
      results.forEach((r, j) => {
        if (r.status === 'fulfilled' && r.value) {
          datosPuntos.push(r.value);
        }
      });
      const pct = Math.round((i + batch) / GRILLA.length * 100);
      mostrarProgreso(Math.min(pct, 99));
      // Pequeña pausa para no saturar
      await sleep(120);
    }

    mostrarProgreso(100);
    setTimeout(() => ocultarProgreso(), 600);

    renderHeatmap();
    cargando = false;
  }

  // ── FETCH PUNTO ──────────────────────────
  async function fetchPunto(lat, lng) {
    const url = `https://api.open-meteo.com/v1/forecast?` +
      `latitude=${lat}&longitude=${lng}` +
      `&daily=precipitation_sum,temperature_2m_max,temperature_2m_min,et0_fao_evapotranspiration` +
      `&past_days=30&forecast_days=1` +
      `&timezone=America%2FArgentina%2FBuenos_Aires`;

    const res  = await fetch(url);
    const data = await res.json();
    const d    = data.daily;
    if (!d) return null;

    const lluvia30 = d.precipitation_sum.reduce((a, b) => a + (b||0), 0);
    const tempMax  = promedio(d.temperature_2m_max);
    const tempMin  = promedio(d.temperature_2m_min);
    const eto      = promedio(d.et0_fao_evapotranspiration);
    const balance  = lluvia30 - (eto * 30);

    return { lat, lng, lluvia30, tempMax, tempMin, eto, balance };
  }

  // ── RENDER HEATMAP ───────────────────────
  function renderHeatmap() {
    if (capaCalor) mapa.removeLayer(capaCalor);
    if (!datosPuntos.length) return;

    const puntos = datosPuntos.map(p => {
      let intensidad;
      if (modoActual === 'lluvia') {
        // Normalizar 0-200mm → 0-1
        intensidad = Math.min(p.lluvia30 / 180, 1);
      } else if (modoActual === 'temperatura') {
        // Normalizar 10-35°C → 0-1
        intensidad = Math.min(Math.max((p.tempMax - 10) / 25, 0), 1);
      } else {
        // Balance hídrico: -150 a +100 → 0-1
        intensidad = Math.min(Math.max((p.balance + 150) / 250, 0), 1);
      }
      return [p.lat, p.lng, intensidad];
    });

    // Gradientes por modo
    const gradientes = {
      lluvia: {
        0.0: '#8B0000',  // rojo oscuro = seco
        0.2: '#FF4500',
        0.4: '#FFA500',
        0.6: '#ADFF2F',
        0.8: '#00C853',
        1.0: '#004D00',  // verde oscuro = muy húmedo
      },
      temperatura: {
        0.0: '#00BFFF',  // azul = frío
        0.3: '#7FFF00',
        0.6: '#FFD700',
        0.8: '#FF4500',
        1.0: '#8B0000',  // rojo = muy caliente
      },
      balance: {
        0.0: '#8B0000',  // rojo = déficit severo
        0.3: '#FF6347',
        0.5: '#FFD700',
        0.7: '#90EE90',
        1.0: '#004D00',  // verde = superávit
      },
    };

    capaCalor = L.heatLayer(puntos, {
      radius:  55,
      blur:    40,
      maxZoom: 10,
      max:     1.0,
      gradient: gradientes[modoActual],
    }).addTo(mapa);
  }

  // ── CLICK EN PUNTO ───────────────────────
  async function onMapClick(e) {
    const { lat, lng } = e.latlng;

    // Marcador
    if (marcadorActivo) {
      marcadorActivo.setLatLng([lat, lng]);
    } else {
      marcadorActivo = L.marker([lat, lng], {
        icon: L.divIcon({
          className: '',
          html: `<div style="
            width:16px;height:16px;background:#f9a825;
            border:3px solid white;border-radius:50%;
            box-shadow:0 2px 8px rgba(0,0,0,0.6);
          "></div>`,
          iconAnchor: [8, 8],
        })
      }).addTo(mapa);
    }

    mostrarCargandoPanel(lat, lng);

    try {
      const datos = await fetchPunto(lat, lng);
      if (datos) mostrarPanel(datos);
      else mostrarErrorPanel();
    } catch(e) {
      mostrarErrorPanel();
    }
  }

  // ── PANEL ────────────────────────────────
  function mostrarCargandoPanel(lat, lng) {
    document.getElementById('panel-placeholder').style.display = 'none';
    document.getElementById('panel-info').style.display        = 'none';
    document.getElementById('panel-loading').style.display     = 'flex';
    document.getElementById('loading-coords').textContent =
      `${Math.abs(lat).toFixed(3)}°${lat<0?'S':'N'} · ${Math.abs(lng).toFixed(3)}°${lng<0?'O':'E'}`;
  }

  function mostrarPanel(d) {
    document.getElementById('panel-loading').style.display = 'none';
    document.getElementById('panel-info').style.display    = 'flex';

    document.getElementById('panel-coords').textContent =
      `${Math.abs(d.lat).toFixed(3)}°${d.lat<0?'S':'N'} · ${Math.abs(d.lng).toFixed(3)}°${d.lng<0?'O':'E'}`;

    // Lluvia
    document.getElementById('c-lluvia30').textContent    = `${d.lluvia30.toFixed(1)} mm`;
    document.getElementById('c-temp-max').textContent    = `${d.tempMax.toFixed(1)}°C`;
    document.getElementById('c-temp-min').textContent    = `${d.tempMin.toFixed(1)}°C`;
    document.getElementById('c-eto').textContent         = `${d.eto.toFixed(1)} mm/día`;

    const bal = d.balance.toFixed(1);
    document.getElementById('c-balance').textContent  = `${d.balance>0?'+':''}${bal} mm`;
    document.getElementById('c-balance').style.color  = d.balance >= 0 ? 'var(--verde)' : 'var(--rojo)';

    // Barra de lluvia visual
    const pctLluvia = Math.min(d.lluvia30 / 150 * 100, 100).toFixed(0);
    document.getElementById('lluvia-barra-fill').style.width = `${pctLluvia}%`;
    document.getElementById('lluvia-barra-fill').style.background =
      d.lluvia30 > 80 ? 'var(--verde-claro)' : d.lluvia30 > 30 ? 'var(--oro)' : 'var(--rojo)';

    // Semáforo
    const dot  = document.getElementById('sem-hidrico-dot');
    const text = document.getElementById('sem-hidrico-text');
    dot.className = 'semaforo-dot';
    if (d.balance > 20) {
      dot.classList.add('verde');
      text.textContent = '✅ Balance hídrico positivo — condiciones favorables.';
    } else if (d.balance > -40) {
      dot.classList.add('amarillo');
      text.textContent = '⚠️ Balance ajustado — monitorear humedad de suelo.';
    } else {
      dot.classList.add('rojo');
      text.textContent = '🔴 Déficit hídrico — estrés probable en el cultivo.';
    }

    // NDVI placeholder (sin backend)
    const ndviEst = estimarNDVI(d.lluvia30, d.balance);
    document.getElementById('ndvi-valor').textContent  = ndviEst.valor;
    document.getElementById('ndvi-estado').textContent = ndviEst.estado;
    document.getElementById('ndvi-estado').style.color = ndviEst.color;
    document.getElementById('ndvi-barra').style.width  = `${ndviEst.pct}%`;
    document.getElementById('ndvi-barra').style.background = ndviEst.color;
  }

  // NDVI estimado por balance hídrico (sin NASA por CORS)
  function estimarNDVI(lluvia, balance) {
    if (balance > 50 && lluvia > 80)
      return { valor: '~0.65', estado: 'Excelente', color: '#2d7d3a', pct: 65 };
    if (balance > 10 && lluvia > 40)
      return { valor: '~0.48', estado: 'Bueno',     color: '#4caf50', pct: 48 };
    if (balance > -30)
      return { valor: '~0.30', estado: 'Moderado',  color: '#f9a825', pct: 30 };
    return   { valor: '~0.15', estado: 'Bajo',      color: '#c62828', pct: 15 };
  }

  function mostrarErrorPanel() {
    document.getElementById('panel-loading').style.display     = 'none';
    document.getElementById('panel-placeholder').style.display = 'flex';
    document.getElementById('placeholder-icon').textContent    = '⚠️';
    document.getElementById('placeholder-text').textContent    = 'Error al obtener datos. Intentá de nuevo.';
  }

  // ── TOGGLE MODO ──────────────────────────
  function setModo(modo) {
    modoActual = modo;
    document.querySelectorAll('.modo-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`modo-${modo}`).classList.add('active');
    renderHeatmap();
    actualizarLeyenda();
  }

  function actualizarLeyenda() {
    const leyendas = {
      lluvia:      { min: '0 mm', mid: '90 mm', max: '180+ mm', titulo: '🌧️ Lluvia 30 días' },
      temperatura: { min: '10°C', mid: '22°C',  max: '35°C',    titulo: '🌡️ Temperatura máx prom' },
      balance:     { min: 'Déficit', mid: 'Neutro', max: 'Superávit', titulo: '💧 Balance hídrico' },
    };
    const l = leyendas[modoActual];
    document.getElementById('leyenda-titulo').textContent = l.titulo;
    document.getElementById('leyenda-min').textContent    = l.min;
    document.getElementById('leyenda-mid').textContent    = l.mid;
    document.getElementById('leyenda-max').textContent    = l.max;
    document.getElementById('leyenda-gradient').className = `leyenda-gradient grad-${modoActual}`;
  }

  // ── PROGRESO ─────────────────────────────
  function mostrarProgreso(pct) {
    const el = document.getElementById('heatmap-progreso');
    if (!el) return;
    el.style.display = 'flex';
    document.getElementById('progreso-pct').textContent  = `${pct}%`;
    document.getElementById('progreso-fill').style.width = `${pct}%`;
  }

  function ocultarProgreso() {
    const el = document.getElementById('heatmap-progreso');
    if (el) el.style.display = 'none';
  }

  // ── HELPERS ──────────────────────────────
  function promedio(arr) {
    const v = (arr||[]).filter(x => x !== null);
    return v.length ? v.reduce((a,b)=>a+b,0)/v.length : 0;
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  function invalidar() { if (mapa) mapa.invalidateSize(); }

  return { init, invalidar, setModo };

})();

window.Mapa = Mapa;
