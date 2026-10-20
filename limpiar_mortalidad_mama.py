"""
Mortalidad por cáncer de mama (CIE-10 C50) en mujeres - América Latina
=====================================================================

Calcula, por país y año:
  - muertes registradas por cáncer de mama (mujeres)
  - tasa bruta por 100.000 mujeres
  - tasa ajustada por edad por 100.000 mujeres (estandarización directa,
    población estándar mundial OMS 2000-2025, Ahmad et al. 2001)

Fuentes
-------
  * Defunciones: WHO Mortality Database, archivos crudos Morticd10_part2..part6
    https://www.who.int/data/data-collection-tools/who-mortality-database
  * Códigos de país: country_codes (misma página)
  * Población femenina por edad: Naciones Unidas, World Population Prospects 2024,
    archivo oficial WPP2024_POP_F01_3_POPULATION_SINGLE_AGE_FEMALE.xlsx
    (https://population.un.org/wpp/ > Download Files > Standard Projections > Population >
    Population by Single Age - Female). Hojas "Estimates" (2005-2023) y "Medium variant" (2024).
    Se resume en poblacion_wpp2024_latam.csv con la opción --generar-poblacion.
    Se usa WPP porque el archivo "pop" de la OMS no tiene población de casi ningún
    país latinoamericano después de 2005. El portal de la OMS también usa WPP.
  * Población estándar: OMS, World Standard Population 2000-2025 (Ahmad et al., 2001, Tabla 4)

Uso
---
  python limpiar_mortalidad_mama.py \
      --mortalidad Morticd10_part2 Morticd10_part3 Morticd10_part4 Morticd10_part5 Morticd10_part6 \
      --paises country_codes \
      --poblacion poblacion_wpp2024_latam.csv \
      --salida mortalidad_mama_latam.json

  Generar primero el CSV de población desde el Excel oficial de la ONU
  (requiere `pip install openpyxl`; tarda unos minutos porque el Excel pesa ~200 MB):
  python limpiar_mortalidad_mama.py --generar-poblacion WPP2024_POP_F01_3_POPULATION_SINGLE_AGE_FEMALE.xlsx
"""

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd

# ---------------------------------------------------------------------------
# Parámetros
# ---------------------------------------------------------------------------
ANIO_DESDE, ANIO_HASTA = 2005, 2024
SEXO_FEMENINO = 2

# Código OMS -> (nombre en español, código numérico ISO usado por WPP)
PAISES_LATAM = {
    2020: ("Argentina", 32),
    2060: ("Bolivia", 68),
    2070: ("Brasil", 76),
    2120: ("Chile", 152),
    2130: ("Colombia", 170),
    2140: ("Costa Rica", 188),
    2150: ("Cuba", 192),
    2170: ("República Dominicana", 214),
    2180: ("Ecuador", 218),
    2190: ("El Salvador", 222),
    2250: ("Guatemala", 320),
    2270: ("Haití", 332),
    2280: ("Honduras", 340),
    2310: ("México", 484),
    2340: ("Nicaragua", 558),
    2350: ("Panamá", 591),
    2360: ("Paraguay", 600),
    2370: ("Perú", 604),
    2380: ("Puerto Rico", 630),
    2460: ("Uruguay", 858),
    2470: ("Venezuela", 862),
}

# Grupos de edad finales (el último abierto: 85+)
GRUPOS = ["0-4", "5-9", "10-14", "15-19", "20-24", "25-29", "30-34", "35-39",
          "40-44", "45-49", "50-54", "55-59", "60-64", "65-69", "70-74",
          "75-79", "80-84", "85+"]

# Población estándar mundial OMS (por 100.000). 85+ = 85-89 + 90-94 + 95-99 + 100+
POB_ESTANDAR_OMS = dict(zip(GRUPOS, [
    8860, 8690, 8600, 8470, 8220, 7930, 7610, 7150, 6590, 6040,
    5370, 4550, 3720, 2960, 2210, 1520, 910, 440 + 150 + 40 + 5,
]))

# Columnas Deaths2..Deaths25 del archivo OMS -> grupo de edad final.
# Formatos 00, 01 y 02 (Anexo 1 de la documentación): cuando un formato junta
# edades, el dato queda en la primera columna del grupo y el resto vacío,
# así que sumar las columnas de cada grupo funciona para los tres.
COLUMNAS_A_GRUPO = {
    **{f"Deaths{i}": "0-4" for i in range(2, 7)},        # 0, 1, 2, 3, 4
    **{f"Deaths{i + 7}": GRUPOS[i + 1] for i in range(16)},  # 5-9 ... 80-84
    **{f"Deaths{i}": "85+" for i in range(23, 26)},      # 85-89, 90-94, 95+
}
FORMATOS_VALIDOS = {"00", "01", "02"}

# Países con datos que no conviene usar para comparar
ADVERTENCIAS = {
    2280: "Registro muy incompleto (unas 15-20 muertes por año en todo el país); no usar para comparar",
}

COLS_TEXTO = {c: str for c in ["Admin1", "SubDiv", "List", "Cause", "Frmat", "IM_Frmat"]}


