import { useEffect, useState } from 'react'
import { Icon } from '../components/ui'

const saludoDe = (h) => (h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches')

// La terminal queda abierta en esta pantalla durante todo el turno: refrescamos
// el saludo cada minuto para que acompañe el cambio de franja horaria.
function useSaludo() {
  const [saludo, setSaludo] = useState(() => saludoDe(new Date().getHours()))
  useEffect(() => {
    const id = setInterval(() => setSaludo(saludoDe(new Date().getHours())), 60000)
    return () => clearInterval(id)
  }, [])
  return saludo
}

const ROLES = [
  { id: 'revision', t: 'Revisión final', d: 'Detectar defectos y enviar unidades al box', icon: 'lupa2', bg: 'var(--accent-soft)', fg: 'var(--accent-ink)' },
  { id: 'oleo', t: 'Óleo', d: 'Detectar defectos y enviar unidades al box', icon: 'auto', bg: 'var(--amber-soft)', fg: 'var(--amber)' },
  { id: 'box', t: 'Box de retoques', d: 'Tomar unidades, repararlas y liberarlas', icon: 'llave', bg: 'var(--blue-soft)', fg: 'var(--blue)' },
  { id: 'supervisor', t: 'Supervisión', d: 'Indicadores, alertas y exportación', icon: 'panel', bg: 'var(--green-soft)', fg: 'var(--green)' },
]

export default function RolSelect({ onPick }) {
  const saludo = useSaludo()
  return (
    <div className="rol-select">
      <div className="rol-hero">
        <div className="logo">TK</div>
        <span className="kicker">Cronos · KP1</span>
        <h1>TRAZABILIDAD</h1>
        <p className="saludo">{saludo}</p>
        <p>Elegí el puesto de esta terminal</p>
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

      <footer className="corp">
        <span className="corp-mark">STELLANTIS</span>
        <span className="corp-sub">Sistema interno de trazabilidad · Uso exclusivo de planta</span>
      </footer>
    </div>
  )
}
