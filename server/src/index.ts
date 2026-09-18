import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import { GameRoom, genRoomCode } from './game/GameRoom.js';
import type { ClientMessage } from './shared.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT) || 3000;

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const rooms = new Map<string, GameRoom>();
const playerRoom = new Map<string, string>(); // playerId -> roomCode

// 静态前端
const clientDistCandidates = [
  path.resolve(__dirname, '../../../../client/dist'),
  path.resolve(__dirname, '../../client/dist'),
];
const clientDist = clientDistCandidates.find((d) => fs.existsSync(d)) || clientDistCandidates[0];
app.use(express.static(clientDist));
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, rooms: rooms.size, name: '天元争锋' });
});
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/ws') || req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) res.status(404).send('请先执行 npm run build');
  });
});

function send(ws: WebSocket, data: unknown) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
}

wss.on('connection', (ws) => {
  let playerId = randomUUID();
  let nickname = '';

  send(ws, { type: 'toast', message: '已连接天元争锋服务器' });

  ws.on('message', (raw) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(String(raw));
    } catch {
      send(ws, { type: 'error', message: '无效消息' });
      return;
    }

    if (msg.type === 'create_room') {
      nickname = (msg.nickname || '侠客').slice(0, 12);
      playerId = randomUUID();
      let code = genRoomCode();
      while (rooms.has(code)) code = genRoomCode();
      const room = new GameRoom(code, playerId);
      const err = room.addPlayer(playerId, nickname, (d) => send(ws, d));
      if (err) {
        send(ws, { type: 'error', message: err });
        return;
      }
      rooms.set(code, room);
      playerRoom.set(playerId, code);
      send(ws, { type: 'room_created', roomCode: code, playerId });
      room.broadcastState();
      return;
    }

    if (msg.type === 'join_room') {
      nickname = (msg.nickname || '侠客').slice(0, 12);
      const code = (msg.roomCode || '').toUpperCase().trim();
      const room = rooms.get(code);
      if (!room) {
        send(ws, { type: 'error', message: '房间不存在' });
        return;
      }
      playerId = randomUUID();
      const err = room.addPlayer(playerId, nickname, (d) => send(ws, d));
      if (err) {
        send(ws, { type: 'error', message: err });
        return;
      }
      playerRoom.set(playerId, code);
      send(ws, { type: 'joined', roomCode: code, playerId });
      room.broadcastState();
      return;
    }

    if (msg.type === 'leave_room') {
      const code = playerRoom.get(playerId);
      if (code) {
        const room = rooms.get(code);
        room?.removePlayer(playerId);
        playerRoom.delete(playerId);
        if (room && room.players.length === 0) rooms.delete(code);
      }
      return;
    }

    const code = playerRoom.get(playerId);
    if (!code) {
      send(ws, { type: 'error', message: '请先加入房间' });
      return;
    }
    const room = rooms.get(code);
    if (!room) {
      send(ws, { type: 'error', message: '房间已解散' });
      return;
    }
    room.handle(playerId, msg);
  });

  ws.on('close', () => {
    const code = playerRoom.get(playerId);
    if (!code) return;
    const room = rooms.get(code);
    if (!room) return;
    room.removePlayer(playerId);
    playerRoom.delete(playerId);
    if (room.players.length === 0) rooms.delete(code);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`天元争锋 已启动 http://${HOST}:${PORT}`);
  console.log(`WebSocket: ws://${HOST}:${PORT}/ws`);
});
