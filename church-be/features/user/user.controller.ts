import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../../config/database';
import { User } from '../../features/user/user.model';

export class UserController {
  private userRepository = AppDataSource.getRepository(User);

  async getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await this.userRepository.find();
      res.json(users);
    } catch (error) {
      next(error);
    }
  }

  async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, firstName, lastName, age } = req.body;
      
      const user = this.userRepository.create({
        email,
        firstName,
        lastName,
        age
      });

      const savedUser = await this.userRepository.save(user);
      res.status(201).json(savedUser);
    } catch (error) {
      next(error);
    }
  }

  async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const user = await this.userRepository.findOne({ 
        where: { id }
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json(user);
    } catch (error) {
      next(error);
    }
  }
}