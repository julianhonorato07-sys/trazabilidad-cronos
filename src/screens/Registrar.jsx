import { useState } from 'react'
import { catalogo, unidadPorCis, crearIncidencia, colorNombre, fmtFecha, fmtRel } from '../data/repo'
import { Icon, OperarioPicker, Swatch } from '../components/ui'

export default function Registrar() {
  const { tipos, parts, colores } = catalogo()
  const [cis, setCis] = useState('')
  const [cest, setCest] = useState('')
  const [tiposSel, setTiposSel] = useState([])
  const [partsSel, setPartsSel] = useState({})
  const [nota, setNota] = useState('')
  const [pick, setPick] = useState(false)
  const [ok, setOk] = useState('')
  const [err, setErr] = useState('')

  const unidad = cis.length === 7 ? unidadPorCis(cis) : null

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
    if (!/^\d{7}$/.test(cis)) return 'Ingresá el CIS de 7 dígitos.'
    if (!tiposSel.length) return 'Seleccioná al menos una falla.'
    for (const tid of tiposSel) {
      const t = tipos.find((x) => x.id === tid)
      if (t.requiere_particularidad && !(partsSel[tid] || []).length) {
        return `Indicá qué particularidad corresponde a "${t.nombre}".`
      }
    }
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
      crearIncidencia({ cis, cest: unidad ? unidad.cest : cest, fallas, notas: nota, operario_id })
      setOk(cis)
      setCis(''); setCest(''); setTiposSel([]); setPartsSel({}); setNota('')
    } catch (e) {
      setErr(e.message)
    }
  }

  return (
    <div>
      {err && (
        <div className="banner err">
          <span>{err}</span>
          <button onClick={() => setErr('')}>Cerrar</button>
        </div>
      )}

      <h3>Registrar desvío</h3>
      <p className="sub">Ingresá la carrocería, clasificá la falla y envíala al box.</p>

      <input
        className="cis-input"
        inputMode="numeric"
        maxLength={7}
        placeholder="CIS · 7 dígitos"
        value={cis}
        onChange={(e) => { setErr(''); setCis(e.target.value.replace(/\D/g, '')) }}
      />
      {unidad && (
        <div className="unidad-info">
          <Icon name="ok" size={19} />
          <span>
            Verificada en el maestro — <Swatch cest={unidad.cest} size={11} /> {colorNombre(unidad.cest)}
            {unidad.salida_linea ? ` · salió de línea ${fmtRel(unidad.salida_linea)} (${fmtFecha(unidad.salida_linea)})` : ''}
          </span>
        </div>
      )}
      {cis.length === 7 && !unidad && (
        <div className="unidad-info nueva">
          <Icon name="alerta" size={19} />
          <span>CIS nuevo, no está en el maestro. Indicá el color:</span>
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
          <button
            key={t.id}
            className={'falla-btn' + (tiposSel.includes(t.id) ? ' on' : '')}
            onClick={() => toggleTipo(t.id)}
          >
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
            {parts.map((p) => (
              <button
                key={p.id}
                className={'chip pick' + ((partsSel[tid] || []).includes(p.id) ? ' on' : '')}
                onClick={() => togglePart(tid, p.id)}
              >
                {p.nombre}
              </button>
            ))}
          </div>
        )
      })}

      <h4>Observaciones (opcional)</h4>
      <textarea
        placeholder="Ej: bollo grande, revisar grafado del baúl…"
        value={nota}
        onChange={(e) => setNota(e.target.value)}
      />

      <div className="acciones">
        <button
          className="btn primary"
          onClick={() => { const v = validar(); v ? setErr(v) : setPick(true) }}
        >
          Enviar al box →
        </button>
      </div>

      {pick && (
        <OperarioPicker roles={['revision']} titulo="¿Quién detectó el desvío?" onPick={enviar} onClose={() => setPick(false)} />
      )}

      {ok && (
        <div className="exito" onClick={() => setOk('')}>
          <div className="exito-card" onClick={(e) => e.stopPropagation()}>
            <div className="exito-check">✓</div>
            <div className="cis" style={{ fontSize: 30 }}>{ok}</div>
            <p className="muted" style={{ margin: '6px 0 18px' }}>Registrada y enviada al box</p>
            <button className="btn primary" onClick={() => setOk('')}>Registrar otra</button>
          </div>
        </div>
      )}
    </div>
  )
}
