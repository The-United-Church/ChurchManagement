import { randomBytes } from "crypto";
import { In } from "typeorm";
import { AppDataSource } from "../../config/database";
import { BranchJoinRequest, JoinRequestStatus } from "../../models/church/branch-join-request.model";
import { BranchInvite } from "../../models/church/branch-invite.model";
import { BranchMembership, BranchRole } from "../../models/church/branch-membership.model";
import { Branch } from "../../models/church/branch.model";
import { Denomination } from "../../models/church/denomination.model";
import { User } from "../../models/user.model";
import { sendInviteJoinNotification, sendJoinRequestNotification, sendJoinDecisionNotification } from "../../email/templates/email.admin_notify";

function generateCode(): string {
  return randomBytes(5).toString("hex").toUpperCase(); // 10-char hex e.g. "A3F9C12DE0"
}

export class JoinService {
  private readonly requestRepo = AppDataSource.getRepository(BranchJoinRequest);
  private readonly inviteRepo = AppDataSource.getRepository(BranchInvite);
  private readonly membershipRepo = AppDataSource.getRepository(BranchMembership);
  private readonly branchRepo = AppDataSource.getRepository(Branch);
  private readonly denomRepo = AppDataSource.getRepository(Denomination);
  private readonly userRepo = AppDataSource.getRepository(User);

  // ─── Public: list denominations + branches for search ────────────────────

  async listDenominationsWithBranches(): Promise<Denomination[]> {
    return this.denomRepo.find({
      relations: ["branches"],
      order: { denomination_name: "ASC" },
    });
  }

  // ─── Public: resolve invite code ─────────────────────────────────────────

  async resolveInvite(code: string): Promise<{
    invite: BranchInvite;
    branch: Branch;
    denomination: Denomination;
  }> {
    const invite = await this.inviteRepo.findOne({
      where: { code: code.toUpperCase(), is_active: true },
      relations: ["branch", "denomination"],
    });
    if (!invite) throw new Error("Invite link is invalid or has expired.");
    if (invite.expires_at && new Date() > invite.expires_at) {
      throw new Error("This invite link has expired.");
    }
    if (invite.max_uses !== null && invite.uses_count >= invite.max_uses) {
      throw new Error("This invite link has reached its maximum number of uses.");
    }
    return { invite, branch: invite.branch, denomination: invite.denomination };
  }

  // ─── User: submit a join request ─────────────────────────────────────────

  async submitJoinRequest(
    userId: string,
    branchId: string,
    message?: string
  ): Promise<BranchJoinRequest> {
    const branch = await this.branchRepo.findOne({ where: { id: branchId } });
    if (!branch) throw new Error("Branch not found.");

    const existing = await this.requestRepo.findOne({
      where: { user_id: userId, branch_id: branchId },
    });
    if (existing) {
      if (existing.status === "pending") throw new Error("You already have a pending request for this branch.");
      if (existing.status === "approved") throw new Error("You are already a member of this branch.");
      // Rejected: allow re-request by removing old record
      await this.requestRepo.delete(existing.id);
    }

    // Also prevent if already a member via BranchMembership
    const alreadyMember = await this.membershipRepo.findOne({
      where: { user_id: userId, branch_id: branchId },
    });
    if (alreadyMember) throw new Error("You are already a member of this branch.");

    const req = this.requestRepo.create({
      user_id: userId,
      branch_id: branchId,
      denomination_id: branch.denomination_id,
      message,
      joined_via: "request",
    });
    const saved = await this.requestRepo.save(req);

    // Notify all branch admins by email (fire-and-forget)
    this.notifyBranchAdmins(branchId, branch.name, userId, message).catch(() => {});

    return saved;
  }

  // ─── User: use invite code ────────────────────────────────────────────────

