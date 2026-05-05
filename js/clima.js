/* ─────────────────────────────────────────
   AGROCALC — js/clima.js
   Módulo: Datos climáticos y NDVI reales
   
   APIs:
   - Open-Meteo (gratis, sin key)
   - NASA MODIS NDVI (token NASA Earthdata)
   
   NO conoce otros módulos.
   Expone: window.Clima
───────────────────────────────────────── */

const Clima = (() => {

  // ── CONFIG ───────────────────────────────
  // IMPORTANTE: Regenerar token en NASA Earthdata después de testear
  const NASA_TOKEN = 'eyJ0eXAiOiJKV1QiLCJvcmlnaW4iOiJFYXJ0aGRhdGEgTG9naW4iLCJzaWciOiJlZGxqd3RwdWJrZXlfb3BzIiwiYWxnIjoiUlMyNTYifQ.eyJ0eXBlIjoiVXNlciIsInVpZCI6InNhbnRpZ29uemFsZXoiLCJleHAiOjE3ODMxODY0NzEsImlhdCI6MTc3ODAwMjQ3MSwiaXNzIjoiaHR0cHM6Ly91cnMuZWFydGhkYXRhLm5hc2EuZ292IiwiaWRlbnRpdHlfcHJvdmlkZXIiOiJlZGxfb3BzIiwiYWNyIjoiZWRsIiwiYXNzdXJhbmNlX2xldmVsIjozfQ.ZETXrCy-ANsxYDl4krkzDvY7Ae_fC7nOfbu1msv5ZjykE296q13B2BWHn5B9bIzpbUMeySH41kmPxlr7YIY0r3HuY3aBZSdsSTPEI41ywL0oH5r6iodxdHqmtnkkiIyWH7QKE6gv9swtymRMzp_A2AL2WBXgl7FLYGFdSdDnkQBn9ivt4yYCY0gZ0s1Cf0-nLb14phSQfgt2A6psD1mOYinxlPfTVgWLHM5MwHJ2MK4C4Xc5nAQkZaHAOlZ54HfUVr4SMO4YwKAZKs564hOjeKlJ-UwQknWV4Y-tbp1mddwafqpvs0adYXp6O2KBRLT_xZN6xA3GSVEXZ8Ps1FthtQ';

  // ── OPEN-METEO ───────────────────────────
  async function fetchClima(lat, lng) {
    const url = `https://api.open-meteo.com/v1/forecast?` +
      `latitude=${lat}&longitude=${lng}` +
      `&daily=precipitation_sum,temperature_2m_max,temperature_2m_min,et0_fao_evapotranspiration` +
      `&hourly=soil_moisture_0_to_1cm` +
      `&past_days=30` +
      `&forecast_days=7` +
      `&timezone=America%2FArgentina%2FBuenos_Aires`;

    const res  = await fetch(url);
    const data = await res.json();
    return procesarClima(data);
  }

  function procesarClima(data) {
    const daily = data.daily;
    const n     = daily.time.length;

    // Lluvia acumulada últimos 30 días
    const lluviaTotal30 = daily.precipitation_sum
      .slice(0, 30)
      .reduce((a, b) => a + (b || 0), 0);

    // Lluvia últimos 7 días
    const lluviaTotal7 = daily.precipitation_sum
      .slice(0, 7)
      .reduce((a, b) => a + (b || 0), 0);

    // Temperatura promedio
    const tempMaxProm = promedio(daily.temperature_2m_max.slice(0, 30));
    const tempMinProm = promedio(daily.temperature_2m_min.slice(0, 30));

    // Evapotranspiración acumulada
    const etoProm = promedio(daily.et0_fao_evapotranspiration.slice(0, 30));

    // Balance hídrico (lluvia - ETo)
    const balanceHidrico = lluviaTotal30 - (etoProm * 30);

    // Lluvia por semana para el gráfico (últimas 4 semanas)
    const lluviaSemanal = [];
    for (let i = 0; i < 4; i++) {
      const slice = daily.precipitation_sum.slice(i * 7, (i + 1) * 7);
      lluviaSemanal.push(slice.reduce((a, b) => a + (b || 0), 0));
    }

    // Próximos 7 días de lluvia
    const lluviaProxima = daily.precipitation_sum.slice(30, 37)
      .reduce((a, b) => a + (b || 0), 0);

    return {
      lluviaTotal30: lluviaTotal30.toFixed(1),
      lluviaTotal7:  lluviaTotal7.toFixed(1),
      lluviaProxima: lluviaProxima.toFixed(1),
      lluviaSemanal,
      tempMaxProm:   tempMaxProm.toFixed(1),
      tempMinProm:   tempMinProm.toFixed(1),
      etoProm:       etoProm.toFixed(1),
      balanceHidrico: balanceHidrico.toFixed(1),
    };
  }

  // ── NASA MODIS NDVI ──────────────────────
  async function fetchNDVI(lat, lng) {
    // NASA AppEEARS - MODIS MOD13Q1 NDVI 250m
    // Usamos el endpoint de point query de NASA MODIS
    const hoy   = new Date();
    const desde = new Date(hoy); desde.setMonth(hoy.getMonth() - 3);
    const fechaDesde = desde.toISOString().split('T')[0];
    const fechaHoy   = hoy.toISOString().split('T')[0];

    // NASA MODIS via ORNL DAAC - endpoint público
    const url = `https://modis.ornl.gov/rst/api/v1/MOD13Q1/dates?` +
      `latitude=${lat}&longitude=${lng}`;

    try {
      const res  = await fetch(url, {
        headers: { 'Authorization': `Bearer ${NASA_TOKEN}` }
      });

      if (!res.ok) throw new Error('NDVI no disponible');

      const data  = await res.json();
      const dates = data.dates?.slice(-3) || [];

      if (dates.length === 0) return ndviFallback();

      // Obtener NDVI del último período disponible
      const lastDate = dates[dates.length - 1].modis_date;
      const ndviUrl  = `https://modis.ornl.gov/rst/api/v1/MOD13Q1/subset?` +
        `latitude=${lat}&longitude=${lng}&startDate=${lastDate}&endDate=${lastDate}&kmAboveBelow=0&kmLeftRight=0`;

      const ndviRes  = await fetch(ndviUrl, {
        headers: { 'Authorization': `Bearer ${NASA_TOKEN}` }
      });
      const ndviData = await ndviRes.json();

      const rawNDVI  = ndviData.subset?.[0]?.data?.[0];
      if (!rawNDVI || rawNDVI < -2000) return ndviFallback();

      // MODIS NDVI viene escalado x10000
      const ndvi = rawNDVI / 10000;
      return interpretarNDVI(ndvi, lastDate);

    } catch (e) {
      console.warn('NASA NDVI error, usando estimación:', e);
      return ndviFallback();
    }
  }

  function interpretarNDVI(valor, fecha) {
    let estado, color, descripcion;

    if (valor >= 0.6) {
      estado = 'Excelente'; color = '#2d7d3a';
      descripcion = 'Cobertura vegetal muy densa. Cultivo en óptimas condiciones.';
    } else if (valor >= 0.4) {
      estado = 'Bueno'; color = '#4caf50';
      descripcion = 'Buena cobertura vegetal. Desarrollo normal del cultivo.';
    } else if (valor >= 0.2) {
      estado = 'Moderado'; color = '#f9a825';
      descripcion = 'Cobertura moderada. Puede indicar estrés hídrico o suelo desnudo.';
    } else if (valor >= 0) {
      estado = 'Bajo'; color = '#c62828';
      descripcion = 'Cobertura vegetal escasa. Suelo desnudo o cultivo con estrés severo.';
    } else {
      estado = 'Sin datos'; color = '#90a090';
      descripcion = 'Sin cobertura vegetal (agua, nube, o sin dato).';
    }

    return { valor: valor.toFixed(3), estado, color, descripcion, fecha, fuente: 'NASA MODIS MOD13Q1' };
  }

  function ndviFallback() {
    return {
      valor: 'N/D', estado: 'Sin dato', color: '#90a090',
      descripcion: 'NDVI no disponible para esta ubicación en este período.',
      fecha: '—', fuente: 'NASA MODIS (sin cobertura)'
    };
  }

  // ── HELPERS ──────────────────────────────
  function promedio(arr) {
    const validos = arr.filter(v => v !== null && v !== undefined);
    return validos.length ? validos.reduce((a, b) => a + b, 0) / validos.length : 0;
  }

  // ── API PÚBLICA ──────────────────────────
  return { fetchClima, fetchNDVI };

})();

window.Clima = Clima;
