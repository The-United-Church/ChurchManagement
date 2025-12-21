import { Request, Response } from 'express';
import { CategoryService } from '../../services/catalogs/category.service';
import asyncHandler from '../../utils/asyncHandler';

const categoryService = new CategoryService();

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
	const { name, description } = req.body;
	if (!name) {
		res.status(400).json({ message: 'Name is required' });
		return;
	}
	const category = await categoryService.createCategory(name, description);
	res.status(201).json({ data: category, message: 'Category created' });
});

export const createManyCategories = asyncHandler(async (req: Request, res: Response) => {
	const categories = req.body;
	if (!Array.isArray(categories) || categories.length === 0) {
		res.status(400).json({ data: null, message: 'Categories array is required', status: false });
		return;
	}
	const result = await categoryService.createManyCategories(categories);
	res.status(201).json({
		data: result.created,
		message: `Categories created: ${result.uniqueCount}, duplicates skipped: ${result.duplicateCount}`,
		status: true,
		uniqueCount: result.uniqueCount,
		duplicateCount: result.duplicateCount,
		duplicateData: result.duplicates
	});
});

export const getCategories = asyncHandler(async (req: Request, res: Response) => {
	const categories = await categoryService.getAllCategories();
	res.status(200).json({ data: categories });
});

export const getCategoryById = asyncHandler(async (req: Request, res: Response) => {
	const { id } = req.params;
	const category = await categoryService.getCategoryById(Number(id));
	if (!category) {
		res.status(404).json({ message: 'Category not found' });
		return;
	}
	res.status(200).json({ data: category });
});

export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
	const { id } = req.params;
	const { name, description } = req.body;
	const updated = await categoryService.updateCategory(Number(id), name, description);
	if (!updated) {
		res.status(404).json({ message: 'Category not found' });
		return;
	}
	res.status(200).json({ data: updated, message: 'Category updated' });
});

export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
	const { id } = req.params;
	const deleted = await categoryService.deleteCategory(Number(id));
	if (!deleted) {
		res.status(404).json({ message: 'Category not found' });
		return;
	}
	res.status(200).json({ message: 'Category deleted' });
});
