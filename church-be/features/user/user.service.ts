import { AppDataSource } from "../../config/database";
import { User, UserRole } from "./user.model";
import * as jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"; // In production, always use environment variable

export class UserService {
    private readonly userRepository = AppDataSource.getRepository(User);

    async getUserById(id: string): Promise<User | null> {
        return this.userRepository.findOne({ where: { id } });
    }

    async updateUser(id: string, data: Partial<User>): Promise<User | null> {
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user) {
            return null;
        }

        // Update user fields
        Object.assign(user, data);
        return this.userRepository.save(user);
    }

    async deleteUser(id: string): Promise<boolean> {
        const result = await this.userRepository.delete(id);
        return result.affected !== undefined && result.affected !== null && result.affected > 0;
    }

    verifyToken(token: string): any {
        try {
            return jwt.verify(token, JWT_SECRET);
        } catch (error) {
            throw new Error("Invalid token");
        }
    }
} 