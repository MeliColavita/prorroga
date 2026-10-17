# ============================================================
# GEOCODIFICAR_MAMOGRAFOS.PY — agrega lat/lon a buscador-datos.js (Meli, prefijo me-)
# ============================================================
# Convierte la dirección de cada mamógrafo en coordenadas. Se corre UNA vez (o cuando
# cambian los datos): la página no consulta ninguna API, lee las coordenadas del archivo.
#
#   py geocodificar_mamografos.py
#
# Usa dos servicios gratuitos, en este orden:
#   1. Georef (Gobierno argentino, apis.datos.gob.ar/georef): rápido, pero muchas
#      calles del interior no tienen alturas cargadas.
#   2. Nominatim (OpenStreetMap): completa lo que Georef no encontró. Pide 1 consulta
#      por segundo, así que esta parte tarda unos 15 minutos la primera vez.
# Toda dirección se acepta solo si cae a menos de MAX_KM del centro de su localidad
# (para no confundir calles con el mismo nombre en otra ciudad). Si ninguno la
# encuentra, se usa el centro de la localidad y se marca con "aprox": 1.
#
# Guarda lo consultado en geocache_mamografos.json: si se corta o se vuelve a correr,
# no repite consultas. Lo que quedó aproximado se lista en geocodificar_revisar.csv.
# Solo usa la librería estándar de Python (no hace falta instalar nada).
# ============================================================
import csv
import json
import math
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

GEOREF = os.environ.get('GEOREF_API', 'https://apis.datos.gob.ar/georef/api/v2.0')
NOMINATIM = os.environ.get('NOMINATIM_API', 'https://nominatim.openstreetmap.org/search')
AGENTE = 'contar-con-datos-mamografos/1.0 (proyecto educativo, geocodificacion unica)'
DATOS = 'buscador-datos.js'
CACHE = 'geocache_mamografos.json'
REVISAR = 'geocodificar_revisar.csv'
LOTE = 50  # consultas por pedido a Georef
PAUSA_GEOREF = 1.5  # segundos entre pedidos a Georef (si se le pide muy seguido, corta)
PAUSA_NOMINATIM = 1.1  # Nominatim pide como máximo 1 consulta por segundo
MAX_KM = 25  # distancia máxima aceptada al centro de la localidad

# Provincias de la base -> id de Georef/INDEC y nombre para Nominatim
PROVINCIAS = {
    'CABA': ('02', 'Ciudad Autónoma de Buenos Aires'), 'Buenos Aires': ('06', 'Buenos Aires'),
    'Catamarca': ('10', 'Catamarca'), 'Córdoba': ('14', 'Córdoba'),
    'Corrientes': ('18', 'Corrientes'), 'Chaco': ('22', 'Chaco'), 'Chubut': ('26', 'Chubut'),
    'Entre Ríos': ('30', 'Entre Ríos'), 'Formosa': ('34', 'Formosa'), 'Jujuy': ('38', 'Jujuy'),
    'La Pampa': ('42', 'La Pampa'), 'La Rioja': ('46', 'La Rioja'), 'Mendoza': ('50', 'Mendoza'),
    'Misiones': ('54', 'Misiones'), 'Neuquén': ('58', 'Neuquén'), 'Río Negro': ('62', 'Río Negro'),
    'Salta': ('66', 'Salta'), 'San Juan': ('70', 'San Juan'), 'San Luis': ('74', 'San Luis'),
    'Santa Cruz': ('78', 'Santa Cruz'), 'Santa Fe': ('82', 'Santa Fe'),
    'Santiago del Estero': ('86', 'Santiago del Estero'), 'Tucumán': ('90', 'Tucumán'),
    'Tierra del Fuego': ('94', 'Tierra del Fuego'),
}
CENTRO_CABA = (-34.6144, -58.4459)

