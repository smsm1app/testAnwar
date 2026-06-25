// server.ts - Local Development and VPS Entrypoint
// Do NOT use this file for Vercel deployment. Vercel uses /api/index.ts

import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import app from './api/index.js'; // Import the Express app from our Serverless entrypoint

const PORT = parseInt(process.env.PORT || '3000', 10);
const IS_PROD = process.env.NODE_ENV === 'production';

async function startServer() {
  if (!IS_PROD) {
    // In development, we use Vite's middleware to serve the frontend
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // In production (non-Vercel), serve the built static files
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SHAMS ERP] Server running on http://localhost:${PORT}`);
    console.log(`[SHAMS ERP] Mode: ${IS_PROD ? 'Production (VPS)' : 'Development'}`);
  });
}

startServer().catch(err => {
  console.error('[FATAL] Server startup failed:', err);
  process.exit(1);
});
