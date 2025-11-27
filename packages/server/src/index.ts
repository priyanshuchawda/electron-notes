import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { notesRoutes } from './routes/notes';
import { tagsRoutes } from './routes/tags';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

const app = new Elysia()
  .use(cors())
  .use(notesRoutes)
  .use(tagsRoutes)
  .get('/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }))
  .onError(({ error }) => {
    console.error('Server error:', error);
    return { success: false, error: 'Internal server error' };
  })
  .listen(PORT);

console.log(`🚀 Server running at http://localhost:${app.server?.port}`);

export type App = typeof app;
