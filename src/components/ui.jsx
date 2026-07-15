import { useState } from 'react'
import { catalogo, colorHex, colorNombre, agregarOperario, ESTADOS, TURNOS } from '../data/repo'

export function Icon({ name, size = 22 }) {
  const paths = {
    registrar: <><rect x="4" y="4" width="16" height="16" rx="4.5" /><path d="M12 9v6M9 12h6" /></>,
    box: <><rect x="3.5" y="4" width="4.6" height="16" rx="1.6" /><rect x="9.7" y="4" width="4.6" height="10" rx="1.6" /><rect x="15.9" y="4" width="4.6" height="13" rx="1.6" /></>,
    buscar: <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l5 5" /></>,
    panel: <><path d="M4 20.5h16" /><rect x="4.5" y="11" width="3.6" height="6.5" rx="1.2" /><rect x="10.2" y="6" width="3.6" height="11.5" rx="1.2" /><rect x="15.9" y="13" width="3.6" height="4.5" rx="1.2" /></>,
    reloj: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
    alerta: <><path d="M12 4L21 19H3z" /><path d="M12 10v4M12 16.8v.2" /></>,
    ok: <><circle cx="12" cy="12" r="8.5" /><path d="M8.5 12.2l2.4 2.4 4.6-5" /></>,
    piso: <><path d="M4 17l8-4 8 4M4 12l8-4 8 4M4 7l8-4 8 4" /></>,
    lupa2: <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l5 5M8.5 11h5M11 8.5v5" /></>,
    auto: <><path d="M5 16l1.2-4.5A2 2 0 0 1 8.1 10h7.8a2 2 0 0 1 1.9 1.5L19 16" /><rect x="3.5" y="15.5" width="17" height="4" rx="1.6" /><path d="M7 19.5V21M17 19.5V21" /></>,
    llave: <><circle cx="7" cy="17" r="3.2" /><path d="M9.3 14.7L20 4M15.5 8.5L18 11M13 11l2 2" /></>,
    vacio: <><circle cx="12" cy="12" r="8.5" /><path d="M8.5 14.5c1 1.2 2.2 1.8 3.5 1.8s2.5-.6 3.5-1.8M9.3 10h.02M14.7 10h.02" /></>,
  }
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  )
}

export function Swatch({ cest, size = 15 }) {
  return <span className="swatch" style={{ background: colorHex(cest), width: size, height: size }} title={colorNombre(cest)} />
}

export function ColorChip({ cest }) {
  return (
    <span className="chip">
      <Swatch cest={cest} size={12} />
      {colorNombre(cest)}
    </span>
  )
}

export function Modal({ onClose, children }) {
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  )
}

const iniciales = (n) => n.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()

// Pide turno + operario. El operario puede elegirse de la lista o escribirse a mano
// (en ese caso queda guardado y aparece como botón la próxima vez).
export function OperarioPicker({ roles, titulo, onPick, onClose }) {
  const { operarios } = catalogo()
  const rol = (roles && roles[0]) || 'revision'
  const lista = operarios.filter((o) => !roles || roles.includes(o.rol) || o.rol === 'supervisor')
  const [turno, setTurno] = useState('')
  const [nuevo, setNuevo] = useState(false)
  const [nombre, setNombre] = useState('')
  const [err, setErr] = useState('')

  const elegir = (operario_id) => {
    if (!turno) return setErr('Elegí primero el turno.')
    onPick(operario_id, turno)
  }
  const confirmarNuevo = () => {
    if (!turno) return setErr('Elegí primero el turno.')
    if (nombre.trim().length < 2) return setErr('Escribí el nombre del operario.')
    onPick(agregarOperario(nombre, rol), turno)
  }

  return (
    <Modal onClose={onClose}>
      <h3>{titulo || '¿Quién registra?'}</h3>
      <p className="sub">Queda registrado el turno y quién fue el responsable.</p>
      {err && <div className="banner err"><span>{err}</span><button onClick={() => setErr('')}>Cerrar</button></div>}

      <h4>Turno</h4>
      <div className="grid2">
        {TURNOS.map((t) => (
          <button key={t.id} className={'btn turno-btn' + (turno === t.id ? ' on' : '')}
            onClick={() => { setErr(''); setTurno(t.id) }}>
            {t.label}
          </button>
        ))}
      </div>

      <h4>Operario</h4>
      {nuevo ? (
        <>
          <input className="nombre-input" placeholder="Nombre y apellido" value={nombre} autoFocus
            onChange={(e) => { setErr(''); setNombre(e.target.value) }} />
          <div className="acciones">
            <button className="btn primary" onClick={confirmarNuevo}>Confirmar</button>
            <button className="btn ghost" onClick={() => { setNuevo(false); setNombre('') }}>Volver a la lista</button>
          </div>
        </>
      ) : (
        <>
          <div className="grid2">
            {lista.map((o) => (
              <button key={o.id} className="btn op-btn" onClick={() => elegir(o.id)}>
                <span className="avatar">{iniciales(o.nombre)}</span>
                {o.nombre}
              </button>
            ))}
          </div>
          <div className="acciones">
            <button className="btn" onClick={() => { setErr(''); setNuevo(true) }}>✎ Otro… (escribir nombre)</button>
            <button className="btn ghost" onClick={onClose}>Cancelar</button>
          </div>
        </>
      )}
    </Modal>
  )
}

export function EstadoChip({ estado }) {
  const e = ESTADOS[estado]
  return <span className={'chip ' + e.css}>{e.label}</span>
}

export function FallaTag({ falla }) {
  return (
    <span className={'chip tag' + (falla.resuelta_at ? ' res' : '')}>
      {falla.tipo.nombre}{falla.part ? ' · ' + falla.part.codigo : ''}
    </span>
  )
}

export function Vacio({ texto }) {
  return (
    <div className="vacio">
      <Icon name="vacio" size={34} />
      {texto}
    </div>
  )
}

export function descargar(nombre, contenido) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob(['﻿' + contenido], { type: 'text/csv;charset=utf-8' }))
  a.download = nombre
  a.click()
  URL.revokeObjectURL(a.href)
}
