import { AppDataSource } from '../config/database';
import { Category } from '../models/catalogs/category.model';

async function seedCategories() {
  try {
    await AppDataSource.initialize();
    console.log('Database connected');

    const categoryRepository = AppDataSource.getRepository(Category);

    const categories = [
      { name: 'Machinery', description: 'Heavy machinery and equipment' },
      { name: 'Vehicles', description: 'Company vehicles and transportation' },
      { name: 'Equipment', description: 'General equipment and tools' },
      { name: 'Tools', description: 'Hand tools and small equipment' },
      { name: 'Electronics', description: 'Electronic devices and computers' },
    ];

    for (const cat of categories) {
      const existing = await categoryRepository.findOne({ where: { name: cat.name } });
      if (!existing) {
        const category = categoryRepository.create(cat);
        await categoryRepository.save(category);
        console.log(`Created category: ${cat.name}`);
      } else {
        console.log(`Category already exists: ${cat.name}`);
      }
    }

    console.log('Categories seeded successfully');
  } catch (error) {
    console.error('Error seeding categories:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

seedCategories();