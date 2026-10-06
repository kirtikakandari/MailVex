# MailVex — Email Scheduler & Automation Platform

The application supports scheduled and bulk email sending, persistent BullMQ jobs, Redis-backed rate limiting, Elasticsearch indexing, Google OAuth, Slack notifications, and a React dashboard.

---

## Features

- Google OAuth authentication
- Email/password authentication
- Schedule emails for a specific start time
- Send emails immediately
- Bulk recipient import through CSV
- Configurable delay between emails
- Configurable hourly email limit
- Redis-backed rate limiting
- Automatic rescheduling when the hourly limit is reached
- BullMQ delayed jobs
- Configurable BullMQ worker concurrency
- Idempotent email processing
- MySQL persistence
- Ethereal SMTP email delivery
- Elasticsearch indexing
- BullMQ live queue dashboard
- Slack OAuth integration
- Slack rate-limit notifications
- Scheduled emails dashboard
- Sent emails dashboard
- Loading and empty states
- Error handling
- Tested with 1000+ scheduled emails

---

# Tech Stack

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS

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
reachinbox-frontend/
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
│   │   │   ├── authRoutes.ts
│   │   │   └── emailRoutes.ts
│   │   ├── middleware/
│   │   │   └── requireAuth.ts
│   │   └── utils/
│   │       └── dateUtils.ts
│   │
│   ├── .env
│   ├── package.json
│   └── tsconfig.json
│
├── public/
│
├── src/
│   ├── App.tsx
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Compose.tsx
│   │   └── EmailDetail.tsx
│   ├── components/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   ├── EmailRow.tsx
│   │   └── ProfileMenu.tsx
│   ├── services/
│   │   ├── api.ts
│   │   └── auth.ts
│   ├── hooks/
│   │   └── useAuth.ts
│   └── types/
│       └── email.ts
│
├── .gitignore
├── .olxtrc.json
├── index.html
├── package.json
├── package-lock.json
├── README.md
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

---

# Prerequisites

Make sure the following are installed and running:

- Node.js
- MySQL
- Redis / Memurai
- Elasticsearch

---

# Installation

## 1. Clone the Repository

GitHub repository:

https://github.com/kirtikakandari/MailVex

Clone it using:

```bash
git clone https://github.com/kirtikakandari/MailVex.git
cd MailVex
```

---

# 2. Install Frontend Dependencies

From the project root:

```bash
npm install
```

---

# 3. Install Backend Dependencies

Open a terminal and run:

```bash
cd backend
npm install
```

---

# 4. Configure MySQL

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

# 5. Configure Redis / Memurai

The application expects Redis to run on:

```text
127.0.0.1:6379
```

If using Memurai, check that it is running:

```bash
memurai-cli ping
```

Expected output:

```text
PONG
```

---

# 6. Configure Elasticsearch

Make sure Elasticsearch is running at:

```text
https://localhost:9200
```

Elasticsearch authentication details are provided through environment variables.

---

# 7. Configure Environment Variables

Create the following file:

```text
backend/.env
```

Use this structure:

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

**Never commit the real `.env` file or secrets to GitHub.**

---

# Running the Application

The frontend and backend run as separate processes during local development.

You need **two terminals**.

---

## Terminal 1 — Backend

From the project root:

```bash
cd backend
npm run dev
```

The backend will run on:

```text
http://localhost:5000
```

The BullMQ worker is also started with the backend.

---

## Terminal 2 — Frontend

Open another terminal.

Make sure you are in the project root:

```bash
cd MailVex
```

Then run:

```bash
npm run dev
```

The frontend will run on:

```text
http://localhost:5173
```

Open the application:

```text
http://localhost:5173
```

---

# Required Services

Before using the application, make sure these services are running:

```text
MySQL
Redis / Memurai
Elasticsearch
```

The application itself is started using:

```text
Terminal 1 → Backend + BullMQ Worker
Terminal 2 → Frontend
```

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
3. Upload a CSV containing email addresses.
4. View the number of detected recipients.
5. Set a start time.
6. Configure the delay between emails.
7. Configure the hourly email limit.
8. Schedule the emails.
9. Send emails immediately.