# Localidades que en la base están escritas distinto (o son barrios / provincia mal cargada):
# (localidad, provincia en la base) -> (nombre para buscar, provincia real)
CORRECCIONES = {
    ('Alberdi', 'Córdoba'): ('Córdoba', 'Córdoba'),
    ('Alta Cordoba', 'Córdoba'): ('Córdoba', 'Córdoba'),
    ('Guemes', 'Córdoba'): ('Córdoba', 'Córdoba'),
    ('Nueva Córdoba', 'Córdoba'): ('Córdoba', 'Córdoba'),
    ('Córdoba Capital', 'Córdoba'): ('Córdoba', 'Córdoba'),
    ('C. Rosales', 'Buenos Aires'): ('Punta Alta', 'Buenos Aires'),
    ('Caseros Tres de Febrero', 'Buenos Aires'): ('Caseros', 'Buenos Aires'),
    ('Cipolletti', 'Neuquén'): ('Cipolletti', 'Río Negro'),
    ('General Roca', 'Neuquén'): ('General Roca', 'Río Negro'),
    ('Ciudad de Mendoza', 'Mendoza'): ('Mendoza', 'Mendoza'),
    ('Colonia Catriel', 'Río Negro'): ('Catriel', 'Río Negro'),
    ('Colonia Cerrito', 'Entre Ríos'): ('Cerrito', 'Entre Ríos'),
    ('Juan B. Alberdi', 'Tucumán'): ('Juan Bautista Alberdi', 'Tucumán'),
    ('Leandro N.alem', 'Misiones'): ('Leandro N. Alem', 'Misiones'),
    ('Neuquén Capital', 'Neuquén'): ('Neuquén', 'Neuquén'),
    ('San Juan Capital', 'San Juan'): ('San Juan', 'San Juan'),
    ('Santa Fe Capital', 'Santa Fe'): ('Santa Fe', 'Santa Fe'),
    ('Pcia.roque Sáenz Peña', 'Chaco'): ('Presidencia Roque Sáenz Peña', 'Chaco'),
    ('Pueblo de Esquina', 'Corrientes'): ('Esquina', 'Corrientes'),
    ('Bella Vista Corrientes', 'Corrientes'): ('Bella Vista', 'Corrientes'),
    ('Maipu BS AS', 'Buenos Aires'): ('Maipú', 'Buenos Aires'),
    ('Villa Ciudadela', 'Buenos Aires'): ('Ciudadela', 'Buenos Aires'),
    ('Villa Santos Lugares', 'Buenos Aires'): ('Santos Lugares', 'Buenos Aires'),
    ('Villa Estacion Ramallo', 'Buenos Aires'): ('Villa Ramallo', 'Buenos Aires'),
    ('Villa Libertador San Martín / Diamante', 'Entre Ríos'): ('Libertador San Martín', 'Entre Ríos'),
    ('Perico del Carmen', 'Jujuy'): ('Perico', 'Jujuy'),
    ('Comandante Luis Piedra Buena', 'Santa Cruz'): ('Comandante Luis Piedrabuena', 'Santa Cruz'),
}


# ---------- Limpieza de textos ----------
def limpiar_direccion(d):
    """'Av. 51 N° 1725, Barrio X' -> 'Av. 51 1725'. Deja lo que los servicios entienden mejor."""
    d = (d or '').split(',')[0]  # lo que va después de la coma (barrio, esquina...) confunde
    d = re.sub(r'\b(N°|Nº|N\.º|Nro\.?|Num\.?)\s*', '', d, flags=re.I)
    d = re.sub(r'\bN\s+(?=\d)', '', d)  # "Calle 28 N 544" -> "Calle 28 544"
    d = re.sub(r'\s+esquina$', '', d, flags=re.I)
    d = re.sub(r'(\d+)\s*[/-]\s*\d+', r'\1', d)  # "1742/4" o "306-348" -> primer número
    d = re.sub(r'(\d+)\s+\d+\s*°.*$', r'\1', d)  # "Amenábar 1945 1°" -> "Amenábar 1945"
    d = re.sub(r'\bs/?n\b', '', d, flags=re.I)
    d = re.sub(r'\s+0$', '', d)  # "Alberti Y Belgrano 0"
    return re.sub(r'\s+', ' ', d).strip()


def localidad_y_provincia(l):
    """Nombre de localidad para buscar y provincia real (aplica CORRECCIONES y limpieza general)."""
    clave = (l['localidad'], l['provincia'])
    if clave in CORRECCIONES:
        return CORRECCIONES[clave]
    n = re.sub(r'\s*\(.*?\)', '', l['localidad'])  # "Temperley (Lomas de Zamora)" -> "Temperley"
    n = re.split(r'\.\s|\s/\s', n)[0]  # "Burzaco. Almirante Brown" -> "Burzaco"
    n = re.sub(r'\s+Capital$', '', n)
    return n.strip(), l['provincia']


def km(a, b):
    """Distancia en km entre dos (lat, lon)."""
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(h))


# ---------- Consultas (con caché y reintentos) ----------
def pedir(req, que):
    for intento in range(8):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except (urllib.error.URLError, TimeoutError) as e:
            espera = 15 * (intento + 1)
            print(f'  ! error en {que} ({e}); reintento en {espera} s')
            time.sleep(espera)
    sys.exit(f'No se pudo consultar {que}. Revisá la conexión y volvé a correr (no se pierde lo hecho).')


