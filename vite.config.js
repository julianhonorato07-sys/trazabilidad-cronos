import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: ruta bajo la que GitHub Pages sirve el proyecto (usuario.github.io/<repo>/).
// En dev queda en '/'. Cambiá el nombre del repo aquí si lo publicás con otro nombre.
export default defineConfig({
  plugins: [react()],
  base: '/',
})
