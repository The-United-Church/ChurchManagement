import { Request, Response } from 'express';
import asyncHandler from '../../utils/asyncHandler';
import { DepartmentService } from '../../services/catalogs/department.service';

const departmentService = new DepartmentService();

export const createDepartment = asyncHandler(async (req: Request, res: Response) => {
  const department = await departmentService.createDepartment(req.body);
  res.status(201).json({ status: 201, message: 'Department created', data: department });
});

export const getDepartments = asyncHandler(async (_req: Request, res: Response) => {
  const departments = await departmentService.getDepartments();
  res.json({ status: 200, message: 'Departments retrieved', data: departments });
});

export const getDepartmentById = asyncHandler(async (req: Request, res: Response) => {
  const department = await departmentService.getDepartmentById(req.params.id);
  if (!department) {
    res.status(404).json({ status: 404, message: 'Department not found' });
    return;
  }
  res.json({ status: 200, message: 'Department retrieved', data: department });
});

export const updateDepartment = asyncHandler(async (req: Request, res: Response) => {
  const department = await departmentService.updateDepartment(req.params.id, req.body);
  res.json({ status: 200, message: 'Department updated', data: department });
});

export const deleteDepartment = asyncHandler(async (req: Request, res: Response) => {
  await departmentService.deleteDepartment(req.params.id);
  res.json({ status: 200, message: 'Department deleted' });
});