def guardar_cache(cache):
    with open(CACHE, 'w', encoding='utf-8') as f:
        json.dump(cache, f, ensure_ascii=False)


def georef_lotes(endpoint, clave, pedidos, cache, prefijo):
    """POST masivo a Georef: consulta solo lo que no está en la caché."""
    llave = lambda p: prefijo + json.dumps(p, sort_keys=True)
    faltan = [p for p in pedidos if llave(p) not in cache]
    for i in range(0, len(faltan), LOTE):
        lote = faltan[i:i + LOTE]
        print(f'  Georef {endpoint}: {i + len(lote)}/{len(faltan)}')
        req = urllib.request.Request(
            GEOREF + '/' + endpoint, data=json.dumps({clave: lote}).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
        )
        for p, res in zip(lote, pedir(req, 'Georef ' + endpoint)['resultados']):
            cache[llave(p)] = res
        guardar_cache(cache)
        time.sleep(PAUSA_GEOREF)
    return lambda p: cache[llave(p)]


def nominatim(params, cache):
    """Una consulta a Nominatim (OpenStreetMap). Devuelve (lat, lon) o None."""
    llave = 'N' + json.dumps(params, sort_keys=True)
    if llave not in cache:
        q = dict(params, country='Argentina', countrycodes='ar', format='jsonv2', limit=1)
        req = urllib.request.Request(NOMINATIM + '?' + urllib.parse.urlencode(q),
                                     headers={'User-Agent': AGENTE, 'Accept-Language': 'es'})
        res = pedir(req, 'Nominatim')
        cache[llave] = [[float(res[0]['lat']), float(res[0]['lon'])]] if res else []
        time.sleep(PAUSA_NOMINATIM)
    r = cache[llave]
    return tuple(r[0]) if r else None


def calle_nominatim(d):
    """'San Martin 675' -> '675 San Martin' (Nominatim espera el número adelante)."""
    m = re.match(r'^(.*\D)\s+(\d+)$', d)
    return f'{m.group(2)} {m.group(1)}' if m else d


# ---------- Datos ----------
def leer_datos():
    with open(DATOS, encoding='utf-8') as f:
        texto = f.read()
    ini, fin = texto.index('['), texto.rindex(']') + 1
    return texto[:ini], json.loads(texto[ini:fin]), texto[fin:]


def escribir_datos(cabecera, datos, cola):
    if 'lat, lon' not in cabecera:
        cabecera = cabecera.replace(
            '"Privado"); los vacíos se omiten\n',
            '"Privado"); los vacíos se omiten\n'
            '//          lat, lon (geocodificar_mamografos.py: Georef + OpenStreetMap);\n'
            '//          aprox: 1 = no se encontró la dirección, es el centro de la localidad\n',
        )
    filas = ',\n'.join(json.dumps(l, ensure_ascii=False, separators=(',', ':')) for l in datos)
    with open(DATOS, 'w', encoding='utf-8', newline='\n') as f:
        f.write(cabecera + '[\n' + filas + '\n]' + cola)


