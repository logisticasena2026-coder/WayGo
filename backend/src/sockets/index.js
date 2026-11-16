// ============================================================
// WayGo - Socket.IO (presencia, salas y eventos en tiempo real)
// ============================================================
const { Server } = require('socket.io');
const { verifyAccessToken } = require('../utils/jwt');
const prisma = require('../utils/prisma');
const config = require('../config/env');

let io = null;

// Mapa de conexiones activas: userId -> Set de socket ids
const presence = new Map();

/** Sala personal de un usuario */
const userRoom = (userId) => `user:${userId}`;
/** Sala por rol */
const roleRoom = (role) => `role:${role}`;

async function socketAuthMiddleware(socket, next) {
  try {
    const token =
      socket.handshake.auth?.token ||
      (socket.handshake.headers.authorization || '').replace(/^Bearer /, '');
    if (!token) return next(new Error('AUTH_TOKEN_REQUIRED'));

    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, status: true, role: { select: { name: true } } },
    });
    if (!user || user.status !== 'ACTIVE') return next(new Error('AUTH_USER_INVALID'));

    socket.data.user = { id: user.id, email: user.email, role: user.role.name };
    next();
  } catch (e) {
    next(new Error('AUTH_TOKEN_INVALID'));
  }
}

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: config.clientUrl, credentials: true },
  });

  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    const { id, role } = socket.data.user;
    socket.join(userRoom(id));
    socket.join(roleRoom(role));

    if (!presence.has(id)) presence.set(id, new Set());
    presence.get(id).add(socket.id);
    io.to(roleRoom('CALL_CENTER')).emit('presence:user', { userId: id, role, online: true });

    socket.on('ping:presence', () => {
      socket.emit('pong:presence', { at: new Date().toISOString() });
    });

    socket.on('disconnect', () => {
      const set = presence.get(id);
      if (set) {
        set.delete(socket.id);
        if (set.size === 0) {
          presence.delete(id);
          io.to(roleRoom('CALL_CENTER')).emit('presence:user', { userId: id, role, online: false });
        }
      }
    });
  });

  return io;
}

/** Emite a un usuario */
function emitToUser(userId, event, payload) {
  if (io) io.to(userRoom(userId)).emit(event, payload);
}

/** Emite a todos los de un rol */
function emitToRole(role, event, payload) {
  if (io) io.to(roleRoom(role)).emit(event, payload);
}

/** IDs de usuarios conectados en este momento */
function getConnectedUserIds() {
  return [...presence.keys()];
}

module.exports = { initSocket, emitToUser, emitToRole, getConnectedUserIds, getIO: () => io };
