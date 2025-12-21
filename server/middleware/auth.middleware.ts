import { Request, Response, NextFunction, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { UserService } from "../services/user.service";
import dotenv from "dotenv";
import { Role } from "../models/role-permission/role.model";
dotenv.config();


export interface AuthRequest extends Request {
    user: {
        id: string;
        email: string;
        role: Role;
        groups?: any[];
        permissions?: any[];
        effectivePermissions?: string[];
    };
}

export const authMiddleware = (userService: UserService) => {
    return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                res.status(401).json({
                    statusCode: 401,
                    message: "No authorization header"
                });
                return;
            }

            const token = authHeader.split(" ")[1];
            if (!token) {
                res.status(401).json({
                    statusCode: 401,
                    message: "No token provided"
                });
                return;
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
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

            // Extract permissions from role, groups, and individual permissions
            const rolePermissions = user.role?.permissions || [];
            const groupPermissions = (user.groups || []).flatMap((group: any) => group.permissions || []);
            const individualPermissions = user.permissions || [];

            req.user = {
                id: user.id,
                email: user.email,
                role: user.role,
                groups: user.groups || [],
                permissions: individualPermissions,
                effectivePermissions: [
                    ...rolePermissions.map((p: any) => p.name || p.id),
                    ...groupPermissions.map((p: any) => p.name || p.id),
                    ...individualPermissions.map((p: any) => p.name || p.id),
                ]
            };
            next();
        } catch (error) {
            res.status(401).json({
                statusCode: 401,
                message: "Invalid token"
            });
        }
    };
};

export const adminMiddleware: RequestHandler = (req, res, next) => {
    const authReq = req as AuthRequest;
    console.log("auth role:", authReq.user)
    if (!authReq.user || !authReq.user.role || authReq.user.role.name !== "admin") {
        res.status(403).json({
            statusCode: 403,
            message: "Access denied. Admin role required."
        });
        return;
    }
    next();
};