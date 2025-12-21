import { AppDataSource } from '../config/database';
import { Permission } from '../models/role-permission/permission.model';

const Permissions = [
  { category: "people", name: "view_people" },
  { category: "people", name: "create_people" },
  { category: "people", name: "edit_people" },
  { category: "people", name: "delete_people" },
  { category: "people", name: "import_people" },
  { category: "people", name: "email_people" },
  { category: "people", name: "sms" },
  { category: "people", name: "notification" },
  { category: "people", name: "letter" },
  { category: "people", name: "export" },
  { category: "people", name: "reports" },
  { category: "people", name: "advanced_search" },
  { category: "people", name: "communicate_with_parents" },
  { category: "people", name: "communicate_with_children" },
  { category: "person_notes", name: "view_note" },
  { category: "person_notes", name: "create_note" },
  { category: "person_notes", name: "edit_note" },
  { category: "person_notes", name: "delete_note" },
  { category: "ministries", name: "create_ministry" },
  { category: "ministries", name: "edit_ministry" },
  { category: "ministries", name: "delete_ministry" },
  { category: "groups", name: "create_group" },
  { category: "groups", name: "edit_group" },
  { category: "groups", name: "delete_group" },
  { category: "groups", name: "view_group" },
  { category: "groups", name: "manage_request" },

];

async function seedPermissions() {
  try {
    await AppDataSource.initialize();
    const permissionRepo = AppDataSource.getRepository(Permission);
    for (const permData of Permissions) {
      let existing = await permissionRepo.findOne({ where: { name: permData.name } });
      if (!existing) {
        await permissionRepo.save(permissionRepo.create(permData));
        console.log(`✓ Created permission: ${permData.name}`);
      } else {
        console.log(`✓ Permission already exists: ${permData.name}`);
      }
    }
  } catch (error) {
    console.error('❌ Error seeding report permissions:', error);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

seedPermissions().then(() => process.exit(0)).catch(() => process.exit(1));
