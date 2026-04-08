// middleware/index.ts
import express, { Express } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import { config } from '../config';
import { Logger } from '../utils/logger';
import path from 'path';


export const setupMiddleware = (app: Express) => {
  const logger = new Logger({ level: 'info' });

  app.use(cors({
    origin: config.corsOrigins,
    // No cookies used for auth; credentials not required
    credentials: false,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Access-Token', 'X-Refresh-Token'],
    exposedHeaders: ['Authorization', 'X-Access-Token', 'X-Refresh-Token'],
  }));
  app.use('/public', express.static(path.join(__dirname, '../public')));
  app.use(express.json({ limit: '10mb' }));
  app.use(helmet());
  app.use(morgan('combined'));
  app.use(express.urlencoded({ extended: true }));

  app.use((req, res, next) => {
    logger.info('Request received:', {
      method: req.method,
      path: req.path,
      originalUrl: req.originalUrl,
      baseUrl: req.baseUrl,
      url: req.url,
    });
    next();
  });
};