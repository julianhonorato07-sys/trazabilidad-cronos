import { useEffect, useState } from 'react'
import { Icon } from './components/ui'
import RolSelect from './screens/RolSelect'
import Registrar from './screens/Registrar'
import Box from './screens/Box'
import Cabina from './screens/Cabina'
import Cajas from './screens/Cajas'
import Buscar from './screens/Buscar'
import Panel from './screens/Panel'

const TABS = [
  { id: 'registrar', label: 'Registrar', icon: 'registrar', comp: Registrar },
  { id: 'box', label: 'Box', icon: 'box', comp: Box },
  { id: 'cabina', label: 'Cabina', icon: 'auto', comp: Cabina },
  { id: 'cajas', label: 'Cajas', icon: 'piso', comp: Cajas },
  { id: 'buscar', label: 'Buscar', icon: 'buscar', comp: Buscar },
  { id: 'panel', label: 'Panel', icon: 'panel', comp: Panel },
]
const ROL_LABEL = { revision: 'Revisión final', box: 'Box', supervisor: 'Supervisión', cabina: 'Cabina', cajas: 'Cajas' }
const ROL_TAB = { revision: 'registrar', box: 'box', supervisor: 'panel', cabina: 'cabina', cajas: 'cajas' }

export default function App() {
  const [rol, setRol] = useState(localStorage.getItem('terminal-rol') || '')
  const [tab, setTab] = useState(location.hash.slice(2))

  useEffect(() => {
    const f = () => setTab(location.hash.slice(2))
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])

  if (!rol) {
    return (
      <RolSelect
        onPick={(r) => {
          localStorage.setItem('terminal-rol', r)
          setRol(r)
          location.hash = '#/' + ROL_TAB[r]
        }}
      />
    )
  }

  const activa = TABS.find((t) => t.id === tab) || TABS.find((t) => t.id === ROL_TAB[rol])
  const Pantalla = activa.comp

  return (
    <>
      <header className="app">
        <div className="logo">TC</div>
        <div className="brand">
          <strong>Trazabilidad Cronos</strong>
          <span>Carrocerías fuera de línea</span>
        </div>
        <div className="spacer" />
        <span className="demo-pill">MODO DEMO</span>
        <button
          className="rol-chip"
          title="Cambiar puesto de la terminal"
          onClick={() => { localStorage.removeItem('terminal-rol'); setRol('') }}
        >
          {ROL_LABEL[rol]} ⌄
        </button>
      </header>
      <div className="wrap">
        <Pantalla />
      </div>
      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.id} className={t.id === activa.id ? 'on' : ''} onClick={() => { location.hash = '#/' + t.id }}>
            <Icon name={t.icon} />
            {t.label}
          </button>
        ))}
      </nav>
    </>
  )
}
