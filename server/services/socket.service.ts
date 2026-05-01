import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { TokenService } from "./auth/token.service";
import { config } from "../config";
import { AppDataSource } from "../config/database";
import { User } from "../models/user.model";

const tokenService = new TokenService();

let io: Server | null = null;
const activeUserSockets = new Map<string, Set<string>>();

export function initializeSocket(httpServer: HttpServer): Server {
  // Match the HTTP CORS policy: allow configured origins plus any
  // *.localhost:* subdomain (used for custom-domain previews in dev).
  const LOCALHOST_RE = /^https?:\/\/[^/]+\.localhost(:\d+)?$/i;
  const allowOrigin = (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    if (
      (config.corsOrigins as string[]).includes(origin) ||
      LOCALHOST_RE.test(origin)
    ) {
      callback(null, true);
    } else {
      callback(new Error(`Socket.IO CORS: origin '${origin}' is not allowed.`));
    }
  };

  io = new Server(httpServer, {
    cors: {
      origin: allowOrigin,
      credentials: true,
    },
  });

  io.use(authenticateSocket);
  io.on("connection", handleConnection);

  return io;
}

function authenticateSocket(socket: Socket, next: (err?: Error) => void) {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error("Authentication required"));
  }

  try {
    const payload = tokenService.verifyAccessToken(token);
    socket.data.userId = payload.id;
    socket.data.email = payload.email;
    next();
  } catch {
    next(new Error("Invalid token"));
  }
}

function handleConnection(socket: Socket) {
  const userId = socket.data.userId;
  if (typeof userId !== "string" || !userId) return;

  void markUserOnline(userId, socket.id);
  socket.join(`user:${userId}`);

  socket.on("join:branch", (branchId: string) => {
    if (typeof branchId !== "string" || !branchId) return;
    // Leave any previously joined branch rooms
    for (const room of socket.rooms) {
      if (room.startsWith("branch:")) socket.leave(room);
    }
    socket.join(`branch:${branchId}`);
  });

  socket.on("leave:branch", (branchId: string) => {
    if (typeof branchId === "string" && branchId) {
      socket.leave(`branch:${branchId}`);
    }
  });

  socket.on("disconnect", () => {
    socket.leave(`user:${userId}`);
    void markUserOffline(userId, socket.id);
  });
}

async function markUserOnline(userId: string, socketId: string): Promise<void> {
  const sockets = activeUserSockets.get(userId) ?? new Set<string>();
  const wasOnline = sockets.size > 0;
  sockets.add(socketId);
  activeUserSockets.set(userId, sockets);

  if (!wasOnline) {
    await touchLastAccess(userId);
    emitPresenceChanged();
  }
}

async function markUserOffline(userId: string, socketId: string): Promise<void> {
  const sockets = activeUserSockets.get(userId);
  if (!sockets) return;

  sockets.delete(socketId);
  if (sockets.size > 0) return;

  activeUserSockets.delete(userId);
  await touchLastAccess(userId);
  emitPresenceChanged();
}

async function touchLastAccess(userId: string): Promise<void> {
  try {
    if (!AppDataSource.isInitialized) return;
    await AppDataSource.getRepository(User).update(
      { id: userId },
      { last_access: new Date() },
    );
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Failed to update socket presence timestamp", error);
    }
  }
}

function emitPresenceChanged(): void {
  if (io) {
    io.emit("presence:changed", { at: new Date().toISOString() });
  }
}

export function isUserOnline(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return (activeUserSockets.get(userId)?.size ?? 0) > 0;
}

export function getOnlineUserIds(): string[] {
  return [...activeUserSockets.keys()];
}

export function getIO(): Server {
  if (!io) {
    throw new Error("Socket.IO not initialized. Call initializeSocket first.");
  }
  return io;
}

export function emitToUser(userId: string, event: string, data: any): void {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

export function emitToAll(event: string, data: any): void {
  if (io) {
    io.emit(event, data);
  }
}

export function emitToBranch(branchId: string, event: string, data: any): void {
  if (io && branchId) {
    io.to(`branch:${branchId}`).emit(event, data);
  }
}
