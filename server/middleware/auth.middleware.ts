import { Request, Response, NextFunction, RequestHandler } from "express";
import { UserService } from "../services/user.service";
import { TokenService } from "../services/token.service";
import { getPermissionsForRole } from "../utils/roles";
import dotenv from "dotenv";
dotenv.config();

const tokenService = new TokenService();


export interface AuthRequest extends Request {
    user: {
        id: string;
        email: string;
        role: string;
        groups?: any[];
        effectivePermissions?: string[];
    };
}

export const authMiddleware = (userService: UserService) => {
    return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const authHeader = req.headers.authorization;
            const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
            const xAccessToken = (req.headers['x-access-token'] as string | undefined) || undefined;
            const token = headerToken || xAccessToken || null;

            if (process.env.NODE_ENV !== 'production') {
                console.debug('[auth] incoming request', {
                    path: req.path,
                    hasAuthHeader: Boolean(authHeader),
                    hasXAccessToken: Boolean(xAccessToken),
                });
            }

            if (!token) {
                res.status(401).json({
                    statusCode: 401,
                    message: "No authorization token"
                });
                return;
            }

            const decoded = tokenService.verifyAccessToken(token);
            const user = await userService.getUserById(decoded.id);

            if (!user) {
                res.status(401).json({
                    statusCode: 401,
                    message: "User not found"
                });
                return;
            }

            // Check if user is active
            if (!user.is_active) {
                res.status(403).json({
                    statusCode: 403,
                    message: "Account is deactivated. Please contact an administrator."
                });
                return;
            }

            const effectivePermissions = getPermissionsForRole(user.role || 'member');

            req.user = {
                id: user.id,
                email: user.email,
                role: user.role || 'member',
                groups: user.groups || [],
                effectivePermissions,
            };
            next();
        } catch (error) {
            if (process.env.NODE_ENV !== 'production') {
                console.warn('[auth] token verification failed', {
                    name: (error as any)?.name,
                    message: (error as any)?.message,
                });
            }
            const msg = (error as any)?.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
            res.status(401).json({ statusCode: 401, message: msg });
        }
    };
};

export const adminMiddleware: RequestHandler = (req, res, next) => {
    const authReq = req as AuthRequest;
    console.log("auth role:", authReq.user)
    if (!authReq.user || !authReq.user.role || !['admin', 'super_admin'].includes(authReq.user.role)) {
        res.status(403).json({
            statusCode: 403,
            message: "Access denied. Admin role required."
        });
        return;
    }
    next();
};