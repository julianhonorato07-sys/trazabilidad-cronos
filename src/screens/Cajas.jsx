import { useState } from 'react'
import { incidencias, transicion, toggleFalla, dias, fmtDur, fmtRel, semaforo, colorNombre, catalogo, unidadPorCis, crearIncidencia } from '../data/repo'
import { Modal, OperarioPicker, EstadoChip, FallaTag, Swatch, Vacio, Icon } from '../components/ui'

const COLS = [
  { id: 'espera', titulo: 'En espera', filtro: (i) => i.estado === 'en_box' },
  { id: 'rep', titulo: 'En reparación', filtro: (i) => i.estado === 'en_reparacion' || i.estado === 'espera_particularidad' },
  { id: 'lib', titulo: 'Liberadas hoy', filtro: (i) => i.estado === 'liberada' && i.cerrada_at && new Date(i.cerrada_at).toDateString() === new Date().toDateString() },
]

const ACCIONES = {
  en_box: [
    { nuevo: 'en_reparacion', label: 'Iniciar reparación', css: 'primary' },
    { nuevo: 'caso_especial', label: 'Marcar caso especial', css: 'danger' },
  ],
  en_reparacion: [
    { nuevo: 'liberada', label: 'Liberar caja ✓', css: 'success' },
    { nuevo: 'espera_particularidad', label: 'Falta particularidad (pausar)', css: 'warn' },
  ],
  espera_particularidad: [
    { nuevo: 'en_reparacion', label: 'Retomar reparación', css: 'primary' },
  ],
  caso_especial: [
    { nuevo: 'en_box', label: 'Volver a espera', css: 'primary' },
  ],
  liberada: [],
}

