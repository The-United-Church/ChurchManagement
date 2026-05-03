import { Request, Response } from "express";
import { PersonService } from "../services/user/person.service";
import { UserService } from "../services/user/user.service";
import asyncHandler from "../utils/asyncHandler";
import { Person } from "../models/person.model";
import { AuthRequest } from "../middleware/auth.middleware";
import { emitToBranch, emitToAll } from "../services/socket.service";
import { normalizeEmail } from "../utils/email";
import { FollowUpService } from "../services/follow-up.service";
import { FollowUpType, FollowUpPriority } from "../models/follow-up.model";

const personService = new PersonService();
const userService = new UserService();
const followUpService = new FollowUpService();

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizePersonInput(body: any, branchId?: string): Partial<Person> {
  const trim = (v: any) => (typeof v === 'string' ? v.trim() : v);
  const nz = (v: any) => {
    if (v === undefined || v === null) return undefined;
    if (typeof v === 'string' && v.trim() === '') return undefined;
    return v;
  };

  // Strip duplicate dial code prefix (e.g. "+2342349069577255" → "+2349069577255")
  const normalizePhone = (raw: any): string | undefined => {
    if (!raw || typeof raw !== 'string') return undefined;
    const v = raw.trim();
    if (!v) return undefined;
    // If it starts with '+', extract the dial code (1-3 digits) then check if the
    // remaining local portion starts with those same digits again.
    const match = v.match(/^(\+(\d{1,3}))(\d+)$/);
    if (match) {
      const dialCode = match[2]; // e.g. "234"
      const rest = match[3];     // everything after the '+'
      // rest already includes dialCode, so rest = dialCode + localNumber
      // Check if localNumber itself starts with dialCode again
      const localPart = rest.slice(dialCode.length); // strip dial code once
      if (localPart.startsWith(dialCode)) {
        // User included dial code in the local part — strip it
        return `+${dialCode}${localPart.slice(dialCode.length)}`;
      }
    }
    return v;
  };

  const birthRaw = typeof body.birthdate === 'string' ? body.birthdate.trim() : undefined;
  const birthdate = birthRaw && /^\d{4}-\d{2}-\d{2}$/.test(birthRaw) ? birthRaw : undefined;
  const genderRaw = typeof body.gender === 'string' ? body.gender.trim().toLowerCase() : undefined;
  const gender = genderRaw === 'male' || genderRaw === 'female' ? genderRaw : undefined;

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
    email: normalizeEmail(body.email),
    phone: nz(normalizePhone(body.phone)),
    profile_image: nz(trim(body.profile_image)),
    branch_id: branchId || nz(trim(body.branch_id)),
  };
}

// ─── CRUD ───────────────────────────────────────────────────────────────────

export const createPerson = asyncHandler(async (req: Request, res: Response) => {
  const branchId = (req as AuthRequest).branchId || req.body.branch_id;
  const payload = normalizePersonInput(req.body, branchId || undefined);
  // Block if email already belongs to a member (user) account
  if (payload.email) {
    const existingUser = await userService.findUserByEmail(payload.email);
    if (existingUser) {
      res.status(409).json({ status: 409, message: `A member account already exists for "${payload.email}". People records are for non-members only.` });
      return;
    }
  }
  const conflict = await personService.checkUnique(payload.email, payload.phone, undefined, payload.branch_id);
  if (conflict) { res.status(409).json({ status: 409, message: conflict }); return; }
  const person = await personService.create(payload);
  const bid = person.branch_id;
  if (bid) emitToBranch(bid, "people:changed", { action: "created" });
  else emitToAll("people:changed", { action: "created" });
  // Auto-create a "first_visit" follow-up for the new visitor (best-effort, non-blocking)
  if (bid) {
    followUpService
      .autoCreate(
        {
          branch_id: bid,
          person_id: person.id,
          type: FollowUpType.FIRST_VISIT,
          priority: FollowUpPriority.MEDIUM,
          notes: "Auto-created on visitor record creation. Reach out to welcome them.",
          created_by: (req as AuthRequest).user?.id ?? null,
        },
        { skipIfDuplicate: true },
      )
      .then((fu) => {
        if (fu && bid) emitToBranch(bid, "followups:changed", { action: "created", id: fu.id });
      })
      .catch(() => {
        /* fire-and-forget */
      });
  }
  res.status(201).json({ data: person, status: 201, message: "Person created" });
});

export const getPeople = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const branchId = authReq.branchId || undefined;
  const role = authReq.user?.role;
  const denominationIds = authReq.user?.denominationIds;
  // Super admins see everything; all others are scoped to their denomination when no branch selected
  const scopedDenomIds = role !== 'super_admin' ? denominationIds : undefined;

  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '25'), 10)));
  const search = req.query.search ? String(req.query.search) : undefined;

  const { data, total } = await personService.findPaginated({
    page,
    limit,
    search,
    branchId,
    denominationIds: scopedDenomIds,
  });

  res.status(200).json({ data, total, page, limit, status: 200, message: "People fetched" });
});

