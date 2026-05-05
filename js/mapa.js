/* ─────────────────────────────────────────
   AGROCALC — js/mapa.js
   Módulo: Mapa profesional con datos reales
   Sprint 3: IGN WMS + Open-Meteo + NASA NDVI
───────────────────────────────────────── */

const Mapa = (() => {

  let mapa           = null;
  let marcadorActivo = null;

  // ── INIT ─────────────────────────────────
  function init() {
    if (mapa) return;

    mapa = L.map('mapa-leaflet', {
      center: [-36.0, -63.5],
      zoom: 6,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    // Capa base satelital Esri
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Esri · USGS · NOAA', maxZoom: 18 }
    ).addTo(mapa);

    // IGN — límites de departamentos/partidos exactos sobre satélite
    L.tileLayer.wms('https://wms.ign.gob.ar/geoserver/ows', {
      layers:      'departamentos',
      format:      'image/png',
      transparent: true,
      opacity:     0.8,
      version:     '1.3.0',
    }).addTo(mapa);

    // Labels de localidades IGN
    L.tileLayer.wms('https://wms.ign.gob.ar/geoserver/ows', {
      layers:      'localidades',
      format:      'image/png',
      transparent: true,
      opacity:     0.9,
      version:     '1.3.0',
    }).addTo(mapa);

    // Click en cualquier punto
    mapa.on('click', onMapClick);
  }

  // ── CLICK ────────────────────────────────
  async function onMapClick(e) {
    const { lat, lng } = e.latlng;

    // Marcador dorado
    if (marcadorActivo) {
      marcadorActivo.setLatLng([lat, lng]);
    } else {
      marcadorActivo = L.marker([lat, lng], {
        icon: L.divIcon({
          className: '',
          html: `<div style="
            width:18px;height:18px;background:#f9a825;
            border:3px solid white;border-radius:50%;
            box-shadow:0 2px 8px rgba(0,0,0,0.5);
          "></div>`,
          iconAnchor: [9, 9],
        })
      }).addTo(mapa);
    }

    mostrarCargando(lat, lng);

    try {
      const [clima, ndvi] = await Promise.all([
        Clima.fetchClima(lat, lng),
        Clima.fetchNDVI(lat, lng),
      ]);
      mostrarPanel(lat, lng, clima, ndvi);
    } catch (err) {
      console.error(err);
      mostrarError();
    }
  }

  // ── ESTADOS DEL PANEL ────────────────────
  function mostrarCargando(lat, lng) {
    document.getElementById('panel-placeholder').style.display = 'none';
    document.getElementById('panel-info').style.display        = 'none';
    document.getElementById('panel-loading').style.display     = 'flex';
    document.getElementById('loading-coords').textContent =
      `${Math.abs(lat).toFixed(4)}°${lat<0?'S':'N'} · ${Math.abs(lng).toFixed(4)}°${lng<0?'O':'E'}`;
  }

  function mostrarError() {
    document.getElementById('panel-loading').style.display  = 'none';
    document.getElementById('panel-info').style.display     = 'none';
    document.getElementById('panel-placeholder').style.display = 'flex';
    document.getElementById('placeholder-icon').textContent = '⚠️';
    document.getElementById('placeholder-text').textContent = 'Error al obtener datos. Intentá de nuevo.';
  }

  // ── PANEL PRINCIPAL ──────────────────────
  function mostrarPanel(lat, lng, clima, ndvi) {
    document.getElementById('panel-loading').style.display = 'none';
    document.getElementById('panel-info').style.display    = 'flex';

    // Coordenadas
    document.getElementById('panel-coords').textContent =
      `${Math.abs(lat).toFixed(4)}°${lat<0?'S':'N'} · ${Math.abs(lng).toFixed(4)}°${lng<0?'O':'E'}`;

    // ── NDVI ──
    const ndviNum = parseFloat(ndvi.valor);
    document.getElementById('ndvi-valor').textContent  = ndvi.valor !== 'N/D' ? ndvi.valor : '—';
    document.getElementById('ndvi-estado').textContent = ndvi.estado;
    document.getElementById('ndvi-estado').style.color = ndvi.color;
    document.getElementById('ndvi-desc').textContent   = ndvi.descripcion;
    document.getElementById('ndvi-fecha').textContent  = `${ndvi.fecha} · ${ndvi.fuente}`;
    document.getElementById('ndvi-barra').style.width  =
      !isNaN(ndviNum) ? `${Math.max(0, Math.min(100, ndviNum * 100))}%` : '0%';
    document.getElementById('ndvi-barra').style.background = ndvi.color;

    // ── CLIMA ──
    document.getElementById('c-lluvia30').textContent    = `${clima.lluviaTotal30} mm`;
    document.getElementById('c-lluvia7').textContent     = `${clima.lluviaTotal7} mm`;
    document.getElementById('c-lluvia-prox').textContent = `${clima.lluviaProxima} mm`;
    document.getElementById('c-temp-max').textContent    = `${clima.tempMaxProm}°C`;
    document.getElementById('c-temp-min').textContent    = `${clima.tempMinProm}°C`;
    document.getElementById('c-eto').textContent         = `${clima.etoProm} mm/día`;

    const balance = parseFloat(clima.balanceHidrico);
    document.getElementById('c-balance').textContent    = `${balance > 0 ? '+' : ''}${clima.balanceHidrico} mm`;
    document.getElementById('c-balance').style.color    = balance >= 0 ? 'var(--verde)' : 'var(--rojo)';

    // Barras lluvia semanal
    renderLluviaSemanal(clima.lluviaSemanal);

    // Semáforo hídrico
    const dot  = document.getElementById('sem-hidrico-dot');
    const text = document.getElementById('sem-hidrico-text');
    dot.className = 'semaforo-dot';
    if (balance > 20) {
      dot.classList.add('verde');
      text.textContent = '✅ Balance positivo — condiciones favorables para el cultivo.';
    } else if (balance > -30) {
      dot.classList.add('amarillo');
      text.textContent = '⚠️ Balance ajustado — monitorear humedad de suelo.';
    } else {
      dot.classList.add('rojo');
      text.textContent = '🔴 Déficit hídrico — estrés probable en el cultivo.';
    }
  }

  // ── BARRAS LLUVIA SEMANAL ────────────────
  function renderLluviaSemanal(semanas) {
    const max = Math.max(...semanas, 1);
    const labels = ['Sem 4', 'Sem 3', 'Sem 2', 'Sem 1'];
    document.getElementById('lluvia-barras').innerHTML = semanas.map((mm, i) => {
      const pct   = (mm / max * 100).toFixed(0);
      const color = mm > 40 ? 'var(--verde-claro)' : mm > 15 ? 'var(--oro)' : '#ef9a9a';
      return `
        <div class="barra-wrap">
          <div class="barra-value">${mm.toFixed(0)}</div>
          <div class="barra" style="height:${Math.max(pct,4)}%; background:${color};"></div>
          <div class="barra-label">${labels[i]}</div>
        </div>`;
    }).join('');
  }

  function invalidar() { if (mapa) mapa.invalidateSize(); }

  return { init, invalidar };

})();

window.Mapa = Mapa;
