import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth';
import { ordersRouter } from './routes/orders';
import { printRouter } from './routes/print';
import { sendRouter } from './routes/send';
import { messageRouter } from './routes/message';
import { notesRouter } from './routes/notes';
import { draftsRouter } from './routes/drafts';
import { catalogRouter } from './routes/catalog';
import { storeContext } from './middleware/storeContext';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes (no store context needed - these handle installation)
app.use('/auth', authRouter);

// API routes (require store context)
app.use('/api/order', storeContext, ordersRouter);
app.use('/api/order', storeContext, printRouter);
app.use('/api/order', storeContext, sendRouter);
app.use('/api/order', storeContext, messageRouter);
app.use('/api/order', storeContext, notesRouter);
app.use('/api/drafts', storeContext, draftsRouter);
app.use('/api/catalog', storeContext, catalogRouter);

export default app;