# ---------------------------------------------------------------------------
# 1. Defunciones
# ---------------------------------------------------------------------------
def leer_defunciones(archivos):
    partes = []
    for archivo in archivos:
        df = pd.read_csv(archivo, dtype=COLS_TEXTO, low_memory=False)
        df = df[df["Country"].isin(PAISES_LATAM)]
        partes.append(df)
    df = pd.concat(partes, ignore_index=True)

    # Solo datos del país completo (Admin1 y SubDiv vacíos)
    df = df[df["Admin1"].isna() & df["SubDiv"].isna()]

    # Mujeres, período de interés
    df = df[(df["Sex"] == SEXO_FEMENINO) & df["Year"].between(ANIO_DESDE, ANIO_HASTA)]

    # Cáncer de mama según la lista CIE usada:
    #   103 -> "C50" | 104 y 10M -> "C50" y/o "C500".."C509" (mutuamente excluyentes)
    #   101 (lista condensada) -> código "1036"
    es_c50 = df["List"].isin(["103", "104", "10M"]) & df["Cause"].str.match(r"^C50\d?$")
    es_1036 = (df["List"] == "101") & (df["Cause"] == "1036")
    df = df[es_c50 | es_1036].copy()

    formatos_raros = set(df["Frmat"].unique()) - FORMATOS_VALIDOS
    if formatos_raros:
        raise ValueError(f"Formatos de edad no contemplados: {formatos_raros}")

    cols_muertes = ["Deaths1"] + list(COLUMNAS_A_GRUPO) + ["Deaths26"]
    df[cols_muertes] = df[cols_muertes].fillna(0)

    # Sumar subcódigos C500..C509 -> una fila por país y año
    df = df.groupby(["Country", "Year"], as_index=False)[cols_muertes].sum()

    # Control: Deaths1 = suma de edades + edad desconocida
    suma = df[list(COLUMNAS_A_GRUPO) + ["Deaths26"]].sum(axis=1)
    if not np.allclose(suma, df["Deaths1"]):
        raise ValueError("Deaths1 no coincide con la suma por edades")

    # Pasar a formato largo con los grupos de edad finales
    largo = df.melt(id_vars=["Country", "Year", "Deaths1", "Deaths26"],
                    value_vars=list(COLUMNAS_A_GRUPO),
                    var_name="col", value_name="muertes")
    largo["grupo"] = largo["col"].map(COLUMNAS_A_GRUPO)
    largo = largo.groupby(["Country", "Year", "Deaths1", "Deaths26", "grupo"],
                          as_index=False)["muertes"].sum()

    # Repartir las muertes de edad desconocida en proporción a las conocidas
    conocidas = largo.groupby(["Country", "Year"])["muertes"].transform("sum")
    largo["muertes"] = np.where(
        conocidas > 0,
        largo["muertes"] + largo["Deaths26"] * largo["muertes"] / conocidas.replace(0, np.nan),
        largo["muertes"],
    )
    return largo.rename(columns={"Deaths1": "muertes_total", "Deaths26": "edad_desconocida"})


