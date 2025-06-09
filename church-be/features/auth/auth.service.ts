// services/auth.service.ts
import { UserRole, User } from "../../features/user/user.model";
import { AppDataSource } from "../../config/database";
import * as jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"; // In production, always use environment variable

export class AuthService {
    private readonly userRepository = AppDataSource.getRepository(User);

    async register(email: string, firstName: string, lastName: string, password: string, role: UserRole): Promise<{ user: User; token: string }> {
        // Check if user already exists
        const existingUser = await this.userRepository.findOne({
            where: [
                { email },
                // { username }
            ]
        });

        if (existingUser) {
            throw new Error("User with this email already exists");
        }

        // Create new user
        const user = this.userRepository.create({
            email,
            firstName,
            lastName,
            password,
            role: role === UserRole.ADMIN ? UserRole.ADMIN : UserRole.USER
        });

        // Save user to database
        await this.userRepository.save(user);

        // Generate JWT token
        const token = this.generateToken(user);

        return { user, token };
    }

    private generateToken(user: User): string {
        return jwt.sign(
            {
                id: user.id,
                email: user.email,
                // username: user.username,
                role: user.role
            },
            JWT_SECRET,
            { expiresIn: "24h" }
        );
    }

    async login(email: string, password: string): Promise<{ user: User; token: string }> {
        // Find user by email
        const user = await this.userRepository.findOne({ where: { email } });
        console.log("user: ", user)
        if (!user) {
            throw new Error("Invalid email or password.");
        }

        // Validate password
        const isValidPassword = await user.validatePassword(password);
        if (!isValidPassword) {
            throw new Error("Invalid email or password");
        }

        // Generate JWT token
        const token = this.generateToken(user);

        return { user, token };
    }
}
