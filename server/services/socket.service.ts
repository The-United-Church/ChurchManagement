import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { TokenService } from "./auth/token.service";
import { config } from "../config";
import { AppDataSource } from "../config/database";
import { User } from "../models/user.model";

const tokenService = new TokenService();

let io: Server | null = null;
const activeUserSockets = new Map<string, Set<string>>();
const activeSessionStartedAt = new Map<string, Date>();

// ─── Live location tracking ─────────────────────────────────────────────
// In-memory only. No DB writes. Cleared automatically when socket disconnects
// or the member emits `location:stop`.
interface LiveLocation {
  userId: string;
  branchId: string;
  lat: number;
  lng: number;
  accuracy?: number | null;
  first_name: string | null;
  last_name: string | null;
  profile_img: string | null;
  updated_at: string;
}
// branchId -> userId -> live location
const liveLocations = new Map<string, Map<string, LiveLocation>>();
// socketId -> { userId, branchId } so we can clean up on disconnect
const socketTracking = new Map<string, { userId: string; branchId: string }>();
// userId -> cached display info (first_name, last_name, profile_img)
const userDisplayCache = new Map<string, { first_name: string | null; last_name: string | null; profile_img: string | null }>();

async function getDisplayInfo(userId: string) {
  const cached = userDisplayCache.get(userId);
  if (cached) return cached;
  try {
    if (!AppDataSource.isInitialized) {
      return { first_name: null, last_name: null, profile_img: null };
    }
    const u = await AppDataSource.getRepository(User).findOne({
      where: { id: userId },
      select: ["id", "first_name", "last_name", "profile_img"],
    });
    const info = {
      first_name: u?.first_name ?? null,
      last_name: u?.last_name ?? null,
      profile_img: u?.profile_img ?? null,
    };
    userDisplayCache.set(userId, info);
    return info;
  } catch {
    return { first_name: null, last_name: null, profile_img: null };
  }
}

function removeLiveLocation(userId: string, branchId: string): boolean {
  const branchMap = liveLocations.get(branchId);
  if (!branchMap) return false;
  const existed = branchMap.delete(userId);
  if (branchMap.size === 0) liveLocations.delete(branchId);
  return existed;
}

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

  // ─── Live location tracking ──────────────────────────────────────────
  socket.on(
    "location:update",
    async (payload: { branchId?: string; lat?: number; lng?: number; accuracy?: number }) => {
      const branchId = typeof payload?.branchId === "string" ? payload.branchId : null;
      const lat = typeof payload?.lat === "number" ? payload.lat : null;
      const lng = typeof payload?.lng === "number" ? payload.lng : null;
      const accuracy =
        typeof payload?.accuracy === "number" && Number.isFinite(payload.accuracy)
          ? payload.accuracy
          : null;
      if (!branchId || lat == null || lng == null) return;
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return;

      const display = await getDisplayInfo(userId);
      const entry: LiveLocation = {
        userId,
        branchId,
        lat,
        lng,
        accuracy,
        ...display,
        updated_at: new Date().toISOString(),
      };

      // Track which branch this socket is broadcasting to so we can clean up
      // on disconnect (or when the member switches branches).
      const prev = socketTracking.get(socket.id);
      if (prev && prev.branchId !== branchId) {
        if (removeLiveLocation(prev.userId, prev.branchId)) {
          io?.to(`branch:${prev.branchId}`).emit("location:member_left", {
            userId: prev.userId,
            branchId: prev.branchId,
          });
        }
      }
      socketTracking.set(socket.id, { userId, branchId });

      let branchMap = liveLocations.get(branchId);
      if (!branchMap) {
        branchMap = new Map();
        liveLocations.set(branchId, branchMap);
      }
      const isNew = !branchMap.has(userId);
      branchMap.set(userId, entry);

      io?.to(`branch:${branchId}`).emit("location:member_moved", entry);
      if (isNew) {
        io?.to(`branch:${branchId}`).emit("location:member_joined", entry);
      }
    },
  );

  socket.on("location:stop", (payload: { branchId?: string }) => {
    const branchId = typeof payload?.branchId === "string" ? payload.branchId : null;
    if (!branchId) return;
    if (removeLiveLocation(userId, branchId)) {
      io?.to(`branch:${branchId}`).emit("location:member_left", { userId, branchId });
    }
    const tracked = socketTracking.get(socket.id);
    if (tracked && tracked.userId === userId && tracked.branchId === branchId) {
      socketTracking.delete(socket.id);
    }
  });

  socket.on("location:request_snapshot", (payload: { branchId?: string }, ack?: (data: LiveLocation[]) => void) => {
    const branchId = typeof payload?.branchId === "string" ? payload.branchId : null;
    if (!branchId) {
      if (typeof ack === "function") ack([]);
      return;
    }
    const branchMap = liveLocations.get(branchId);
    const list = branchMap ? [...branchMap.values()] : [];
    if (typeof ack === "function") {
      ack(list);
    } else {
      socket.emit("location:snapshot", { branchId, members: list });
    }
  });

  socket.on("error", () => {
    socket.leave(`user:${userId}`);
    cleanupTrackingForSocket(socket.id);
    void markUserOffline(userId, socket.id);
  });

  socket.on("disconnect", () => {
    socket.leave(`user:${userId}`);
    cleanupTrackingForSocket(socket.id);
    void markUserOffline(userId, socket.id);
  });
}

