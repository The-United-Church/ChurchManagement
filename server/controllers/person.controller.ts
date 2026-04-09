import { Request, Response } from "express";
import { PersonService } from "../services/person.service";
import { UserService } from "../services/user.service";
import asyncHandler from "../utils/asyncHandler";
import { Person } from "../models/person.model";
import { AuthRequest } from "../middleware/auth.middleware";

const personService = new PersonService();
const userService = new UserService();

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizePersonInput(body: any, branchId?: string): Partial<Person> {
  const trim = (v: any) => (typeof v === 'string' ? v.trim() : v);
  const nz = (v: any) => {
    if (v === undefined || v === null) return undefined;
    if (typeof v === 'string' && v.trim() === '') return undefined;
    return v;
  };
  const birthRaw = typeof body.birthdate === 'string' ? body.birthdate.trim() : undefined;
  const birthdate = birthRaw && /^\d{4}-\d{2}-\d{2}$/.test(birthRaw) ? birthRaw : undefined;
  const gender = body.gender === 'male' || body.gender === 'female' ? body.gender : undefined;

  return {
    first_name: trim(body.first_name),
    last_name: trim(body.last_name),
    middle_name: nz(trim(body.middle_name)),
    nickname: nz(trim(body.nickname)),
    birthdate: birthdate as any,
    gender: gender as any,
    address: nz(trim(body.address)),
    state: nz(trim(body.state)),
    city: nz(trim(body.city)),
    country: nz(trim(body.country)),
    email: nz(trim(body.email)),
    phone: nz(trim(body.phone)),
    profile_image: nz(trim(body.profile_image)),
    branch_id: branchId || nz(trim(body.branch_id)),
  };
}

// ─── CRUD ───────────────────────────────────────────────────────────────────

export const createPerson = asyncHandler(async (req: Request, res: Response) => {
  const branchId = (req as AuthRequest).branchId || req.body.branch_id;
  const payload = normalizePersonInput(req.body, branchId || undefined);
  const conflict = await personService.checkUnique(payload.email, payload.phone);
  if (conflict) { res.status(409).json({ status: 409, message: conflict }); return; }
  const person = await personService.create(payload);
  res.status(201).json({ data: person, status: 201, message: "Person created" });
});

export const getPeople = asyncHandler(async (req: Request, res: Response) => {
  const branchId = (req as AuthRequest).branchId || undefined;
  const { search } = req.query;
  const people = search
    ? await personService.search(String(search), branchId ?? undefined)
    : await personService.findAll(branchId ?? undefined);
  res.status(200).json({ data: people, status: 200, message: "People fetched" });
});

export const getPersonById = asyncHandler(async (req: Request, res: Response) => {
  const person = await personService.findById(req.params.id);
  if (!person) { res.status(404).json({ status: 404, message: "Person not found" }); return; }
  res.status(200).json({ data: person, status: 200, message: "Person fetched" });
});

export const updatePerson = asyncHandler(async (req: Request, res: Response) => {
  const branchId = (req as AuthRequest).branchId || req.body.branch_id;
  const payload = normalizePersonInput(req.body, branchId || undefined);
  const conflict = await personService.checkUnique(payload.email, payload.phone, req.params.id);
  if (conflict) { res.status(409).json({ status: 409, message: conflict }); return; }
  const person = await personService.update(req.params.id, payload);
  if (!person) { res.status(404).json({ status: 404, message: "Person not found" }); return; }
  res.status(200).json({ data: person, status: 200, message: "Person updated" });
});

export const deletePerson = asyncHandler(async (req: Request, res: Response) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ status: 400, message: "'ids' must be a non-empty array" });
    return;
  }
  const deleted = await personService.delete(ids);
  const noun = deleted === 1 ? 'Person' : 'People';
  res.status(200).json({ status: 200, message: `${deleted} ${noun} deleted`, data: { deleted } });
});

// ─── IMPORT ─────────────────────────────────────────────────────────────────

export const importPeople = asyncHandler(async (req: Request, res: Response) => {
  const rows: any[] = req.body;
  if (!Array.isArray(rows) || rows.length === 0) {
    res.status(400).json({ status: 400, message: "Request body must be a non-empty array" });
    return;
  }
  const branchId = (req as AuthRequest).branchId || undefined;
  const items = rows.map((r) => normalizePersonInput(r, branchId));
  const result = await personService.importWithDedupe(items, branchId);
  const { valid, duplicates, invalid } = result;
  res.status(200).json({
    status: 200,
    message: `${valid.length} saved, ${duplicates.length} duplicate(s), ${invalid.length} invalid`,
    data: { valid, duplicates, invalid },
  });
});

// ─── CONVERT TO MEMBER ─────────────────────────────────────────────────────

export const convertToMember = asyncHandler(async (req: Request, res: Response) => {
  const person = await personService.findById(req.params.id);
  if (!person) { res.status(404).json({ status: 404, message: "Person not found" }); return; }
  if (person.converted_user_id) {
    res.status(409).json({ status: 409, message: "Person is already a member" });
    return;
  }
  if (!person.email) {
    res.status(400).json({ status: 400, message: "Person must have an email to be converted" });
    return;
  }
  const user = await userService.createUserWithGeneratedPassword(
    person.email,
    "member",
    person.first_name,
    person.last_name,
    person.phone,
  );
  if (!user) { res.status(500).json({ status: 500, message: "Failed to create user" }); return; }

  // Attach user to the same branch
  if (person.branch_id) {
    try { await userService.addUserToBranch(user.id, person.branch_id, "member"); } catch {}
  }

  await personService.markConverted(person.id, user.id);
  res.status(201).json({ data: user, status: 201, message: "Person converted to member. Password sent to email." });
});