  async useInvite(code: string, userId: string): Promise<BranchMembership> {
    const { invite, branch } = await this.resolveInvite(code);

    // Already a member?
    const alreadyMember = await this.membershipRepo.findOne({
      where: { user_id: userId, branch_id: branch.id },
    });
    if (alreadyMember) throw new Error("You are already a member of this branch.");

    // Create membership directly (invite = auto-approved)
    const membership = this.membershipRepo.create({
      user_id: userId,
      branch_id: branch.id,
      role: BranchRole.MEMBER,
      is_active: true,
    });
    await this.membershipRepo.save(membership);

    // Record a resolved join request for audit trail
    const existing = await this.requestRepo.findOne({
      where: { user_id: userId, branch_id: branch.id },
    });
    if (!existing) {
      const req = this.requestRepo.create({
        user_id: userId,
        branch_id: branch.id,
        denomination_id: branch.denomination_id,
        status: "approved",
        joined_via: "invite_link",
        invite_id: invite.id,
        reviewed_at: new Date(),
      });
      await this.requestRepo.save(req);
    }

    // Increment invite uses
    await this.inviteRepo.update(invite.id, { uses_count: invite.uses_count + 1 });

    // Notify branch admins that a new member joined via invite link (fire-and-forget)
    this.notifyBranchAdminsInviteJoin(branch.id, branch.name, userId).catch(() => {});

    return membership;
  }

  // ─── Internal: email admins when someone joins via invite link ────────────

  private async notifyBranchAdminsInviteJoin(
    branchId: string,
    branchName: string,
    newMemberId: string
  ): Promise<void> {
    const newMember = await this.userRepo.findOne({ where: { id: newMemberId } });
    const memberName = newMember
      ? (newMember.full_name || [newMember.first_name, newMember.last_name].filter(Boolean).join(" ") || newMember.email)
      : "Someone";

    const adminMemberships = await this.membershipRepo.find({
      where: { branch_id: branchId, role: BranchRole.ADMIN, is_active: true },
      relations: ["user"],
    });

    for (const m of adminMemberships) {
      if (m.user?.email) {
        sendInviteJoinNotification(m.user.email, memberName, newMember?.email ?? "", branchName).catch(() => {});
      }
    }
  }

  // ─── Internal: email all admins of a branch about a new join request ────

  private async notifyBranchAdmins(
    branchId: string,
    branchName: string,
    requestingUserId: string,
    message?: string
  ): Promise<void> {
    // Load the requesting user
    const requester = await this.userRepo.findOne({ where: { id: requestingUserId } });
    const requesterName = requester
      ? (requester.full_name || [requester.first_name, requester.last_name].filter(Boolean).join(" ") || requester.email)
      : "Someone";

    // Find all admin memberships for this branch and load their users
    const adminMemberships = await this.membershipRepo.find({
      where: { branch_id: branchId, role: BranchRole.ADMIN, is_active: true },
      relations: ["user"],
    });

    for (const m of adminMemberships) {
      const adminEmail = m.user?.email;
      if (adminEmail) {
        sendJoinRequestNotification(adminEmail, requesterName, requester?.email ?? "", branchName, message).catch(() => {});
      }
    }
  }

  // ─── Admin: list join requests for a branch ───────────────────────────────

  async listRequestsForBranch(branchId: string, status?: JoinRequestStatus): Promise<BranchJoinRequest[]> {
    const qb = this.requestRepo
      .createQueryBuilder("r")
      .where("r.branch_id = :branchId", { branchId })
      .leftJoinAndMapOne("r.user", User, "u", "u.id = r.user_id::uuid")
      .orderBy("r.created_at", "ASC");
    if (status) qb.andWhere("r.status = :status", { status });
    return qb.getMany();
  }

  // ─── Admin: approve or reject a join request ─────────────────────────────

  async reviewRequest(
    requestId: string,
    decision: "approved" | "rejected",
    reviewerId: string
  ): Promise<BranchJoinRequest> {
    const req = await this.requestRepo.findOne({
      where: { id: requestId },
      relations: ["branch"],
    });
    if (!req) throw new Error("Join request not found.");
    if (req.status !== "pending") throw new Error("This request has already been reviewed.");

    req.status = decision;
    req.reviewed_by = reviewerId;
    req.reviewed_at = new Date();
    await this.requestRepo.save(req);

    if (decision === "approved") {
      const alreadyMember = await this.membershipRepo.findOne({
        where: { user_id: req.user_id, branch_id: req.branch_id },
      });
      if (!alreadyMember) {
        const membership = this.membershipRepo.create({
          user_id: req.user_id,
          branch_id: req.branch_id,
          role: BranchRole.MEMBER,
          is_active: true,
        });
        await this.membershipRepo.save(membership);
      }
    }

    // Notify the requesting user of the outcome (fire-and-forget)
    this.notifyRequester(req.user_id, decision, req.branch?.name ?? "the branch").catch(() => {});

    // Re-fetch with user populated so the client gets full user info
    const updated = await this.requestRepo
      .createQueryBuilder("r")
      .where("r.id = :id", { id: requestId })
      .leftJoinAndMapOne("r.user", User, "u", "u.id = r.user_id::uuid")
      .getOne();
    return updated ?? req;
  }

