import { useState } from 'react'
import {
  TIPOS, ORIGENES, ATRIBUCIONES, catalogo, unidadPorCis, crearIncidencia, incidencias, transicion,
  toggleFalla, eventosDe, dias, fmtDur, fmtRel, fmtFecha, turnoLabel, semaforo, colorNombre, tipoDe, ESTADOS,
} from '../data/repo'
import { Modal, OperarioPicker, EstadoChip, FallaTag, Swatch, Vacio, Icon } from '../components/ui'

const PUESTOS = {
  revision: { titulo: 'Revisión final', sub: 'Detectá el defecto y enviá la unidad al box.', origen: 'revision', registra: true, opera: false },
  oleo: { titulo: 'Óleo', sub: 'Detectá el defecto y enviá la unidad al box.', origen: 'oleo', registra: true, opera: false },
  box: { titulo: 'Box de retoques', sub: 'Tomá las unidades en espera, reparalas y liberalas.', origen: null, registra: false, opera: true },
}

const COLS = [
  { id: 'en_espera', titulo: 'En espera' },
  { id: 'liberada', titulo: 'Liberadas hoy' },
  { id: 'caso_especial', titulo: 'Casos especiales' },
]

const ACCIONES = {
  en_espera: [
    { nuevo: 'liberada', label: 'Liberar unidad ✓', css: 'success' },
    { nuevo: 'caso_especial', label: 'Marcar caso especial', css: 'danger' },
  ],
  liberada: [],
  caso_especial: [{ nuevo: 'en_espera', label: 'Volver a espera', css: 'primary' }],
}

const esHoy = (iso) => iso && new Date(iso).toDateString() === new Date().toDateString()
const enColumna = (i, col) =>
  col === 'liberada' ? i.estado === 'liberada' && esHoy(i.cerrada_at) : i.estado === col

function Tarjeta({ i, onOpen }) {
  const d = dias(i.detectada_at)
  const sem = i.cerrada_at ? 'green' : semaforo(d)
  return (
    <button className="card tarjeta" onClick={onOpen}>
      <div className="fila">
        <span className="cis">{i.unidad.cis}</span>
        <span className={'chip ' + sem}>{fmtDur(d)}</span>
      </div>
      <div className="color-line">
        <Swatch cest={i.unidad.cest} size={12} />
        {colorNombre(i.unidad.cest)}
        <span className="chip origen">{ORIGENES[i.origen] || 'Revisión final'}</span>
      </div>
      <div className="tags">{i.fallas.map((f) => <FallaTag key={f.id} falla={f} />)}</div>
      {i.notas && <div className="nota-prev">{i.notas}</div>}
      {!i.cerrada_at && (
        <div className={'aging ' + sem}><div style={{ width: `${Math.min(100, (d / 40) * 100)}%` }} /></div>
      )}
    </button>
  )
}

