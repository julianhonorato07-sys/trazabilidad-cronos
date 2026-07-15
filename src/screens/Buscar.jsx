import { useState } from 'react'
import {
  getDB, incidencias, eventosDe, fmtFecha, fmtDur, fmtRel, dias, turnoLabel, colorNombre,
  tipoDe, tipoLabel, ORIGENES, ATRIBUCIONES, ESTADOS,
} from '../data/repo'
import { Modal, EstadoChip, FallaTag, Swatch, Vacio } from '../components/ui'

const CSS_TL = { liberada: 'g', caso_especial: 'r', en_espera: '' }

export default function Buscar() {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(null)

  const d = getDB()
  const res = q.length >= 3 ? d.unidades.filter((u) => u.cis.includes(q)).slice(0, 25) : []
  const inc = sel ? incidencias((i) => i.id === sel)[0] : null
  const eventos = inc ? eventosDe(inc.id) : []

  return (
    <div>
      <h3>Buscar unidad</h3>
      <p className="sub">Historial completo de cualquier CIS (Cronos, Cabina o Caja): estados, tiempos y operarios.</p>
      <input
        className="cis-input" inputMode="numeric" maxLength={10} placeholder="CIS o parte del número"
        value={q} onChange={(e) => setQ(e.target.value.replace(/\D/g, ''))}
      />

      <div className="lista" style={{ marginTop: 16 }}>
        {res.map((u) => {
          const incs = incidencias((i) => i.unidad_id === u.id)
          return (
            <div key={u.id} className="card">
              <div className="fila">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="cis">{u.cis}</span>
                  <span className="chip tipo">{tipoLabel(tipoDe(u))}</span>
                </div>
                <span className="chip"><Swatch cest={u.cest} size={12} /> {colorNombre(u.cest)}</span>
              </div>
              {u.salida_linea && (
                <p className="muted" style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 600 }}>
                  Salida de línea: {fmtFecha(u.salida_linea)}
                </p>
              )}
              {!incs.length && (
                <p className="muted" style={{ margin: '8px 0 0', fontSize: 13.5 }}>
                  Sin desvíos registrados — nunca salió de la línea regular.
                </p>
              )}
              {incs.map((i) => (
                <button key={i.id} className="btn ghost" style={{ marginTop: 10, minHeight: 48, fontSize: 14 }} onClick={() => setSel(i.id)}>
                  <span className="fila" style={{ width: '100%' }}>
                    <EstadoChip estado={i.estado} />
                    <span className="muted" style={{ fontSize: 13 }}>{fmtRel(i.detectada_at)} → historial</span>
                  </span>
                </button>
              ))}
            </div>
          )
        })}
        {q.length >= 3 && !res.length && <Vacio texto={`Sin resultados para «${q}»`} />}
        {q.length < 3 && <Vacio texto="Ingresá al menos 3 dígitos del CIS" />}
      </div>

      {inc && (
        <Modal onClose={() => setSel(null)}>
          <div className="fila">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="cis">{inc.unidad.cis}</span>
              <span className="chip tipo">{tipoLabel(tipoDe(inc.unidad))}</span>
            </div>
            <EstadoChip estado={inc.estado} />
          </div>
          <p className="muted" style={{ margin: '6px 0 0', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Swatch cest={inc.unidad.cest} size={12} /> {colorNombre(inc.unidad.cest)}
            <span className="chip origen">{ORIGENES[inc.origen] || 'Revisión final'}</span>
            <span className="chip">{turnoLabel(inc.turno)}</span>
            {inc.cerrada_at
              ? ` · ciclo cerrado en ${fmtDur(dias(inc.detectada_at) - dias(inc.cerrada_at))}`
              : ` · en piso hace ${fmtDur(dias(inc.detectada_at))}`}
          </p>
          {inc.atribucion && <p className="nota" style={{ marginTop: 10 }}>Origen del defecto: <strong>{ATRIBUCIONES[inc.atribucion]}</strong></p>}
          {inc.notas && <p className="nota" style={{ marginTop: 12 }}>{inc.notas}</p>}

          <h4>Fallas</h4>
          <div className="tags">{inc.fallas.map((f) => <FallaTag key={f.id} falla={f} />)}</div>

          <h4>Línea de tiempo</h4>
          <div className="tl">
            {eventos.map((e, idx) => {
              const prev = eventos[idx - 1]
              const durDias = prev ? (new Date(e.registrado_at) - new Date(prev.registrado_at)) / 86400000 : null
              return (
                <div key={e.id} className={'tl-item ' + (CSS_TL[e.estado_nuevo] || '')}>
                  {durDias != null && <span className="tl-dur">+{fmtDur(durDias)}</span>}
                  <div className="tl-fecha">{fmtFecha(e.registrado_at)} · {turnoLabel(e.turno)}</div>
                  <div className="tl-txt">
                    {ESTADOS[e.estado_nuevo].label}
                    {e.operario ? <span className="muted" style={{ fontWeight: 700 }}> — {e.operario.nombre}</span> : ''}
                  </div>
                  {e.observacion && <div className="tl-obs">{e.observacion}</div>}
                </div>
              )
            })}
          </div>

          <div className="acciones"><button className="btn ghost" onClick={() => setSel(null)}>Cerrar</button></div>
        </Modal>
      )}
    </div>
  )
}
