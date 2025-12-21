import { AppDataSource } from '../config/database';
import { User } from '../models/user.model';
import { Role } from '../models/role-permission/role.model';

async function assignAdminRole(email: string) {
  try {
    await AppDataSource.initialize();
    console.log('Database connected');

    const userRepository = AppDataSource.getRepository(User);
    const roleRepository = AppDataSource.getRepository(Role);

    const user = await userRepository.findOne({
      where: { email },
      relations: ['role'],
    });

    if (!user) {
      console.error(`❌ User with email "${email}" not found`);
      process.exit(1);
    }

    const adminRole = await roleRepository.findOne({
      where: { name: 'admin' },
      relations: ['permissions'],
    });

    if (!adminRole) {
      console.error('❌ Admin role not found. Please run seed:roles first.');
      process.exit(1);
    }

    user.role = adminRole;
    await userRepository.save(user);

    const updatedUser = await userRepository.findOne({
      where: { email },
      relations: ['role', 'role.permissions'],
    });

    console.log(`✅ Successfully assigned admin role to user: ${email}`);
    console.log(`   Role: ${updatedUser?.role?.name || 'None'}`);
    console.log(`   Role ID: ${updatedUser?.role?.id || 'None'}`);
    console.log(`   Permissions: ${updatedUser?.role?.permissions?.length || 0} permissions`);
    
    if (updatedUser?.role?.permissions && updatedUser.role.permissions.length > 0) {
      console.log(`   Sample permissions: ${updatedUser.role.permissions.slice(0, 5).map(p => p.name).join(', ')}`);
    } else {
      console.log(`   ⚠️  WARNING: Role has no permissions! This might be the issue.`);
    }
  } catch (error) {
    console.error('❌ Error assigning admin role:', error);
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

async function main() {
  const email = process.argv[2];

  if (email) {
    await assignAdminRole(email);
  } else {
    try {
      await AppDataSource.initialize();
      console.log('Database connected');

      const userRepository = AppDataSource.getRepository(User);
      const roleRepository = AppDataSource.getRepository(Role);

      const adminRole = await roleRepository.findOne({
        where: { name: 'admin' },
        relations: ['permissions'],
      });

      if (!adminRole) {
        console.error('❌ Admin role not found. Please run seed:roles first.');
        process.exit(1);
      }

      const users = await userRepository.find({
        relations: ['role'],
      });

      if (users.length === 0) {
        console.error('❌ No users found in database');
        process.exit(1);
      }

      const nonAdminUsers = users.filter(user => !user.role || user.role.name !== 'admin');

      if (nonAdminUsers.length === 0) {
        console.log('✅ All users already have admin role');
        process.exit(0);
      }

      console.log(`\nFound ${nonAdminUsers.length} user(s) without admin role:`);
      nonAdminUsers.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.email} (${user.full_name || 'No name'}) - Current role: ${user.role?.name || 'None'}`);
      });

      const firstUser = nonAdminUsers[0];
      firstUser.role = adminRole;
      await userRepository.save(firstUser);

      console.log(`\n✅ Successfully assigned admin role to: ${firstUser.email}`);
      console.log(`   Role: ${adminRole.name}`);
      console.log(`   Permissions: ${adminRole.permissions?.length || 0} permissions`);
      
      if (nonAdminUsers.length > 1) {
        console.log(`\n⚠️  There are ${nonAdminUsers.length - 1} more user(s) without admin role.`);
        console.log(`   To assign admin role to a specific user, run: npm run assign:admin <email>`);
      }
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    } finally {
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
      }
    }
  }
}

main().then(() => process.exit(0)).catch(() => process.exit(1));

