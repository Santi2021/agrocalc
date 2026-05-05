/* ─────────────────────────────────────────
   AGROCALC — js/rindes.js
   Módulo: Calculadora de rindes
   
   Responsabilidades:
   - Datos de cultivos y costos por defecto
   - Datos históricos por cultivo
   - Lógica de cálculo de margen / PE
   - Render del HTML del módulo
   - Export a Excel
   
   NO conoce: mapa.js, clima.js, app.js
   Se comunica via: window.Rindes (API pública)
───────────────────────────────────────── */

const Rindes = (() => {

  // ── DATOS ────────────────────────────────
  const CULTIVOS = {
    soja:    { emoji: '🌱', label: 'Soja',    precio: 280, rendRef: 35,
               costos: { semilla: 45, agro: 80, labores: 60, cosecha: 35, flete: 20, arriendo: 120 } },
    maiz:    { emoji: '🌽', label: 'Maíz',    precio: 165, rendRef: 80,
               costos: { semilla: 90, agro: 100, labores: 70, cosecha: 40, flete: 22, arriendo: 120 } },
    trigo:   { emoji: '🌾', label: 'Trigo',   precio: 210, rendRef: 40,
               costos: { semilla: 40, agro: 70, labores: 55, cosecha: 30, flete: 18, arriendo: 110 } },
    girasol: { emoji: '🌻', label: 'Girasol', precio: 340, rendRef: 22,
               costos: { semilla: 30, agro: 55, labores: 55, cosecha: 28, flete: 15, arriendo: 100 } },
  };

  const HISTORICOS = {
    soja:    [
      { camp: '20/21', rinde: 32, precio: 320, margen: 210 },
      { camp: '21/22', rinde: 28, precio: 370, margen: 180 },
      { camp: '22/23', rinde: 20, precio: 290, margen: -40 },
      { camp: '23/24', rinde: 36, precio: 260, margen: 195 },
      { camp: '24/25', rinde: 38, precio: 275, margen: 220 },
    ],
    maiz:    [
      { camp: '20/21', rinde: 75, precio: 175, margen: 280 },
      { camp: '21/22', rinde: 82, precio: 195, margen: 340 },
      { camp: '22/23', rinde: 60, precio: 155, margen: 90  },
      { camp: '23/24', rinde: 85, precio: 160, margen: 310 },
      { camp: '24/25', rinde: 88, precio: 162, margen: 325 },
    ],
    trigo:   [
      { camp: '20/21', rinde: 38, precio: 200, margen: 150 },
      { camp: '21/22', rinde: 42, precio: 230, margen: 195 },
      { camp: '22/23', rinde: 35, precio: 195, margen: 110 },
      { camp: '23/24', rinde: 40, precio: 205, margen: 145 },
      { camp: '24/25', rinde: 44, precio: 215, margen: 210 },
    ],
    girasol: [
      { camp: '20/21', rinde: 20, precio: 310, margen: 120 },
      { camp: '21/22', rinde: 22, precio: 360, margen: 170 },
      { camp: '22/23', rinde: 18, precio: 320, margen: 80  },
      { camp: '23/24', rinde: 23, precio: 335, margen: 160 },
      { camp: '24/25', rinde: 24, precio: 345, margen: 185 },
    ],
  };

  // ── ESTADO INTERNO ───────────────────────
  let cultivoActual = 'soja';

  // ── HELPERS ──────────────────────────────
  const fmt = v => v >= 0
    ? `USD ${Math.round(v).toLocaleString('es-AR')}`
    : `−USD ${Math.round(Math.abs(v)).toLocaleString('es-AR')}`;

  const getVal = id => +document.getElementById(id)?.value || 0;

  // ── CALCULAR ─────────────────────────────
  function calcular() {
    const ha     = getVal('hectareas');
    const rinde  = getVal('rinde');
    const precio = getVal('precio-slider');

    const costo_ha =
      getVal('c-semilla') + getVal('c-agro') + getVal('c-labores') +
      getVal('c-cosecha') + getVal('c-flete') + getVal('c-arriendo');

    const ingreso_ha = (rinde / 10) * precio;
    const margen_ha  = ingreso_ha - costo_ha;
    const ingreso    = ingreso_ha * ha;
    const costo      = costo_ha * ha;
    const margen     = margen_ha * ha;
    const pe_qq      = costo_ha / (precio / 10);

    // Resultados principales
    document.getElementById('r-ingreso').textContent    = fmt(ingreso);
    document.getElementById('r-ingreso-ha').textContent = `${fmt(ingreso_ha)} / ha`;
    document.getElementById('r-costo').textContent      = fmt(costo);
    document.getElementById('r-costo-ha').textContent   = `${fmt(costo_ha)} / ha`;
    document.getElementById('r-margen').textContent     = fmt(margen);
    document.getElementById('r-margen-ha').textContent  = `${fmt(margen_ha)} / ha`;
    document.getElementById('r-pe').textContent         = pe_qq.toFixed(1) + ' qq';

    // Semáforo
    const dot  = document.getElementById('semaforo-dot');
    const text = document.getElementById('semaforo-text');
    dot.className = 'semaforo-dot';
    if (margen_ha > 50) {
      dot.classList.add('verde');
      text.textContent = `✅ Campaña rentable — Margen ${fmt(margen_ha)}/ha. Superás el punto de equilibrio por ${(rinde - pe_qq).toFixed(1)} qq.`;
    } else if (margen_ha > 0) {
      dot.classList.add('amarillo');
      text.textContent = `⚠️ Margen ajustado — Cubrís costos pero con poco colchón. Considerá fijar precio a futuro.`;
    } else {
      dot.classList.add('rojo');
      text.textContent = `🔴 Campaña en rojo — Necesitás ${pe_qq.toFixed(1)} qq/ha para cubrir costos, tu rinde actual no alcanza.`;
    }

    // Escenarios ±25%
    [['p', 0.75], ['b', 1.0], ['o', 1.25]].forEach(([k, factor]) => {
      const p  = precio * factor;
      const mg = (rinde / 10) * p - costo_ha;
      document.getElementById(`e-precio-${k}`).textContent = `USD ${Math.round(p)}/t`;
      document.getElementById(`e-margen-${k}`).textContent = fmt(mg * ha);
      document.getElementById(`e-ha-${k}`).textContent     = `${fmt(mg)} /ha`;
    });
  }

  // ── SLIDER ───────────────────────────────
  function updateSlider(el) {
    const pct = ((+el.value - +el.min) / (+el.max - +el.min) * 100).toFixed(1);
    el.style.setProperty('--pct', pct + '%');
    document.getElementById('precio-display').textContent = `USD ${el.value}/t`;
  }

  // ── CAMBIO DE CULTIVO ────────────────────
  function setCultivo(c) {
    cultivoActual = c;
    const d = CULTIVOS[c];
    document.getElementById('precio-slider').value = d.precio;
    document.getElementById('rinde').value          = d.rendRef;
    document.getElementById('c-semilla').value      = d.costos.semilla;
    document.getElementById('c-agro').value         = d.costos.agro;
    document.getElementById('c-labores').value      = d.costos.labores;
    document.getElementById('c-cosecha').value      = d.costos.cosecha;
    document.getElementById('c-flete').value        = d.costos.flete;
    document.getElementById('c-arriendo').value     = d.costos.arriendo;
    updateSlider(document.getElementById('precio-slider'));
    renderHistorico();
    calcular();
  }

  // ── HISTÓRICO ────────────────────────────
  function renderHistorico() {
    const data   = HISTORICOS[cultivoActual];
    const maxMg  = Math.max(...data.map(d => Math.abs(d.margen)));
    const body   = document.getElementById('historico-body');
    if (!body) return;
    body.innerHTML = data.map(d => `
      <tr>
        <td>${d.camp}</td>
        <td>${d.rinde} qq/ha</td>
        <td>USD ${d.precio}</td>
        <td style="color:${d.margen >= 0 ? 'var(--verde)' : 'var(--rojo)'}; font-weight:600;">
          ${d.margen >= 0 ? '+' : ''}${d.margen} USD/ha
          <span class="bar-mini" style="width:${Math.abs(d.margen)/maxMg*100}%; background:${d.margen >= 0 ? 'var(--verde-claro)' : 'var(--rojo)'}"></span>
        </td>
      </tr>`).join('');
  }

  // ── EXPORT EXCEL ─────────────────────────
  function exportarExcel() {
    const ha     = getVal('hectareas');
    const rinde  = getVal('rinde');
    const precio = getVal('precio-slider');
    const costos = {
      Semilla:       getVal('c-semilla'),
      Agroquímicos:  getVal('c-agro'),
      Labores:       getVal('c-labores'),
      Cosecha:       getVal('c-cosecha'),
      Flete:         getVal('c-flete'),
      Arrendamiento: getVal('c-arriendo'),
    };
    const costo_ha   = Object.values(costos).reduce((a,b) => a+b, 0);
    const ingreso_ha = (rinde / 10) * precio;
    const margen_ha  = ingreso_ha - costo_ha;

    const wb = XLSX.utils.book_new();

    // Hoja 1: Resumen
    const ws1 = XLSX.utils.aoa_to_sheet([
      ['AgroCalc — Resumen de Campaña'],
      ['Cultivo', cultivoActual.toUpperCase()],
      ['Superficie (ha)', ha],
      ['Rinde esperado (qq/ha)', rinde],
      ['Precio de venta (USD/t)', precio],
      [],
      ['COSTOS (USD/ha)'],
      ...Object.entries(costos).map(([k,v]) => [k, v]),
      ['COSTO TOTAL/ha', costo_ha],
      [],
      ['RESULTADOS'],
      ['Ingreso bruto/ha (USD)', ingreso_ha.toFixed(2)],
      ['Margen neto/ha (USD)',   margen_ha.toFixed(2)],
      ['Margen total campaña (USD)', (margen_ha * ha).toFixed(2)],
      ['Punto de equilibrio (qq/ha)', (costo_ha / (precio / 10)).toFixed(1)],
    ]);
    XLSX.utils.book_append_sheet(wb, ws1, 'Resumen');

    // Hoja 2: Escenarios
    const ws2 = XLSX.utils.aoa_to_sheet([
      ['Escenario', 'Precio (USD/t)', 'Margen/ha (USD)', 'Margen Total (USD)'],
      ['Pesimista (-25%)', Math.round(precio*0.75), ((rinde/10*precio*0.75)-costo_ha).toFixed(2), (((rinde/10*precio*0.75)-costo_ha)*ha).toFixed(2)],
      ['Base',             precio,                  margen_ha.toFixed(2),                         (margen_ha*ha).toFixed(2)],
      ['Optimista (+25%)', Math.round(precio*1.25), ((rinde/10*precio*1.25)-costo_ha).toFixed(2), (((rinde/10*precio*1.25)-costo_ha)*ha).toFixed(2)],
    ]);
    XLSX.utils.book_append_sheet(wb, ws2, 'Escenarios');

    // Hoja 3: Histórico
    const ws3 = XLSX.utils.aoa_to_sheet([
      ['Campaña', 'Rinde (qq/ha)', 'Precio (USD/t)', 'Margen/ha (USD)'],
      ...HISTORICOS[cultivoActual].map(d => [d.camp, d.rinde, d.precio, d.margen])
    ]);
    XLSX.utils.book_append_sheet(wb, ws3, 'Histórico');

    XLSX.writeFile(wb, `AgroCalc_${cultivoActual}_campaña.xlsx`);
  }

  // ── RENDER HTML ──────────────────────────
  function render() {
    const grid = document.getElementById('main-grid');
    if (!grid) return;

    grid.innerHTML = `
      <!-- CARD: CAMPO -->
      <div class="card">
        <div class="card-title">📍 Tu Campo</div>
        <div class="input-grid">
          <div class="input-group full">
            <label>Zona Agroeconómica</label>
            <select id="zona">
              <option value="nucleo">Núcleo Pampeano</option>
              <option value="norte">Norte de Buenos Aires</option>
              <option value="sur">Sur de Buenos Aires</option>
              <option value="cordoba">Córdoba Central</option>
              <option value="entrerios">Entre Ríos</option>
              <option value="nea">NEA / Chaco</option>
            </select>
          </div>
          <div class="input-group">
            <label>Superficie</label>
            <div class="input-unit">
              <input type="number" id="hectareas" value="500" min="1" oninput="Rindes.calcular()">
              <span class="unit-badge">HA</span>
            </div>
          </div>
          <div class="input-group">
            <label>Rinde esperado</label>
            <div class="input-unit">
              <input type="number" id="rinde" value="35" min="1" step="0.5" oninput="Rindes.calcular()">
              <span class="unit-badge">QQ/HA</span>
            </div>
          </div>
        </div>
        <div class="slider-section">
          <div class="slider-label">
            <span>Precio de venta</span>
            <span class="slider-value" id="precio-display">USD 280/t</span>
          </div>
          <input type="range" id="precio-slider" min="100" max="600" value="280" step="5"
            oninput="Rindes.updateSlider(this); Rindes.calcular()">
        </div>
      </div>

      <!-- CARD: COSTOS -->
      <div class="card">
        <div class="card-title">💸 Estructura de Costos</div>
        <div class="input-grid">
          <div class="input-group">
            <label>Semilla</label>
            <div class="input-unit">
              <input type="number" id="c-semilla" value="45" oninput="Rindes.calcular()">
              <span class="unit-badge">USD/HA</span>
            </div>
          </div>
          <div class="input-group">
            <label>Agroquímicos</label>
            <div class="input-unit">
              <input type="number" id="c-agro" value="80" oninput="Rindes.calcular()">
              <span class="unit-badge">USD/HA</span>
            </div>
          </div>
          <div class="input-group">
            <label>Labores / Siembra</label>
            <div class="input-unit">
              <input type="number" id="c-labores" value="60" oninput="Rindes.calcular()">
              <span class="unit-badge">USD/HA</span>
            </div>
          </div>
          <div class="input-group">
            <label>Cosecha</label>
            <div class="input-unit">
              <input type="number" id="c-cosecha" value="35" oninput="Rindes.calcular()">
              <span class="unit-badge">USD/HA</span>
            </div>
          </div>
          <div class="input-group">
            <label>Flete</label>
            <div class="input-unit">
              <input type="number" id="c-flete" value="20" oninput="Rindes.calcular()">
              <span class="unit-badge">USD/HA</span>
            </div>
          </div>
          <div class="input-group">
            <label>Arrendamiento</label>
            <div class="input-unit">
              <input type="number" id="c-arriendo" value="120" oninput="Rindes.calcular()">
              <span class="unit-badge">USD/HA</span>
            </div>
          </div>
        </div>
      </div>

      <!-- CARD: RESULTADO -->
      <div class="card resultado-card">
        <div class="card-title" style="color:var(--verde-mint);">📊 Resultado de Campaña</div>
        <div class="resultado-grid">
          <div class="resultado-item">
            <div class="resultado-label">Ingreso bruto</div>
            <div class="resultado-value" id="r-ingreso">—</div>
            <div class="resultado-sub" id="r-ingreso-ha">— / ha</div>
          </div>
          <div class="resultado-item">
            <div class="resultado-label">Costo total</div>
            <div class="resultado-value" id="r-costo">—</div>
            <div class="resultado-sub" id="r-costo-ha">— / ha</div>
          </div>
          <div class="resultado-item">
            <div class="resultado-label">Margen neto</div>
            <div class="resultado-value highlight" id="r-margen">—</div>
            <div class="resultado-sub" id="r-margen-ha">— / ha</div>
          </div>
          <div class="resultado-item">
            <div class="resultado-label">Punto de equilibrio</div>
            <div class="resultado-value" id="r-pe">—</div>
            <div class="resultado-sub">qq/ha para cubrir costos</div>
          </div>
        </div>
        <div class="semaforo">
          <div class="semaforo-dot verde" id="semaforo-dot"></div>
          <span class="semaforo-text" id="semaforo-text">Calculando...</span>
        </div>
      </div>

      <!-- CARD: ESCENARIOS -->
      <div class="card">
        <div class="card-title">🔭 Escenarios de Precio</div>
        <div class="escenarios-grid">
          <div class="escenario-item pesimista">
            <div class="escenario-label">Pesimista</div>
            <div class="escenario-precio" id="e-precio-p">—</div>
            <div class="escenario-margen" id="e-margen-p">—</div>
            <div class="escenario-ha"     id="e-ha-p">— /ha</div>
          </div>
          <div class="escenario-item base">
            <div class="escenario-label">Base ✓</div>
            <div class="escenario-precio" id="e-precio-b">—</div>
            <div class="escenario-margen" id="e-margen-b">—</div>
            <div class="escenario-ha"     id="e-ha-b">— /ha</div>
          </div>
          <div class="escenario-item optimista">
            <div class="escenario-label">Optimista</div>
            <div class="escenario-precio" id="e-precio-o">—</div>
            <div class="escenario-margen" id="e-margen-o">—</div>
            <div class="escenario-ha"     id="e-ha-o">— /ha</div>
          </div>
        </div>
        <button class="export-btn" onclick="Rindes.exportarExcel()">
          ⬇️ Exportar a Excel
        </button>
      </div>

      <!-- CARD: HISTÓRICO -->
      <div class="card">
        <div class="card-title">📅 Histórico Últimas Campañas</div>
        <table class="historico-table">
          <thead>
            <tr>
              <th>Campaña</th>
              <th>Rinde prom.</th>
              <th>Precio</th>
              <th>Margen/ha</th>
            </tr>
          </thead>
          <tbody id="historico-body"></tbody>
        </table>
      </div>
    `;
  }

  // ── INIT ─────────────────────────────────
  function init() {
    render();
    // Tabs de cultivo
    const tabsEl = document.getElementById('cultivo-tabs');
    if (tabsEl) {
      tabsEl.innerHTML = Object.entries(CULTIVOS).map(([key, d]) => `
        <button class="cultivo-tab ${key === 'soja' ? 'active' : ''}"
          onclick="Rindes.setCultivo('${key}', this)">
          ${d.emoji} ${d.label}
        </button>`).join('');
    }
    updateSlider(document.getElementById('precio-slider'));
    renderHistorico();
    calcular();
  }

  // ── API PÚBLICA ──────────────────────────
  return { init, calcular, updateSlider, setCultivo: (c, btn) => {
    document.querySelectorAll('.cultivo-tab').forEach(t => t.classList.remove('active'));
    if (btn) btn.classList.add('active');
    setCultivo(c);
  }, exportarExcel, CULTIVOS, HISTORICOS };

})();

// Exponer globalmente
window.Rindes = Rindes;