function cleanupTrackingForSocket(socketId: string): void {
  const tracked = socketTracking.get(socketId);
  if (!tracked) return;
  socketTracking.delete(socketId);
  if (removeLiveLocation(tracked.userId, tracked.branchId)) {
    io?.to(`branch:${tracked.branchId}`).emit("location:member_left", {
      userId: tracked.userId,
      branchId: tracked.branchId,
    });
  }
}

async function markUserOnline(userId: string, socketId: string): Promise<void> {
  const sockets = activeUserSockets.get(userId) ?? new Set<string>();
  const wasOnline = sockets.size > 0;
  sockets.add(socketId);
  activeUserSockets.set(userId, sockets);

  if (!wasOnline) {
    const startedAt = new Date();
    activeSessionStartedAt.set(userId, startedAt);
    await touchLastAccess(userId, { current_session_started_at: startedAt });
    emitPresenceChanged();
  }
}

async function markUserOffline(userId: string, socketId: string): Promise<void> {
  const sockets = activeUserSockets.get(userId);
  if (!sockets) return;

  sockets.delete(socketId);
  if (sockets.size > 0) return;

  activeUserSockets.delete(userId);
  const endedAt = new Date();
  const startedAt = activeSessionStartedAt.get(userId);
  activeSessionStartedAt.delete(userId);
  const elapsedSeconds = startedAt
    ? Math.max(0, Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000))
    : 0;
  await finalizeSession(userId, elapsedSeconds, endedAt);
  emitPresenceChanged();
}

async function touchLastAccess(userId: string, extra: Partial<User> = {}): Promise<void> {
  try {
    if (!AppDataSource.isInitialized) return;
    await AppDataSource.getRepository(User).update(
      { id: userId },
      { last_access: new Date(), ...extra },
    );
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Failed to update socket presence timestamp", error);
    }
  }
}

async function finalizeSession(userId: string, elapsedSeconds: number, endedAt: Date): Promise<void> {
  try {
    if (!AppDataSource.isInitialized) return;
    const repo = AppDataSource.getRepository(User);
    const user = await repo.findOne({ where: { id: userId } });
    if (!user) return;
    user.last_access = endedAt;
    user.current_session_started_at = null;
    user.total_time_spent_seconds = (user.total_time_spent_seconds || 0) + elapsedSeconds;
    await repo.save(user);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Failed to finalize socket session duration", error);
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

export function getActiveSessionStartedAt(userId: string | null | undefined): Date | null {
  if (!userId) return null;
  return activeSessionStartedAt.get(userId) ?? null;
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
