import { AppDataSource } from "../config/database";
import {
  DenominationRequest,
  DenominationRequestStatus,
} from "../models/church/denomination-request.model";
import { Denomination } from "../models/church/denomination.model";
import { User } from "../models/user.model";
import { sendDenominationApprovedEmail, sendDenominationRejectedEmail, sendNewDenominationRequestAdminNotify } from "../email/email.denomination_approved";
import { firebaseAuth } from "../config/firebase.admin";
import { randomUUID } from "crypto";
import CustomError from "../utils/customError";

export class DenominationRequestService {
  private readonly requestRepo = AppDataSource.getRepository(DenominationRequest);
  private readonly denominationRepo = AppDataSource.getRepository(Denomination);
  private readonly userRepo = AppDataSource.getRepository(User);

  /**
   * Submit a new denomination request (public — no auth required).
   */
  async submit(data: {
    denomination_name: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    reason?: string;
  }): Promise<DenominationRequest> {
    // Check for duplicate denomination name
    const existingDenom = await this.denominationRepo
      .createQueryBuilder("d")
      .where("LOWER(d.denomination_name) = LOWER(:name)", {
        name: data.denomination_name.trim(),
      })
      .getOne();
    if (existingDenom) {
      throw new CustomError(
        `A denomination named "${data.denomination_name.trim()}" is already registered.`,
        409
      );
    }

    // Check for duplicate pending request
    const existingRequest = await this.requestRepo.findOne({
      where: {
        email: data.email.toLowerCase().trim(),
        status: DenominationRequestStatus.PENDING,
      },
    });
    if (existingRequest) {
      throw new CustomError(
        "You already have a pending denomination request. Please wait for it to be reviewed.",
        409
      );
    }

    const request = this.requestRepo.create({
      denomination_name: data.denomination_name.trim(),
      first_name: data.first_name.trim(),
      last_name: data.last_name.trim(),
      email: data.email.toLowerCase().trim(),
      phone: data.phone?.trim() || undefined,
      address: data.address?.trim() || undefined,
      city: data.city?.trim() || undefined,
      state: data.state?.trim() || undefined,
      country: data.country?.trim() || undefined,
      reason: data.reason?.trim() || undefined,
    });

    const saved = await this.requestRepo.save(request);

    // Notify admin of new request (fire-and-forget)
    sendNewDenominationRequestAdminNotify({
      denomination_name: saved.denomination_name,
      first_name: saved.first_name,
      last_name: saved.last_name,
      email: saved.email,
      phone: saved.phone,
      city: saved.city,
      state: saved.state,
      country: saved.country,
      reason: saved.reason,
    }).catch(() => {}); // don't fail the request if email fails

    return saved;
  }

  /**
   * List all denomination requests (super_admin only).
   */
  async list(status?: DenominationRequestStatus): Promise<DenominationRequest[]> {
    const where = status ? { status } : {};
    return this.requestRepo.find({
      where,
      order: { created_at: "DESC" },
    });
  }

  /**
   * Get a single request by ID.
   */
  async getById(id: string): Promise<DenominationRequest> {
    const request = await this.requestRepo.findOne({ where: { id } });
    if (!request) throw new CustomError("Denomination request not found", 404);
    return request;
  }

