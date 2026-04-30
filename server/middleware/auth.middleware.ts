import { Request, Response, NextFunction, RequestHandler } from "express";
import { UserService } from "../services/user/user.service";
import { TokenService } from "../services/auth/token.service";
import { getPermissionsForRole } from "../utils/roles";
import dotenv from "dotenv";
import { AppDataSource } from "../config/database";
import { BranchMembership } from "../models/church/branch-membership.model";
dotenv.config();

const tokenService = new TokenService();


export interface AuthRequest extends Request {
    user: {
        id: string;
        email: string;
        role: string;
        branchRole?: string;
        denominationIds?: string[];
        effectivePermissions?: string[];
    };
    branchId?: string | null;
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
            const denominationIds: string[] = ((user as any).denominations ?? [])
                .map((d: any) => d.id)
                .filter(Boolean);

            req.user = {
                id: user.id,
                email: user.email,
                role: user.role || 'member',
                denominationIds,
                effectivePermissions,
            };

            // Optional branch scoping via header
            const requestedBranchId = (req.headers['x-branch-id'] as string | undefined) || undefined;
            // Endpoints where the caller is allowed to send X-Branch-Id even
            // though they are not (yet) a member of that branch — e.g. the
            // join-request submission, which is by definition pre-membership.
            const isPreMembershipEndpoint =
                req.method === 'POST' &&
                /^\/api\/join\/request\/?$/.test(req.originalUrl.split('?')[0]);
            if (requestedBranchId && !isPreMembershipEndpoint) {
                // Super admins can scope to any branch
                if (req.user.role === 'super_admin') {
                    req.branchId = requestedBranchId;
                } else {
                    // Validate membership for non-super admins
                    try {
                        const membershipRepo = AppDataSource.getRepository(BranchMembership);
                        const membership = await membershipRepo.findOne({ where: { user_id: req.user.id, branch_id: requestedBranchId } });
                        if (!membership) {
                            // User has no membership in this branch yet (e.g. pending join
                            // request on a custom domain).  Rather than 403-ing every API
                            // call, silently ignore the branch-scope hint so the request
                            // proceeds unscoped.  Controllers already gate branch-specific
                            // data on req.branchId being non-null.
                            req.branchId = null;
                            next();
                            return;
                        }
                        if (!membership.is_active) {
                            res.status(403).json({ statusCode: 403, message: 'Your access to this branch has been deactivated. Please contact an administrator.' });
                            return;
                        }
                        req.branchId = requestedBranchId;
                        // Elevate effective permissions when the user holds admin/coordinator in this branch
                        req.user.branchRole = membership.role;
                    } catch (e) {
                        if (process.env.NODE_ENV !== 'production') {
                            console.warn('[auth] branch membership lookup failed', { message: (e as any)?.message });
                        }
                        res.status(500).json({ statusCode: 500, message: 'Failed to validate branch membership' });
                        return;
                    }
                }
            } else {
                req.branchId = null;
            }
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
    const globalRole = authReq.user?.role;
    const branchRole = authReq.user?.branchRole;
    const isAdmin = ['admin', 'super_admin'].includes(globalRole) || ['admin', 'super_admin'].includes(branchRole ?? '');
    if (!authReq.user || !isAdmin) {
        res.status(403).json({
            statusCode: 403,
            message: "Access denied. Admin role required."
        });
        return;
    }
    next();
};

export const superAdminMiddleware: RequestHandler = (req, res, next) => {
    const authReq = req as AuthRequest;
    if (!authReq.user || authReq.user.role !== 'super_admin') {
        res.status(403).json({
            statusCode: 403,
            message: "Access denied. Super admin role required."
        });
        return;
    }
    next();
};