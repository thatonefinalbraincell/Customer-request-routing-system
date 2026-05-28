import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

let wss: WebSocketServer;
const clients = new Set<WebSocket>();

export const initWebSocket = (server: Server) => {
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    clients.add(ws);
    ws.on('close', () => clients.delete(ws));
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