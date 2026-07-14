import seed from './seed.json'

const KEY = 'traza-cronos-v2'
let db = null

export function getDB() {
  if (!db) {
    const raw = localStorage.getItem(KEY)
    db = raw ? JSON.parse(raw) : structuredClone(seed)
    // Los catálogos de colores viven en el seed: se refrescan aunque haya datos guardados.
    db.colores = structuredClone(seed.colores)
  }
  return db
}
function persist() { localStorage.setItem(KEY, JSON.stringify(getDB())) }
export function resetDemo() { localStorage.removeItem(KEY); db = null }

export const ESTADOS = {
  en_box: { label: 'En espera de box', css: 'purple' },
  en_reparacion: { label: 'En reparación', css: 'blue' },
  espera_particularidad: { label: 'Espera de particularidad', css: 'amber' },
  liberada: { label: 'Liberada', css: 'green' },
  caso_especial: { label: 'Caso especial', css: 'red' },
}

export const ahora = () => new Date().toISOString()
export const dias = (iso) => (Date.now() - new Date(iso).getTime()) / 86400000
export const turno = (iso) => (new Date(iso).getHours() < 14 ? 'Mañana' : 'Tarde')
export const fmtDur = (d) =>
  d < 1 / 24 ? `${Math.max(1, Math.round(d * 1440))} min` : d < 1 ? `${Math.round(d * 24)} h` : `${Math.floor(d)} d`
export const fmtHoras = (h) =>
  h < 1 ? `${Math.max(1, Math.round(h * 60))} min` : h < 48 ? `${h.toFixed(1)} h` : `${(h / 24).toFixed(1)} d`
export const fmtFecha = (iso) =>
  new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
export const semaforo = (d) => (d > 40 ? 'red' : d > 7 ? 'amber' : 'green')

export function catalogo() {
  const d = getDB()
  return {
    tipos: d.tipos_falla,
    parts: d.particularidades,
    colores: d.colores,
    operarios: d.operarios.filter((o) => o.activo !== false),
  }
}

export function colorNombre(cest) {
  if (!cest) return 'Color s/d'
  const c = getDB().colores[cest]
  return c && c.nombre ? `${cest} · ${c.nombre}` : `CEST ${cest}`
}

export function colorHex(cest) {
  const c = getDB().colores[cest]
  return (c && c.hex) || '#B9B3A8'
}

export const fmtRel = (iso) => {
  const d = dias(iso)
  if (d < 1 / 24) return `hace ${Math.max(1, Math.round(d * 1440))} min`
  if (d < 1) return `hace ${Math.round(d * 24)} h`
  return `hace ${Math.floor(d)} d`
}

function csv(filas) {
  return filas.map((f) => f.map((v) => `"${String(v ?? '').replaceAll('"', '""')}"`).join(';')).join('\n')
}

export function csvEnPiso() {
  const filas = [['CIS', 'CEST', 'Color', 'Estado', 'Detectada', 'Dias_en_piso', 'Fallas', 'Notas']]
  for (const i of incidencias((x) => !x.cerrada_at)) {
    filas.push([
      i.unidad.cis, i.unidad.cest, colorNombre(i.unidad.cest), ESTADOS[i.estado].label,
      i.detectada_at, dias(i.detectada_at).toFixed(1),
      i.fallas.map((f) => f.tipo.nombre + (f.part ? ` (${f.part.codigo})` : '')).join(' | '),
      i.notas,
    ])
  }
  return csv(filas)
}

export function csvEventos() {
  const d = getDB()
  const filas = [['CIS', 'Estado_anterior', 'Estado_nuevo', 'Fecha', 'Turno', 'Operario', 'Observacion']]
  for (const e of d.eventos) {
    const inc = d.incidencias.find((i) => i.id === e.incidencia_id)
    const u = d.unidades.find((x) => x.id === inc.unidad_id)
    const op = d.operarios.find((o) => o.id === e.operario_id)
    filas.push([u.cis, e.estado_anterior || '', e.estado_nuevo, e.registrado_at, turno(e.registrado_at), op ? op.nombre : '', e.observacion])
  }
  return csv(filas)
}

export function unidadPorCis(cis, tipo_unidad = 'carroceria') {
  return getDB().unidades.find((u) => u.cis === String(cis) && (u.tipo || 'carroceria') === tipo_unidad)
}

export function fallasDe(incId) {
  const d = getDB()
  return d.incidencia_fallas
    .filter((f) => f.incidencia_id === incId)
    .map((f) => ({
      ...f,
      tipo: d.tipos_falla.find((t) => t.id === f.tipo_falla_id),
      part: d.particularidades.find((p) => p.id === f.particularidad_id) || null,
    }))
}

export function incidencias(filtro) {
  const d = getDB()
  return d.incidencias
    .filter((i) => !filtro || filtro(i))
    .map((i) => ({ ...i, unidad: d.unidades.find((u) => u.id === i.unidad_id), fallas: fallasDe(i.id) }))
}

const nid = (arr) => arr.reduce((m, x) => Math.max(m, x.id), 0) + 1

