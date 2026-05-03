import app from './app';
import { AppDataSource } from './config/database';
import { createServer } from 'http';
import { initializeSocket } from './services/socket.service';
import { startCronJobs } from './services/cron.service';
import { config } from './config';
import { Logger } from './utils/logger';

const PORT = config.port;
const logger = new Logger({ level: 'info' });
const httpServer = createServer(app);

initializeSocket(httpServer);

const startServer = async () => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    logger.info('Database connected successfully');

    // Run cron jobs in-process when IN_TEST=true (local / staging).
    // In production on Render, native cron services call the standalone job
    // scripts instead — so we skip the in-process scheduler there.
    if (process.env.IN_TEST === 'true') {
      startCronJobs();
      logger.info('Cron jobs started in-process (IN_TEST=true)');
    }

    httpServer.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();