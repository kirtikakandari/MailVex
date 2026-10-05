import express from "express";
import multer from "multer";
import { parse } from "csv-parse/sync";

import { db } from "../db";
import { emailQueue } from "../queue";
import { elasticsearch, indexEmail } from "../elasticsearch";
import { requireAuth } from "../middleware/requireAuth";
import { formatMySQLDate } from "../utils/dateUtils";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

// ============================================================
// SCHEDULE SINGLE EMAIL
// ============================================================

router.post("/schedule", requireAuth, async (req, res) => {
  try {
    const {
      email,
      subject,
      body,
      scheduledAt,
      delayBetweenEmails = 0,
      hourlyLimit = 100,
    } = req.body;

    if (!email || !subject || !body || !scheduledAt) {
      return res.status(400).json({
        message: "email, subject, body and scheduledAt are required",
      });
    }

    const scheduledDate = new Date(scheduledAt);

    if (isNaN(scheduledDate.getTime())) {
      return res.status(400).json({
        message: "Invalid scheduledAt date",
      });
    }

    const userId = (req.user as any).id;

    // --------------------------------------------------------
    // 1. Save email to MySQL
    // --------------------------------------------------------

    const [result] = await db.execute(
      `INSERT INTO emails
       (user_id, recipient, subject, body, scheduled_at)
       VALUES (?, ?, ?, ?, ?)`,
      [
        userId,
        email,
        subject,
        body,
        formatMySQLDate(scheduledDate),
      ]
    );

    const insertResult = result as any;
    const emailId = insertResult.insertId;

    // --------------------------------------------------------
    // 2. Index email in Elasticsearch
    // --------------------------------------------------------

    await indexEmail({
      emailId,
      userId,
      recipient: email,
      subject,
      body,
      status: "scheduled",
      scheduledAt: scheduledDate,
      createdAt: new Date(),
    });

    // --------------------------------------------------------
    // 3. Calculate BullMQ delay
    // --------------------------------------------------------

    const delay = Math.max(
      0,
      scheduledDate.getTime() - Date.now()
    );

    // --------------------------------------------------------
    // 4. Add job to BullMQ
    // --------------------------------------------------------

    const job = await emailQueue.add(
      "send-email",
      {
        emailId,
        userId,
        email,
        subject,
        body,
        hourlyLimit,
        delayBetweenEmails,
      },
      {
        delay,
        jobId: `email-${emailId}`,
      }
    );

    res.status(201).json({
      message: "Email scheduled successfully",
      emailId,
      jobId: job.id,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to schedule email",
    });
  }
});

// ============================================================
// SCHEDULE BULK EMAILS
// ============================================================

router.post("/schedule-bulk", requireAuth, async (req, res) => {
  try {
    const {
      emails,
      subject,
      body,
      scheduledAt,
      delayBetweenEmails = 0,
      hourlyLimit = 100,
    } = req.body;

    if (
      !Array.isArray(emails) ||
      emails.length === 0 ||
      !subject ||
      !body ||
      !scheduledAt
    ) {
      return res.status(400).json({
        message:
          "emails, subject, body and scheduledAt are required",
      });
    }

    const baseTime = new Date(scheduledAt).getTime();

    if (isNaN(baseTime)) {
      return res.status(400).json({
        message: "Invalid scheduledAt date",
      });
    }

    const userId = (req.user as any).id;

    // Remove duplicate recipients
    const uniqueEmails = [
      ...new Set(
        emails
          .map((email: string) => email.trim().toLowerCase())
          .filter(Boolean)
      ),
    ];

    if (uniqueEmails.length === 0) {
      return res.status(400).json({
        message: "No valid recipients found",
      });
    }

    // --------------------------------------------------------
    // 1. Insert emails into MySQL with limited concurrency
    // --------------------------------------------------------

    const insertedEmails: Array<{
      emailId: number;
      email: string;
      scheduledAt: Date;
      delay: number;
    }> = [];

    const DB_CONCURRENCY = 25;

    for (
      let start = 0;
      start < uniqueEmails.length;
      start += DB_CONCURRENCY
    ) {
      const batch = uniqueEmails.slice(
        start,
        start + DB_CONCURRENCY
      );

      const results = await Promise.all(
        batch.map(async (email, batchIndex) => {
          const index = start + batchIndex;

          const emailScheduledTime =
            baseTime +
            index *
              Number(delayBetweenEmails) *
              1000;

          const emailScheduledDate = new Date(
            emailScheduledTime
          );

          const delay = Math.max(
            0,
            emailScheduledTime - Date.now()
          );

          const [result] = await db.execute(
            `INSERT INTO emails
             (user_id, recipient, subject, body, scheduled_at)
             VALUES (?, ?, ?, ?, ?)`,
            [
              userId,
              email,
              subject,
              body,
              formatMySQLDate(emailScheduledDate),
            ]
          );

          const insertResult = result as any;

          return {
            emailId: insertResult.insertId,
            email,
            scheduledAt: emailScheduledDate,
            delay,
          };
        })
      );

      insertedEmails.push(...results);
    }

    // --------------------------------------------------------
    // 2. Add ALL jobs to BullMQ at once
    // --------------------------------------------------------

    const jobs = insertedEmails.map((item) => ({
      name: "send-email",
      data: {
        emailId: item.emailId,
        userId,
        email: item.email,
        subject,
        body,
        hourlyLimit: Number(hourlyLimit),
        delayBetweenEmails: Number(delayBetweenEmails),
      },
      opts: {
        delay: item.delay,
        jobId: `email-${item.emailId}`,
      },
    }));

    const addedJobs = await emailQueue.addBulk(jobs);

    // --------------------------------------------------------
    // 3. Index in Elasticsearch WITHOUT blocking scheduling
    // --------------------------------------------------------

    void (async () => {
      const ES_CONCURRENCY = 25;

      for (
        let start = 0;
        start < insertedEmails.length;
        start += ES_CONCURRENCY
      ) {
        const batch = insertedEmails.slice(
          start,
          start + ES_CONCURRENCY
        );

        await Promise.allSettled(
          batch.map((item) =>
            indexEmail({
              emailId: item.emailId,
              userId,
              recipient: item.email,
              subject,
              body,
              status: "scheduled",
              scheduledAt: item.scheduledAt,
              createdAt: new Date(),
            })
          )
        );
      }
    })().catch((error) => {
      console.error(
        "Background Elasticsearch indexing failed:",
        error
      );
    });

    // --------------------------------------------------------
    // 4. Respond immediately after MySQL + BullMQ succeed
    // --------------------------------------------------------

    return res.status(201).json({
      message: `${addedJobs.length} emails scheduled successfully`,
      count: addedJobs.length,
      jobs: addedJobs.map((job, index) => ({
        emailId: insertedEmails[index].emailId,
        jobId: job.id,
        email: insertedEmails[index].email,
        scheduledAt:
          insertedEmails[index].scheduledAt,
      })),
    });
  } catch (error) {
    console.error(
      "Bulk scheduling failed:",
      error
    );

    return res.status(500).json({
      message: "Failed to schedule emails",
    });
  }
});

