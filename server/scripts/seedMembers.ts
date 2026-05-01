/**
 * Seed 1000 members (User rows + BranchMembership rows) into the database.
 *
 * Usage:
 *   npx ts-node scripts/seedMembers.ts --branch <branch-uuid>
 *   $env:BRANCH_ID="<branch-uuid>"; npx ts-node scripts/seedMembers.ts
 *   npm run seed:members
 *
 * --branch  or  BRANCH_ID env var are required.
 * --count   or  SEED_COUNT env var override the default 1000.
 */

import "reflect-metadata";
import dotenv from "dotenv";
dotenv.config();

import * as bcrypt from "bcrypt";
import { AppDataSource } from "../config/database";
import { User } from "../models/user.model";
import { BranchMembership, BranchRole } from "../models/church/branch-membership.model";
import { Branch } from "../models/church/branch.model";
import { Gender } from "../types/user";

/* ─── Static data pools ─────────────────────────────────────────────────── */

const MALE_FIRST = [
  "James", "John", "Robert", "Michael", "William", "David", "Richard",
  "Joseph", "Charles", "Thomas", "Christopher", "Daniel", "Matthew",
  "Anthony", "Donald", "Mark", "Paul", "Steven", "Andrew", "Kenneth",
  "George", "Joshua", "Kevin", "Brian", "Edward", "Ronald", "Timothy",
  "Jason", "Jeffrey", "Ryan", "Jacob", "Gary", "Nicholas", "Eric",
  "Jonathan", "Stephen", "Larry", "Justin", "Scott", "Brandon",
  "Benjamin", "Samuel", "Frank", "Raymond", "Gregory", "Patrick",
  "Alexander", "Jack", "Dennis", "Henry",
];

const FEMALE_FIRST = [
  "Mary", "Patricia", "Jennifer", "Linda", "Barbara", "Elizabeth",
  "Susan", "Jessica", "Sarah", "Karen", "Lisa", "Nancy", "Betty",
  "Margaret", "Sandra", "Ashley", "Dorothy", "Kimberly", "Emily",
  "Donna", "Michelle", "Carol", "Amanda", "Melissa", "Deborah",
  "Stephanie", "Rebecca", "Sharon", "Laura", "Cynthia", "Kathleen",
  "Amy", "Angela", "Shirley", "Anna", "Brenda", "Pamela", "Emma",
  "Nicole", "Helen", "Samantha", "Katherine", "Christine", "Debra",
  "Rachel", "Carolyn", "Janet", "Catherine", "Maria", "Heather",
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
  "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez",
  "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
  "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark",
  "Ramirez", "Lewis", "Robinson", "Walker", "Young", "Allen", "King",
  "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores", "Green",
  "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell",
  "Carter", "Roberts",
];

const MIDDLE_NAMES = [
  "Ann", "Marie", "Lynn", "Rose", "Grace", "Faith", "Joy", "Hope",
  "Lee", "James", "Ray", "Dean", "Wayne", "Dale", "Alan", "Scott",
  "Paul", "John", "Michael", "David", "Thomas", "Mark", "Luke",
  "Mae", "Sue", "Jean", "Kay", "May", "Eve", "Claire",
];

const STREETS = [
  "Oak Street", "Maple Avenue", "Cedar Lane", "Elm Drive", "Pine Road",
  "Birch Court", "Walnut Street", "Willow Way", "Chestnut Blvd", "Ash Circle",
  "Magnolia Drive", "Sunset Boulevard", "Riverside Road", "Hilltop Avenue",
  "Valley View Lane", "Church Street", "Main Street", "Park Avenue",
  "Lake Drive", "Forest Road", "Highland Ave", "Meadow Lane", "Brook Court",
  "Spring Street", "Orchard Way",
];

const CITIES = [
  "Atlanta", "Charlotte", "Dallas", "Houston", "Phoenix", "Philadelphia",
  "San Antonio", "Jacksonville", "Columbus", "Indianapolis", "Fort Worth",
  "Memphis", "Louisville", "Baltimore", "Milwaukee", "Albuquerque",
  "Nashville", "Raleigh", "Tampa", "Virginia Beach", "Minneapolis",
  "New Orleans", "Bakersfield", "Fresno", "Sacramento",
];

const STATES = [
  "Georgia", "North Carolina", "Texas", "Arizona", "Pennsylvania",
  "Florida", "Ohio", "Indiana", "Maryland", "Wisconsin",
  "New Mexico", "Tennessee", "California", "Virginia", "Minnesota",
  "Louisiana", "Kentucky", "Oregon", "Colorado", "Michigan",
];

const EMAIL_DOMAINS = [
  "gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com",
  "live.com", "protonmail.com", "mail.com",
];

const PHONE_PREFIXES = [
  "404", "470", "678", "770", "214", "469", "972", "713",
  "832", "281", "312", "773", "872", "415", "628",
];

const MARITAL_STATUSES: Array<"single" | "married" | "widowed" | "engaged" | "divorced" | "separated"> = [
  "single", "married", "widowed", "engaged", "divorced", "separated",
];

const JOB_TITLES = [
  "Engineer", "Teacher", "Nurse", "Doctor", "Accountant", "Manager",
  "Designer", "Developer", "Lawyer", "Pastor", "Social Worker",
  "Electrician", "Plumber", "Chef", "Pharmacist", "Professor",
  "Counselor", "Analyst", "Consultant", "Architect",
];

/* ─── Helpers ────────────────────────────────────────────────────────────── */

