import { Icon } from '../components/ui'

const ROLES_CRONOS = [
  { id: 'revision', t: 'Revisión final', d: 'Detectar defectos y enviar a Box u OLEO', icon: 'lupa2', bg: 'var(--purple-soft)', fg: 'var(--purple)' },
  { id: 'box', t: 'Box de reparación', d: 'Tomar unidades, repararlas y liberarlas', icon: 'llave', bg: 'var(--blue-soft)', fg: 'var(--blue)' },
  { id: 'oleo', t: 'Proceso OLEO', d: 'Gestión de unidades en el proceso OLEO', icon: 'auto', bg: 'var(--amber-soft)', fg: 'var(--amber)' },
  { id: 'supervisor', t: 'Supervisión', d: 'Indicadores, alertas y exportación', icon: 'panel', bg: 'var(--green-soft)', fg: 'var(--green)' },
]

const ROLES_OTRAS = [
  { id: 'cabina', t: 'Puesto Cabina', d: 'Registrar y reparar desvíos en Cabina', icon: 'auto', bg: 'var(--blue-soft)', fg: 'var(--blue)' },
  { id: 'cajas', t: 'Puesto Cajas', d: 'Registrar y reparar desvíos en Cajas', icon: 'piso', bg: 'var(--amber-soft)', fg: 'var(--amber)' },
]

export default function RolSelect({ onPick }) {
  const renderRol = (r) => (
    <button key={r.id} className="btn rol" onClick={() => onPick(r.id)}>
      <span className="rol-ico" style={{ background: r.bg, color: r.fg }}>
        <Icon name={r.icon} size={24} />
      </span>
      <div>
        <strong>{r.t}</strong>
        <span>{r.d}</span>
      </div>
    </button>
  )

  return (
    <div className="rol-select">
      <div className="rol-hero">
        <div className="logo">TC</div>
        <div>
          <h1>Trazabilidad de Carrocerías</h1>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>Elegí el tipo de proceso y puesto de esta terminal</p>
        </div>
      </div>
      
      <h4 style={{ margin: '16px 0 8px', color: 'var(--faint)', fontSize: 13, textTransform: 'uppercase' }}>Flujo Cronos (Carrocerías)</h4>
      {ROLES_CRONOS.map(renderRol)}

      <h4 style={{ margin: '24px 0 8px', color: 'var(--faint)', fontSize: 13, textTransform: 'uppercase' }}>Otros Componentes (Cabina y Cajas)</h4>
      {ROLES_OTRAS.map(renderRol)}

      <p className="muted" style={{ fontSize: 12.5, textAlign: 'center', marginTop: 16 }}>
        El puesto se puede cambiar en cualquier momento desde el encabezado.
      </p>
    </div>
  )
}
