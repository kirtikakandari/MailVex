import { Worker, DelayedError } from "bullmq";
import IORedis from "ioredis";
import nodemailer from "nodemailer";
import { transporter } from "./mailer";
import { db } from "./db";
import { updateEmailIndex } from "./elasticsearch";
import {
  sendSlackRateLimitNotification,
} from "./slack";

const connection = new IORedis({
  host: "127.0.0.1",
  port: 6379,
  maxRetriesPerRequest: null,
});

const worker = new Worker(
  "emailQueue",

  async (job, token) => {
    console.log("Processing job:", job.id);
    console.log("Job data:", job.data);

    const {
      emailId,
      userId,
      email,
      subject,
      body,
    } = job.data;

    // ========================================================
    // 1. PREVENT DUPLICATE EMAIL SENDS
    // ========================================================

    if (emailId) {
      const [rows] = await db.execute(
        `SELECT status FROM emails WHERE id = ?`,
        [emailId]
      );

      const emailRow = (rows as any[])[0];

      if (!emailRow) {
        console.log(
          `Email ${emailId} not found in database.`
        );

        return;
      }

      if (emailRow.status === "sent") {
        console.log(
          `Email ${emailId} has already been sent. ` +
          `Skipping duplicate send.`
        );

        return;
      }
    }

    // ========================================================
    // 2. HOURLY RATE LIMIT
    // ========================================================

    const hourlyLimit = Number(
      job.data.hourlyLimit || 100
    );

    const now = new Date();

    const hourKey = `email-rate:${userId}:${now
      .toISOString()
      .slice(0, 13)}`;

    const currentCount =
      await connection.incr(hourKey);

    console.log("RATE LIMIT DEBUG", {
      jobId: job.id,
      userId,
      hourlyLimit,
      hourKey,
      currentCount,
    });

    // Keep the rate-limit key alive for 2 hours
    if (currentCount === 1) {
      await connection.expire(
        hourKey,
        7200
      );
    }

    // ========================================================
    // 3. RATE LIMIT EXCEEDED
    // ========================================================

    if (currentCount > hourlyLimit) {
      // Don't consume the rate-limit slot
      await connection.decr(hourKey);

      // Calculate beginning of next UTC hour
      const nextHour = new Date(now);

      nextHour.setUTCMinutes(
        0,
        0,
        0
      );

      nextHour.setUTCHours(
        nextHour.getUTCHours() + 1
      );

            // ------------------------------------------------------
      // Notify Slack once for this user's rate-limit event
      // ------------------------------------------------------

      const slackNotificationKey =
        `slack-rate-notified:${userId}:${hourKey}`;

      const shouldNotifySlack =
        await connection.set(
          slackNotificationKey,
          "1",
          "EX",
          7200,
          "NX"
        );

      if (shouldNotifySlack === "OK") {
        await sendSlackRateLimitNotification(
          userId,
          hourlyLimit,
          nextHour
        );
      }

      const delayUntilNextHour =
        nextHour.getTime();

      console.log(
        `Hourly limit (${hourlyLimit}) reached ` +
        `for user ${userId}. ` +
        `Rescheduling job ${job.id} ` +
        `until ${nextHour.toISOString()}`
      );

      // ------------------------------------------------------
      // Update MySQL scheduled time
      // ------------------------------------------------------

      if (emailId) {
        const mysqlDate = nextHour
          .toISOString()
          .slice(0, 19)
          .replace("T", " ");

        await db.execute(
          `UPDATE emails
           SET scheduled_at = ?
           WHERE id = ?`,
          [
            mysqlDate,
            emailId,
          ]
        );
      }

      // ------------------------------------------------------
      // Move BullMQ job to next hour
      // ------------------------------------------------------

      await job.moveToDelayed(
        delayUntilNextHour,
        token
      );

      // Tell BullMQ that this job was intentionally delayed
      throw new DelayedError();
    }

    // ========================================================
    // 4. SEND EMAIL
    // ========================================================

    try {
      const info =
        await transporter.sendMail({
          from: process.env.SMTP_FROM,
          to: email,
          subject,
          text: body,
        });

      console.log("Email sent!");

      console.log(
        "Message ID:",
        info.messageId
      );

      console.log(
        "Preview URL:",
        nodemailer.getTestMessageUrl(info)
      );

      // ======================================================
      // 5. UPDATE DATABASE
      // ======================================================

      if (emailId) {
        await db.execute(
          `UPDATE emails
           SET status = 'sent',
               sent_at = NOW(),
               message_id = ?
           WHERE id = ?`,
          [
            info.messageId,
            emailId,
          ]
        );

        await updateEmailIndex(
          emailId,
          {
            status: "sent",
            sentAt: new Date(),
          }
        );

        console.log(
          `Email ${emailId} marked as sent`
        );
      }

      return {
        messageId:
          info.messageId,
      };
    } catch (error) {
      // ======================================================
      // 6. HANDLE FAILED EMAIL
      // ======================================================

      if (emailId) {
        await db.execute(
          `UPDATE emails
           SET status = 'failed'
           WHERE id = ?`,
          [emailId]
        );

        await updateEmailIndex(
          emailId,
          {
            status: "failed",
          }
        );
      }

      console.error(
        "Email sending failed:",
        error
      );

      throw error;
    }
  },

  {
    connection,

    // ========================================================
    // CONFIGURABLE WORKER CONCURRENCY
    // ========================================================

    concurrency: Number(
      process.env.WORKER_CONCURRENCY || 5
    ),
  }
);

// ============================================================
// WORKER EVENTS
// ============================================================

worker.on(
  "completed",
  (job) => {
    console.log(
      `Job ${job.id} completed`
    );
  }
);

worker.on(
  "failed",
  (job, err) => {
    console.error(
      `Job ${job?.id} failed:`,
      err.message
    );
  }
);

console.log(
  `Email worker is running with concurrency ${Number(
    process.env.WORKER_CONCURRENCY || 5
  )}...`
);