export function crearIncidencia({ cis, cest, fallas, notas, operario_id, tipo_unidad = 'carroceria' }) {
  const d = getDB()
  let u = d.unidades.find((x) => x.cis === cis && (x.tipo || 'carroceria') === tipo_unidad)
  if (!u) {
    u = { id: nid(d.unidades), cis, check_digit: null, cest: cest || '', salida_linea: null, st: '', ssc: '', smo: '', tipo: tipo_unidad }
    d.unidades.push(u)
  } else if (cest && !u.cest) {
    u.cest = cest
  }
  const abierta = d.incidencias.find((i) => i.unidad_id === u.id && !i.cerrada_at)
  if (abierta) throw new Error(`El CIS ${cis} ya está en piso (${ESTADOS[abierta.estado].label.toLowerCase()}).`)
  const inc = { id: nid(d.incidencias), unidad_id: u.id, estado: 'en_box', detectada_at: ahora(), cerrada_at: null, notas: notas || '' }
  d.incidencias.push(inc)
  for (const f of fallas) {
    d.incidencia_fallas.push({
      id: nid(d.incidencia_fallas), incidencia_id: inc.id, tipo_falla_id: f.tipo_falla_id,
      particularidad_id: f.particularidad_id || null, descripcion: f.descripcion || '', resuelta_at: null,
    })
  }
  d.eventos.push({
    id: nid(d.eventos), incidencia_id: inc.id, estado_anterior: null, estado_nuevo: 'en_box',
    operario_id, registrado_at: ahora(), observacion: `Detectada en revisión final (${tipo_unidad}), enviada al box`,
  })
  persist()
  return inc
}

export function transicion(incId, nuevo, operario_id, obs = '') {
  const d = getDB()
  const inc = d.incidencias.find((i) => i.id === incId)
  d.eventos.push({
    id: nid(d.eventos), incidencia_id: incId, estado_anterior: inc.estado, estado_nuevo: nuevo,
    operario_id, registrado_at: ahora(), observacion: obs,
  })
  inc.estado = nuevo
  inc.cerrada_at = nuevo === 'liberada' ? ahora() : null
  persist()
}

export function toggleFalla(fallaId) {
  const d = getDB()
  const f = d.incidencia_fallas.find((x) => x.id === fallaId)
  f.resuelta_at = f.resuelta_at ? null : ahora()
  persist()
}

export function eventosDe(incId) {
  const d = getDB()
  return d.eventos
    .filter((e) => e.incidencia_id === incId)
    .map((e) => ({ ...e, operario: d.operarios.find((o) => o.id === e.operario_id) || null }))
    .sort((a, b) => a.registrado_at.localeCompare(b.registrado_at))
}

export function kpis() {
  const d = getDB()
  const cabinasActivas = incidencias((i) => !i.cerrada_at && i.unidad && i.unidad.tipo === 'cabina').length
  const cajasActivas = incidencias((i) => !i.cerrada_at && i.unidad && i.unidad.tipo === 'caja').length

  const abiertas = incidencias((i) => !i.cerrada_at && (!i.unidad || !i.unidad.tipo || i.unidad.tipo === 'carroceria'))
  const mas40 = abiertas.filter((i) => dias(i.detectada_at) > 40)
  const promDias = abiertas.length ? abiertas.reduce((s, i) => s + dias(i.detectada_at), 0) / abiertas.length : 0
  const liberadas7 = d.incidencias.filter((i) => {
    const u = d.unidades.find((x) => x.id === i.unidad_id)
    const t = u ? (u.tipo || 'carroceria') : 'carroceria'
    return i.cerrada_at && dias(i.cerrada_at) <= 7 && t === 'carroceria'
  }).length

  const t = { espera: [], reparacion: [], total: [] }
  const h = (a, b) => (new Date(b).getTime() - new Date(a).getTime()) / 3600000
  for (const i of d.incidencias.filter((x) => x.estado === 'liberada')) {
    const u = d.unidades.find((x) => x.id === i.unidad_id)
    if (u && u.tipo && u.tipo !== 'carroceria') continue
    const evs = d.eventos.filter((e) => e.incidencia_id === i.id)
    const rep = evs.find((e) => e.estado_nuevo === 'en_reparacion')
    const lib = evs.find((e) => e.estado_nuevo === 'liberada')
    if (rep) t.espera.push(h(i.detectada_at, rep.registrado_at))
    if (rep && lib) t.reparacion.push(h(rep.registrado_at, lib.registrado_at))
    if (lib) t.total.push(h(i.detectada_at, lib.registrado_at))
  }
  const prom = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null)

  const conteo = {}
  for (const f of d.incidencia_fallas) {
    const inc = d.incidencias.find((x) => x.id === f.incidencia_id)
    const u = inc ? d.unidades.find((x) => x.id === inc.unidad_id) : null
    if (u && u.tipo && u.tipo !== 'carroceria') continue
    const tipo = d.tipos_falla.find((x) => x.id === f.tipo_falla_id)
    conteo[tipo.nombre] = (conteo[tipo.nombre] || 0) + 1
  }
  const pareto = Object.entries(conteo).sort((a, b) => b[1] - a[1])

  const alertas = abiertas
    .map((i) => {
      const dd = dias(i.detectada_at)
      let motivo = null
      if (dd > 40) motivo = `${Math.floor(dd)} días en piso (umbral: 40)`
      else if (i.estado === 'en_box' && dd > 3) motivo = `${Math.floor(dd)} días esperando box`
      else if (i.estado === 'espera_particularidad' && dd > 7) motivo = 'Espera de particularidad prolongada'
      return motivo ? { inc: i, motivo, nivel: dd > 40 ? 'red' : 'amber' } : null
    })
    .filter(Boolean)
    .sort((a, b) => dias(b.inc.detectada_at) - dias(a.inc.detectada_at))

  return {
    enPiso: abiertas.length, mas40: mas40.length, promDias, liberadas7,
    tiempos: { espera: prom(t.espera), reparacion: prom(t.reparacion), total: prom(t.total) },
    pareto, alertas, cabinasActivas, cajasActivas
  }
}
