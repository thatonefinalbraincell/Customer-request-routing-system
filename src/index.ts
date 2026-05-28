import express from 'express';
import cors from 'cors';
import http from 'http';
import dotenv from 'dotenv';
import { initWebSocket } from './config/ws.js';
import { initWorker } from './workers/requestWorker.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { authenticateToken } from './middleware/auth.js';
import * as authController from './controllers/authController.js';

// Named destructuring forces TypeScript to treat each handler function as an independent, cleanly castable reference
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
app.use(express.static('src/public'));

// Real-time Gateway and Background Worker initialization
initWebSocket(server);
initWorker();

// Public Routes
app.post('/auth/login', authController.login);
app.post('/requests', rateLimiter(5, 60000), createRequest);

// Protected Admin/Agent Dashboard Routes (Directly referenced handlers mapping flawlessly to Express)
app.get('/requests', authenticateToken, listRequests);
app.get('/requests/:id', authenticateToken, getRequestById);
app.patch('/requests/:id/status', authenticateToken, updateStatus);
app.post('/requests/:id/notes', authenticateToken, addNote);
app.post('/requests/:id/retry-classification', authenticateToken, retryClassification);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server fully operational on port ${PORT}`);
});