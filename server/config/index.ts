import dotenv from 'dotenv';

dotenv.config();

interface AppConfig {
  nodeEnv: string;
  port: number;
  corsOrigins: string[];
}

export const config: AppConfig = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '9999', 10),
  corsOrigins:
        [
          'http://localhost:3000',
          'http://localhost:5173',
          'http://localhost:5174',
          'http://localhost:5172',
          'http://localhost:3001',
          'http://localhost:3002',
          'https://churchmanagement-m27h.onrender.com',
          'https://theunitedchurch.online'
        ],
};