import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { UserService } from "../services/user.service";
import {
  createPerson,
  getPeople,
  getPersonById,
  updatePerson,
  deletePerson,
  importPeople,
  convertToMember,
} from "../controllers/person.controller";

const router = Router();
const auth = authMiddleware(new UserService());

router.use(auth as any);

router.post("/", createPerson);
router.get("/", getPeople);
router.get("/:id", getPersonById);
router.put("/:id", updatePerson);
router.delete("/", deletePerson);
router.post("/import", importPeople);
router.post("/:id/convert", convertToMember);

export default router;
