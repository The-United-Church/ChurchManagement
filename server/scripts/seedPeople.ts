/**
 * Seed 150 people into the `people` table.
 *
 * Usage:
 *   ts-node scripts/seedPeople.ts
 * npm run seed:people
 * npm run seed:people -- --branch <your-branch-uuid>
 *   ts-node scripts/seedPeople.ts --branch <branch_uuid>
 *   npx ts-node scripts/seedPeople.ts --branch <branch_uuid>
 *
 * The --branch flag is optional. If omitted, branch_id is left null.
 */

import "reflect-metadata";
import dotenv from "dotenv";
dotenv.config();

import { AppDataSource } from "../config/database";
import { Person, PersonGender } from "../models/person.model";

/* ─── Static data pools ────────────────────────────────────────────────── */

const MALE_FIRST = [
  "James", "John", "Robert", "Michael", "William", "David", "Richard",
  "Joseph", "Charles", "Thomas", "Christopher", "Daniel", "Matthew",
  "Anthony", "Donald", "Mark", "Paul", "Steven", "Andrew", "Kenneth",
  "George", "Joshua", "Kevin", "Brian", "Edward", "Ronald", "Timothy",
  "Jason", "Jeffrey", "Ryan", "Jacob", "Gary", "Nicholas", "Eric",
  "Jonathan", "Stephen", "Larry", "Justin", "Scott", "Brandon",
  "Benjamin", "Samuel", "Frank", "Raymond", "Gregory", "Frank",
  "Patrick", "Alexander", "Jack", "Dennis",
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

/* ─── Helpers ───────────────────────────────────────────────────────────── */

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const pickIdx = <T>(arr: T[], seed: number): T => arr[seed % arr.length];

const randBetween = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

/** Generate a birth date for an adult aged 18–80. */
const randomBirthdate = (): string => {
  const year = new Date().getFullYear() - randBetween(18, 80);
  const month = String(randBetween(1, 12)).padStart(2, "0");
  const day = String(randBetween(1, 28)).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/** Produce a unique-enough email from a name + index. */
const makeEmail = (first: string, last: string, idx: number): string => {
  const variants = [
    `${first.toLowerCase()}.${last.toLowerCase()}${idx}`,
    `${first.toLowerCase()}${idx}.${last.toLowerCase()}`,
    `${last.toLowerCase()}${idx}.${first.toLowerCase()}`,
  ];
  return `${variants[idx % variants.length]}@${pick(EMAIL_DOMAINS)}`;
};

const makePhone = (): string => {
  const prefix = pick(PHONE_PREFIXES);
  const mid = String(randBetween(100, 999));
  const end = String(randBetween(1000, 9999));
  return `+1${prefix}${mid}${end}`;
};

/* ─── Seed function ─────────────────────────────────────────────────────── */

async function seed() {
  // Support both --branch <uuid> flag AND BRANCH_ID env variable
  // (npm's -- separator can be unreliable on Windows PowerShell)
  let branchId: string | null = null;

  const branchArg = process.argv.indexOf("--branch");
  if (branchArg !== -1 && process.argv[branchArg + 1]) {
    branchId = process.argv[branchArg + 1];
  } else if (process.env.BRANCH_ID) {
    branchId = process.env.BRANCH_ID;
  }

  const updateMode = process.argv.includes("--update-branch") || process.env.UPDATE_BRANCH === "true";

  if (!branchId) {
    console.error("ERROR: --branch <uuid> (or BRANCH_ID env var) is required.");
    process.exit(1);
  }

  console.log(`Branch ID : ${branchId}`);
  console.log(`Mode      : ${updateMode ? "update existing null-branch people" : "insert new people"}`);

  await AppDataSource.initialize();
  console.log("Database connected.");

  const repo = AppDataSource.getRepository(Person);

  /* ── UPDATE MODE: assign branch to all people that have no branch yet ── */
  if (updateMode) {
    const result = await repo
      .createQueryBuilder()
      .update(Person)
      .set({ branch_id: branchId })
      .where("branch_id IS NULL")
      .execute();

    console.log(`✓ Updated ${result.affected ?? 0} people → branch ${branchId}`);
    await AppDataSource.destroy();
    process.exit(0);
  }

  /* ── INSERT MODE: seed 500 new people ──────────────────────────────── */
  const people: Partial<Person>[] = [];

  for (let i = 0; i < 500; i++) {
    const isMale = i % 2 === 0;
    const gender = isMale ? PersonGender.MALE : PersonGender.FEMALE;

    const firstPool = isMale ? MALE_FIRST : FEMALE_FIRST;
    const first = pickIdx(firstPool, i + Math.floor(i / firstPool.length));
    const last = pickIdx(LAST_NAMES, i * 3 + 7);
    const middle = pickIdx(MIDDLE_NAMES, i * 7 + 3);

    // Nickname: use shortened first name occasionally
    const nickname =
      i % 5 === 0 ? first.slice(0, 3) : i % 7 === 0 ? `${first[0]}.${last[0]}.` : undefined;

    const houseNo = randBetween(1, 9999);
    const city = pickIdx(CITIES, i * 2 + 1);
    const state = pickIdx(STATES, i + 4);
    const address = `${houseNo} ${pick(STREETS)}`;

    people.push({
      first_name: first,
      last_name: last,
      middle_name: middle,
      nickname: nickname ?? undefined,
      gender,
      birthdate: new Date(randomBirthdate()),
      email: makeEmail(first, last, i),
      phone: makePhone(),
      address,
      city,
      state,
      country: "United States",
      branch_id: branchId ?? undefined,
    });
  }

  const inserted = await repo.save(people as Person[]);
  console.log(`✓ Seeded ${inserted.length} people successfully.`);

  await AppDataSource.destroy();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
