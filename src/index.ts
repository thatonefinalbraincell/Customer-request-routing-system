import express from 'express';
import cors from 'cors';
import http from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initWebSocket } from './config/ws.js';
import { initWorker } from './workers/requestWorker.js';

// Absolute file paths configuration for ESM environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Controllers & Middleware Imports (WIRED FIX: appended explicit .js targets)
import { rateLimiter } from './middleware/rateLimiter.js';
import { authenticateToken } from './middleware/auth.js';
import * as authController from './controllers/authController.js';
import { 
  createRequest, 
  listRequests, 
  getRequestById, 
  updateStatus, 
  addNote, 
  retryClassification 
} from './controllers/requestController.js';

dotenv.config();
const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// FIXED: Anchor asset system to a fallback path resolver
const publicPath = path.isAbsolute('src/public') 
  ? 'src/public' 
  : path.join(process.cwd(), 'src', 'public');

app.use(express.static(publicPath));

// Real-time Gateway and Background Worker initialization
initWebSocket(server);
initWorker();

// Public Routes
app.post('/auth/login', authController.login);
app.post('/requests', rateLimiter(5, 60000), createRequest);

// FIXED: Root fallback router to drop index.html into browser windows
app.get('/', (_req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Protected Admin/Agent Dashboard Routes
app.get('/requests', authenticateToken, listRequests);
app.get('/requests/:id', authenticateToken, getRequestById);
app.patch('/requests/:id/status', authenticateToken, updateStatus);
app.post('/requests/:id/notes', authenticateToken, addNote);
app.post('/requests/:id/retry-classification', authenticateToken, retryClassification);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server fully operational on port ${PORT}`);
});