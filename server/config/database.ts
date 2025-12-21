import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "../models/user.model";
import dotenv from "dotenv";
import { Role } from "../models/role-permission/role.model";
import { Permission } from "../models/role-permission/permission.model";
import { Category } from "../models/catalogs/category.model";
import { Department } from "../models/catalogs/department.model";
import { ActivityLog } from "../models/activity-log.model";
import { Group } from "../models/role-permission/group.model";
dotenv.config();

export const AppDataSource = new DataSource({
    type: "postgres",
    url: process.env.DB_URL,
    ssl: {
        requestCert: true,
        rejectUnauthorized: false,  
    },
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    username: process.env.DB_USERNAME || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_NAME || "ferncot_db",
    synchronize: process.env.NODE_ENV === 'development',
    logging: process.env.NODE_ENV === 'development',
    entities: [ User,
                Role,
                Permission,
                Group,
                Category,
                Department,
                ActivityLog
            ],
    migrations: ["./migrations/*.ts"],
    subscribers: ['./subscribers/*.ts'],
}); 