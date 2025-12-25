import { Router } from "express";
import { protectRoute } from "../middleware/authmiddleware.js";
import { getAllUsers } from "../controllers/userController.js";

const router = Router();

router.get("/", protectRoute, getAllUsers);

export default router;