function RegistroModal({ tipo, origen, onDone, onClose }) {
  const { tipos, parts, colores } = catalogo(tipo)
  const [cis, setCis] = useState('')
  const [cest, setCest] = useState('')
  const [tiposSel, setTiposSel] = useState([])
  const [partsSel, setPartsSel] = useState({})
  const [nota, setNota] = useState('')
  const [atrib, setAtrib] = useState('')
  const [pick, setPick] = useState(false)
  const [err, setErr] = useState('')

  const unidad = tipo === 'cronos' && cis.length === 7 ? unidadPorCis(cis, 'cronos') : null

  const toggleTipo = (id) => {
    setErr('')
    if (tiposSel.includes(id)) {
      setTiposSel(tiposSel.filter((x) => x !== id))
      setPartsSel({ ...partsSel, [id]: [] })
    } else setTiposSel([...tiposSel, id])
  }
  const togglePart = (tid, pid) => {
    const cur = partsSel[tid] || []
    setPartsSel({ ...partsSel, [tid]: cur.includes(pid) ? cur.filter((x) => x !== pid) : [...cur, pid] })
  }
  const validar = () => {
    if (cis.replace(/\D/g, '').length < (tipo === 'cronos' ? 7 : 4)) return 'Ingresá el CIS de la unidad.'
    if (!tiposSel.length) return 'Seleccioná al menos una falla.'
    for (const tid of tiposSel) {
      const t = tipos.find((x) => x.id === tid)
      if (t.requiere_particularidad && !(partsSel[tid] || []).length) return `Indicá la particularidad de "${t.nombre}".`
    }
    if (origen === 'oleo' && !atrib) return 'Indicá de dónde salió el defecto.'
    return ''
  }
  const enviar = (operario_id, turno) => {
    setPick(false)
    const fallas = []
    for (const tid of tiposSel) {
      const ps = partsSel[tid] || []
      if (ps.length) for (const pid of ps) fallas.push({ tipo_falla_id: tid, particularidad_id: pid })
      else fallas.push({ tipo_falla_id: tid })
    }
    try {
      crearIncidencia({
        cis, cest: unidad ? unidad.cest : cest, fallas, notas: nota, operario_id, turno,
        atribucion: atrib || null, tipo_unidad: tipo, origen,
      })
      onDone(cis)
    } catch (e) { setErr(e.message) }
  }

  return (
    <Modal onClose={onClose}>
      <h3>Registrar desvío · {TIPOS.find((t) => t.id === tipo).label}</h3>
      {err && <div className="banner err" style={{ marginTop: 10 }}><span>{err}</span><button onClick={() => setErr('')}>Cerrar</button></div>}
      <input
        className="cis-input" inputMode="numeric" maxLength={10} placeholder="CIS"
        value={cis} onChange={(e) => { setErr(''); setCis(e.target.value.replace(/\D/g, '')) }}
      />
      {unidad && (
        <div className="unidad-info"><Icon name="ok" size={19} />
          <span>Verificada — <Swatch cest={unidad.cest} size={11} /> {colorNombre(unidad.cest)}</span>
        </div>
      )}
      {!unidad && cis.length >= 4 && (
        <div className="unidad-info nueva"><Icon name="alerta" size={19} />
          <span>Indicá el color:</span>
          <span className="parts" style={{ margin: '4px 0 0' }}>
            {Object.keys(colores).map((c) => (
              <button key={c} className={'chip pick' + (cest === c ? ' on' : '')} onClick={() => setCest(c)}>
                <Swatch cest={c} size={13} /> {colorNombre(c)}
              </button>
            ))}
          </span>
        </div>
      )}

      <h4>Fallas detectadas {tiposSel.length > 0 && `· ${tiposSel.length}`}</h4>
      <div className="fallas-grid">
        {tipos.map((t) => (
          <button key={t.id} className={'falla-btn' + (tiposSel.includes(t.id) ? ' on' : '')} onClick={() => toggleTipo(t.id)}>
            {t.nombre}
          </button>
        ))}
      </div>
      {tiposSel.map((tid) => {
        const t = tipos.find((x) => x.id === tid)
        if (!t.usa_particularidad) return null
        return (
          <div key={tid} className="parts">
            <span className="parts-lbl">{t.nombre} — ¿en qué particularidad?</span>
            {parts.length === 0 && <span className="muted" style={{ fontSize: 13 }}>Sin partes cargadas para este tipo.</span>}
            {parts.map((p) => (
              <button key={p.id} className={'chip pick' + ((partsSel[tid] || []).includes(p.id) ? ' on' : '')} onClick={() => togglePart(tid, p.id)}>
                {p.nombre}
              </button>
            ))}
          </div>
        )
      })}

      {origen === 'oleo' && (
        <>
          <h4>¿De dónde salió el defecto?</h4>
          <div className="fallas-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            {Object.entries(ATRIBUCIONES).map(([id, label]) => (
              <button key={id} className={'falla-btn' + (atrib === id ? ' on' : '')} onClick={() => { setErr(''); setAtrib(id) }}>
                {label}
              </button>
            ))}
          </div>
        </>
      )}

      <h4>Observaciones (opcional)</h4>
      <textarea placeholder="Ej: bollo grande, revisar grafado…" value={nota} onChange={(e) => setNota(e.target.value)} />

      <div className="acciones">
        <button className="btn primary" onClick={() => { const v = validar(); v ? setErr(v) : setPick(true) }}>Enviar al box →</button>
        <button className="btn ghost" onClick={onClose}>Cancelar</button>
      </div>

      {pick && <OperarioPicker roles={[origen]} titulo="¿Quién detectó el desvío?" onPick={enviar} onClose={() => setPick(false)} />}
    </Modal>
  )
}

