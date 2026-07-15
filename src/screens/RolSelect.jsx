import { Icon } from '../components/ui'

const ROLES = [
  { id: 'revision', t: 'Revisión final', d: 'Detectar defectos y enviar unidades al box', icon: 'lupa2', bg: 'var(--purple-soft)', fg: 'var(--purple)' },
  { id: 'oleo', t: 'OLEO', d: 'Detectar defectos y enviar unidades al box', icon: 'auto', bg: 'var(--amber-soft)', fg: 'var(--amber)' },
  { id: 'box', t: 'Box de retoques', d: 'Tomar unidades, repararlas y liberarlas', icon: 'llave', bg: 'var(--blue-soft)', fg: 'var(--blue)' },
  { id: 'supervisor', t: 'Supervisión', d: 'Indicadores, alertas y exportación', icon: 'panel', bg: 'var(--green-soft)', fg: 'var(--green)' },
]

export default function RolSelect({ onPick }) {
  return (
    <div className="rol-select">
      <div className="rol-hero">
        <div className="logo">TK</div>
        <div>
          <h1>Trazabilidad Cronos + KP1</h1>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>Elegí el puesto de esta terminal</p>
        </div>
      </div>
      {ROLES.map((r) => (
        <button key={r.id} className="btn rol" onClick={() => onPick(r.id)}>
          <span className="rol-ico" style={{ background: r.bg, color: r.fg }}><Icon name={r.icon} size={24} /></span>
          <div>
            <strong>{r.t}</strong>
            <span>{r.d}</span>
          </div>
        </button>
      ))}
      <p className="muted" style={{ fontSize: 12.5, textAlign: 'center', marginTop: 6 }}>
        Cada puesto maneja Cronos, Cabina y Caja en pestañas. Se puede cambiar desde el encabezado.
      </p>
    </div>
  )
}