const pickIdx = <T>(arr: T[], seed: number): T => arr[seed % arr.length];
const pick    = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const randBetween = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const randomBirthdate = (): Date => {
  const year  = new Date().getFullYear() - randBetween(18, 75);
  const month = randBetween(0, 11);
  const day   = randBetween(1, 28);
  return new Date(year, month, day);
};

const makeEmail = (first: string, last: string, idx: number): string => {
  const tag = idx.toString().padStart(4, "0");
  const variants = [
    `${first.toLowerCase()}.${last.toLowerCase()}${tag}`,
    `${first.toLowerCase()}${tag}.${last.toLowerCase()}`,
    `${last.toLowerCase()}${tag}.${first.toLowerCase()}`,
  ];
  return `${variants[idx % variants.length]}@${pick(EMAIL_DOMAINS)}`;
};

const makePhone = (): string => {
  const prefix = pick(PHONE_PREFIXES);
  const mid = String(randBetween(100, 999));
  const end = String(randBetween(1000, 9999));
  return `+1${prefix}${mid}${end}`;
};

/* ─── Seed function ──────────────────────────────────────────────────────── */

async function seed() {
  /* ── Parse args ── */
  let branchId: string | null = null;

  const branchArg = process.argv.indexOf("--branch");
  if (branchArg !== -1 && process.argv[branchArg + 1]) {
    branchId = process.argv[branchArg + 1];
  } else if (process.env.BRANCH_ID) {
    branchId = process.env.BRANCH_ID;
  }

  if (!branchId) {
    console.error("ERROR: --branch <uuid>  or  BRANCH_ID env var is required.");
    process.exit(1);
  }

  const countArg = process.argv.indexOf("--count");
  const TOTAL =
    countArg !== -1 && process.argv[countArg + 1]
      ? parseInt(process.argv[countArg + 1], 10)
      : process.env.SEED_COUNT
      ? parseInt(process.env.SEED_COUNT, 10)
      : 1000;

  console.log(`Branch ID : ${branchId}`);
  console.log(`Seeding   : ${TOTAL} members`);

  await AppDataSource.initialize();
  console.log("Database connected.");

  /* ── Look up the branch → get denomination_id ── */
  const branchRepo = AppDataSource.getRepository(Branch);
  const branch = await branchRepo.findOne({ where: { id: branchId } });
  if (!branch) {
    console.error(`ERROR: Branch ${branchId} not found.`);
    await AppDataSource.destroy();
    process.exit(1);
  }
  const denominationId = branch.denomination_id;
  console.log(`Denomination: ${denominationId}`);

  /* ── Pre-hash a default password once (avoids 1000 × bcrypt rounds) ── */
  const passwordHash = await bcrypt.hash("Seeded@1234", 10);

  const userRepo       = AppDataSource.getRepository(User);
  const membershipRepo = AppDataSource.getRepository(BranchMembership);

  const CHUNK = 50;
  let totalInserted = 0;

  for (let i = 0; i < TOTAL; i += CHUNK) {
    const chunkSize = Math.min(CHUNK, TOTAL - i);
    const users: Partial<User>[] = [];

    for (let j = 0; j < chunkSize; j++) {
      const idx     = i + j;
      const isMale  = idx % 2 === 0;
      const gender  = isMale ? Gender.MALE : Gender.FEMALE;

      const firstPool = isMale ? MALE_FIRST : FEMALE_FIRST;
      const first  = pickIdx(firstPool, idx + Math.floor(idx / firstPool.length));
      const last   = pickIdx(LAST_NAMES, idx * 3 + 7);
      const middle = pickIdx(MIDDLE_NAMES, idx * 7 + 3);

      const houseNo = randBetween(1, 9999);
      const city    = pickIdx(CITIES, idx * 2 + 1);
      const state   = pickIdx(STATES, idx + 4);

      users.push({
        email:          makeEmail(first, last, idx),
        first_name:     first,
        last_name:      last,
        middle_name:    middle,
        full_name:      `${first} ${middle} ${last}`,
        gender,
        dob:            randomBirthdate(),
        phone_number:   makePhone(),
        address_line:   `${houseNo} ${pick(STREETS)}`,
        city,
        state,
        country:        "United States",
        postal_code:    String(randBetween(10000, 99999)),
        job_title:      pick(JOB_TITLES),
        marital_status: pickIdx(MARITAL_STATUSES, idx * 5 + 2),
        member_status:  "member",
        role:           "member",
        is_active:      true,
        // pre-hashed → BeforeInsert hook will skip re-hashing
        password_hash:  passwordHash,
      });
    }

    /* Save users */
    const savedUsers = await userRepo.save(users as User[]);

    /* Create BranchMembership rows for this chunk */
    const memberships: Partial<BranchMembership>[] = savedUsers.map((u) => ({
      user_id:    u.id,
      branch_id:  branchId as string,
      role:       BranchRole.MEMBER,
      is_active:  true,
    }));
    await membershipRepo.save(memberships as BranchMembership[]);

    /* Link users to denomination via user_denominations join table */
    if (savedUsers.length > 0) {
      const values = savedUsers
        .map((u) => `('${u.id}', '${denominationId}')`)
        .join(", ");
      await AppDataSource.query(
        `INSERT INTO user_denominations (user_id, denomination_id) VALUES ${values}
         ON CONFLICT DO NOTHING`
      );
    }

    totalInserted += savedUsers.length;
    process.stdout.write(`\r  Progress: ${totalInserted}/${TOTAL}`);
  }

  console.log(`\n✓ Seeded ${totalInserted} members to branch ${branchId}`);
  console.log(`  Default password: Seeded@1234`);

  await AppDataSource.destroy();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