function DetalleModal({ inc, opera, rolOperario, onClose, onRefresh }) {
  const [accion, setAccion] = useState(null)
  const pendientes = inc.fallas.filter((f) => !f.resuelta_at).length
  const eventos = eventosDe(inc.id)

  const ejecutar = (operario_id, turno) => { transicion(inc.id, accion.nuevo, operario_id, turno); setAccion(null); onClose(); onRefresh() }

  if (accion) {
    return <OperarioPicker roles={[rolOperario]} titulo={`${accion.label} — ¿quién lo registra?`} onPick={ejecutar} onClose={() => setAccion(null)} />
  }
  return (
    <Modal onClose={onClose}>
      <div className="fila">
        <span className="cis">{inc.unidad.cis}</span>
        <EstadoChip estado={inc.estado} />
      </div>
      <p className="muted" style={{ margin: '6px 0 0', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Swatch cest={inc.unidad.cest} size={12} /> {colorNombre(inc.unidad.cest)}
        <span className="chip origen">{ORIGENES[inc.origen] || 'Revisión final'}</span>
        <span className="chip">{turnoLabel(inc.turno)}</span>
        · detectada {fmtRel(inc.detectada_at)}
      </p>
      {inc.atribucion && <p className="nota" style={{ marginTop: 10 }}>Origen del defecto: <strong>{ATRIBUCIONES[inc.atribucion]}</strong></p>}
      {inc.notas && <p className="nota" style={{ marginTop: 12 }}>{inc.notas}</p>}

      <h4>Fallas ({inc.fallas.length})</h4>
      {inc.fallas.map((f) => (
        <label key={f.id} className="check">
          <input type="checkbox" disabled={!opera} checked={!!f.resuelta_at} onChange={() => { toggleFalla(f.id); onRefresh() }} />
          <span className={f.resuelta_at ? 'res-txt' : ''}>
            {f.tipo.nombre}{f.part ? ' · ' + f.part.nombre : ''}{f.descripcion ? ` — ${f.descripcion}` : ''}
          </span>
        </label>
      ))}

      {opera ? (
        <>
          {inc.estado === 'en_espera' && pendientes > 0 && <p className="warn-txt">Quedan {pendientes} fallas sin marcar como resueltas.</p>}
          <div className="acciones">
            {ACCIONES[inc.estado].map((a) => (
              <button key={a.nuevo} className={'btn ' + a.css} onClick={() => setAccion(a)}>{a.label}</button>
            ))}
            <button className="btn ghost" onClick={onClose}>Cerrar</button>
          </div>
        </>
      ) : (
        <>
          <h4>Línea de tiempo</h4>
          <div className="tl">
            {eventos.map((e, idx) => {
              const prev = eventos[idx - 1]
              const dur = prev ? (new Date(e.registrado_at) - new Date(prev.registrado_at)) / 86400000 : null
              const css = { liberada: 'g', caso_especial: 'r', en_espera: '' }[e.estado_nuevo] || ''
              return (
                <div key={e.id} className={'tl-item ' + css}>
                  {dur != null && <span className="tl-dur">+{fmtDur(dur)}</span>}
                  <div className="tl-fecha">{fmtFecha(e.registrado_at)} · {turnoLabel(e.turno)}</div>
                  <div className="tl-txt">{ESTADOS[e.estado_nuevo].label}{e.operario ? <span className="muted" style={{ fontWeight: 700 }}> — {e.operario.nombre}</span> : ''}</div>
                  {e.observacion && <div className="tl-obs">{e.observacion}</div>}
                </div>
              )
            })}
          </div>
          <div className="acciones"><button className="btn ghost" onClick={onClose}>Cerrar</button></div>
        </>
      )}
    </Modal>
  )
}

export default function Puesto({ rol }) {
  const cfg = PUESTOS[rol]
  const [tipo, setTipo] = useState('cronos')
  const [col, setCol] = useState('en_espera')
  const [selId, setSelId] = useState(null)
  const [reg, setReg] = useState(false)
  const [ok, setOk] = useState('')
  const [, setTick] = useState(0)
  const refrescar = () => setTick((t) => t + 1)

  const base = incidencias((i) => tipoDe(i.unidad) === tipo && (cfg.origen ? i.origen === cfg.origen : true))
  const inc = selId ? base.find((i) => i.id === selId) : null

  return (
    <div>
      <h3>{cfg.titulo}</h3>
      <p className="sub">{cfg.sub}</p>

      <div className="tabs-tipo">
        {TIPOS.map((t) => {
          const n = incidencias((i) => tipoDe(i.unidad) === t.id && !i.cerrada_at && (cfg.origen ? i.origen === cfg.origen : true)).length
          return (
            <button key={t.id} className={t.id === tipo ? 'on' : ''} onClick={() => { setTipo(t.id); setSelId(null) }}>
              <strong>{t.label}</strong>
              <span>{t.sub}{n ? ` · ${n}` : ''}</span>
            </button>
          )
        })}
      </div>

      {cfg.registra && (
        <button className="btn primary reg-btn" onClick={() => setReg(true)}>
          <Icon name="registrar" size={20} /> Registrar desvío de {TIPOS.find((t) => t.id === tipo).label}
        </button>
      )}

      <div className="seg">
        {COLS.map((c) => (
          <button key={c.id} className={c.id === col ? 'on' : ''} onClick={() => setCol(c.id)}>
            {c.titulo} ({base.filter((i) => enColumna(i, c.id)).length})
          </button>
        ))}
      </div>

      <div className="board">
        {COLS.map((c) => {
          const lista = base.filter((i) => enColumna(i, c.id)).sort((a, b) => a.detectada_at.localeCompare(b.detectada_at))
          return (
            <section key={c.id} className={'col' + (c.id === col ? ' on' : '')}>
              <header className="col-h">{c.titulo} <span className="num">{lista.length}</span></header>
              <div className="lista">
                {lista.map((i) => <Tarjeta key={i.id} i={i} onOpen={() => setSelId(i.id)} />)}
                {!lista.length && <Vacio texto="Nada por aquí" />}
              </div>
            </section>
          )
        })}
      </div>

      {inc && (
        <DetalleModal inc={inc} opera={cfg.opera} rolOperario="box" onClose={() => setSelId(null)} onRefresh={refrescar} />
      )}
      {reg && (
        <RegistroModal tipo={tipo} origen={cfg.origen} onClose={() => setReg(false)} onDone={(cis) => { setReg(false); setOk(cis); refrescar() }} />
      )}
      {ok && (
        <div className="exito" onClick={() => setOk('')}>
          <div className="exito-card" onClick={(e) => e.stopPropagation()}>
            <div className="exito-check">✓</div>
            <div className="cis" style={{ fontSize: 30 }}>{ok}</div>
            <p className="muted" style={{ margin: '6px 0 18px' }}>Registrada y enviada al box</p>
            <button className="btn primary" onClick={() => setOk('')}>Listo</button>
          </div>
        </div>
      )}
    </div>
  )
}
