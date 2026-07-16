import { useEffect, useState } from 'react'
import { Icon } from './components/ui'
import RolSelect from './screens/RolSelect'
import Puesto from './screens/Puesto'
import Buscar from './screens/Buscar'
import Panel from './screens/Panel'
import { initDB, onDataChange } from './data/repo'
import { USE_SUPABASE } from './data/supabase'

const ROL_LABEL = { revision: 'Revisión final', oleo: 'Óleo', box: 'Box de retoques', supervisor: 'Supervisión' }

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

const rolGuardado = () => {
  const r = localStorage.getItem('terminal-rol') || ''
  return ROL_LABEL[r] ? r : ''
}

export default function App() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rol, setRol] = useState(rolGuardado)
  const [tab, setTab] = useState(location.hash.slice(2))
  const [, setTick] = useState(0)

  useEffect(() => {
    initDB()
      .then(() => setLoading(false))
      .catch((e) => setError(e.message))
  }, [])

  useEffect(() => onDataChange(() => setTick((t) => t + 1)), [])

  useEffect(() => {
    const f = () => setTab(location.hash.slice(2))
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])

  if (error) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <h2>Error de conexión</h2>
        <p style={{ color: '#c33' }}>{error}</p>
        <p>Verificá que las credenciales de Supabase estén correctas en el archivo <code>.env</code></p>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: 'center', marginTop: '30vh' }}>
        <div className="spinner" />
        <p style={{ marginTop: 16, opacity: 0.7 }}>Conectando…</p>
      </div>
    )
  }

  if (!rol) {
    return (
      <RolSelect onPick={(r) => { localStorage.setItem('terminal-rol', r); setRol(r); location.hash = '#/' }} />
    )
  }

  const tabs = tabsDe(rol)
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
        <span className={USE_SUPABASE ? 'online-pill' : 'demo-pill'}>
          {USE_SUPABASE ? 'EN LÍNEA' : 'MODO DEMO'}
        </span>
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