export const findPersonByEmail = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.query;
  if (!email || typeof email !== 'string') {
    res.status(400).json({ status: 400, message: "Email query parameter is required" });
    return;
  }
  // Search across ALL people by email (not filtered by branch)
  const people = await personService.findByEmail(email);
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
  const conflict = await personService.checkUnique(payload.email, payload.phone, req.params.id, payload.branch_id);
  if (conflict) { res.status(409).json({ status: 409, message: conflict }); return; }
  const person = await personService.update(req.params.id, payload);
  if (!person) { res.status(404).json({ status: 404, message: "Person not found" }); return; }
  const bid = person.branch_id;
  if (bid) emitToBranch(bid, "people:changed", { action: "updated" });
  else emitToAll("people:changed", { action: "updated" });
  res.status(200).json({ data: person, status: 200, message: "Person updated" });
});

export const deletePerson = asyncHandler(async (req: Request, res: Response) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ status: 400, message: "'ids' must be a non-empty array" });
    return;
  }
  const branchId = (req as AuthRequest).branchId || undefined;
  const deleted = await personService.delete(ids);
  if (branchId) emitToBranch(branchId, "people:changed", { action: "deleted" });
  else emitToAll("people:changed", { action: "deleted" });
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

  // Gather emails from the batch and check which ones already have member accounts
  const candidateEmails = items.map((i) => i.email).filter(Boolean) as string[];
  let memberEmailSet = new Set<string>();
  if (candidateEmails.length > 0) {
    const matchedUsers = await userService.findUsersByEmails(candidateEmails);
    matchedUsers.forEach((u) => memberEmailSet.add(u.email.trim().toLowerCase()));
  }

  const result = await personService.importWithDedupe(items, branchId, memberEmailSet);
  const { valid, duplicates, invalid, alreadyMembers } = result;
  if (valid.length > 0) {
    if (branchId) emitToBranch(branchId, "people:changed", { action: "imported" });
    else emitToAll("people:changed", { action: "imported" });
  }
  res.status(200).json({
    status: 200,
    message: `${valid.length} saved, ${duplicates.length} duplicate(s), ${invalid.length} invalid, ${alreadyMembers.length} already member(s)`,
    data: { valid, duplicates, invalid, alreadyMembers },
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

  // Reuse an existing user with same email (across branches) instead of failing conversion.
  let user = await userService.findUserByEmail(person.email);
  let createdNewUser = false;

  if (!user) {
    user = await userService.createUserWithGeneratedPassword(
      person.email,
      "member",
      person.first_name,
      person.last_name,
      person.phone,
    );
    createdNewUser = true;
  }

  if (!user) { res.status(500).json({ status: 500, message: "Failed to create or resolve member user" }); return; }

  // Attach user to the same branch
  if (person.branch_id) {
    try { await userService.addUserToBranch(user.id, person.branch_id, "member"); } catch {}
  }

  await personService.markConverted(person.id, user.id);
  if (person.branch_id) {
    emitToBranch(person.branch_id, "people:changed", { action: "converted" });
    emitToBranch(person.branch_id, "members:changed", { action: "converted" });
  } else {
    emitToAll("people:changed", { action: "converted" });
    emitToAll("members:changed", { action: "converted" });
  }
  res.status(201).json({
    data: user,
    status: 201,
    message: createdNewUser
      ? "Person converted to member. Password sent to email."
      : "Person linked to existing member account and added to branch.",
  });
});

export const bulkConvertToMember = asyncHandler(async (req: Request, res: Response) => {
  const { ids } = req.body as { ids: string[] };
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ status: 400, message: "ids must be a non-empty array" });
    return;
  }

  const results: { id: string; status: "converted" | "skipped" | "failed"; message: string }[] = [];

  for (const id of ids) {
    try {
      const person = await personService.findById(id);
      if (!person) { results.push({ id, status: "skipped", message: "Not found" }); continue; }
      if (person.converted_user_id) { results.push({ id, status: "skipped", message: "Already a member" }); continue; }
      if (!person.email) { results.push({ id, status: "skipped", message: "No email address" }); continue; }

      let user = await userService.findUserByEmail(person.email);
      if (!user) {
        user = await userService.createUserWithGeneratedPassword(
          person.email, "member", person.first_name, person.last_name, person.phone,
        );
      }
      if (!user) { results.push({ id, status: "failed", message: "Failed to create user" }); continue; }

      if (person.branch_id) {
        try { await userService.addUserToBranch(user.id, person.branch_id, "member"); } catch {}
      }
      await personService.markConverted(person.id, user.id);
      results.push({ id, status: "converted", message: "OK" });
    } catch (e: any) {
      results.push({ id, status: "failed", message: e?.message || "Unknown error" });
    }
  }

  const converted = results.filter((r) => r.status === "converted").length;
  const skipped  = results.filter((r) => r.status === "skipped").length;
  const failed   = results.filter((r) => r.status === "failed").length;

  // Emit socket events once after batch
  emitToAll("people:changed", { action: "bulk-converted" });
  emitToAll("members:changed", { action: "bulk-converted" });

  res.status(200).json({
    status: 200,
    message: `${converted} converted, ${skipped} skipped, ${failed} failed`,
    converted,
    skipped,
    failed,
    results,
  });
});
