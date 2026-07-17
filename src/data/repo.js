import { supabase, USE_SUPABASE } from './supabase'
import seed from './seed.json'

const KEY = 'traza-cronos-v4'
let db = null

// ── Pub/sub para que los componentes se refresque en tiempo real ───────
const listeners = new Set()
function notify() { for (const fn of listeners) fn() }
export function onDataChange(fn) { listeners.add(fn); return () => listeners.delete(fn) }

// ── Constantes (sin cambios) ──────────────────────────────────────────
export const TIPOS = [
  { id: 'cronos', label: 'Cronos', sub: 'Carrocería' },
  { id: 'cabina', label: 'Cabina', sub: 'KP1' },
  { id: 'caja', label: 'Caja', sub: 'KP1' },
]
export const ORIGENES = { revision: 'Revisión final', oleo: 'Óleo' }
export const TURNOS = [{ id: 'A', label: 'Turno A' }, { id: 'B', label: 'Turno B' }]
export const ATRIBUCIONES = {
  generada_oleo: 'Generada en el Óleo',
  no_vista_revision: 'No vista en Revisión final',
}
export const ESTADOS = {
  en_espera: { label: 'En espera', css: 'purple' },
  liberada: { label: 'Liberada', css: 'green' },
  caso_especial: { label: 'Caso especial', css: 'red' },
}

// ── Helpers (sin cambios) ─────────────────────────────────────────────
export const tipoDe = (u) => (u && u.tipo) || 'cronos'
export const tipoLabel = (id) => (TIPOS.find((t) => t.id === id) || { label: id }).label
export const ahora = () => new Date().toISOString()
export const dias = (iso) => (Date.now() - new Date(iso).getTime()) / 86400000
export const turnoLabel = (t) => (t ? `Turno ${t}` : 'Sin dato')
export const fmtDur = (d) =>
  d < 1 / 24 ? `${Math.max(1, Math.round(d * 1440))} min` : d < 1 ? `${Math.round(d * 24)} h` : `${Math.floor(d)} d`
export const fmtHoras = (h) =>
  h < 1 ? `${Math.max(1, Math.round(h * 60))} min` : h < 48 ? `${h.toFixed(1)} h` : `${(h / 24).toFixed(1)} d`
export const fmtFecha = (iso) =>
  new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
export const semaforo = (d) => (d > 40 ? 'red' : d > 7 ? 'amber' : 'green')
export const fmtRel = (iso) => {
  const d = dias(iso)
  if (d < 1 / 24) return `hace ${Math.max(1, Math.round(d * 1440))} min`
  if (d < 1) return `hace ${Math.round(d * 24)} h`
  return `hace ${Math.floor(d)} d`
}

// ── Inicialización ────────────────────────────────────────────────────
export async function initDB() {
  if (USE_SUPABASE) {
    await loadFromSupabase()
    subscribeRealtime()
  } else {
    loadFromLocalStorage()
  }
}

function loadFromLocalStorage() {
  const raw = localStorage.getItem(KEY)
  db = raw ? JSON.parse(raw) : structuredClone(seed)
  db.colores = structuredClone(seed.colores)
  db.particularidades = structuredClone(seed.particularidades)
  db.tipos_falla = structuredClone(seed.tipos_falla)
  const propios = (db.operarios || []).filter((o) => o.manual)
  db.operarios = [...structuredClone(seed.operarios), ...propios]
}

function persist() {
  if (!USE_SUPABASE) localStorage.setItem(KEY, JSON.stringify(db))
}

async function loadFromSupabase() {
  const [col, tf, par, ops, uni, inc, fal, evt] = await Promise.all([
    supabase.from('colores').select('*'),
    supabase.from('tipos_falla').select('*'),
    supabase.from('particularidades').select('*'),
    supabase.from('operarios').select('*').order('id'),
    supabase.from('unidades').select('*').order('id'),
    supabase.from('incidencias').select('*').order('id'),
    supabase.from('incidencia_fallas').select('*').order('id'),
    supabase.from('eventos').select('*').order('registrado_at'),
  ])
  for (const r of [col, tf, par, ops, uni, inc, fal, evt]) {
    if (r.error) throw new Error(`Error cargando datos: ${r.error.message}`)
  }
  const colores = {}
  for (const c of col.data) colores[c.cest] = { nombre: c.nombre, hex: c.hex, manual: c.manual }
  db = {
    colores,
    tipos_falla: tf.data,
    particularidades: par.data,
    operarios: ops.data,
    unidades: uni.data,
    incidencias: inc.data,
    incidencia_fallas: fal.data,
    eventos: evt.data,
  }
}

