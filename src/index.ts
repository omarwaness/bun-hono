import { Hono } from 'hono'
import authorRoutes from './routes/author'


const app = new Hono()

app.route('/authors', authorRoutes)

export default app
