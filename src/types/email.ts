export type Email = {
  id: number;
  recipient: string;
  subject: string;
  body: string;
  scheduled_at: string;
  sent_at: string | null;
  status: "scheduled" | "sent" | "failed";
  message_id: string | null;
  created_at: string;
};

export type MailboxView = "received" | "starred" | "deleted" | null;
