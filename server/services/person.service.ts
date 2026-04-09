import { AppDataSource } from "../config/database";
import { Person } from "../models/person.model";
import { ILike } from "typeorm";

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

  async markConverted(id: string, userId: string): Promise<Person | null> {
    const person = await this.repo.findOneBy({ id });
    if (!person) return null;
    person.converted_user_id = userId;
    return this.repo.save(person);
  }
}
