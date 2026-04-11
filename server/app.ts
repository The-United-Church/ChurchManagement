import 'reflect-metadata';
import express from 'express';
import dotenv from 'dotenv';
import userRoutes from './routes/user.route';
import authRoutes from './routes/auth.route';
import activityLogRoutes from './routes/activity-log.route';
import churchRoutes from './routes/church.route';
import personRoutes from './routes/person.route';
import { errorHandler } from './middleware/error_handler.middleware';
import { setupMiddleware } from './middleware';

dotenv.config();

const app = express();

setupMiddleware(app);

app.use('/api/user', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/activities', activityLogRoutes);
app.use('/api/churches', churchRoutes);
app.use('/api/people', personRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

export default app;