Scheduled emails are stored in MySQL and added to BullMQ as delayed jobs.

---

# CSV Upload

The application supports bulk email scheduling through CSV files.

The frontend:

- Accepts a CSV file.
- Parses the recipient email addresses.
- Displays the number of detected recipients.
- Sends the recipient list to the backend.
- Allows the uploaded CSV to be removed before scheduling.

This allows large batches of emails to be scheduled at once.

---

# Rate Limiting

The application uses a Redis-backed hourly rate limiter.

The hourly limit is configurable from the compose interface.

The rate-limit counter is stored in Redis rather than only in worker memory, allowing concurrent workers to share the same rate-limit state.

When the hourly limit is reached:

1. The email is not dropped.
2. The rate-limit counter is handled safely.
3. The job is rescheduled for the next available hour.
4. The scheduled time is updated in MySQL.
5. A Slack notification is sent if Slack is connected.

This ensures that emails exceeding the hourly limit remain scheduled instead of being permanently failed.

---

# Minimum Delay Between Emails

The application supports a configurable delay between individual email sends.

The delay is configured from the compose interface and is applied when scheduling email jobs.

This helps mimic provider throttling and prevents all emails from being sent simultaneously.

---

# Worker Concurrency

BullMQ worker concurrency is configurable through:

```env
WORKER_CONCURRENCY=5
```

This controls the number of email jobs that can be processed concurrently.

The worker uses Redis-backed rate limiting and MySQL status checks to safely handle concurrent jobs.

---

# Persistence & Restart Safety

Email scheduling is handled using BullMQ delayed jobs backed by Redis.

Because the jobs are persisted in Redis, future scheduled emails are not lost when the backend server restarts.

Email state is also stored in MySQL.

Before sending an email, the worker checks its current status.

If an email is already marked as:

```text
sent
```

the worker skips the job.

This provides idempotency and helps prevent duplicate email sends during retries or server/worker restarts.

---

# Elasticsearch

Email records are indexed in Elasticsearch.

The application maintains indexed email data for scheduled and sent emails.

Elasticsearch is also synchronized with existing email records when the backend starts.

---

# Slack Integration

The application supports Slack OAuth for rate-limit notifications.

## Slack OAuth Flow

1. User connects Slack from the application.
2. MailVex generates an OAuth state value.
3. The user authorizes MailVex in Slack.
4. Slack redirects back to the backend.
5. The backend exchanges the OAuth authorization code.
6. Slack connection information is stored in MySQL.
7. Rate-limit notifications are sent to the connected Slack channel.

When the hourly email limit is reached, a live Slack notification is sent.

If Slack is not connected, rate-limit handling continues normally without crashing the email worker.

Slack can also be disconnected and reconnected.

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

The application also supports email/password authentication.

New users can create an account, and existing users can log in using their email and password.

Passwords are hashed before being stored.

---

# Dashboard

The dashboard provides:

- Scheduled Emails
- Sent Emails
- Email counts
- Email status
- Scheduled time
- Sent time
- Recipient email
- Subject
- Refresh functionality

The dashboard also provides loading and empty states.

---

# Behavior Under Load

The application has been tested with **1000+ emails scheduled for approximately the same time**.

BullMQ handles the scheduled jobs instead of creating thousands of independent application timers.

When the hourly limit would be exceeded, remaining jobs are rescheduled into the next available hour instead of being dropped.

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
- Slack rate-limit notifications
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

# Local Development Summary

### Start Backend

```bash
cd backend
npm run dev
```

### Start Frontend

From the project root:

```bash
npm run dev
```

### Open Frontend

```text
http://localhost:5173
```

### Backend

```text
http://localhost:5000
```

### BullMQ Dashboard

```text
http://localhost:5000/admin/queues
```

---

# Repository

GitHub:

https://github.com/kirtikakandari/MailVex

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
- Configurable worker concurrency
- 1000+ email scheduling under load