let reloadTimer = null
function scheduleReload() {
  clearTimeout(reloadTimer)
  reloadTimer = setTimeout(async () => {
    await loadFromSupabase()
    notify()
  }, 250)
}

function subscribeRealtime() {
  supabase.channel('db-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'incidencias' }, scheduleReload)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'incidencia_fallas' }, scheduleReload)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'eventos' }, scheduleReload)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'unidades' }, scheduleReload)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'operarios' }, scheduleReload)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'colores' }, scheduleReload)
    .subscribe()
}

// ── Lecturas (sincrónicas, desde cache) ───────────────────────────────
export function getDB() {
  if (!db) loadFromLocalStorage()
  return db
}

// Las cabinas y cajas KP1 (RAM) tienen su propia paleta de colores.
const COLORES_RAM = ['504', '860']

export function catalogo(tipo = 'cronos') {
  const d = getDB()
  // Cronos usa su paleta oficial; cabina/caja usan solo la RAM.
  const colores = Object.fromEntries(
    Object.entries(d.colores).filter(([c, v]) =>
      tipo === 'cronos' ? !COLORES_RAM.includes(c) && !v.manual : COLORES_RAM.includes(c)
    )
  )
  return {
    tipos: d.tipos_falla.filter((t) => t.activo !== false),
    parts: d.particularidades.filter((p) => p.tipo === tipo),
    colores,
    operarios: d.operarios.filter((o) => o.activo !== false),
  }
}

export function colorNombre(cest) {
  if (!cest) return 'Color s/d'
  const c = getDB().colores[cest]
  if (!c || !c.nombre) return `CEST ${cest}`
  // Los colores escritos a mano usan el nombre como código: no repetirlo.
  return c.nombre === cest ? c.nombre : `${cest} · ${c.nombre}`
}

export function colorHex(cest) {
  const c = getDB().colores[cest]
  return (c && c.hex) || '#B9B3A8'
}

export function unidadPorCis(cis, tipo = 'cronos') {
  return getDB().unidades.find((u) => u.cis === String(cis) && tipoDe(u) === tipo)
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
    .map((i) => ({ ...i, unidad: d.unidades.find((u) => u.id === i.unidad_id), fallas: fallasDe(i.id) }))
    .filter((i) => !filtro || filtro(i))
}

export function eventosDe(incId) {
  const d = getDB()
  return d.eventos
    .filter((e) => e.incidencia_id === incId)
    .map((e) => ({ ...e, operario: d.operarios.find((o) => o.id === e.operario_id) || null }))
    .sort((a, b) => a.registrado_at.localeCompare(b.registrado_at))
}

// ── Escrituras ────────────────────────────────────────────────────────
const nid = (arr) => arr.reduce((m, x) => Math.max(m, x.id), 0) + 1

export async function agregarOperario(nombre, rol) {
  const d = getDB()
  const limpio = nombre.trim()
  const existe = d.operarios.find((o) => o.nombre.toLowerCase() === limpio.toLowerCase() && o.rol === rol)
  if (existe) return existe.id

  if (USE_SUPABASE) {
    const { data, error } = await supabase.from('operarios')
      .insert({ nombre: limpio, rol, activo: true, manual: true })
      .select().single()
    if (error) throw new Error(error.message)
    d.operarios.push(data)
    return data.id
  }

  const op = { id: nid(d.operarios), nombre: limpio, rol, activo: true, manual: true }
  d.operarios.push(op)
  persist()
  return op.id
}

export async function crearIncidencia({ cis, cest, fallas, notas, operario_id, turno = null, atribucion = null, tipo_unidad = 'cronos', origen = 'revision' }) {
  if (USE_SUPABASE) {
    return await crearIncidenciaSupabase({ cis, cest, fallas, notas, operario_id, turno, atribucion, tipo_unidad, origen })
  }
  return crearIncidenciaLocal({ cis, cest, fallas, notas, operario_id, turno, atribucion, tipo_unidad, origen })
}

function crearIncidenciaLocal({ cis, cest, fallas, notas, operario_id, turno, atribucion, tipo_unidad, origen }) {
  const d = getDB()
  let u = d.unidades.find((x) => x.cis === cis && tipoDe(x) === tipo_unidad)
  if (!u) {
    u = { id: nid(d.unidades), cis, check_digit: null, cest: cest || '', salida_linea: null, st: '', ssc: '', smo: '', tipo: tipo_unidad }
    d.unidades.push(u)
  } else if (cest && !u.cest) {
    u.cest = cest
  }
  const abierta = d.incidencias.find((i) => i.unidad_id === u.id && !i.cerrada_at)
  if (abierta) throw new Error(`El CIS ${cis} (${tipoLabel(tipo_unidad)}) ya está en piso.`)
  const inc = {
    id: nid(d.incidencias), unidad_id: u.id, estado: 'en_espera', origen, turno,
    atribucion: origen === 'oleo' ? atribucion : null,
    detectada_at: ahora(), cerrada_at: null, notas: notas || '',
  }
  d.incidencias.push(inc)
  for (const f of fallas) {
    d.incidencia_fallas.push({
      id: nid(d.incidencia_fallas), incidencia_id: inc.id, tipo_falla_id: f.tipo_falla_id,
      particularidad_id: f.particularidad_id || null, descripcion: f.descripcion || '', resuelta_at: null,
    })
  }
  d.eventos.push({
    id: nid(d.eventos), incidencia_id: inc.id, estado_anterior: null, estado_nuevo: 'en_espera',
    operario_id, turno, registrado_at: ahora(),
    observacion: `Detectada en ${ORIGENES[origen]}${atribucion && origen === 'oleo' ? ` · ${ATRIBUCIONES[atribucion]}` : ''}, enviada al box`,
  })
  persist()
  return inc
}

async function crearIncidenciaSupabase({ cis, cest, fallas, notas, operario_id, turno, atribucion, tipo_unidad, origen }) {
  let { data: u } = await supabase.from('unidades')
    .select('*').eq('cis', cis).eq('tipo', tipo_unidad).maybeSingle()

  if (!u) {
    const { data, error } = await supabase.from('unidades')
      .insert({ cis, cest: cest || null, tipo: tipo_unidad })
      .select().single()
    if (error) throw new Error(error.message)
    u = data
  } else if (cest && !u.cest) {
    await supabase.from('unidades').update({ cest }).eq('id', u.id)
    u.cest = cest
  }

  const { data: abierta } = await supabase.from('incidencias')
    .select('id').eq('unidad_id', u.id).is('cerrada_at', null).maybeSingle()
  if (abierta) throw new Error(`El CIS ${cis} (${tipoLabel(tipo_unidad)}) ya está en piso.`)

  const { data: inc, error: incErr } = await supabase.from('incidencias')
    .insert({
      unidad_id: u.id, estado: 'en_espera', origen, turno,
      atribucion: origen === 'oleo' ? atribucion : null,
      notas: notas || '',
    })
    .select().single()
  if (incErr) throw new Error(incErr.message)

  const fallasRows = fallas.map((f) => ({
    incidencia_id: inc.id, tipo_falla_id: f.tipo_falla_id,
    particularidad_id: f.particularidad_id || null,
    descripcion: f.descripcion || '',
  }))
  if (fallasRows.length) {
    const { error } = await supabase.from('incidencia_fallas').insert(fallasRows)
    if (error) throw new Error(error.message)
  }

  const obs = `Detectada en ${ORIGENES[origen]}${atribucion && origen === 'oleo' ? ` · ${ATRIBUCIONES[atribucion]}` : ''}, enviada al box`
  const { error: evtErr } = await supabase.from('eventos')
    .insert({ incidencia_id: inc.id, estado_anterior: null, estado_nuevo: 'en_espera', operario_id, turno, observacion: obs })
  if (evtErr) throw new Error(evtErr.message)

  await loadFromSupabase()
  notify()
  return inc
}

export async function transicion(incId, nuevo, operario_id, turno = null, obs = '') {
  const d = getDB()
  const inc = d.incidencias.find((i) => i.id === incId)

  if (USE_SUPABASE) {
    const { error: evtErr } = await supabase.from('eventos')
      .insert({ incidencia_id: incId, estado_anterior: inc.estado, estado_nuevo: nuevo, operario_id, turno, observacion: obs })
    if (evtErr) throw new Error(evtErr.message)
    const update = { estado: nuevo, cerrada_at: nuevo === 'liberada' ? new Date().toISOString() : null }
    const { error } = await supabase.from('incidencias').update(update).eq('id', incId)
    if (error) throw new Error(error.message)
    await loadFromSupabase()
    notify()
  } else {
    d.eventos.push({
      id: nid(d.eventos), incidencia_id: incId, estado_anterior: inc.estado, estado_nuevo: nuevo,
      operario_id, turno, registrado_at: ahora(), observacion: obs,
    })
    inc.estado = nuevo
    inc.cerrada_at = nuevo === 'liberada' ? ahora() : null
    persist()
  }
}

export async function toggleFalla(fallaId) {
  const d = getDB()
  const f = d.incidencia_fallas.find((x) => x.id === fallaId)

  if (USE_SUPABASE) {
    const val = f.resuelta_at ? null : new Date().toISOString()
    const { error } = await supabase.from('incidencia_fallas')
      .update({ resuelta_at: val }).eq('id', fallaId)
    if (error) throw new Error(error.message)
    f.resuelta_at = val
    notify()
  } else {
    f.resuelta_at = f.resuelta_at ? null : ahora()
    persist()
  }
}

// Borra una incidencia cargada por error, con sus fallas y eventos.
export async function eliminarIncidencia(incId) {
  if (USE_SUPABASE) {
    const { error } = await supabase.from('incidencias').delete().eq('id', incId)
    if (error) throw new Error(error.message)
    await loadFromSupabase()
    notify()
  } else {
    const d = getDB()
    d.eventos = d.eventos.filter((e) => e.incidencia_id !== incId)
    d.incidencia_fallas = d.incidencia_fallas.filter((f) => f.incidencia_id !== incId)
    d.incidencias = d.incidencias.filter((i) => i.id !== incId)
    persist()
  }
}

export async function resetDemo() {
  if (USE_SUPABASE) {
    await supabase.from('eventos').delete().neq('id', 0)
    await supabase.from('incidencia_fallas').delete().neq('id', 0)
    await supabase.from('incidencias').delete().neq('id', 0)
    await supabase.from('unidades').delete().neq('id', 0)
    await supabase.from('operarios').delete().eq('manual', true)
    await loadFromSupabase()
    notify()
  } else {
    localStorage.removeItem(KEY)
    db = null
  }
}

// ── KPIs y exportación (sin cambios en lógica) ────────────────────────
function csv(filas) {
  return filas.map((f) => f.map((v) => `"${String(v ?? '').replaceAll('"', '""')}"`).join(';')).join('\n')
}

export function csvEnPiso() {
  const filas = [['CIS', 'Tipo', 'CEST', 'Color', 'Origen', 'Turno', 'Atribucion', 'Estado', 'Detectada', 'Dias_en_piso', 'Fallas', 'Notas']]
  for (const i of incidencias((x) => !x.cerrada_at)) {
    filas.push([
      i.unidad.cis, tipoLabel(tipoDe(i.unidad)), i.unidad.cest, colorNombre(i.unidad.cest),
      ORIGENES[i.origen] || '', i.turno || '', ATRIBUCIONES[i.atribucion] || '',
      ESTADOS[i.estado].label, i.detectada_at, dias(i.detectada_at).toFixed(1),
      i.fallas.map((f) => f.tipo.nombre + (f.part ? ` (${f.part.codigo})` : '')).join(' | '), i.notas,
    ])
  }
  return csv(filas)
}

export function csvEventos() {
  const d = getDB()
  const filas = [['CIS', 'Tipo', 'Estado_anterior', 'Estado_nuevo', 'Fecha', 'Turno', 'Operario', 'Observacion']]
  for (const e of d.eventos) {
    const inc = d.incidencias.find((i) => i.id === e.incidencia_id)
    const u = d.unidades.find((x) => x.id === inc.unidad_id)
    const op = d.operarios.find((o) => o.id === e.operario_id)
    filas.push([u.cis, tipoLabel(tipoDe(u)), e.estado_anterior || '', e.estado_nuevo, e.registrado_at, e.turno || '', op ? op.nombre : '', e.observacion])
  }
  return csv(filas)
}

export function kpis(tipoFiltro = 'todos') {
  const d = getDB()
  const delTipo = (i) => tipoFiltro === 'todos' || tipoDe(i.unidad) === tipoFiltro
  const todas = incidencias(delTipo)
  const abiertas = todas.filter((i) => !i.cerrada_at)

  const mas40 = abiertas.filter((i) => dias(i.detectada_at) > 40).length
  const promDias = abiertas.length ? abiertas.reduce((s, i) => s + dias(i.detectada_at), 0) / abiertas.length : 0
  const liberadas7 = todas.filter((i) => i.cerrada_at && dias(i.cerrada_at) <= 7).length

  const h = (a, b) => (new Date(b).getTime() - new Date(a).getTime()) / 3600000
  const totales = []
  for (const i of todas.filter((x) => x.estado === 'liberada' && x.cerrada_at)) {
    totales.push(h(i.detectada_at, i.cerrada_at))
  }
  const prom = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null)

  const conteo = {}
  for (const i of todas) for (const f of i.fallas) conteo[f.tipo.nombre] = (conteo[f.tipo.nombre] || 0) + 1
  const pareto = Object.entries(conteo).sort((a, b) => b[1] - a[1])

  const porColor = {}
  for (const i of abiertas) { const c = i.unidad.cest || 's/d'; porColor[c] = (porColor[c] || 0) + 1 }

  const porOrigen = {}
  for (const i of abiertas) { const o = i.origen || 'revision'; porOrigen[o] = (porOrigen[o] || 0) + 1 }

  const porTurno = { A: 0, B: 0, sd: 0 }
  for (const i of todas) porTurno[i.turno === 'A' ? 'A' : i.turno === 'B' ? 'B' : 'sd']++

  const porAtribucion = { generada_oleo: 0, no_vista_revision: 0 }
  for (const i of todas) if (i.origen === 'oleo' && i.atribucion) porAtribucion[i.atribucion]++

  const porTipo = {}
  for (const t of TIPOS) porTipo[t.id] = incidencias((i) => !i.cerrada_at && tipoDe(i.unidad) === t.id).length

  // Liberaciones por operario y turno: cuenta cada evento "liberada".
  const idsTipo = new Set(todas.map((i) => i.id))
  const libMap = {}
  for (const e of d.eventos) {
    if (e.estado_nuevo !== 'liberada' || !idsTipo.has(e.incidencia_id)) continue
    const op = d.operarios.find((o) => o.id === e.operario_id)
    const key = `${op ? op.nombre : 'Sin dato'}|${e.turno || ''}`
    libMap[key] = (libMap[key] || 0) + 1
  }
  const porLiberador = Object.entries(libMap)
    .map(([k, n]) => { const [nombre, turno] = k.split('|'); return { nombre, turno, n } })
    .sort((a, b) => b.n - a.n)

  const alertas = abiertas
    .map((i) => {
      const dd = dias(i.detectada_at)
      let motivo = null
      if (dd > 40) motivo = `${Math.floor(dd)} días en piso (umbral: 40)`
      else if (dd > 7) motivo = `${Math.floor(dd)} días esperando box`
      return motivo ? { inc: i, motivo, nivel: dd > 40 ? 'red' : 'amber' } : null
    })
    .filter(Boolean)
    .sort((a, b) => dias(b.inc.detectada_at) - dias(a.inc.detectada_at))

  return {
    enPiso: abiertas.length, mas40, promDias, liberadas7,
    tiempoTotal: prom(totales), pareto, porColor, porOrigen, porTurno, porAtribucion, porTipo, alertas,
    porLiberador,
  }
}
