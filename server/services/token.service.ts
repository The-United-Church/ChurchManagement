import * as jwt from "jsonwebtoken";
import * as crypto from "crypto";
import { User } from "../models/user.model";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const REFRESH_SECRET = process.env.REFRESH_SECRET || "your-refresh-secret-key";
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || "900000000m";
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || "7d";

export interface TokenPayload {
  id: string;
  email: string;
  role: any;
  type: "access" | "refresh";
}

export class TokenService {
  generateAccessToken(user: User): string {
    return jwt.sign(
      { id: user.id, email: user.email, role: user.role, type: "access" },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY as jwt.SignOptions["expiresIn"] }
    );
  }

  generateRefreshToken(user: User): string {
    return jwt.sign(
      { id: user.id, email: user.email, type: "refresh" },
      REFRESH_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY as jwt.SignOptions["expiresIn"] }
    );
  }

  generateTokenPair(user: User): { accessToken: string; refreshToken: string } {
    return {
      accessToken: this.generateAccessToken(user),
      refreshToken: this.generateRefreshToken(user),
    };
  }

  verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  }

  verifyRefreshToken(token: string): TokenPayload {
    return jwt.verify(token, REFRESH_SECRET) as TokenPayload;
  }

  hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }
}
