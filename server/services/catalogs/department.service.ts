import { AppDataSource } from '../../config/database';
import { Department } from '../../models/catalogs/department.model';
import { Repository } from 'typeorm';

export class DepartmentService {
  private departmentRepo: Repository<Department>;

  constructor() {
    this.departmentRepo = AppDataSource.getRepository(Department);
  }

  async createDepartment(data: { name: string; description?: string }) {
    const department = this.departmentRepo.create(data);
    return this.departmentRepo.save(department);
  }

  async getDepartments() {
    return this.departmentRepo.find();
  }

  async getDepartmentById(id: string) {
    return this.departmentRepo.findOne({ where: { id: Number(id) } });
  }

  async updateDepartment(id: string, updates: Partial<Department>) {
    await this.departmentRepo.update(id, updates);
    return this.getDepartmentById(id);
  }

  async deleteDepartment(id: string) {
    return this.departmentRepo.delete(id);
  }
}
