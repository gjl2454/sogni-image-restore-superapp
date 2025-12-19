import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import restorationRoutes from './routes/restoration.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Trust proxy
app.set('trust proxy', 1);

// CORS Configuration
const allowedOrigins = [
  'https://restoration-local.sogni.ai',
  'http://localhost:5173',
  'http://localhost:3000'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || 
        origin.includes('localhost') || 
        origin.includes('restoration-local.sogni.ai')) {
      callback(null, true);
    } else {
      callback(null, true); // Allow for development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Client-App-ID', 'Accept'],
  exposedHeaders: ['Set-Cookie']
}));

app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API routes
app.use('/api/restore', restorationRoutes);

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});