export default function Cajas() {
  const { tipos, parts, colores } = catalogo()
  const [tab, setTab] = useState('espera')
  const [selInc, setSelInc] = useState(null)
  const [accion, setAccion] = useState(null)
  const [, setTick] = useState(0)

  // Registrar state
  const [cis, setCis] = useState('')
  const [cest, setCest] = useState('')
  const [tiposSel, setTiposSel] = useState([])
  const [partsSel, setPartsSel] = useState({})
  const [nota, setNota] = useState('')
  const [pick, setPick] = useState(false)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')

  const refrescar = () => setTick((t) => t + 1)

  const todas = incidencias((i) => i.unidad && i.unidad.tipo === 'caja')
  const abiertas = todas.filter((i) => !i.cerrada_at)

  const unidad = cis.length >= 3 ? unidadPorCis(cis, 'caja') : null

  const toggleTipo = (id) => {
    setErr('')
    if (tiposSel.includes(id)) {
      setTiposSel(tiposSel.filter((x) => x !== id))
      setPartsSel({ ...partsSel, [id]: [] })
    } else {
      setTiposSel([...tiposSel, id])
    }
  }

  const togglePart = (tid, pid) => {
    const cur = partsSel[tid] || []
    setPartsSel({ ...partsSel, [tid]: cur.includes(pid) ? cur.filter((x) => x !== pid) : [...cur, pid] })
  }

  const validar = () => {
    if (cis.length < 3) return 'Ingresá un código de caja válido (mínimo 3 caracteres).'
    if (!tiposSel.length) return 'Seleccioná al menos una falla.'
    return ''
  }

  const enviar = (operario_id) => {
    setPick(false)
    const fallas = []
    for (const tid of tiposSel) {
      const ps = partsSel[tid] || []
      if (ps.length) for (const pid of ps) fallas.push({ tipo_falla_id: tid, particularidad_id: pid })
      else fallas.push({ tipo_falla_id: tid })
    }
    try {
      crearIncidencia({
        cis,
        cest: unidad ? unidad.cest : cest || Object.keys(colores)[0],
        fallas,
        notas: nota,
        operario_id,
        tipo_unidad: 'caja'
      })
      setOk(cis)
      setCis(''); setCest(''); setTiposSel([]); setPartsSel({}); setNota('')
      refrescar()
    } catch (e) {
      setErr(e.message)
    }
  }

  const inc = selInc ? todas.find((i) => i.id === selInc) : null
  const pendientes = inc ? inc.fallas.filter((f) => !f.resuelta_at).length : 0

  const ejecutar = (operario_id) => {
    transicion(selInc, accion.nuevo, operario_id)
    setAccion(null)
    setSelInc(null)
    refrescar()
  }

  return (
    <div>
      <h3>Control de Cajas</h3>
      <p className="sub">Registrá desvíos específicos de cajas para llevar y controlá su estado de reparación.</p>

      {/* Registrar Desvío */}
      <div className="card" style={{ marginBottom: 24, padding: 20 }}>
        <h4 style={{ margin: '0 0 12px' }}>Registrar nuevo desvío en Cajas</h4>
        {err && (
          <div className="banner err" style={{ marginBottom: 12 }}>
            <span>{err}</span>
            <button onClick={() => setErr('')}>Cerrar</button>
          </div>
        )}
        {ok && (
          <div className="banner success" style={{ marginBottom: 12, backgroundColor: 'var(--green-soft)', color: 'var(--green)', border: '1px solid var(--green)', padding: '8px 12px', borderRadius: 8 }}>
            <span>✓ Caja <strong>{ok}</strong> registrada con éxito.</span>
          </div>
        )}

        <div className="fila" style={{ gap: 12, marginBottom: 12 }}>
          <input
            className="cis-input"
            style={{ margin: 0, flex: 1 }}
            placeholder="Código de Caja (ej: CAJ-01)"
            value={cis}
            onChange={(e) => { setErr(''); setOk(''); setCis(e.target.value.toUpperCase()) }}
          />
        </div>

        {cis.length >= 3 && !unidad && (
          <div className="unidad-info nueva" style={{ marginBottom: 12 }}>
            <Icon name="alerta" size={19} />
            <span>Nueva caja. Opcional - Color identificador:</span>
            <span className="parts" style={{ margin: '4px 0 0' }}>
              {Object.keys(colores).map((c) => (
                <button key={c} className={'chip pick' + (cest === c ? ' on' : '')} onClick={() => setCest(c)}>
                  <Swatch cest={c} size={13} /> {colorNombre(c)}
                </button>
              ))}
            </span>
          </div>
        )}

        <h5 style={{ margin: '12px 0 6px', fontSize: 13, textTransform: 'uppercase', color: 'var(--faint)' }}>Fallas de Caja</h5>
        <div className="fallas-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
          {tipos.map((t) => (
            <button
              key={t.id}
              className={'falla-btn' + (tiposSel.includes(t.id) ? ' on' : '')}
              onClick={() => toggleTipo(t.id)}
              style={{ padding: '8px 12px', fontSize: 13 }}
            >
              {t.nombre}
            </button>
          ))}
        </div>

        <div className="acciones" style={{ marginTop: 16 }}>
          <button
            className="btn primary"
            onClick={() => { const v = validar(); v ? setErr(v) : setPick(true) }}
            style={{ minHeight: 44, fontSize: 15 }}
          >
            Registrar Caja →
          </button>
        </div>
      </div>

      {/* Board de Seguimiento */}
      <h4>Monitoreo de Cajas en Piso ({abiertas.length})</h4>
      <div className="seg">
        {COLS.map((c) => (
          <button key={c.id} className={c.id === tab ? 'on' : ''} onClick={() => setTab(c.id)}>
            {c.titulo} ({todas.filter(c.filtro).length})
          </button>
        ))}
      </div>

      <div className="board">
        {COLS.map((c) => {
          const lista = todas.filter(c.filtro).sort((a, b) => a.detectada_at.localeCompare(b.detectada_at))
          return (
            <section key={c.id} className={'col' + (c.id === tab ? ' on' : '')}>
              <header className="col-h">
                {c.titulo} <span className="num">{lista.length}</span>
              </header>
              <div className="lista">
                {lista.map((i) => {
                  const d = dias(i.detectada_at)
                  const sem = semaforo(d)
                  return (
                    <button key={i.id} className="card tarjeta" onClick={() => setSelInc(i.id)}>
                      <div className="fila">
                        <span className="cis" style={{ fontSize: 18 }}>{i.unidad.cis}</span>
                        <span className={'chip ' + sem}>{fmtDur(d)}</span>
                      </div>
                      <div className="tags">
                        {i.fallas.map((f) => <FallaTag key={f.id} falla={f} />)}
                      </div>
                    </button>
                  )
                })}
                {!lista.length && <Vacio texto="Sin cajas en este estado" />}
              </div>
            </section>
          )
        })}
      </div>

      {/* Modal detalle */}
      {inc && !accion && (
        <Modal onClose={() => setSelInc(null)}>
          <div className="fila">
            <span className="cis">{inc.unidad.cis}</span>
            <EstadoChip estado={inc.estado} />
          </div>
          <p className="muted" style={{ margin: '6px 0 0', fontWeight: 600 }}>
            Registrada {fmtRel(inc.detectada_at)}
          </p>
          {inc.notas && <p className="nota" style={{ marginTop: 12 }}>{inc.notas}</p>}

          <h4>Fallas ({inc.fallas.length})</h4>
          {inc.fallas.map((f) => (
            <label key={f.id} className="check">
              <input
                type="checkbox"
                checked={!!f.resuelta_at}
                onChange={() => { toggleFalla(f.id); refrescar() }}
              />
              <span className={f.resuelta_at ? 'res-txt' : ''}>
                {f.tipo.nombre}{f.part ? ' · ' + f.part.nombre : ''}
              </span>
            </label>
          ))}

          <div className="acciones">
            {ACCIONES[inc.estado] && ACCIONES[inc.estado].map((a) => (
              <button key={a.nuevo} className={'btn ' + a.css} onClick={() => setAccion(a)}>
                {a.label}
              </button>
            ))}
            <button className="btn ghost" onClick={() => setSelInc(null)}>Cerrar</button>
          </div>
        </Modal>
      )}

      {pick && (
        <OperarioPicker roles={['revision']} titulo="¿Quién registra desvío?" onPick={enviar} onClose={() => setPick(false)} />
      )}

      {inc && accion && (
        <OperarioPicker
          roles={['box']}
          titulo={`${accion.label} — ¿quién registra?`}
          onPick={ejecutar}
          onClose={() => setAccion(null)}
        />
      )}
    </div>
  )
}
