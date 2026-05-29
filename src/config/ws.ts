import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import url from 'url';
import jwt from 'jsonwebtoken';

let wss: WebSocketServer;
const clients = new Set<WebSocket>();

export const initWebSocket = (server: Server) => {
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws, req) => {
    // 1. Extract the token query parameter passed by your index.html (?token=blah)
    const parameters = url.parse(req.url || '', true).query;
    const token = parameters.token as string;

    // 2. Reject the handshake immediately if the token is completely missing
    if (!token) {
      console.log("❌ WebSocket Handshake Rejected: Security Token Missing");
      ws.close(4001, "Unauthorized: Token Missing");
      return;
    }

    try {
      // 3. Verify the JWT token using the secret in your environment variables
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      console.log(`🟢 WebSocket Authenticated for: ${(decoded as any).email || 'Agent'}`);
      
      // Save identity payload directly inside the socket context if needed later
      (ws as any).user = decoded;

    } catch (err) {
      console.log("❌ WebSocket Handshake Rejected: Invalid or Expired Session Token");
      ws.close(4002, "Unauthorized: Token Invalid");
      return;
    }

    // 4. Add to active tracking set if authenticated successfully
    clients.add(ws);

    ws.on('close', () => {
      console.log('⚪ Client disconnected from WebSocket engine');
      clients.delete(ws);
    });
  });
};

export const broadcastEvent = (type: string, data: any) => {
  const payload = JSON.stringify({ type, data });
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
};