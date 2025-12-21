import { AppDataSource } from '../config/database';
import { User } from '../models/user.model';
import { Role } from '../models/role-permission/role.model';
import * as bcrypt from 'bcrypt';

async function seedAdminUser() {
  try {
    await AppDataSource.initialize();
    console.log('✓ Database connected');

    const userRepository = AppDataSource.getRepository(User);
    const roleRepository = AppDataSource.getRepository(Role);

    // Check if admin user already exists
    const existingAdmin = await userRepository.findOne({
      where: { email: 'ferncot1@gmail.com' },
    });

    if (existingAdmin) {
      console.log('✅ Admin user already exists: ferncot1@gmail.com');
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
      }
      process.exit(0);
    }

    // Get admin role
    const adminRole = await roleRepository.findOne({
      where: { name: 'admin' },
      relations: ['permissions'],
    });

    if (!adminRole) {
      console.error('❌ Admin role not found. Please run seed:roles first.');
      process.exit(1);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('admin123!', 10);

    // Create admin user
    const adminUser = userRepository.create({
      email: 'ferncot1@gmail.com',
      password_hash: hashedPassword,
      first_name: 'Admin',
      last_name: 'User',
      full_name: 'Admin User',
      role: adminRole,
    });

    await userRepository.save(adminUser);

    console.log('✅ Admin user created successfully');
    console.log(`   Email: admin@ferncot.com`);
    console.log(`   Password: Admin123!`);
    console.log(`   Role: admin`);
    console.log(`   Permissions: ${adminRole.permissions?.length || 0}`);

    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admin user:', error);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  }
}

seedAdminUser();
