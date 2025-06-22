import { Request, Response } from "express";
import {AuthService} from "./auth.service";

const authService = new AuthService();

export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, churchName, password } = req.body;
        const result = await authService.register(email, churchName, password);

        res.status(201).json({
            statusCode: 201,
            message: "User registered successfully",
            data: {
                user: {
                    id: result.user.id,
                    email: result.user.email,
                    // username: result.user.username,
                    // role: result.user.role
                },
                token: result.token
            }
        });
    } catch (error) {
        res.status(400).json({
            statusCode: 400,
            message: error instanceof Error ? error.message : "Registration failed"
        });
    }
};

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;
        console.log("email, password", email, password);
        const result = await authService.login(email, password);

        res.status(200).json({
            statusCode: 200,
            message: "Login successful",
            data: {
                user: {
                    id: result.user.id,
                    email: result.user.email,
                    // username: result.user.username
                },
                token: result.token
            }
        });
    } catch (error) {
        res.status(401).json({
            statusCode: 401,
            message: error instanceof Error ? error.message : "Login failed"
        });
    }
};
