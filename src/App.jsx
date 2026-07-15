import { useEffect, useState } from 'react'
import { Icon } from './components/ui'
import RolSelect from './screens/RolSelect'
import Puesto from './screens/Puesto'
import Buscar from './screens/Buscar'
import Panel from './screens/Panel'

const ROL_LABEL = { revision: 'Revisión final', oleo: 'Óleo', box: 'Box de retoques', supervisor: 'Supervisión' }

// Los tres puestos operativos son navegables desde la barra inferior, para saltar
// entre ellos sin pasar por la pantalla de inicio.
const PUESTOS = [
  { id: 'revision', label: 'Revisión', icon: 'lupa2' },
  { id: 'oleo', label: 'Óleo', icon: 'auto' },
  { id: 'box', label: 'Box', icon: 'llave' },
]

function tabsDe(rol) {
  const puestos = PUESTOS.map((p) => ({ ...p, render: () => <Puesto rol={p.id} /> }))
  const buscar = { id: 'buscar', label: 'Buscar', icon: 'buscar', render: () => <Buscar /> }
  const panel = { id: 'panel', label: 'Panel', icon: 'panel', render: () => <Panel /> }
  return rol === 'supervisor' ? [panel, ...puestos, buscar] : [...puestos, buscar]
}

// Un puesto guardado de una versión anterior (ej. "cabina", que ya no existe) no debe
// romper la app: se descarta y se vuelve a pedir el puesto.
const rolGuardado = () => {
  const r = localStorage.getItem('terminal-rol') || ''
  return ROL_LABEL[r] ? r : ''
}

export default function App() {
  const [rol, setRol] = useState(rolGuardado)
  const [tab, setTab] = useState(location.hash.slice(2))

  useEffect(() => {
    const f = () => setTab(location.hash.slice(2))
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])

  if (!rol) {
    return (
      <RolSelect onPick={(r) => { localStorage.setItem('terminal-rol', r); setRol(r); location.hash = '#/' }} />
    )
  }

  const tabs = tabsDe(rol)
  // Sin pestaña en la URL, abre la del puesto configurado en la terminal.
  const activa = tabs.find((t) => t.id === tab) || tabs.find((t) => t.id === rol) || tabs[0]

  return (
    <>
      <header className="app">
        <div className="logo">TK</div>
        <div className="brand">
          <strong>TRAZABILIDAD</strong>
          <span>Cronos · KP1</span>
        </div>
        <div className="spacer" />
        <span className="demo-pill">MODO DEMO</span>
        <button className="rol-chip" title="Cambiar puesto de la terminal"
          onClick={() => { localStorage.removeItem('terminal-rol'); setRol('') }}>
          {ROL_LABEL[rol]} ⌄
        </button>
      </header>
      <div className="wrap">{activa.render()}</div>
      <nav className="tabbar">
        {tabs.map((t) => (
          <button key={t.id} className={t.id === activa.id ? 'on' : ''} onClick={() => { location.hash = '#/' + t.id }}>
            <Icon name={t.icon} />
            {t.label}
          </button>
        ))}
      </nav>
    </>
  )
}