# ---------------------------------------------------------------------------
# 2. Población (WPP 2024)
# ---------------------------------------------------------------------------
def generar_poblacion(archivo_onu, salida="poblacion_wpp2024_latam.csv"):
    """Arma el CSV de población femenina por grupo quinquenal desde el archivo oficial de la ONU:
    WPP2024_POP_F01_3_POPULATION_SINGLE_AGE_FEMALE.xlsx (File POP/01-3, miles de personas al 1 de julio).
    Hoja "Estimates" = 1950-2023; hoja "Medium variant" = 2024-2100 (se usa solo 2024)."""
    edades = list(range(100)) + ["100+"]
    partes = []
    for hoja in ["Estimates", "Medium variant"]:
        df = pd.read_excel(archivo_onu, sheet_name=hoja, header=16)   # fila 17 = encabezados
        df.columns = [str(c) for c in df.columns]
        df = df[["Location code", "Year"] + [str(e) for e in edades]]
        partes.append(df)
    pob = pd.concat(partes, ignore_index=True)

    # Location code de la ONU = código numérico ISO del país
    iso_a_oms = {iso: oms for oms, (_, iso) in PAISES_LATAM.items()}
    pob = pob[pob["Location code"].isin(iso_a_oms) & pob["Year"].between(ANIO_DESDE, ANIO_HASTA)]

    pob = pob.melt(id_vars=["Location code", "Year"], var_name="edad", value_name="poblacion")
    pob["Country"] = pob["Location code"].map(iso_a_oms)
    pob["edad"] = pob["edad"].map(lambda e: 100 if e == "100+" else int(e))
    pob["grupo"] = pob["edad"].map(lambda a: "85+" if a >= 85 else GRUPOS[a // 5])
    pob["poblacion"] = pd.to_numeric(pob["poblacion"])
    pob = pob.groupby(["Country", "Year", "grupo"], as_index=False)["poblacion"].sum()
    pob["poblacion"] = (pob["poblacion"] * 1000).round()   # la ONU publica en miles
    pob["Year"] = pob["Year"].astype(int)
    pob.to_csv(salida, index=False)
    print(f"Población guardada en {salida} ({len(pob)} filas)")


def leer_poblacion(archivo):
    return pd.read_csv(archivo)


# ---------------------------------------------------------------------------
# 3. Tasas
# ---------------------------------------------------------------------------
def calcular_tasas(muertes, poblacion):
    df = muertes.merge(poblacion, on=["Country", "Year", "grupo"], how="left")
    sin_pob = df[df["poblacion"].isna()][["Country", "Year"]].drop_duplicates()
    if len(sin_pob):
        print("Aviso: país-años sin población, se descartan:\n", sin_pob)
        df = df.dropna(subset=["poblacion"])

    df["peso"] = df["grupo"].map(POB_ESTANDAR_OMS)
    df["tasa_especifica"] = df["muertes"] / df["poblacion"]

    def resumir(g):
        return pd.Series({
            "muertes": int(round(g["muertes_total"].iloc[0])),
            "muertes_edad_desconocida": int(round(g["edad_desconocida"].iloc[0])),
            "poblacion_femenina": int(g["poblacion"].sum()),
            "tasa_bruta": g["muertes_total"].iloc[0] / g["poblacion"].sum() * 1e5,
            "tasa_ajustada": (g["tasa_especifica"] * g["peso"]).sum() / g["peso"].sum() * 1e5,
        })

    return df.groupby(["Country", "Year"]).apply(resumir, include_groups=False).reset_index()


# ---------------------------------------------------------------------------
# 4. JSON
# ---------------------------------------------------------------------------
def exportar_json(tasas, codigos_paises, salida):
    nombres_oms = dict(zip(codigos_paises["country"], codigos_paises["name"]))
    paises = {}
    for codigo, g in tasas.sort_values(["Country", "Year"]).groupby("Country"):
        nombre = PAISES_LATAM[codigo][0]
        paises[nombre] = {
            "codigo_oms": int(codigo),
            "nombre_oms": nombres_oms.get(codigo),
            "anios_disponibles": [int(a) for a in g["Year"]],
            "advertencia": ADVERTENCIAS.get(codigo),
            "serie": [
                {
                    "anio": int(r.Year),
                    "muertes": int(r.muertes),
                    "muertes_edad_desconocida": int(r.muertes_edad_desconocida),
                    "poblacion_femenina": int(r.poblacion_femenina),
                    "tasa_bruta": round(float(r.tasa_bruta), 2),
                    "tasa_ajustada": round(float(r.tasa_ajustada), 2),
                }
                for r in g.itertuples()
            ],
        }

    sin_datos = sorted(n for c, (n, _) in PAISES_LATAM.items() if c not in tasas["Country"].values)
    resultado = {
        "metadatos": {
            "indicador": "Mortalidad por cáncer de mama (CIE-10 C50), mujeres",
            "unidad_tasas": "muertes por 100.000 mujeres",
            "tasa_ajustada": "Estandarización directa, población estándar mundial OMS (Ahmad et al., 2001), 18 grupos de edad (0-4 ... 85+)",
            "edad_desconocida": "Las muertes sin edad se reparten proporcionalmente entre los grupos para la tasa ajustada; la tasa bruta usa el total",
            "periodo": f"{ANIO_DESDE}-{ANIO_HASTA}",
            "fuente_defunciones": "WHO Mortality Database (actualización 23/02/2026)",
            "fuente_poblacion": "UN World Population Prospects 2024, File POP/01-3: Female population by single age (población al 1 de julio; 2005-2023 = Estimates, 2024 = Medium variant)",
            "paises_sin_datos_en_el_periodo": sin_datos,
            "aviso": "Defunciones registradas: la cobertura y calidad del registro varía entre países. Análisis propio; la OMS solo provee los datos originales.",
        },
        "paises": paises,
    }
    with open(salida, "w", encoding="utf-8") as f:
        json.dump(resultado, f, ensure_ascii=False, indent=2)
    print(f"JSON guardado en {salida} ({len(paises)} países)")


# ---------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--mortalidad", nargs="+", help="Archivos Morticd10_partN")
    ap.add_argument("--paises", default="country_codes")
    ap.add_argument("--poblacion", default="poblacion_wpp2024_latam.csv")
    ap.add_argument("--salida", default="mortalidad_mama_latam.json")
    ap.add_argument("--generar-poblacion", metavar="EXCEL_ONU",
                    help="Genera el CSV de población desde WPP2024_POP_F01_3_POPULATION_SINGLE_AGE_FEMALE.xlsx y termina")
    args = ap.parse_args()

    if args.generar_poblacion:
        generar_poblacion(args.generar_poblacion, args.poblacion)
        return
    if not args.mortalidad:
        ap.error("Falta --mortalidad")

    muertes = leer_defunciones(args.mortalidad)
    poblacion = leer_poblacion(args.poblacion)
    tasas = calcular_tasas(muertes, poblacion)
    codigos = pd.read_csv(args.paises)
    exportar_json(tasas, codigos, args.salida)

if __name__ == "__main__":
    main()