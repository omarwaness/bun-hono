import { Hono } from 'hono'
import authorRoutes from './routes/authorRoutes'
import authRoutes from './routes/authRoutes'


const app = new Hono()

app.route('/authors', authorRoutes)
app.route('/auth', authRoutes)

export default app
