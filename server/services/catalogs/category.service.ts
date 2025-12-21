import { AppDataSource } from '../../config/database';
import { Category } from '../../models/catalogs/category.model';

export class CategoryService {
	private readonly categoryRepository = AppDataSource.getRepository(Category);

	async createCategory(name: string, description?: string) {
		const exists = await this.categoryRepository.findOne({ where: { name } });
		if (exists) throw new Error('Category with this name already exists');
		const category = this.categoryRepository.create({ name, description });
		return this.categoryRepository.save(category);
	}

	async createManyCategories(categories: { name: string }[]) {
		const names = categories.map((c: { name: string }) => c.name.trim().toLowerCase());
		const existing = await this.categoryRepository
			.createQueryBuilder('category')
			.where('LOWER(category.name) IN (:...names)', { names })
			.getMany();
		const existingNames = new Set(existing.map((c: Category) => c.name.trim().toLowerCase()));
		// Filter out duplicates
		const uniqueCategories = categories.filter((c: { name: string }) => !existingNames.has(c.name.trim().toLowerCase()));
		const duplicateCategories = categories.filter((c: { name: string }) => existingNames.has(c.name.trim().toLowerCase()));
		let created: Category[] = [];
		if (uniqueCategories.length > 0) {
			const categoryEntities = this.categoryRepository.create(uniqueCategories);
			created = await this.categoryRepository.save(categoryEntities);
		}
		return {
			created,
			duplicateCount: duplicateCategories.length,
			uniqueCount: uniqueCategories.length,
			duplicates: duplicateCategories
		}; 
	}

	async getAllCategories() {
		return this.categoryRepository.find();
	}

	async getCategoryById(id: number) {
		return this.categoryRepository.findOne({ where: { id } });
	}

	async updateCategory(id: number, name: string, description: string) {
		const category = await this.categoryRepository.findOne({ where: { id } });
		if (!category) return null;
		category.name = name;
		category.description = description;
		return this.categoryRepository.save(category);
	}

	async deleteCategory(id: number) {
		const category = await this.categoryRepository.findOne({ where: { id } });
		if (!category) return null;
		await this.categoryRepository.remove(category);
		return true;
	}
}