// ============================================================
// SEARCH EMAILS
// ============================================================

router.get("/search", requireAuth, async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();

    if (!q) {
      return res.status(400).json({
        message: "Search query is required",
      });
    }

    const userId = (req.user as any).id;

    const result = await elasticsearch.search({
      index: "emails",

      query: {
        bool: {
          must: [
            {
              multi_match: {
                query: q,
                fields: [
                  "recipient",
                  "subject",
                  "body",
                  "status",
                ],
              },
            },
          ],

          filter: [
            {
              term: {
                userId: userId,
              },
            },
          ],
        },
      },

      sort: [
        {
          createdAt: {
            order: "desc",
          },
        },
      ],
    });

    const emails = result.hits.hits.map((hit) => ({
      id: hit._id,
      ...(hit._source as any),
    }));

    res.json({
      total: emails.length,
      emails,
    });
  } catch (error) {
    console.error(
      "Elasticsearch search failed:",
      error
    );

    res.status(500).json({
      message: "Search failed",
    });
  }
});
// ============================================================
// PARSE CSV - does NOT schedule emails
// ============================================================

router.post(
  "/parse-csv",
  requireAuth,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "CSV file is required",
        });
      }

      const records = parse(
        req.file.buffer.toString("utf-8"),
        {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        }
      ) as Record<string, string>[];

      if (!records.length) {
        return res.status(400).json({
          message: "CSV file is empty",
        });
      }

      const recipients: string[] = [];

      for (const row of records) {
        const email = String(
          row.email || row.recipient || ""
        )
          .trim()
          .toLowerCase();

        if (
          email &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ) {
          recipients.push(email);
        }
      }

      const uniqueRecipients = [
        ...new Set(recipients),
      ];

      if (uniqueRecipients.length === 0) {
        return res.status(400).json({
          message:
            "CSV must contain a valid email or recipient column",
        });
      }

      return res.status(200).json({
        message: `${uniqueRecipients.length} recipients loaded`,
        count: uniqueRecipients.length,
        recipients: uniqueRecipients,
      });
    } catch (error) {
      console.error("CSV parsing failed:", error);

      return res.status(500).json({
        message: "Failed to parse CSV file",
      });
    }
  }
);
// ============================================================
// PARSE CSV ONLY
// Does NOT schedule or send emails
// ============================================================

router.post(
  "/parse-csv",
  requireAuth,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "CSV file is required",
        });
      }

      const records = parse(
        req.file.buffer.toString("utf-8"),
        {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        }
      ) as Record<string, string>[];

      if (records.length === 0) {
        return res.status(400).json({
          message: "CSV file is empty",
        });
      }

      const recipients: string[] = [];

      for (const row of records) {
        const email = String(
          row.email || row.recipient || ""
        )
          .trim()
          .toLowerCase();

        if (
          email &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ) {
          recipients.push(email);
        }
      }

      const uniqueRecipients = [
        ...new Set(recipients),
      ];

      if (uniqueRecipients.length === 0) {
        return res.status(400).json({
          message:
            "CSV must contain a valid email or recipient column",
        });
      }

      return res.status(200).json({
        message: `${uniqueRecipients.length} recipients loaded`,
        count: uniqueRecipients.length,
        recipients: uniqueRecipients,
      });
    } catch (error) {
      console.error(
        "CSV parsing failed:",
        error
      );

      return res.status(500).json({
        message: "Failed to parse CSV file",
      });
    }
  }
);

