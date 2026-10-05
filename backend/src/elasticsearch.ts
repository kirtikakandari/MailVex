import { Client } from "@elastic/elasticsearch";
import dotenv from "dotenv";
import { db } from "./db";

dotenv.config();

const node = process.env.ELASTICSEARCH_URL;

if (!node) {
  throw new Error("ELASTICSEARCH_URL is missing from .env");
}

export const elasticsearch = new Client({
  node,
  auth: {
    username: process.env.ELASTICSEARCH_USERNAME!,
    password: process.env.ELASTICSEARCH_PASSWORD!,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// ============================================================
// TEST ELASTICSEARCH CONNECTION
// ============================================================

export async function testElasticsearch() {
  try {
    const response = await elasticsearch.info();

    console.log(
      "Elasticsearch connected:",
      response.version.number
    );
  } catch (error) {
    console.error(
      "Elasticsearch connection failed:",
      error
    );
  }
}

// ============================================================
// CREATE EMAIL INDEX
// ============================================================

export async function createEmailIndex() {
  const indexName = "emails";

  try {
    const exists = await elasticsearch.indices.exists({
      index: indexName,
    });

    if (!exists) {
      await elasticsearch.indices.create({
        index: indexName,

        mappings: {
          properties: {
            emailId: {
              type: "integer",
            },

            // User who owns this email
            userId: {
              type: "integer",
            },

            recipient: {
              type: "text",
              fields: {
                keyword: {
                  type: "keyword",
                },
              },
            },

            subject: {
              type: "text",
            },

            body: {
              type: "text",
            },

            status: {
              type: "keyword",
            },

            scheduledAt: {
              type: "date",
            },

            sentAt: {
              type: "date",
            },

            createdAt: {
              type: "date",
            },
          },
        },
      });

      console.log(
        "Elasticsearch index 'emails' created"
      );
    } else {
      console.log(
        "Elasticsearch index 'emails' already exists"
      );
    }
  } catch (error) {
    console.error(
      "Failed to create Elasticsearch index:",
      error
    );
  }
}

// ============================================================
// INDEX EMAIL
// ============================================================

export async function indexEmail(email: {
  emailId: number;
  userId: number;
  recipient: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: Date | string;
  sentAt?: Date | string | null;
  createdAt?: Date | string;
}) {
  try {
    await elasticsearch.index({
      index: "emails",

      id: String(email.emailId),

      refresh: "wait_for",

      document: {
        emailId: email.emailId,

        // Store owner of the email
        userId: email.userId,

        recipient: email.recipient,
        subject: email.subject,
        body: email.body,
        status: email.status,
        scheduledAt: email.scheduledAt,
        sentAt: email.sentAt ?? null,
        createdAt: email.createdAt ?? new Date(),
      },
    });

    console.log(
      `Email ${email.emailId} indexed in Elasticsearch`
    );
  } catch (error) {
    console.error(
      `Failed to index email ${email.emailId}:`,
      error
    );
  }
}

// ============================================================
// UPDATE EMAIL INDEX
// ============================================================

export async function updateEmailIndex(
  emailId: number,
  data: {
    status?: string;
    sentAt?: Date | string | null;
  }
) {
  try {
    await elasticsearch.update({
      index: "emails",
      id: String(emailId),

      doc: data,
    });

    console.log(
      `Email ${emailId} Elasticsearch document updated`
    );
  } catch (error) {
    console.error(
      `Failed to update email ${emailId} in Elasticsearch:`,
      error
    );
  }
}

// ============================================================
// SYNC MYSQL EMAILS TO ELASTICSEARCH
// ============================================================

export async function syncEmailsToElasticsearch() {
  try {
    const [rows] = await db.execute(`
      SELECT
        id,
        user_id,
        recipient,
        subject,
        body,
        status,
        scheduled_at,
        sent_at,
        created_at
      FROM emails
    `);

    const emails = rows as any[];

    if (emails.length === 0) {
      console.log(
        "No emails found in MySQL to sync."
      );
      return;
    }

    const operations: any[] = [];

    for (const email of emails) {
      // ------------------------------------------------------
      // Bulk index operation
      // ------------------------------------------------------

      operations.push({
        index: {
          _index: "emails",
          _id: String(email.id),
        },
      });

      // ------------------------------------------------------
      // Email document
      // ------------------------------------------------------

      operations.push({
        emailId: email.id,

        // User who owns the email
        userId: email.user_id,

        recipient: email.recipient,
        subject: email.subject,
        body: email.body,
        status: email.status,
        scheduledAt: email.scheduled_at,
        sentAt: email.sent_at,
        createdAt: email.created_at,
      });
    }

    await elasticsearch.bulk({
      refresh: true,
      operations,
    });

    console.log(
      `${emails.length} emails synced to Elasticsearch`
    );
  } catch (error) {
    console.error(
      "Failed to sync emails to Elasticsearch:",
      error
    );
  }
}