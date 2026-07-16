import { useEffect, useState } from 'react'
import {
  TIPOS, ORIGENES, ATRIBUCIONES, kpis, incidencias, dias, fmtDur, fmtHoras, semaforo, colorNombre,
  colorHex, tipoDe, resetDemo, csvEnPiso, csvEventos, ESTADOS, onDataChange,
} from '../data/repo'
import { USE_SUPABASE } from '../data/supabase'
import { Icon, descargar } from '../components/ui'

const FILTROS = [{ id: 'todos', label: 'Todos' }, ...TIPOS.map((t) => ({ id: t.id, label: t.label }))]

export default function Panel() {
  const [tipo, setTipo] = useState('todos')
  const [, setTick] = useState(0)

  useEffect(() => onDataChange(() => setTick((t) => t + 1)), [])

  const k = kpis(tipo)

  const abiertas = incidencias((i) => !i.cerrada_at && (tipo === 'todos' || tipoDe(i.unidad) === tipo))
  const sems = { green: 0, amber: 0, red: 0 }
  for (const i of abiertas) sems[semaforo(dias(i.detectada_at))]++

  const maxPareto = k.pareto.length ? k.pareto[0][1] : 1
  const colores = Object.entries(k.porColor).sort((a, b) => b[1] - a[1])
  const maxColor = colores.length ? colores[0][1] : 1

  return (
    <div>
      <h3>Panel de supervisión</h3>
      <p className="sub">Foto del piso en tiempo real. Los datos alimentan Power BI vía las vistas SQL.</p>

      <div className="seg">
        {FILTROS.map((f) => (
          <button key={f.id} className={f.id === tipo ? 'on' : ''} onClick={() => setTipo(f.id)}>
            {f.label}{f.id !== 'todos' ? ` (${k.porTipo[f.id]})` : ''}
          </button>
        ))}
      </div>

      <div className="tiles">
        <div className="tile">
          <span className="ico"><Icon name="piso" size={20} /></span>
          <div className="n">{k.enPiso}</div>
          <div className="l">Unidades en piso</div>
        </div>
        <div className={'tile' + (k.mas40 ? ' rojo' : '')}>
          <span className="ico"><Icon name="alerta" size={20} /></span>
          <div className="n">{k.mas40}</div>
          <div className="l">Más de 40 días</div>
        </div>
        <div className="tile">
          <span className="ico"><Icon name="reloj" size={20} /></span>
          <div className="n">{Math.round(k.promDias)} d</div>
          <div className="l">Promedio en piso</div>
        </div>
        <div className="tile">
          <span className="ico"><Icon name="ok" size={20} /></span>
          <div className="n">{k.liberadas7}</div>
          <div className="l">Liberadas últimos 7 días</div>
        </div>
      </div>

      <h4>En piso por tipo de unidad</h4>
      <div className="tiles" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {TIPOS.map((t) => (
          <div key={t.id} className="tile">
            <div className="n">{k.porTipo[t.id]}</div>
            <div className="l">{t.label} · {t.sub}</div>
          </div>
        ))}
      </div>

      <h4>Antigüedad del piso</h4>
      {!k.enPiso ? (
        <p className="muted" style={{ fontSize: 14 }}>Sin unidades en piso para este filtro.</p>
      ) : (
        <>
          <div className="stack">
            {sems.green > 0 && <div style={{ width: `${(sems.green / k.enPiso) * 100}%`, background: 'var(--green)' }} />}
            {sems.amber > 0 && <div style={{ width: `${(sems.amber / k.enPiso) * 100}%`, background: 'var(--amber)' }} />}
            {sems.red > 0 && <div style={{ width: `${(sems.red / k.enPiso) * 100}%`, background: 'var(--red)' }} />}
          </div>
          <div className="leyenda">
            <span><span className="dot green" /> 0–7 días: {sems.green}</span>
            <span><span className="dot amber" /> 7–40 días: {sems.amber}</span>
            <span><span className="dot red" /> +40 días: {sems.red}</span>
          </div>
        </>
      )}

      <h4>Tiempo de ciclo (promedio de liberadas)</h4>
      {k.tiempoTotal == null ? (
        <p className="muted" style={{ fontSize: 14 }}>Se calcula automáticamente cuando el box empiece a liberar unidades.</p>
      ) : (
        <div className="tiles" style={{ gridTemplateColumns: '1fr' }}>
          <div className="tile"><div className="n">{fmtHoras(k.tiempoTotal)}</div><div className="l">Desde que se detecta hasta que se libera</div></div>
        </div>
      )}

      <h4>En piso por origen</h4>
      <div className="strip">
        {Object.keys(ORIGENES).map((o) => (
          <span key={o} className="chip">{ORIGENES[o]}: {k.porOrigen[o] || 0}</span>
        ))}
      </div>

      <h4>Detecciones por turno</h4>
      <div className="tiles" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="tile"><div className="n">{k.porTurno.A}</div><div className="l">Turno A</div></div>
        <div className="tile"><div className="n">{k.porTurno.B}</div><div className="l">Turno B</div></div>
        <div className="tile"><div className="n">{k.porTurno.sd}</div><div className="l">Sin dato (previo a la app)</div></div>
      </div>

      <h4>Defectos detectados en Óleo</h4>
      {!k.porAtribucion.generada_oleo && !k.porAtribucion.no_vista_revision ? (
        <p className="muted" style={{ fontSize: 14 }}>Todavía no hay registros cargados desde Óleo.</p>
      ) : (
        <div className="tiles" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="tile">
            <div className="n">{k.porAtribucion.generada_oleo}</div>
            <div className="l">{ATRIBUCIONES.generada_oleo}</div>
          </div>
          <div className="tile rojo">
            <div className="n">{k.porAtribucion.no_vista_revision}</div>
            <div className="l">{ATRIBUCIONES.no_vista_revision} (se escapó)</div>
          </div>
        </div>
      )}

      <h4>Pareto de fallas</h4>
      {!k.pareto.length && <p className="muted" style={{ fontSize: 14 }}>Sin fallas registradas para este filtro.</p>}
      {k.pareto.map(([nombre, n]) => (
        <div key={nombre} className="pareto-fila">
          <span className="pl">{nombre}</span>
          <div className="pb" style={{ width: `${(n / maxPareto) * 52}%` }} />
          <span className="pn">{n}</span>
        </div>
      ))}

      <h4>En piso por color</h4>
      {!colores.length && <p className="muted" style={{ fontSize: 14 }}>Sin unidades en piso.</p>}
      {colores.map(([cest, n]) => (
        <div key={cest} className="color-fila">
          <span className="cl">
            <span className="swatch" style={{ background: colorHex(cest), width: 14, height: 14 }} />
            {colorNombre(cest)}
          </span>
          <div className="cb" style={{ width: `${(n / maxColor) * 52}%`, background: colorHex(cest) }} />
          <span className="pn">{n}</span>
        </div>
      ))}

      <h4>Alertas activas ({k.alertas.length})</h4>
      {!k.alertas.length && <p className="muted">Sin alertas. El piso está al día.</p>}
      {k.alertas.slice(0, 12).map((a) => (
        <div key={a.inc.id} className={'alerta ' + a.nivel}>
          <div>
            <span className="cis" style={{ fontSize: 17 }}>{a.inc.unidad.cis}</span>
            <span className="muted" style={{ fontSize: 13, display: 'block', fontWeight: 600 }}>
              {ESTADOS[a.inc.estado].label} · {a.motivo}
            </span>
          </div>
          <span className={'chip ' + a.nivel}>{fmtDur(dias(a.inc.detectada_at))}</span>
        </div>
      ))}
      {k.alertas.length > 12 && <p className="muted" style={{ fontSize: 13 }}>… y {k.alertas.length - 12} alertas más.</p>}

      <h4>Exportar</h4>
      <p className="muted" style={{ fontSize: 13.5, margin: '0 0 4px' }}>
        CSV listos para Excel o Power BI mientras no esté la conexión directa a la base.
      </p>
      <div className="fila-btns">
        <button className="btn" onClick={() => descargar('piso_actual.csv', csvEnPiso())}>⬇ Piso actual (CSV)</button>
        <button className="btn" onClick={() => descargar('historial_eventos.csv', csvEventos())}>⬇ Historial de eventos (CSV)</button>
      </div>

      {!USE_SUPABASE && (
        <div className="acciones" style={{ marginTop: 26 }}>
          <button className="btn ghost" onClick={async () => {
            if (confirm('¿Restaurar los datos de demo a partir del Excel? Se pierden los cambios hechos en la app.')) {
              await resetDemo(); location.reload()
            }
          }}>Restaurar datos de demo</button>
        </div>
      )}
    </div>
  )
}
