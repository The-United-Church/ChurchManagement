import { AppDataSource } from "../config/database";
import { Permission } from "../models/role-permission/permission.model";

export const defaultPermissions = [
  {
    name: "view_assets",
    description: "Can view asset information",
    category: "Assets",
  },
  {
    name: "manage_assets",
    description: "Can create, edit, and delete assets",
    category: "Assets",
  },
  {
    name: "view_work_orders",
    description: "Can view work orders",
    category: "Work Orders",
  },
  {
    name: "manage_work_orders",
    description: "Can create, edit, and delete work orders",
    category: "Work Orders",
  },
  {
    name: "view_maintenance",
    description: "Can view maintenance schedules",
    category: "Maintenance",
  },
  {
    name: "manage_maintenance",
    description: "Can create and manage maintenance schedules",
    category: "Maintenance",
  },
  {
    name: "view_inventory",
    description: "Can view inventory items",
    category: "Inventory",
  },
  {
    name: "manage_inventory",
    description: "Can manage inventory items",
    category: "Inventory",
  },
  {
    name: "view_reports",
    description: "Can view reports and analytics",
    category: "Reports",
  },
  {
    name: "manage_users",
    description: "Can manage user accounts and permissions",
    category: "Administration",
  },
];

export async function seedPermissions(): Promise<void> {
  const permissionRepository = AppDataSource.getRepository(Permission);

  for (const permissionData of defaultPermissions) {
    const exists = await permissionRepository.findOne({
      where: { name: permissionData.name },
    });

    if (!exists) {
      const permission = permissionRepository.create(permissionData);
      await permissionRepository.save(permission);
      console.log(`Created permission: ${permissionData.name}`);
    }
  }
}
