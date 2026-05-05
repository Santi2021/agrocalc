#!/usr/bin/env python3
# ─────────────────────────────────────────
# AGROCALC — scripts/fetch_precios.py
# Corre en GitHub Actions cada 30 minutos
# Genera data/precios.json
# ─────────────────────────────────────────

import json
import os
from datetime import datetime, timezone
import pandas as pd
import yfinance as yf

# ── CONFIG ───────────────────────────────
TICKERS = {
    'ZS=F': {'cultivo': 'soja',  'factor': 36.74},  # Soja CBOT cents/bushel → USD/t
    'ZC=F': {'cultivo': 'maiz',  'factor': 39.37},  # Maíz CBOT
    'ZW=F': {'cultivo': 'trigo', 'factor': 36.74},  # Trigo CBOT
    'ARS=X': {'cultivo': 'tc',   'factor': 1},       # USD/ARS
}

# ── HELPERS (tu función) ─────────────────
def _get_closes(raw: pd.DataFrame, sym: str, n_tickers: int) -> pd.Series:
    if n_tickers == 1:
        if isinstance(raw.columns, pd.MultiIndex):
            return raw["Close"].iloc[:, 0]
        return raw["Close"]
    if isinstance(raw.columns, pd.MultiIndex):
        level0 = raw.columns.get_level_values(0).tolist()
        if "Close" in level0:
            return raw["Close"][sym]
        else:
            return raw[sym]["Close"]
    else:
        return raw[sym]

# ── FALLBACKS ────────────────────────────
FALLBACK = {
    'soja':    280,
    'maiz':    165,
    'trigo':   210,
    'girasol': 340,
    'tc':      1500,
}

def fetch_precios():
    resultado = {**FALLBACK}
    simbolos  = list(TICKERS.keys())
    n         = len(simbolos)

    try:
        raw = yf.download(simbolos, period='2d', interval='1d', progress=False)

        for sym, config in TICKERS.items():
            try:
                serie  = _get_closes(raw, sym, n)
                ultimo = serie.dropna().iloc[-1]

                if config['cultivo'] == 'tc':
                    resultado['tc'] = round(float(ultimo))
                else:
                    # Granos: Yahoo da en cents/bushel → ÷100 → ×factor = USD/t
                    usd_ton = float(ultimo) / 100 * config['factor']
                    resultado[config['cultivo']] = round(usd_ton)

                print(f"✅ {sym}: {ultimo} → {config['cultivo']}: {resultado[config['cultivo']]}")

            except Exception as e:
                print(f"⚠️  {sym} falló: {e} — usando fallback")

    except Exception as e:
        print(f"❌ Download falló: {e} — usando fallbacks")

    # Girasol: no hay futuro líquido en CBOT, referencia BCR manual
    resultado['girasol'] = FALLBACK['girasol']

    return resultado

# ── MAIN ─────────────────────────────────
if __name__ == '__main__':
    print("🌾 Fetching precios...")
    precios = fetch_precios()

    output = {
        'precios': {
            'soja':    precios['soja'],
            'maiz':    precios['maiz'],
            'trigo':   precios['trigo'],
            'girasol': precios['girasol'],
        },
        'tc': {
            'oficial': precios['tc'],
        },
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'fuente':    'Yahoo Finance via yfinance (GitHub Actions)',
    }

    # Crear carpeta data/ si no existe
    os.makedirs('data', exist_ok=True)

    with open('data/precios.json', 'w') as f:
        json.dump(output, f, indent=2)

    print(f"\n✅ data/precios.json generado:")
    print(json.dumps(output, indent=2))