// ============================================================
// UPLOAD CSV
// ============================================================

router.post(
  "/upload-csv",
  requireAuth,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "CSV file is required",
        });
      }

      const {
        subject,
        body,
        scheduledAt,
        delayBetweenEmails = 0,
        hourlyLimit = 100,
      } = req.body;

      if (!subject || !body || !scheduledAt) {
        return res.status(400).json({
          message:
            "subject, body and scheduledAt are required",
        });
      }

      const baseTime = new Date(scheduledAt).getTime();

      if (isNaN(baseTime)) {
        return res.status(400).json({
          message: "Invalid scheduledAt date",
        });
      }

      // ------------------------------------------------------
      // Parse CSV
      // ------------------------------------------------------

      const records = parse(
        req.file.buffer.toString("utf-8"),
        {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        }
      ) as Record<string, string>[];

      if (!records.length) {
        return res.status(400).json({
          message: "CSV file is empty",
        });
      }

      // ------------------------------------------------------
      // Support either "email" or "recipient" column
      // ------------------------------------------------------

      const recipients: string[] = [];

      for (const row of records) {
        const email = String(
          row.email || row.recipient || ""
        )
          .trim()
          .toLowerCase();

        if (email) {
          recipients.push(email);
        }
      }

      if (recipients.length === 0) {
        return res.status(400).json({
          message:
            "CSV must contain an email or recipient column",
        });
      }

      const scheduledJobs = [];

      const userId = (req.user as any).id;

      // ------------------------------------------------------
      // Schedule each CSV recipient
      // ------------------------------------------------------

      for (let i = 0; i < recipients.length; i++) {
        const email = recipients[i];

        // Basic email validation
        if (
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ) {
          continue;
        }

        const emailScheduledTime =
          baseTime +
          i * Number(delayBetweenEmails) * 1000;

        const emailScheduledDate = new Date(
          emailScheduledTime
        );

        const delay = Math.max(
          0,
          emailScheduledTime - Date.now()
        );

        // ----------------------------------------------------
        // 1. Save to MySQL
        // ----------------------------------------------------

        const [result] = await db.execute(
          `INSERT INTO emails
           (user_id, recipient, subject, body, scheduled_at)
           VALUES (?, ?, ?, ?, ?)`,
          [
            userId,
            email,
            subject,
            body,
            formatMySQLDate(emailScheduledDate),
          ]
        );

        const insertResult = result as any;
        const emailId = insertResult.insertId;

        // ----------------------------------------------------
        // 2. Index in Elasticsearch
        // ----------------------------------------------------

        await indexEmail({
          emailId,
          userId,
          recipient: email,
          subject,
          body,
          status: "scheduled",
          scheduledAt: emailScheduledDate,
          createdAt: new Date(),
        });

        // ----------------------------------------------------
        // 3. Add BullMQ job
        // ----------------------------------------------------

        const job = await emailQueue.add(
          "send-email",
          {
            emailId,
            userId,
            email,
            subject,
            body,
            hourlyLimit: Number(hourlyLimit),
            delayBetweenEmails,
          },
          {
            delay,
            jobId: `email-${emailId}`,
          }
        );

        scheduledJobs.push({
          emailId,
          jobId: job.id,
          email,
          scheduledAt: emailScheduledDate,
        });
      }

      if (scheduledJobs.length === 0) {
        return res.status(400).json({
          message:
            "No valid email addresses found in CSV",
        });
      }

      res.status(201).json({
        message: `${scheduledJobs.length} emails scheduled successfully`,
        jobs: scheduledJobs,
      });
    } catch (error) {
      console.error(
        "CSV upload failed:",
        error
      );

      res.status(500).json({
        message: "Failed to process CSV",
      });
    }
  }
);

// ============================================================
// GET USER EMAILS
// ============================================================

router.get("/", requireAuth, async (req, res) => {
  try {
    const status = String(
      req.query.status || ""
    ).trim();

    const userId = (req.user as any).id;

    let query = `
      SELECT
        id,
        recipient,
        subject,
        body,
        scheduled_at,
        sent_at,
        status,
        message_id,
        created_at
      FROM emails
      WHERE user_id = ?
    `;

    const params: any[] = [userId];

    if (
      status === "scheduled" ||
      status === "sent" ||
      status === "failed"
    ) {
      query += ` AND status = ?`;
      params.push(status);
    }

    query += ` ORDER BY created_at DESC`;

    const [rows] = await db.execute(
      query,
      params
    );

    res.json({
      emails: rows,
    });
  } catch (error) {
    console.error(
      "Failed to fetch emails:",
      error
    );

    res.status(500).json({
      message: "Failed to fetch emails",
    });
  }
});

export default router;