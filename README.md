MailVex — Email Scheduler & Automation Platform

A full-stack email scheduling platform built as a ReachInbox full-stack assessment. It supports scheduled and bulk email sending, persistent BullMQ jobs, Redis-backed rate limiting, Elasticsearch indexing, Google OAuth, Slack rate-limit notifications, and a React dashboard.

Features
- Google OAuth and email/password authentication
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
- Elasticsearch email indexing
- BullMQ live queue dashboard
- Slack OAuth integration
- Slack notifications when the hourly rate limit is reached
- Scheduled and sent email views
- Loading, empty, and error states
- Tested with 1000+ scheduled emails

Tech Stack
Frontend
- React
- TypeScript
- Tailwind CSS
- Vite
Backend
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

Project Structure
reachinbox-frontend/
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
└── package.json

Prerequisites
Install:
- Node.js
- MySQL
- Redis or Memurai
- Elasticsearch
The project was developed and tested locally on Windows.
1. Clone the Repository
git clone https://github.com/kirtikakandari/MailVex
cd reachinbox-frontend

2. Install Dependencies
Frontend, from the project root:
npm install
Backend:
cd backend
npm install

3. Configure MySQL
Create the database:
CREATE DATABASE reachinbox;
The application uses the users, emails, and slack_connections tables.

4. Configure Redis
Make sure Redis/Memurai is running on 127.0.0.1:6379.
For Memurai:
memurai-cli ping
Expected:
PONG

5. Configure Elasticsearch
Make sure Elasticsearch is running at:
https://localhost:9200
Credentials are provided through environment variables.

6. Configure Environment Variables
Create:
backend/.env
Use this structure:
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

Never commit the real .env file or credentials to GitHub.

7. Start the Backend
From the backend directory:
npm run dev
Backend:
http://localhost:5000
The backend also starts the BullMQ worker.

8. Start the Frontend
Open a second terminal in the project root:
npm run dev
Frontend:
http://localhost:5173
Open:
http://localhost:5173
BullMQ Dashboard
The live BullMQ dashboard is available at:
http://localhost:5000/admin/queues
Email Scheduling
Users can:
1. Enter an email subject and body.
2. Upload a CSV containing recipient email addresses.
3. View the number of detected recipients.
4. Set a start time.
5. Configure the delay between emails.
6. Configure the hourly email limit.
7. Schedule emails or send them immediately.
Scheduled emails are stored in MySQL and added to BullMQ as delayed jobs.
Rate Limiting
The scheduler uses a Redis-backed hourly rate limiter.
The hourly limit is configurable from the compose interface and is passed with the email job.
The worker maintains an hour-based Redis counter. Because the counter is stored in Redis rather than worker memory, rate limiting is shared across concurrent workers.
When the hourly limit is reached:
1. The job is not permanently failed or dropped.
2. The rate-limit counter is rolled back for the blocked job.
3. The email is rescheduled for the next available hour.
4. The scheduled time is updated in MySQL.
5. A Slack notification is sent if Slack is connected.
A Redis notification key prevents repeated Slack notifications for the same rate-limit event.
Minimum Delay Between Emails
The application supports a configurable delay between individual email sends.
The delay is used in the scheduling flow to mimic provider throttling and is configurable from the compose interface.
Worker Concurrency
BullMQ worker concurrency is configurable through:
WORKER_CONCURRENCY=5
This controls how many email jobs the worker can process concurrently.
Persistence & Idempotency
Future scheduled jobs are stored in BullMQ/Redis rather than relying on in-memory timers.
Email state is persisted in MySQL.
Before sending an email, the worker checks the email status. If an email is already marked as sent, the worker skips it.
This prevents duplicate sends when jobs are retried or the server/worker restarts.
Elasticsearch
Email records are indexed in Elasticsearch when they are created or when their status changes.
The application maintains searchable email data for scheduled and sent emails and performs startup synchronization for existing email records.
Slack Integration
Slack can be connected through Slack OAuth.
The OAuth flow:
1. User starts the Slack connection.
2. ReachInbox generates an OAuth state value.
3. User authorizes ReachInbox in Slack.
4. Slack redirects back to the backend.
5. The backend exchanges the OAuth code.
6. Webhook information is stored in MySQL.
7. Rate-limit notifications are sent to the connected Slack channel.
If Slack is not connected, rate-limit handling continues normally without breaking email processing.
Slack connections can be disconnected and reconnected.
Authentication
Google OAuth
Google OAuth redirects authenticated users to the dashboard and stores user information in MySQL.
Email & Password
Users can create an account or sign in using an email address and password. Passwords are hashed using bcrypt before storage.
Testing
The application has been tested for:
- Email scheduling
- Immediate email sending
- CSV bulk uploads
- 1000+ emails scheduled for approximately the same time
- Hourly rate limiting
- Automatic rescheduling
- Redis-backed rate limiting
- BullMQ worker concurrency
- Duplicate-send protection
- Elasticsearch indexing
- Google OAuth
- Slack OAuth
- Live Slack rate-limit notifications
- Scheduled and sent email dashboard views
The 1000+ email scenario is handled through BullMQ rather than thousands of independent application timers.
Important Notes
Ethereal Email
Ethereal Email is used as the SMTP provider for testing. It does not deliver messages to real recipients. Sent messages can be inspected through Ethereal's preview functionality.
Local Development
The backend and frontend are currently run as separate development processes:
# Terminal 1
cd backend
npm run dev
# Terminal 2
npm run dev
Redis/Memurai, MySQL, and Elasticsearch must also be running.
Security
Never commit:
- .env
- SMTP passwords
- Google OAuth secrets
- Slack client secrets
- Elasticsearch passwords
- Session secrets