import { AppDataSource } from "../config/database";
import { Person } from "../models/person.model";
import { ILike } from "typeorm";

export interface ImportResult {
  valid: Person[];
  duplicates: Array<{ row: Partial<Person>; reason: string }>;
  invalid: Array<{ row: Partial<Person>; reason: string }>;
}

export class PersonService {
  private readonly repo = AppDataSource.getRepository(Person);

  async create(data: Partial<Person>): Promise<Person> {
    const person = this.repo.create(data);
    return this.repo.save(person);
  }

  async createMany(items: Partial<Person>[]): Promise<Person[]> {
    const entities = this.repo.create(items);
    return this.repo.save(entities);
  }

  async findAll(branchId?: string): Promise<Person[]> {
    const where: any = {};
    if (branchId) where.branch_id = branchId;
    return this.repo.find({ where, order: { created_at: "DESC" } });
  }

  async findById(id: string): Promise<Person | null> {
    return this.repo.findOne({ where: { id }, relations: ["branch"] });
  }

  async update(id: string, data: Partial<Person>): Promise<Person | null> {
    const person = await this.repo.findOneBy({ id });
    if (!person) return null;
    Object.assign(person, data);
    return this.repo.save(person);
  }

  async delete(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const result = await this.repo.delete(ids);
    return result.affected ?? 0;
  }

  async search(term: string, branchId?: string): Promise<Person[]> {
    const qb = this.repo.createQueryBuilder("p");
    if (branchId) qb.andWhere("p.branch_id = :branchId", { branchId });
    qb.andWhere(
      "(p.first_name ILIKE :t OR p.last_name ILIKE :t OR p.email ILIKE :t)",
      { t: `%${term}%` }
    );
    return qb.orderBy("p.created_at", "DESC").getMany();
  }

  async findByEmail(email: string): Promise<Person[]> {
    // Search by email across ALL people (no branch filtering)
    // Case-insensitive search
    const qb = this.repo.createQueryBuilder("p")
      .where("LOWER(p.email) = LOWER(:email)", { email });
    return qb.orderBy("p.created_at", "DESC").getMany();
  }

  async markConverted(id: string, userId: string): Promise<Person | null> {
    const person = await this.repo.findOneBy({ id });
    if (!person) return null;
    person.converted_user_id = userId;
    return this.repo.save(person);
  }

  /** Returns an error message if email/phone conflicts with another record (scoped to branch when provided), else null. */
  async checkUnique(email?: string, phone?: string, excludeId?: string, branchId?: string): Promise<string | null> {
    if (email) {
      const qb = this.repo.createQueryBuilder("p")
        .where("LOWER(p.email) = LOWER(:email)", { email });
      if (branchId) qb.andWhere("p.branch_id = :branchId", { branchId });
      if (excludeId) qb.andWhere("p.id != :excludeId", { excludeId });
      if (await qb.getOne()) return `Email "${email}" is already in use`;
    }
    if (phone) {
      const qb = this.repo.createQueryBuilder("p")
        .where("p.phone = :phone", { phone });
      if (branchId) qb.andWhere("p.branch_id = :branchId", { branchId });
      if (excludeId) qb.andWhere("p.id != :excludeId", { excludeId });
      if (await qb.getOne()) return `Phone "${phone}" is already in use`;
    }
    return null;
  }

  async importWithDedupe(items: Partial<Person>[], branchId?: string): Promise<ImportResult> {
    const duplicates: ImportResult["duplicates"] = [];
    const invalid: ImportResult["invalid"] = [];
    const candidates: Partial<Person>[] = [];

    // 1. Basic validation
    for (const item of items) {
      if (!item.first_name?.trim() || !item.last_name?.trim()) {
        invalid.push({ row: item, reason: "Missing first_name or last_name" });
        continue;
      }
      candidates.push(item);
    }

    // 2. Bulk-fetch existing emails & phones in one query each
    const emails = candidates.filter((i) => i.email).map((i) => i.email!.toLowerCase());
    const phones = candidates.filter((i) => i.phone).map((i) => i.phone!);

    const existingEmailSet = new Set<string>();
    const existingPhoneSet = new Set<string>();

    if (emails.length > 0) {
      const query = this.repo
        .createQueryBuilder("p")
        .where("LOWER(p.email) IN (:...emails)", { emails });
      if (branchId) query.andWhere("p.branch_id = :branchId", { branchId });
      const found = await query.getMany();
      found.forEach((p) => p.email && existingEmailSet.add(p.email.toLowerCase()));
    }
    if (phones.length > 0) {
      const query = this.repo
        .createQueryBuilder("p")
        .where("p.phone IN (:...phones)", { phones });
      if (branchId) query.andWhere("p.branch_id = :branchId", { branchId });
      const found = await query.getMany();
      found.forEach((p) => p.phone && existingPhoneSet.add(p.phone));
    }

    // 3. Classify each candidate (also dedup within the batch itself)
    const batchEmailSet = new Set<string>();
    const batchPhoneSet = new Set<string>();
    const toSave: Partial<Person>[] = [];

    for (const item of candidates) {
      const email = item.email?.toLowerCase();
      const phone = item.phone;

      if (email && (existingEmailSet.has(email) || batchEmailSet.has(email))) {
        duplicates.push({ row: item, reason: `Email "${item.email}" already exists` });
        continue;
      }
      if (phone && (existingPhoneSet.has(phone) || batchPhoneSet.has(phone))) {
        duplicates.push({ row: item, reason: `Phone "${item.phone}" already exists` });
        continue;
      }

      if (email) batchEmailSet.add(email);
      if (phone) batchPhoneSet.add(phone);
      toSave.push({ ...item, branch_id: branchId || item.branch_id });
    }

    // 4. Save valid rows
    let saved: Person[] = [];
    if (toSave.length > 0) {
      const entities = this.repo.create(toSave);
      saved = await this.repo.save(entities);
    }

    return { valid: saved, duplicates, invalid };
  }
}
