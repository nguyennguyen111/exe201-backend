// src/routes/messageRoutes.js
import express from "express";
import {
  getMessagesByChat,
  createMessage,
} from "../controllers/messageController.js";

const router = express.Router();

router.get("/:chatId", getMessagesByChat);
router.post("/", createMessage);

export default router;
