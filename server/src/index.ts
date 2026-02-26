import 'dotenv/config';
import path from 'path';
import app from './app';
import { initDatabase } from './db';

const PORT = process.env.PORT || 3000;

// Serve the built React frontend.
// In dev: run `cd client && npm run build` first, then Express serves it.
// BigCommerce loads the side panel iframe directly via ngrok → Express,
// so Express must serve the frontend in both dev and production.
const clientDist = path.join(__dirname, '../../client/dist');
app.use(require('express').static(clientDist));

// Side panel entry point + SPA fallback — serve index.html for all non-API routes
app.get('/panel', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

// Initialize database and start server
initDatabase();

app.listen(PORT, () => {
  console.log(`Scribe server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