def main():
    if not os.path.exists(DATOS):
        sys.exit(f'No encuentro {DATOS}: corré el script desde la carpeta del proyecto.')
    cabecera, datos, cola = leer_datos()
    cache = json.load(open(CACHE, encoding='utf-8')) if os.path.exists(CACHE) else {}
    print(f'{len(datos)} localidades, {sum(len(l["items"]) for l in datos)} mamógrafos')
    lp = {id(l): localidad_y_provincia(l) for l in datos}

    # 1) Centro de cada localidad (para validar las direcciones y como último recurso)
    print('Buscando el centro de cada localidad...')
    def pedido_loc(l):
        nombre, prov = lp[id(l)]
        return {'nombre': nombre, 'provincia': PROVINCIAS[prov][0], 'max': 1, 'campos': 'centroide'}
    otras = [l for l in datos if lp[id(l)][1] != 'CABA']
    r_loc = georef_lotes('localidades', 'localidades', [pedido_loc(l) for l in otras], cache, 'L')
    falta = [l for l in otras if not r_loc(pedido_loc(l))['localidades']]
    r_cen = georef_lotes('localidades-censales', 'localidades_censales', [pedido_loc(l) for l in falta], cache, 'C')
    falta2 = [l for l in falta if not r_cen(pedido_loc(l))['localidades_censales']]
    r_mun = georef_lotes('municipios', 'municipios', [pedido_loc(l) for l in falta2], cache, 'M')

    centros = {}
    for l in datos:
        nombre, prov = lp[id(l)]
        if prov == 'CABA':
            centros[id(l)] = CENTRO_CABA
            continue
        p = pedido_loc(l)
        res = r_loc(p)['localidades'] or (r_cen(p)['localidades_censales'] if l in falta else [])
        if not res and l in falta2:
            res = r_mun(p)['municipios']
        if res:
            centros[id(l)] = (res[0]['centroide']['lat'], res[0]['centroide']['lon'])
        else:  # ni Georef la conoce: se le pregunta a OpenStreetMap
            centros[id(l)] = nominatim({'city': nombre, 'state': PROVINCIAS[prov][1]}, cache)
    guardar_cache(cache)

    # 2) Direcciones con Georef (dentro de la localidad)
    print('Buscando las direcciones en Georef...')
    def pedido_dir(l, m):
        nombre, prov = lp[id(l)]
        p = {'direccion': limpiar_direccion(m.get('direccion')), 'provincia': PROVINCIAS[prov][0],
             'max': 1, 'campos': 'ubicacion'}
        if prov != 'CABA':
            p['localidad'] = nombre
        return p
    pares = [(l, m) for l in datos for m in l['items'] if limpiar_direccion(m.get('direccion'))]
    r_dir = georef_lotes('direcciones', 'direcciones', [pedido_dir(l, m) for l, m in pares], cache, 'D1')

    def valido(pt, l):
        c = centros[id(l)]
        return pt is not None and (c is None or km(pt, c) <= MAX_KM)

    def georef_punto(l, m):
        res = r_dir(pedido_dir(l, m))
        if res.get('direcciones'):
            u = res['direcciones'][0].get('ubicacion') or {}
            if u.get('lat') is not None and u.get('lon') is not None:
                pt = (u['lat'], u['lon'])
                return pt if valido(pt, l) else None
        return None

    # 3) Lo que Georef no ubicó, con Nominatim (OpenStreetMap), 1 por segundo
    faltan = [(l, m) for l, m in pares if georef_punto(l, m) is None]
    print(f'Buscando {len(faltan)} direcciones en OpenStreetMap (≈ {len(faltan) * 1.2 / 60:.0f} min)...')
    def pedido_osm(l, m):
        nombre, prov = lp[id(l)]
        return {'street': calle_nominatim(limpiar_direccion(m.get('direccion'))),
                'city': 'Buenos Aires' if prov == 'CABA' else nombre, 'state': PROVINCIAS[prov][1]}
    for i, (l, m) in enumerate(faltan, 1):
        nominatim(pedido_osm(l, m), cache)
        if i % 25 == 0 or i == len(faltan):
            print(f'  OpenStreetMap: {i}/{len(faltan)}')
            guardar_cache(cache)

    # 4) Resultado
    exactos = aprox = sin_dato = 0
    revisar = []
    for l in datos:
        for m in l['items']:
            for k in ('lat', 'lon', 'aprox'):
                m.pop(k, None)
            pt = None
            if limpiar_direccion(m.get('direccion')):
                pt = georef_punto(l, m)
                if pt is None:
                    pt = nominatim(pedido_osm(l, m), cache)
                    if not valido(pt, l):
                        pt = None
            c = centros[id(l)]
            if pt:
                m['lat'], m['lon'] = round(pt[0], 5), round(pt[1], 5)
                exactos += 1
            elif c:
                m['lat'], m['lon'], m['aprox'] = round(c[0], 5), round(c[1], 5), 1
                aprox += 1
                revisar.append([l['localidad'], l['provincia'], m['establecimiento'],
                                m.get('direccion', ''), 'centro de la localidad'])
            else:
                sin_dato += 1
                revisar.append([l['localidad'], l['provincia'], m['establecimiento'],
                                m.get('direccion', ''), 'SIN COORDENADAS'])

    guardar_cache(cache)
    escribir_datos(cabecera, datos, cola)
    with open(REVISAR, 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.writer(f, delimiter=';')
        w.writerow(['localidad', 'provincia', 'establecimiento', 'direccion', 'resultado'])
        w.writerows(revisar)

    print(f'\nListo: {exactos} con dirección exacta, {aprox} con el centro de la localidad, '
          f'{sin_dato} sin coordenadas.')
    print(f'Se actualizó {DATOS}. Lo aproximado está en {REVISAR}.')


if __name__ == '__main__':
    main()
