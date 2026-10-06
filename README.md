# MailVex — Email Scheduler & Automation Platform

MailVex is a full-stack email scheduling and automation platform built as a ReachInbox Full-Stack Engineer assessment.

It supports scheduled and bulk email sending, persistent BullMQ jobs, Redis-backed rate limiting, Elasticsearch indexing, Google OAuth, Slack rate-limit notifications, and a React dashboard.

---

## Features

- Google OAuth authentication
- Email/password authentication
- Schedule emails for a specific start time
- Send emails immediately
- Bulk recipient import through CSV
- Configurable delay between individual emails
- Configurable hourly email limit
- Redis-backed rate limiting
- Automatic rescheduling when the hourly limit is reached
- BullMQ delayed jobs
- Configurable BullMQ worker concurrency
- Idempotent email processing to prevent duplicate sends
- MySQL persistence
- Ethereal SMTP email delivery
- Elasticsearch indexing
- BullMQ live queue dashboard
- Slack OAuth integration
- Slack rate-limit notifications
- Scheduled and sent email dashboard
- Loading, empty, and error states
- Tested with 1000+ scheduled emails

---

# Tech Stack

## Frontend

- React
- TypeScript
- Tailwind CSS
- Vite

## Backend

- Node.js
- TypeScript
- Express.js
- BullMQ
- Redis / Memurai
- MySQL
- Nodemailer
- Ethereal Email
- Elasticsearch
- Google OAuth
- Slack OAuth

---

# Project Structure

```text
MailVex/
│
├── backend/
│   ├── src/
│   │   ├── server.ts
│   │   ├── db.ts
│   │   ├── queue.ts
│   │   ├── worker.ts
│   │   ├── mailer.ts
│   │   ├── elasticsearch.ts
│   │   ├── auth.ts
│   │   ├── slack.ts
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── utils/
│   │
│   ├── .env
│   ├── package.json
│   └── tsconfig.json
│
├── src/
│   ├── App.tsx
│   ├── pages/
│   ├── components/
│   ├── services/
│   ├── hooks/
│   └── types/
│
├── package.json
└── README.md
```

---

# Prerequisites

Install the following before running the project:

- Node.js
- MySQL
- Redis or Memurai
- Elasticsearch

---

# Installation & Setup

## 1. Clone the Repository

```bash
git clone https://github.com/kirtikakandari/MailVex.git
cd MailVex
```

---

## 2. Install Dependencies

### Frontend

From the project root:

```bash
npm install
```

### Backend

Open a terminal and run:

```bash
cd backend
npm install
```

---

# 3. Configure MySQL

Create the database:

```sql
CREATE DATABASE reachinbox;
```

The application uses the following tables:

- `users`
- `emails`
- `slack_connections`

Make sure MySQL is running before starting the backend.

---

# 4. Configure Redis

Make sure Redis/Memurai is running on:

```text
127.0.0.1:6379
```

For Memurai, verify the connection with:

```bash
memurai-cli ping
```

Expected output:

```text
PONG
```

---

# 5. Configure Elasticsearch

Make sure Elasticsearch is running at:

```text
https://localhost:9200
```

Elasticsearch credentials are provided through environment variables.

---

# 6. Configure Environment Variables

Create the following file:

```text
backend/.env
```

Use the following structure:

```env
PORT=5000

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_PASSWORD
DB_NAME=reachinbox

REDIS_HOST=localhost
REDIS_PORT=6379

SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=YOUR_ETHEREAL_USERNAME
SMTP_PASS=YOUR_ETHEREAL_PASSWORD
SMTP_FROM=ReachInbox <no-reply@reachinbox.local>

ELASTICSEARCH_URL=https://localhost:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=YOUR_ELASTICSEARCH_PASSWORD

GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback

SLACK_CLIENT_ID=YOUR_SLACK_CLIENT_ID
SLACK_CLIENT_SECRET=YOUR_SLACK_CLIENT_SECRET
SLACK_REDIRECT_URI=http://localhost:5000/auth/slack/callback

SESSION_SECRET=YOUR_SESSION_SECRET

WORKER_CONCURRENCY=5
```

Replace the placeholder values with your own credentials.

**Do not commit the real `.env` file to GitHub.**

---

# 7. Start the Backend

Open **Terminal 1**.

From the project root:

```bash
cd backend
npm run dev
```

The backend will run on:

```text
http://localhost:5000
```

The BullMQ email worker is also started with the backend.

---

# 8. Start the Frontend

Open **Terminal 2**.

From the project root:

```bash
npm run dev
```

The frontend will run on:

```text
http://localhost:5173
```

Open the application in your browser:

```text
http://localhost:5173
```

---

# Running the Application

You need two terminals for local development.

### Terminal 1 — Backend

```bash
cd backend
npm run dev
```

### Terminal 2 — Frontend

```bash
npm run dev
```

The following services must also be running:

- MySQL
- Redis/Memurai
- Elasticsearch

---

# BullMQ Dashboard

The live BullMQ dashboard is available at:

```text
http://localhost:5000/admin/queues
```

It provides visibility into:

- Waiting jobs
- Active jobs
- Delayed jobs
- Completed jobs
- Failed jobs

---

# Email Scheduling

Users can:

