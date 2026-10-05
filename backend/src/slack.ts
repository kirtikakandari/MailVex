import crypto from "crypto";
import { db } from "./db";

export function generateSlackState(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function getSlackAuthorizationUrl(state: string): string {
  const clientId = process.env.SLACK_CLIENT_ID;
  const redirectUri = process.env.SLACK_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error(
      "Slack OAuth environment variables are missing"
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    scope: "incoming-webhook",
    redirect_uri: redirectUri,
    state,
  });

  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}

export async function exchangeSlackCode(
  code: string
) {
  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  const redirectUri = process.env.SLACK_REDIRECT_URI;

  if (
    !clientId ||
    !clientSecret ||
    !redirectUri
  ) {
    throw new Error(
      "Slack OAuth environment variables are missing"
    );
  }

  const response = await fetch(
    "https://slack.com/api/oauth.v2.access",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    }
  );

  const data = await response.json();

  if (!data.ok) {
    throw new Error(
      data.error || "Slack OAuth failed"
    );
  }

  return data;
}

export async function saveSlackConnection(
  userId: number,
  data: any
) {
  const webhook = data.incoming_webhook;

  if (!webhook?.url) {
    throw new Error(
      "Slack did not return an incoming webhook"
    );
  }

  await db.execute(
    `INSERT INTO slack_connections
      (
        user_id,
        team_id,
        team_name,
        channel_id,
        channel_name,
        webhook_url
      )
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       team_id = VALUES(team_id),
       team_name = VALUES(team_name),
       channel_id = VALUES(channel_id),
       channel_name = VALUES(channel_name),
       webhook_url = VALUES(webhook_url),
       updated_at = CURRENT_TIMESTAMP`,
    [
      userId,
      data.team?.id || "",
      data.team?.name || "",
      webhook.channel_id || null,
      webhook.channel || null,
      webhook.url,
    ]
  );
}

export async function sendSlackRateLimitNotification(
  userId: number,
  hourlyLimit: number,
  nextHour: Date
) {
  try {
    const [rows] = await db.execute(
      `SELECT webhook_url, channel_name
       FROM slack_connections
       WHERE user_id = ?`,
      [userId]
    );

    const connection = (rows as any[])[0];

    // Slack isn't connected. That's completely fine.
    if (!connection?.webhook_url) {
      return;
    }

    const message =
      `ReachInbox rate limit reached. ` +
      `The hourly limit of ${hourlyLimit} emails has been reached. ` +
      `Remaining emails have been rescheduled for ` +
      `${nextHour.toISOString()}.`;

    const response = await fetch(
      connection.webhook_url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: message,
        }),
      }
    );

    if (!response.ok) {
      console.error(
        "Slack notification failed:",
        response.status,
        await response.text()
      );
    } else {
      console.log(
        `Slack rate-limit notification sent for user ${userId}`
      );
    }
  } catch (error) {
    // Slack failure must NEVER break email processing.
    console.error(
      "Slack notification error:",
      error
    );
  }
}