  /**
   * Approve a denomination request:
   * 1. Create a user account with a temporary password
   * 2. Create the denomination
   * 3. Link the user to the denomination
   * 4. Send login credentials via email
   */
  async approve(
    requestId: string,
    reviewerId: string
  ): Promise<{ user: User; denomination: Denomination }> {
    const request = await this.getById(requestId);

    if (request.status !== DenominationRequestStatus.PENDING) {
      throw new CustomError("This request has already been reviewed", 400);
    }

    // Check if user already exists with this email
    const existingUser = await this.userRepo.findOne({
      where: { email: request.email },
    });
    if (existingUser) {
      throw new CustomError(
        "A user with this email already exists. They should register their denomination via the normal flow.",
        409
      );
    }

    // Check denomination name again (could have been registered between request and approval)
    const existingDenom = await this.denominationRepo
      .createQueryBuilder("d")
      .where("LOWER(d.denomination_name) = LOWER(:name)", {
        name: request.denomination_name,
      })
      .getOne();
    if (existingDenom) {
      throw new CustomError(
        `A denomination named "${request.denomination_name}" has already been registered.`,
        409
      );
    }

    // Generate a secure temporary password
    const tempPassword = this.generateTempPassword();

    // Pre-generate a shared UUID so Firebase UID === PostgreSQL user ID
    const userId = randomUUID();
    const fullName = `${request.first_name} ${request.last_name}`;

    // 1. Create Firebase Auth account FIRST (fail fast before any DB writes)
    try {
      await firebaseAuth.createUser({
        uid: userId,
        email: request.email,
        password: tempPassword,
        displayName: fullName,
        emailVerified: false,
      });
    } catch (firebaseError: any) {
      throw new CustomError(
        `Failed to create Firebase account: ${firebaseError.message}`,
        500
      );
    }

    // 2. Persist to PostgreSQL using the same UUID (NO password stored — Firebase owns auth)
    let savedUser: User;
    try {
      const user = this.userRepo.create({
        id: userId,
        email: request.email,
        full_name: fullName,
        first_name: request.first_name,
        last_name: request.last_name,
        phone_number: request.phone || undefined,
        address_line: request.address || undefined,
        city: request.city || undefined,
        country: request.country || undefined,
        role: "admin",
        is_active: true,
      });
      savedUser = await this.userRepo.save(user);
    } catch (dbError: any) {
      // Roll back the Firebase account so the two systems stay in sync
      try {
        await firebaseAuth.deleteUser(userId);
      } catch (fbRollbackError: any) {
        console.error("⚠️  Firebase rollback failed after DB error — manual cleanup may be needed for uid:", userId);
      }
      throw dbError;
    }

    // Create the denomination
    const denomination = this.denominationRepo.create({
      denomination_name: request.denomination_name,
      address: request.address || undefined,
      country: request.country || undefined,
      admin_id: savedUser.id,
    });
    const savedDenom = await this.denominationRepo.save(denomination);

    // Link user to denomination
    const userForMembership = await this.userRepo.findOne({
      where: { id: savedUser.id },
      relations: ["denominations"],
    });
    if (userForMembership) {
      userForMembership.denominations = [savedDenom];
      await this.userRepo.save(userForMembership);
    }

    // Mark request as approved
    request.status = DenominationRequestStatus.APPROVED;
    request.reviewed_by = reviewerId;
    request.reviewed_at = new Date();
    await this.requestRepo.save(request);

    // Send credentials email (fire-and-forget — don't fail the approval if email fails)
    sendDenominationApprovedEmail(
      request.email,
      request.first_name,
      request.denomination_name,
      tempPassword
    ).catch(() => {});

    return { user: savedUser, denomination: savedDenom };
  }

  /**
   * Reject a denomination request.
   */
  async reject(requestId: string, reviewerId: string, rejectionReason: string): Promise<DenominationRequest> {
    const request = await this.getById(requestId);

    if (request.status !== DenominationRequestStatus.PENDING) {
      throw new CustomError("This request has already been reviewed", 400);
    }

    request.status = DenominationRequestStatus.REJECTED;
    request.reviewed_by = reviewerId;
    request.reviewed_at = new Date();
    request.rejection_reason = rejectionReason.trim();
    const saved = await this.requestRepo.save(request);

    // Send rejection email to requester (fire-and-forget — don't fail the rejection if email fails)
    sendDenominationRejectedEmail(
      request.email,
      request.first_name,
      request.denomination_name,
      rejectionReason.trim()
    ).catch(() => {});

    return saved;
  }

  /**
   * Generate a secure temporary password (alphanumeric, 10 chars).
   */
  private generateTempPassword(): string {
    return Math.random().toString(36).slice(-5) + Math.random().toString(36).slice(-5);
  }
}
