import { Hono } from 'hono'
import authorRoutes from './routes/author-routes'
import authRoutes from './routes/auth-routes'
import apiKeyRoutes from './routes/api-key-routes'


const app = new Hono()

app.route('/authors', authorRoutes)
app.route('/auth', authRoutes)
app.route('/api-keys', apiKeyRoutes)

export default app
