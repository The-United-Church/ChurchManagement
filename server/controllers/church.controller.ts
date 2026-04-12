import { Request, Response } from "express";
import { ChurchService } from "../services/church.service";
import asyncHandler from "../utils/asyncHandler";
import { AuthRequest } from "../middleware/auth.middleware";
import { logActivity } from "../utils/activityLogger";
import { ActivityAction, EntityType } from "../models/activity-log.model";
import { emitToAll, emitToBranch } from "../services/socket.service";

const churchService = new ChurchService();

export const createChurch = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { denomination_name, description, location, state, country, address } = req.body;
    const userId = (req as AuthRequest).user?.id;

    if (!denomination_name?.trim()) {
      res.status(400).json({ status: 400, message: "denomination_name is required" });
      return;
    }

    const available = await churchService.checkNameAvailable(denomination_name.trim());
    if (!available) {
      res.status(409).json({ status: 409, message: `A denomination named "${denomination_name.trim()}" is already registered.` });
      return;
    }

    const church = await churchService.create({
      denomination_name: denomination_name.trim(),
      description: description?.trim(),
      location: location?.trim(),
      state: state?.trim(),
      country: country?.trim(),
      address: address?.trim(),
      admin_id: userId,
    });

    logActivity(
      userId, ActivityAction.CREATE, EntityType.CHURCH, church.id,
      `Church "${church.denomination_name}" created`,
      { churchName: church.denomination_name }
    );

    emitToAll("churches:changed", { action: "created" });
    res.status(201).json({ data: church, status: 201, message: "Church created successfully" });
  }
);

export const getChurches = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const churches = await churchService.findAll();
    res.json({ data: churches, status: 200, message: "Churches fetched" });
  }
);

export const checkDenominationName = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const name = (req.query.name as string | undefined)?.trim();
    if (!name) {
      res.status(400).json({ status: 400, message: "name query parameter is required" });
      return;
    }
    const available = await churchService.checkNameAvailable(name);
    res.json({ status: 200, available, message: available ? 'Name is available' : 'Name is already taken' });
  }
);

export const getChurchById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const church = await churchService.findById(req.params.id);
    if (!church) {
      res.status(404).json({ status: 404, message: "Church not found" });
      return;
    }
    res.json({ data: church, status: 200, message: "Church fetched" });
  }
);

export const updateChurch = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { denomination_name, description, location, state, country, address } = req.body;
    const userId = (req as AuthRequest).user?.id;

    const church = await churchService.update(req.params.id, {
      denomination_name: denomination_name?.trim(),
      description: description?.trim(),
      location: location?.trim(),
      state: state?.trim(),
      country: country?.trim(),
      address: address?.trim(),
    });

    if (!church) {
      res.status(404).json({ status: 404, message: "Church not found" });
      return;
    }

    logActivity(
      userId, ActivityAction.UPDATE, EntityType.CHURCH, church.id,
      `Church "${church.denomination_name}" updated`,
      { churchName: church.denomination_name }
    );

    emitToAll("churches:changed", { action: "updated" });
    res.json({ data: church, status: 200, message: "Church updated successfully" });
  }
);

export const deleteChurch = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthRequest).user?.id;
    const church = await churchService.findById(req.params.id);

    if (!church) {
      res.status(404).json({ status: 404, message: "Church not found" });
      return;
    }

    await churchService.delete(req.params.id);

    logActivity(
      userId, ActivityAction.DELETE, EntityType.CHURCH, req.params.id,
      `Church "${church.denomination_name}" deleted`,
      { churchName: church.denomination_name }
    );

    emitToAll("churches:changed", { action: "deleted" });
    res.json({ status: 200, message: "Church deleted successfully" });
  }
);

// ─── Branch endpoints ─────────────────────────────────────────────────────

export const createBranch = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { name, address, city, state, country, pastor_name, description, image, is_headquarters } = req.body;
    const denomination_id = req.params.id; // /churches/:id/branches
    const userId = (req as AuthRequest).user?.id;

    if (!name?.trim()) {
      res.status(400).json({ status: 400, message: "Branch name is required" });
      return;
    }

    try {
      const branch = await churchService.createBranch({
        denomination_id,
        name: name.trim(),
        address: address?.trim(),
        city: city?.trim(),
        state: state?.trim(),
        country: country?.trim(),
        pastor_name: pastor_name?.trim(),
        description: description?.trim(),
        image: image?.trim(),
        is_headquarters: is_headquarters ?? false,
        created_by: userId,
      });

      logActivity(
        userId, ActivityAction.CREATE, EntityType.BRANCH, branch.id,
        `Branch "${branch.name}" added to denomination`,
        { branchName: branch.name, denomination_id }
      );

      res.status(201).json({ data: branch, status: 201, message: "Branch created successfully" });
    } catch (err: any) {
      res.status(404).json({ status: 404, message: err.message });
    }
  }
);

export const getBranches = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthRequest).user?.id;
    const branches = await churchService.findBranchesByDenomination(req.params.id, userId);
    res.json({ data: branches, status: 200, message: "Branches fetched" });
  }
);

export const updateBranch = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { name, address, city, state, country, pastor_name, description, image, is_headquarters } = req.body;
    const userId = (req as AuthRequest).user?.id;

    const branch = await churchService.updateBranch(req.params.branchId, {
      name: name?.trim(),
      address: address?.trim(),
      city: city?.trim(),
      state: state?.trim(),
      country: country?.trim(),
      pastor_name: pastor_name?.trim(),
      description: description?.trim(),
      image: image?.trim(),
      is_headquarters,
    });

    if (!branch) {
      res.status(404).json({ status: 404, message: "Branch not found" });
      return;
    }

    logActivity(
      userId, ActivityAction.UPDATE, EntityType.BRANCH, branch.id,
      `Branch "${branch.name}" updated`,
      { branchName: branch.name }
    );

    res.json({ data: branch, status: 200, message: "Branch updated successfully" });
  }
);

export const deleteBranch = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthRequest).user?.id;
    const branch = await churchService.findBranchById(req.params.branchId);

    if (!branch) {
      res.status(404).json({ status: 404, message: "Branch not found" });
      return;
    }

    await churchService.deleteBranch(req.params.branchId);

    logActivity(
      userId, ActivityAction.DELETE, EntityType.BRANCH, req.params.branchId,
      `Branch "${branch.name}" deleted`,
      { branchName: branch.name }
    );

    res.json({ status: 200, message: "Branch deleted successfully" });
  }
);

export const removeBranchMembers = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { branchId } = req.params;
    const { ids } = req.body as { ids?: string[] };
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ status: 400, message: 'ids array is required' });
      return;
    }
    const userId = (req as AuthRequest).user?.id;
    const result = await churchService.removeBranchMembers(branchId, ids);
    logActivity(
      userId, ActivityAction.DELETE, EntityType.USER, ids[0],
      `Removed ${result.removed} member(s) from branch`,
      { branchId, ids, removed: result.removed }
    );
    emitToBranch(branchId, "members:changed", { action: "removed" });
    res.status(200).json({ data: result, status: 200, message: `${result.removed} member(s) removed from branch` });
  }
);