  // ─── Admin: bulk approve / reject ─────────────────────────────────────────
  /**
   * Sequentially apply reviewRequest to each id, scoped to a single branch.
   * IDs that don't belong to the branch (or are no longer pending) are
   * collected into `failed` so the caller can surface them. Email
   * notifications are still fired-and-forgotten per-request, matching the
   * behaviour of the single-review endpoint.
   */
  async bulkReviewRequests(
    branchId: string,
    ids: string[],
    decision: "approved" | "rejected",
    reviewerId: string,
  ): Promise<{ succeeded: string[]; failed: { id: string; reason: string }[] }> {
    const unique = Array.from(new Set(ids));
    const succeeded: string[] = [];
    const failed: { id: string; reason: string }[] = [];

    // Pre-load all requests in one query and validate branch ownership.
    const records = await this.requestRepo.find({ where: { id: In(unique) } });
    const validIds = new Set<string>();
    for (const id of unique) {
      const rec = records.find((r) => r.id === id);
      if (!rec) {
        failed.push({ id, reason: "Request not found" });
      } else if (rec.branch_id !== branchId) {
        failed.push({ id, reason: "Request does not belong to this branch" });
      } else if (rec.status !== "pending") {
        failed.push({ id, reason: `Already ${rec.status}` });
      } else {
        validIds.add(id);
      }
    }

    for (const id of validIds) {
      try {
        await this.reviewRequest(id, decision, reviewerId);
        succeeded.push(id);
      } catch (err: any) {
        failed.push({ id, reason: err?.message ?? "Failed" });
      }
    }
    return { succeeded, failed };
  }

  private async notifyRequester(
    userId: string,
    decision: "approved" | "rejected",
    branchName: string
  ): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user?.email) return;

    const name = user.full_name || [user.first_name, user.last_name].filter(Boolean).join(" ") || "there";

    await sendJoinDecisionNotification(user.email, name, branchName, decision);
  }

  // ─── Admin: create an invite link ────────────────────────────────────────

  async createInvite(data: {
    branchId: string;
    denominationId: string;
    createdBy: string;
    expiresAt?: Date;
    maxUses?: number;
  }): Promise<BranchInvite> {
    let code: string;
    // Ensure uniqueness
    let attempts = 0;
    do {
      code = generateCode();
      attempts++;
      if (attempts > 20) throw new Error("Could not generate a unique invite code. Try again.");
    } while (await this.inviteRepo.findOne({ where: { code } }));

    const invite = this.inviteRepo.create({
      code,
      branch_id: data.branchId,
      denomination_id: data.denominationId,
      created_by: data.createdBy,
      expires_at: data.expiresAt ?? undefined,
      max_uses: data.maxUses ?? undefined,
      uses_count: 0,
      is_active: true,
    });
    return this.inviteRepo.save(invite);
  }

  // ─── Admin: list invites for a branch ────────────────────────────────────

  async listInvitesForBranch(branchId: string): Promise<BranchInvite[]> {
    return this.inviteRepo.find({
      where: { branch_id: branchId },
      order: { created_at: "DESC" },
    });
  }

  // ─── Admin: deactivate an invite ─────────────────────────────────────────

  async deactivateInvite(inviteId: string, branchId: string): Promise<void> {
    const invite = await this.inviteRepo.findOne({ where: { id: inviteId, branch_id: branchId } });
    if (!invite) throw new Error("Invite not found.");
    invite.is_active = false;
    await this.inviteRepo.save(invite);
  }
}
