/* ─────────────────────────────────────────
   AGROCALC — js/mapa.js
   Módulo: Mapa de Zonas Agroeconómicas
   
   Responsabilidades:
   - Renderizar mapa Argentina con Leaflet
   - Dibujar zonas agroeconómicas como polígonos
   - Mostrar info de zona al hacer click
   - Comunicar zona seleccionada a Rindes
   
   NO conoce: rindes.js internamente
   Se comunica via: window.App.state + Rindes.setCultivo()
───────────────────────────────────────── */

const Mapa = (() => {

  // ── DATOS DE ZONAS ───────────────────────
  // Polígonos simplificados de zonas agroeconómicas argentinas
  // Coordenadas: [lat, lng]
  const ZONAS = [
    {
      id: 'nucleo',
      nombre: 'Núcleo Pampeano',
      rentabilidad: 'alta',
      cultivo: 'Soja / Maíz',
      rinde_soja: 38,
      precio_ref: 280,
      margen_prom: 220,
      descripcion: 'La zona más productiva del país. Suelos profundos, lluvias regulares.',
      historico_rindes: [32, 28, 20, 36, 38],
      historico_camps: ['20/21','21/22','22/23','23/24','24/25'],
      costos: { semilla: 45, agro: 80, labores: 60, cosecha: 35, flete: 18, arriendo: 140 },
      // Polígono aproximado zona núcleo (Buenos Aires norte + sur Santa Fe + sur Córdoba)
      poligono: [
        [-32.0, -63.5], [-32.0, -60.0], [-34.5, -58.5],
        [-36.5, -59.5], [-36.5, -62.5], [-34.0, -63.5], [-32.0, -63.5]
      ]
    },
    {
      id: 'cordoba',
      nombre: 'Córdoba Central',
      rentabilidad: 'alta',
      cultivo: 'Soja / Maíz / Maní',
      rinde_soja: 34,
      precio_ref: 275,
      margen_prom: 195,
      descripcion: 'Zona de alta tecnología agrícola. Diversificación con maní y sorgo.',
      historico_rindes: [30, 26, 18, 34, 36],
      historico_camps: ['20/21','21/22','22/23','23/24','24/25'],
      costos: { semilla: 45, agro: 78, labores: 58, cosecha: 34, flete: 20, arriendo: 130 },
      poligono: [
        [-29.5, -65.0], [-29.5, -62.0], [-32.0, -62.0],
        [-32.0, -65.0], [-30.5, -65.5], [-29.5, -65.0]
      ]
    },
    {
      id: 'norte_bsas',
      nombre: 'Norte de Buenos Aires',
      rentabilidad: 'alta',
      cultivo: 'Soja / Maíz',
      rinde_soja: 35,
      precio_ref: 278,
      margen_prom: 200,
      descripcion: 'Transición entre núcleo y zona norte. Buenos suelos con variabilidad climática.',
      historico_rindes: [31, 27, 19, 35, 37],
      historico_camps: ['20/21','21/22','22/23','23/24','24/25'],
      costos: { semilla: 45, agro: 80, labores: 60, cosecha: 35, flete: 22, arriendo: 125 },
      poligono: [
        [-32.0, -60.0], [-29.5, -59.0], [-28.0, -58.5],
        [-28.0, -60.5], [-30.0, -61.5], [-32.0, -60.0]
      ]
    },
    {
      id: 'sur_bsas',
      nombre: 'Sur de Buenos Aires',
      rentabilidad: 'media',
      cultivo: 'Trigo / Girasol / Cebada',
      rinde_soja: 22,
      precio_ref: 210,
      margen_prom: 130,
      descripcion: 'Zona triguera y girasol. Menor aptitud para soja, mayor para cereales de invierno.',
      historico_rindes: [20, 18, 14, 22, 24],
      historico_camps: ['20/21','21/22','22/23','23/24','24/25'],
      costos: { semilla: 40, agro: 65, labores: 55, cosecha: 30, flete: 25, arriendo: 100 },
      poligono: [
        [-36.5, -59.5], [-34.5, -58.5], [-36.5, -57.0],
        [-39.5, -57.5], [-40.5, -62.0], [-38.0, -62.5], [-36.5, -62.5], [-36.5, -59.5]
      ]
    },
    {
      id: 'entrerios',
      nombre: 'Entre Ríos',
      rentabilidad: 'media',
      cultivo: 'Soja / Arroz / Trigo',
      rinde_soja: 28,
      precio_ref: 270,
      margen_prom: 150,
      descripcion: 'Suelos arcillosos con alta variabilidad. Zona arrocera importante.',
      historico_rindes: [25, 22, 16, 28, 30],
      historico_camps: ['20/21','21/22','22/23','23/24','24/25'],
      costos: { semilla: 45, agro: 82, labores: 62, cosecha: 36, flete: 24, arriendo: 110 },
      poligono: [
        [-30.5, -58.5], [-28.0, -58.5], [-29.5, -59.0],
        [-32.0, -60.0], [-32.5, -58.5], [-30.5, -58.5]
      ]
    },
    {
      id: 'nea',
      nombre: 'NEA / Chaco',
      rentabilidad: 'media',
      cultivo: 'Algodón / Soja / Sorgo',
      rinde_soja: 24,
      precio_ref: 265,
      margen_prom: 100,
      descripcion: 'Zona de expansión agrícola. Alta variabilidad por lluvias. Potencial con riego.',
      historico_rindes: [22, 20, 15, 24, 26],
      historico_camps: ['20/21','21/22','22/23','23/24','24/25'],
      costos: { semilla: 45, agro: 85, labores: 65, cosecha: 38, flete: 30, arriendo: 80 },
      poligono: [
        [-22.0, -62.0], [-22.0, -57.5], [-27.0, -57.5],
        [-28.0, -58.5], [-28.0, -60.5], [-25.0, -62.0], [-22.0, -62.0]
      ]
    },
    {
      id: 'noa',
      nombre: 'NOA / Tucumán',
      rentabilidad: 'media',
      cultivo: 'Caña / Soja / Poroto',
      rinde_soja: 26,
      precio_ref: 260,
      margen_prom: 110,
      descripcion: 'Zona cañera y sojera del norte. Alta tecnología en valles irrigados.',
      historico_rindes: [24, 21, 17, 26, 27],
      historico_camps: ['20/21','21/22','22/23','23/24','24/25'],
      costos: { semilla: 48, agro: 88, labores: 68, cosecha: 40, flete: 35, arriendo: 90 },
      poligono: [
        [-22.0, -67.0], [-22.0, -62.0], [-25.0, -62.0],
        [-28.0, -65.0], [-26.0, -67.0], [-22.0, -67.0]
      ]
    },
    {
      id: 'cuyo',
      nombre: 'Cuyo / Mendoza',
      rentabilidad: 'baja',
      cultivo: 'Vid / Olivo / Ajo',
      rinde_soja: 0,
      precio_ref: 0,
      margen_prom: 80,
      descripcion: 'Zona vitivinícola. Agricultura bajo riego. No apta para soja extensiva.',
      historico_rindes: [0, 0, 0, 0, 0],
      historico_camps: ['20/21','21/22','22/23','23/24','24/25'],
      costos: { semilla: 0, agro: 0, labores: 0, cosecha: 0, flete: 0, arriendo: 0 },
      poligono: [
        [-28.0, -70.0], [-28.0, -65.0], [-32.0, -65.0],
        [-36.5, -68.0], [-35.0, -70.0], [-28.0, -70.0]
      ]
    },
    {
      id: 'patagonia',
      nombre: 'Patagonia',
      rentabilidad: 'baja',
      cultivo: 'Ovinos / Frutales / Riego',
      rinde_soja: 0,
      precio_ref: 0,
      margen_prom: 40,
      descripcion: 'Ganadería extensiva ovina. Fruticultura bajo riego en valles.',
      historico_rindes: [0, 0, 0, 0, 0],
      historico_camps: ['20/21','21/22','22/23','23/24','24/25'],
      costos: { semilla: 0, agro: 0, labores: 0, cosecha: 0, flete: 0, arriendo: 0 },
      poligono: [
        [-36.5, -68.0], [-36.5, -57.0], [-40.5, -57.5],
        [-55.0, -65.0], [-55.0, -70.0], [-40.0, -71.5], [-36.5, -68.0]
      ]
    },
  ];

  // ── ESTADO ───────────────────────────────
  let mapa         = null;
  let zonaActiva   = null;
  let capas        = {};

  // ── COLORES ──────────────────────────────
  const COLOR = {
    alta:   { fill: '#2d7d3a', border: '#1a5c2a', hover: '#4caf50' },
    media:  { fill: '#f9a825', border: '#e65100', hover: '#ffca28' },
    baja:   { fill: '#c62828', border: '#8d1c1c', hover: '#ef5350' },
  };

  // ── INIT MAPA ────────────────────────────
  function init() {
    if (mapa) return; // ya inicializado

    mapa = L.map('mapa-leaflet', {
      center: [-38.0, -63.0],
      zoom: 5,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    // Tile layer suave tipo terrain
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CartoDB',
      subdomains: 'abcd',
      maxZoom: 10,
    }).addTo(mapa);

    // Dibujar zonas
    ZONAS.forEach(zona => {
      const color = COLOR[zona.rentabilidad];
      const capa = L.polygon(zona.poligono, {
        color:       color.border,
        fillColor:   color.fill,
        fillOpacity: 0.55,
        weight:      1.5,
        smoothFactor: 1,
      }).addTo(mapa);

      // Tooltip nombre
      capa.bindTooltip(`<strong>${zona.nombre}</strong><br><small>${zona.cultivo}</small>`, {
        sticky: true,
        className: 'zona-tooltip',
      });

      // Click → mostrar info
      capa.on('click', () => seleccionarZona(zona, capa));

      // Hover
      capa.on('mouseover', () => {
        if (zonaActiva?.id !== zona.id) {
          capa.setStyle({ fillOpacity: 0.75, weight: 2.5, color: color.hover });
        }
      });
      capa.on('mouseout', () => {
        if (zonaActiva?.id !== zona.id) {
          capa.setStyle({ fillOpacity: 0.55, weight: 1.5, color: color.border });
        }
      });

      capas[zona.id] = { capa, zona };
    });
  }

  // ── SELECCIONAR ZONA ─────────────────────
  function seleccionarZona(zona, capa) {
    // Reset zona anterior
    if (zonaActiva) {
      const anterior = capas[zonaActiva.id];
      const colorAnt = COLOR[anterior.zona.rentabilidad];
      anterior.capa.setStyle({
        fillOpacity: 0.55, weight: 1.5,
        color: colorAnt.border, fillColor: colorAnt.fill
      });
    }

    // Highlight zona nueva
    const color = COLOR[zona.rentabilidad];
    capa.setStyle({
      fillOpacity: 0.85,
      weight: 3,
      color: '#f9a825',
    });

    zonaActiva = zona;

    // Guardar en estado global
    if (window.App) App.state.zonaActual = zona.id;

    // Mostrar panel
    mostrarPanel(zona);
  }

  // ── PANEL INFO ───────────────────────────
  function mostrarPanel(zona) {
    document.getElementById('panel-placeholder').style.display = 'none';
    document.getElementById('panel-info').style.display = 'flex';

    document.getElementById('panel-zona-nombre').textContent = zona.nombre;

    const badge = document.getElementById('panel-zona-badge');
    const labels = { alta: '🟢 Rentabilidad Alta', media: '🟡 Rentabilidad Media', baja: '🔴 Rentabilidad Baja' };
    badge.textContent = labels[zona.rentabilidad];
    badge.className = `panel-zona-badge ${zona.rentabilidad}`;

    document.getElementById('stat-rinde').textContent =
      zona.rinde_soja > 0 ? `${zona.rinde_soja} qq/ha` : 'N/A';
    document.getElementById('stat-precio').textContent =
      zona.precio_ref > 0 ? `USD ${zona.precio_ref}/t` : 'N/A';
    document.getElementById('stat-margen').textContent =
      `USD ${zona.margen_prom}/ha`;
    document.getElementById('stat-cultivo').textContent = zona.cultivo;

    // Barras históricas
    renderBarras(zona);
  }

  // ── BARRAS HISTÓRICAS ────────────────────
  function renderBarras(zona) {
    const contenedor = document.getElementById('panel-barras');
    const max = Math.max(...zona.historico_rindes.filter(v => v > 0), 1);

    contenedor.innerHTML = zona.historico_rindes.map((rinde, i) => {
      const pct    = rinde > 0 ? (rinde / max * 100) : 5;
      const color  = rinde >= zona.rinde_soja * 0.9 ? 'var(--verde-claro)' :
                     rinde >= zona.rinde_soja * 0.7 ? 'var(--oro)' : 'var(--rojo)';
      return `
        <div class="barra-wrap">
          <div class="barra-value">${rinde > 0 ? rinde : '—'}</div>
          <div class="barra" style="height:${pct}%; background:${color};"></div>
          <div class="barra-label">${zona.historico_camps[i]}</div>
        </div>`;
    }).join('');
  }

  // ── CARGAR EN CALCULADORA ────────────────
  function cargarEnCalculadora() {
    if (!zonaActiva) return;

    // Navegar a calculadora
    App.navigate('calculadora', document.querySelector('.nav-tab'));

    // Esperar que el DOM esté listo y cargar datos
    setTimeout(() => {
      const zona = zonaActiva;

      // Setear zona en el select
      const zonaSelect = document.getElementById('zona');
      if (zonaSelect) zonaSelect.value = zona.id;

      // Cargar costos de la zona
      if (zona.costos.semilla > 0) {
        document.getElementById('c-semilla').value  = zona.costos.semilla;
        document.getElementById('c-agro').value     = zona.costos.agro;
        document.getElementById('c-labores').value  = zona.costos.labores;
        document.getElementById('c-cosecha').value  = zona.costos.cosecha;
        document.getElementById('c-flete').value    = zona.costos.flete;
        document.getElementById('c-arriendo').value = zona.costos.arriendo;
      }

      // Cargar rinde histórico promedio
      if (zona.rinde_soja > 0) {
        document.getElementById('rinde').value = zona.rinde_soja;
      }

      // Cargar precio referencia
      if (zona.precio_ref > 0) {
        const slider = document.getElementById('precio-slider');
        slider.value = zona.precio_ref;
        Rindes.updateSlider(slider);
      }

      // Recalcular
      Rindes.calcular();

      // Feedback visual
      mostrarToast(`✅ Datos de "${zona.nombre}" cargados en la calculadora`);
    }, 300);
  }

  // ── TOAST NOTIFICATION ───────────────────
  function mostrarToast(msg) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
      background: var(--verde); color: white; padding: 12px 24px;
      border-radius: 30px; font-family: 'Syne', sans-serif; font-size: 0.85rem;
      font-weight: 700; box-shadow: 0 4px 16px rgba(0,0,0,0.2);
      z-index: 9999; animation: fadeUp 0.3s ease;
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  // ── API PÚBLICA ──────────────────────────
  return { init, cargarEnCalculadora, ZONAS };

})();

window.Mapa = Mapa;
