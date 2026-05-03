import 'reflect-metadata';
import express from 'express';
import dotenv from 'dotenv';
import userRoutes from './routes/user.route';
import authRoutes from './routes/auth.route';
import activityLogRoutes from './routes/activity-log.route';
import churchRoutes from './routes/church.route';
import personRoutes from './routes/person.route';
import joinRoutes from './routes/join.route';
import eventRoutes from './routes/event.route';
import denominationRequestRoutes from './routes/denomination-request.route';
import customDomainRoutes from './routes/custom-domain.route';
import websiteVisitRoutes from './routes/website-visit.route';
import followUpRoutes from './routes/follow-up.route';
import { errorHandler } from './middleware/error_handler.middleware';
import { setupMiddleware } from './middleware';
import { AppDataSource } from './config/database';
import emailService from './email/email.service';
import { firebaseAdmin } from './config/firebase.admin';
import { getIO, getOnlineUserIds } from './services/socket.service';

dotenv.config();

const app = express();

setupMiddleware(app);

app.use('/api/user', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/activities', activityLogRoutes);
app.use('/api/churches', churchRoutes);
app.use('/api/people', personRoutes);
app.use('/api/join', joinRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/denomination-requests', denominationRequestRoutes);
app.use('/api/custom-domains', customDomainRoutes);
app.use('/api/visits', websiteVisitRoutes);
app.use('/api/follow-ups', followUpRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/health/services', async (req, res) => {
  const checkedAt = new Date().toISOString();

  const probe = async <T,>(fn: () => Promise<T> | T) => {
    const started = Date.now();
    try {
      const details = await fn();
      return { ok: true, responseMs: Date.now() - started, details };
    } catch (error: any) {
      return { ok: false, responseMs: Date.now() - started, error: error?.message || 'Unavailable' };
    }
  };

  const [database, email, socket, storage] = await Promise.all([
    probe(async () => {
      await AppDataSource.query('SELECT 1');
      return { provider: 'PostgreSQL', initialized: AppDataSource.isInitialized };
    }),
    probe(async () => {
      const configured = await emailService.testEmailConfig();
      if (!configured) throw new Error('Resend email configuration is missing');
      return { provider: 'Resend', configured };
    }),
    probe(() => {
      const io = getIO();
      return { provider: 'Socket.IO', connectedUsers: getOnlineUserIds().length, engineClients: io.engine.clientsCount };
    }),
    probe(() => {
      const bucket = process.env.DOMAIN_FIREBASE_STORAGE_BUCKET || null;
      const appReady = Boolean(firebaseAdmin.apps.length);
      if (!bucket || !appReady) throw new Error('Firebase storage configuration is incomplete');
      return { provider: 'Firebase Storage', bucket, appReady };
    }),
  ]);

  res.json({
    status: 'OK',
    timestamp: checkedAt,
    services: { database, email, socket, storage },
  });
});

app.use(errorHandler);

export default app;