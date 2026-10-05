import express from "express";
import cors from "cors";
import session from "express-session";
import passport from "./auth";

import { db } from "./db";
import { emailQueue } from "./queue";
import "./worker";

import {
  testElasticsearch,
  createEmailIndex,
  syncEmailsToElasticsearch,
} from "./elasticsearch";

import { ExpressAdapter } from "@bull-board/express";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";

import authRoutes from "./routes/authRoutes";
import emailRoutes from "./routes/emailRoutes";

const app = express();

app.use(
  session({
    secret: process.env.SESSION_SECRET || "reachinbox-development-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

createBullBoard({
  queues: [new BullMQAdapter(emailQueue)],
  serverAdapter,
});

app.use("/admin/queues", serverAdapter.getRouter());

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "ReachInbox backend is running",
  });
});

app.get("/test-db", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT 1 AS result");

    res.json({
      message: "Database connected successfully",
      data: rows,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Database connection failed",
    });
  }
});

app.get("/test-queue", async (req, res) => {
  try {
    const job = await emailQueue.add(
      "test-email",
      {
        email: "kirtikakandari@gmail.com",
        subject: "ReachInbox Test Email",
        body: "Hello! This email was scheduled through BullMQ and sent using Ethereal SMTP.",
        hourlyLimit: 100,
      },
      {
        delay: 10000,
      }
    );

    res.json({
      message: "Job added successfully",
      jobId: job.id,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to add job",
    });
  }
});

app.use("/auth", authRoutes);
app.use("/emails", emailRoutes);

const PORT = 5000;

app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);

  try {
    await testElasticsearch();
    await createEmailIndex();
    await syncEmailsToElasticsearch();

    console.log("Elasticsearch startup sync completed.");
  } catch (error) {
    console.error(
      "Elasticsearch startup failed. Server will continue running:",
      error
    );
  }
});