1. Enter an email subject.
2. Enter an email body.
3. Upload a CSV containing recipient email addresses.
4. View the number of detected recipients.
5. Set a start time.
6. Configure the delay between emails.
7. Configure the hourly email limit.
8. Schedule the emails.
9. Send emails immediately.

Scheduled emails are stored in MySQL and added to BullMQ as delayed jobs.

---

# Rate Limiting

The application uses Redis-backed hourly rate limiting.

The hourly limit is configurable from the compose interface.

The rate-limit counter is stored in Redis rather than worker memory, allowing multiple concurrent workers to safely share the same rate-limit state.

When the hourly limit is reached:

1. The email is not dropped.
2. The job is rescheduled for the next available hour.
3. The scheduled time is updated in MySQL.
4. Email processing continues for the remaining jobs.
5. A Slack notification is sent if Slack is connected.

This ensures that emails exceeding the hourly limit remain scheduled instead of being permanently failed.

---

# Minimum Delay Between Emails

The application supports a configurable delay between individual email sends.

The delay is configured from the compose interface and is used when scheduling email jobs.

This is used to mimic provider throttling and avoid sending all emails simultaneously.

---

# Worker Concurrency

BullMQ worker concurrency is configurable using:

```env
WORKER_CONCURRENCY=5
```

This controls how many email jobs can be processed concurrently.

The worker uses Redis-backed rate limiting and MySQL status checks to safely handle concurrent jobs.

---

# Persistence & Restart Safety

Email jobs are scheduled using BullMQ delayed jobs backed by Redis.

Because jobs are persisted in Redis, future scheduled emails are not lost when the backend server restarts.

Email state is also persisted in MySQL.

The worker checks the current email status before sending.

If an email is already marked as:

```text
sent
```

the worker skips the job.

This provides idempotency and prevents duplicate email sends when jobs are retried or workers restart.

---

# Elasticsearch

Email records are indexed in Elasticsearch.

The application indexes email information so that scheduled and sent email data can be searched.

Existing email records are synchronized with Elasticsearch when the backend starts.

---

# Slack Integration

MailVex supports Slack OAuth integration for rate-limit notifications.

## Slack OAuth Flow

1. User connects Slack.
2. MailVex generates an OAuth state value.
3. User authorizes the application in Slack.
4. Slack redirects back to the backend.
5. The backend exchanges the OAuth authorization code.
6. The Slack connection is stored in MySQL.
7. Rate-limit notifications are sent to the connected Slack channel.

When the hourly email limit is reached, the application sends a live Slack notification.

If Slack is not connected, the rate-limit logic continues normally without breaking email processing.

Slack connections can be disconnected and reconnected.

---

# Authentication

## Google OAuth

The application supports real Google OAuth authentication.

After successful authentication, the user is redirected to the dashboard.

The dashboard displays:

- User name
- Email
- Profile avatar

Users can also log out.

## Email & Password

Users can create an account and authenticate using email and password.

Passwords are securely hashed before being stored in the database.

---

# Bulk CSV Upload

Users can upload a CSV containing email addresses.

The frontend:

- Parses the uploaded file.
- Detects email addresses.
- Displays the number of recipients.
- Sends the recipient list to the backend for scheduling.

This allows large groups of recipients to be scheduled at once.

---

# Behavior Under Load

The application was tested with **1000+ emails scheduled for approximately the same time**.

BullMQ handles the scheduled jobs rather than creating thousands of independent application timers.

When the configured hourly limit would be exceeded, remaining jobs are rescheduled into the next available hour instead of being dropped.

---

# Testing

The application has been tested for:

- Email scheduling
- Immediate email sending
- CSV bulk uploads
- 1000+ email scheduling
- Hourly rate limiting
- Automatic rescheduling
- Redis-backed rate limiting
- BullMQ worker concurrency
- Duplicate-send protection
- Elasticsearch indexing
- Google OAuth
- Slack OAuth
- Live Slack rate-limit notifications
- Scheduled email dashboard
- Sent email dashboard

---

# Ethereal Email

Ethereal Email is used as the SMTP provider for testing.

Ethereal provides a fake SMTP service, so emails are not delivered to real recipients.

Sent messages can be inspected using the Ethereal email preview URL.

---

# Security

Never commit sensitive credentials to GitHub.

The following should remain private:

- `.env`
- SMTP credentials
- Google OAuth client secret
- Slack client secret
- Elasticsearch password
- Session secret
- Database password

Make sure `.env` is included in `.gitignore`.

---

# Local Development

The application currently runs as two development processes.

### Backend

```bash
cd backend
npm run dev
```

### Frontend

From the project root:

```bash
npm run dev
```

Required services:

```text
MySQL
Redis / Memurai
Elasticsearch
```

---

# Project Highlights

MailVex demonstrates:

- Persistent delayed email scheduling with BullMQ
- Redis-backed rate limiting
- Concurrent worker processing
- Automatic rate-limit rescheduling
- Idempotent email processing
- MySQL persistence
- Elasticsearch indexing
- Slack OAuth and notifications
- Google OAuth
- Bulk CSV email scheduling
- Live BullMQ queue monitoring
- React + TypeScript dashboard
- Real-time Slack rate-limit notifications