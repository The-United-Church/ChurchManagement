import { AppDataSource } from '../config/database';
import { Permission } from '../models/role-permission/permission.model';
import { Role } from '../models/role-permission/role.model';

const Roles = [
  {
    name: 'admin',
    permissions: [
      "view_people",
      "create_people",
      "edit_people",
      "delete_people",
      "import_people",
      "email_people",
      "sms",
      "notification",
      "letter",
      "export",
      "reports",
      "advanced_search",
      "communicate_with_parents",
      "communicate_with_children",
      "view_note",
      "create_note",
      "edit_note",
      "delete_note",
      "create_ministry",
      "edit_ministry",
      "delete_ministry",
      "create_group",
      "edit_group",
      "delete_group",
      "view_group",
      "manage_request"
    ]
  },
  {
    name: 'owner',
    permissions: [
      "view_people",
      "create_people",
      "edit_people",
      "delete_people",
      "import_people",
      "email_people",
      "sms",
      "notification",
      "letter",
      "export",
      "reports",
      "advanced_search",
      "communicate_with_parents",
      "communicate_with_children",
      "view_note",
      "create_note",
      "edit_note",
      "delete_note",
      "create_ministry",
      "edit_ministry",
      "delete_ministry",
      "create_group",
      "edit_group",
      "delete_group",
      "view_group",
      "manage_request"
    ]
  },
  {
    name: 'groupLeader',
    permissions: [
      "view_people",
      "create_people",
      "email_people",
      "notification",
      "view_note",
      "create_note",
      "edit_note",
      "create_group",
      "edit_group",
      "view_group",
      "manage_request"
    ]
  },
  {
    name: 'member',
    permissions: [
      "view_people",
      "view_note",
      "view_group"
    ]
  },
  {
    name: 'user',
    permissions: [
      "view_people",
      "view_note",
      "view_group"
    ]
  },
];

async function seedRoles() {
  try {
    await AppDataSource.initialize();
    const permissionRepo = AppDataSource.getRepository(Permission);
    const roleRepo = AppDataSource.getRepository(Role);
    const allPermissions = await permissionRepo.find();
    const permissionMap = new Map(allPermissions.map(p => [p.name, p]));
    for (const roleData of Roles) {
      let existingRole = await roleRepo.findOne({ where: { name: roleData.name }, relations: ['permissions'] });
      const rolePermissions = roleData.permissions.map(permName => {
        const perm = permissionMap.get(permName);
        if (!perm) {
          throw new Error(`Permission ${permName} not found for role ${roleData.name}`);
        }
        return perm;
      });
      if (!existingRole) {
        const role = roleRepo.create({
          name: roleData.name,
          permissions: rolePermissions
        });
        await roleRepo.save(role);
        console.log(`✓ Created role: ${roleData.name} with ${rolePermissions.length} permissions`);
      } else {
        existingRole.permissions = rolePermissions;
        await roleRepo.save(existingRole);
        console.log(`✓ Updated role: ${roleData.name} with ${rolePermissions.length} permissions`);
      }
    }
  } catch (error) {
    console.error('❌ Error seeding report roles:', error);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

seedRoles().then(() => process.exit(0)).catch(() => process.exit(1));
