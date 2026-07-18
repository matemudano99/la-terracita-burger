import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Sirve las funciones de /api también con `npm run dev` (en producción las
// ejecuta Vercel). Adapta req/res de Node al estilo (req.query, res.json…).
const apiDev = () => ({
  name: 'ltb-api-dev',
  configureServer(server) {
    // Vuelca .env a process.env para que /api lea SUPABASE_URL, PANEL_TOKEN…
    const env = loadEnv(server.config.mode, server.config.root, '')
    for (const [k, v] of Object.entries(env)) if (!(k in process.env)) process.env[k] = v
    server.middlewares.use('/api', async (req, res) => {
      try {
        // /api/orders?x=1 → módulo /api/orders.js (solo nombres simples)
        const url = new URL(req.url, 'http://localhost')
        const nombre = url.pathname.replace(/^\/+|\/+$/g, '')
        if (!/^[a-z][a-z-]*$/.test(nombre)) {
          res.statusCode = 404
          return res.end(JSON.stringify({ error: 'No encontrado' }))
        }
        req.query = Object.fromEntries(url.searchParams)
        if (['POST', 'PATCH', 'PUT'].includes(req.method)) {
          const chunks = []
          for await (const c of req) chunks.push(c)
          const raw = Buffer.concat(chunks).toString('utf8')
          req.body = raw ? JSON.parse(raw) : {}
        }
        res.status = (code) => ((res.statusCode = code), res)
        res.json = (obj) => {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(obj))
        }
        const mod = await server.ssrLoadModule(`/api/${nombre}.js`)
        await mod.default(req, res)
      } catch (err) {
        console.error('[api-dev]', err)
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'Error interno (dev)' }))
      }
    })
  },
})

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), apiDev()],
})
