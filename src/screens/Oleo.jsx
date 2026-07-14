import { useState } from 'react'
import { incidencias, transicion, toggleFalla, dias, fmtDur, fmtRel, semaforo, colorNombre } from '../data/repo'
import { Modal, OperarioPicker, EstadoChip, FallaTag, Swatch, Vacio } from '../components/ui'

const COLS = [
  { id: 'espera', titulo: 'En espera', filtro: (i) => i.estado === 'en_oleo' },
  { id: 'proceso', titulo: 'En proceso', filtro: (i) => i.estado === 'en_proceso_oleo' },
  { id: 'lib', titulo: 'Liberadas hoy', filtro: (i) => i.estado === 'liberada' && i.cerrada_at && new Date(i.cerrada_at).toDateString() === new Date().toDateString() },
]

const ACCIONES = {
  en_oleo: [
    { nuevo: 'en_proceso_oleo', label: 'Iniciar proceso OLEO', css: 'primary' },
    { nuevo: 'caso_especial', label: 'Marcar caso especial', css: 'danger' },
  ],
  en_proceso_oleo: [
    { nuevo: 'liberada', label: 'Liberar unidad ✓', css: 'success' },
    { nuevo: 'espera_particularidad', label: 'Falta particularidad (pausar)', css: 'warn' },
  ],
  espera_particularidad: [
    { nuevo: 'en_proceso_oleo', label: 'Retomar OLEO', css: 'primary' },
  ],
  caso_especial: [
    { nuevo: 'en_oleo', label: 'Volver a espera de OLEO', css: 'primary' },
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
      </div>
      <div className="tags">
        {i.fallas.map((f) => <FallaTag key={f.id} falla={f} />)}
      </div>
      {i.notas && <div className="nota-prev">{i.notas}</div>}
    </button>
  )
}

export default function Oleo() {
  const [tab, setTab] = useState('espera')
  const [selInc, setSelInc] = useState(null)
  const [accion, setAccion] = useState(null)
  const [, setTick] = useState(0)
  const refrescar = () => setTick((t) => t + 1)

  const todas = incidencias((i) => i.unidad && (!i.unidad.tipo || i.unidad.tipo === 'carroceria'))
  const abiertas = todas.filter((i) => !i.cerrada_at)

  const inc = selInc ? todas.find((i) => i.id === selInc) : null

  const ejecutar = (operario_id) => {
    transicion(selInc, accion.nuevo, operario_id)
    setAccion(null)
    setSelInc(null)
    refrescar()
  }

  return (
    <div>
      <h3>Proceso OLEO</h3>
      <p className="sub">Gestión de unidades enviadas al proceso de OLEO.</p>

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
          <p className="muted" style={{ margin: '6px 0 0', fontWeight: 600 }}>
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

      {inc && accion && (
        <OperarioPicker
          roles={['oleo', 'box']}
          titulo={`${accion.label} — ¿quién lo registra?`}
          onPick={ejecutar}
          onClose={() => setAccion(null)}
        />
      )}
    </div>
  )
}
