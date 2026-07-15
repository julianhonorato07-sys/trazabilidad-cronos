import { useEffect, useState } from 'react'
import { Icon } from './components/ui'
import RolSelect from './screens/RolSelect'
import Puesto from './screens/Puesto'
import Buscar from './screens/Buscar'
import Panel from './screens/Panel'

const ROL_LABEL = { revision: 'Revisión final', oleo: 'Óleo', box: 'Box de retoques', supervisor: 'Supervisión' }

// Pestañas de la barra inferior según el puesto de la terminal.
function tabsDe(rol) {
  if (rol === 'supervisor') {
    return [
      { id: 'panel', label: 'Panel', icon: 'panel', render: () => <Panel /> },
      { id: 'buscar', label: 'Buscar', icon: 'buscar', render: () => <Buscar /> },
    ]
  }
  return [
    { id: 'tablero', label: 'Tablero', icon: rol === 'box' ? 'llave' : 'registrar', render: () => <Puesto rol={rol} /> },
    { id: 'buscar', label: 'Buscar', icon: 'buscar', render: () => <Buscar /> },
  ]
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
  const activa = tabs.find((t) => t.id === tab) || tabs[0]

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
