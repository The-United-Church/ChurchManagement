import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "../models/user.model";
import dotenv from "dotenv";
import { ActivityLog } from "../models/activity-log.model";
import { Denomination, Branch, BranchMembership, BranchJoinRequest, BranchInvite } from "../models/church";
import { Person } from "../models/person.model";
import { Event, EventAttendance, GuestAttendance } from "../models/event";
dotenv.config();

export const AppDataSource = new DataSource({
    type: "postgres",
    ...(process.env.DB_URL ? { url: process.env.DB_URL } : {}),
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    username: process.env.DB_USERNAME || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_NAME || "ferncot_db",
    // synchronize: process.env.NODE_ENV === 'development',
    synchronize: false,
    logging: process.env.NODE_ENV === 'development',
    entities: [ User,
                ActivityLog,
                Denomination,
                Branch,
                BranchMembership,
                BranchJoinRequest,
                BranchInvite,
                Person,
                Event,
                EventAttendance,
                GuestAttendance
            ],
    migrations: ["./migrations/*.ts"],
    subscribers: ['./subscribers/*.ts'],
}); 