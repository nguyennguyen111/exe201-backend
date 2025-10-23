import express from "express";
import { env } from "~/config/environment";
import { errorHandlingMiddleware } from "~/middlewares/errorHandlingMiddleware";
import { connectDB } from "~/config/database";

// router
import authRoutes from "~/routes/authRoutes";

// admin
import adminRoutes from "./routes/adminRoutes";

// pt
import ptPackageRoutes from "./routes/ptPackageRoutes";
import ptProfileRoutes from "./routes/ptProfileRoutes";
import ptStudentRoutes from "./routes/ptStudentRoutes";
import ptApprovalRoutes from "./routes/ptApprovalRoutes.js";
import ptRoutes from "./routes/ptRoutes";
import ptWalletRoues from "./routes/ptWalletRoutes";

// student
import cookieParser from "cookie-parser";
import cors from "cors";
const morgan = require("morgan");
import http from "http";

// notification
import notificationRoutes from "./routes/notificationRoutes.js";

const START_SERVER = () => {
  const app = express();

  app.use(express.json());
  app.use(morgan("dev"));
  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
    })
  );
  app.use(cookieParser());

  app.use((req, res, next) => {
    if (req.path.startsWith("/socket.io")) return; // skip morgan
    next();
  });

  // user router
  app.use("/api/auth", authRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/pt", ptPackageRoutes);
  app.use("/api/pt", ptProfileRoutes);
  app.use("/api/pt", ptStudentRoutes);
  app.use("/api/pt", ptWalletRoues);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/pt", ptApprovalRoutes);
  app.use("/api/pt", ptRoutes);

  app.use(errorHandlingMiddleware);

  const server = http.createServer(app);

  server.listen(env.APP_PORT, env.APP_HOST, () => {
    console.log(
      `Hello ${env.AUTHOR}, I am running at http://${env.APP_HOST}:${env.APP_PORT}/`
    );
  });
};

(async () => {
  try {
    console.log("1. Connecting to MongoDB Cloud Atlas");
    await connectDB();
    console.log("2. Connected to MongoDB Cloud Atlas");
    START_SERVER();
  } catch (error) {
    console.error(error);
    process.exit(0);
  }
})();
