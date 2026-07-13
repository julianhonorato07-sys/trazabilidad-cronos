import { useState } from 'react'
import { incidencias, transicion, toggleFalla, dias, fmtDur, fmtRel, semaforo, colorNombre } from '../data/repo'
import { Modal, OperarioPicker, EstadoChip, FallaTag, Swatch, Vacio } from '../components/ui'

const COLS = [
  { id: 'espera', titulo: 'En espera', filtro: (i) => i.estado === 'en_box' },
  { id: 'rep', titulo: 'En reparación', filtro: (i) => i.estado === 'en_reparacion' || i.estado === 'espera_particularidad' },
  { id: 'lib', titulo: 'Liberadas hoy', filtro: (i) => i.estado === 'liberada' && i.cerrada_at && new Date(i.cerrada_at).toDateString() === new Date().toDateString() },
  { id: 'esp', titulo: 'Casos especiales', filtro: (i) => i.estado === 'caso_especial' },
]

const ACCIONES = {
  en_box: [
    { nuevo: 'en_reparacion', label: 'Iniciar reparación', css: 'primary' },
    { nuevo: 'caso_especial', label: 'Marcar caso especial', css: 'danger' },
  ],
  en_reparacion: [
    { nuevo: 'liberada', label: 'Liberar unidad ✓', css: 'success' },
    { nuevo: 'espera_particularidad', label: 'Falta particularidad (pausar)', css: 'warn' },
    { nuevo: 'caso_especial', label: 'Marcar caso especial', css: 'danger' },
  ],
  espera_particularidad: [
    { nuevo: 'en_reparacion', label: 'Retomar reparación', css: 'primary' },
    { nuevo: 'caso_especial', label: 'Marcar caso especial', css: 'danger' },
  ],
  caso_especial: [
    { nuevo: 'en_box', label: 'Volver a espera de box', css: 'primary' },
  ],
  liberada: [],
}

function Tarjeta({ i, onOpen }) {
  const d = dias(i.detectada_at)
  const sem = semaforo(d)
  return (
    <button className="card tarjeta" onClick={onOpen}>
      <div className="fila">
        <span className="cis">{i.unidad.cis}</span>
        <span className={'chip ' + sem}>{fmtDur(d)}</span>
      </div>
      <div className="color-line">
        <Swatch cest={i.unidad.cest} size={12} />
        {colorNombre(i.unidad.cest)}
        {i.estado === 'espera_particularidad' && <span className="chip amber" style={{ marginLeft: 'auto' }}>⏸ sin pieza</span>}
      </div>
      <div className="tags">
        {i.fallas.map((f) => <FallaTag key={f.id} falla={f} />)}
      </div>
      {i.notas && <div className="nota-prev">{i.notas}</div>}
      <div className={'aging ' + sem}>
        <div style={{ width: `${Math.min(100, (d / 40) * 100)}%` }} />
      </div>
    </button>
  )
}

export default function Box() {
  const [tab, setTab] = useState('espera')
  const [selInc, setSelInc] = useState(null)
  const [accion, setAccion] = useState(null)
  const [, setTick] = useState(0)
  const refrescar = () => setTick((t) => t + 1)

  const todas = incidencias()
  const abiertas = todas.filter((i) => !i.cerrada_at)
  const sems = { green: 0, amber: 0, red: 0 }
  for (const i of abiertas) sems[semaforo(dias(i.detectada_at))]++

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
      <h3>Box de reparación</h3>
      <p className="sub">Tocá una unidad para ver el detalle y avanzar su estado.</p>

      <div className="strip">
        <span className="chip"><span className="dot green" /> {sems.green} al día</span>
        <span className="chip amber"><span className="dot amber" /> {sems.amber} de 7 a 40 días</span>
        <span className="chip red"><span className="dot red" /> {sems.red} sobre 40 días</span>
      </div>

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
                {lista.map((i) => <Tarjeta key={i.id} i={i} onOpen={() => setSelInc(i.id)} />)}
                {!lista.length && <Vacio texto="Nada por aquí" />}
              </div>
            </section>
          )
        })}
      </div>

      {inc && !accion && (
        <Modal onClose={() => setSelInc(null)}>
          <div className="fila">
            <span className="cis">{inc.unidad.cis}</span>
            <EstadoChip estado={inc.estado} />
          </div>
          <p className="muted" style={{ margin: '6px 0 0', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Swatch cest={inc.unidad.cest} size={12} /> {colorNombre(inc.unidad.cest)} · detectada {fmtRel(inc.detectada_at)}
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
                {f.descripcion ? ` — ${f.descripcion}` : ''}
              </span>
            </label>
          ))}

          {inc.estado === 'en_reparacion' && pendientes > 0 && (
            <p className="warn-txt">Quedan {pendientes} fallas sin marcar como resueltas.</p>
          )}

          <div className="acciones">
            {ACCIONES[inc.estado].map((a) => (
              <button key={a.nuevo} className={'btn ' + a.css} onClick={() => setAccion(a)}>
                {a.label}
              </button>
            ))}
            <button className="btn ghost" onClick={() => setSelInc(null)}>Cerrar</button>
          </div>
        </Modal>
      )}

      {inc && accion && (
        <OperarioPicker
          roles={['box']}
          titulo={`${accion.label} — ¿quién lo registra?`}
          onPick={ejecutar}
          onClose={() => setAccion(null)}
        />
      )}
    </div>
  )
}
