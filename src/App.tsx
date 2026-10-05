import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { API_URL } from "./services/auth";
import { useAuth } from "./hooks/useAuth";
import type { Email, MailboxView } from "./types/email";
import Login from "./pages/Login";
import Compose from "./pages/Compose";
import Dashboard from "./pages/Dashboard";

function App() {
  const { user, authLoading, handleLogout } = useAuth();

  const [emails, setEmails] = useState<Email[]>([]);
  const [activeTab, setActiveTab] = useState<"scheduled" | "sent">(
    "scheduled"
  );
  const [scheduledCount, setScheduledCount] = useState(0);
  const [sentCount, setSentCount] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showCompose, setShowCompose] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [mailboxView, setMailboxView] = useState<MailboxView>(null);

  const [recipient, setRecipient] = useState("");
  const [recipientChips, setRecipientChips] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [hourlyLimit, setHourlyLimit] = useState("100");
  const [delayBetweenEmails, setDelayBetweenEmails] = useState("0");
  const [sendLaterOpen, setSendLaterOpen] = useState(false);
  const [sendMode, setSendMode] = useState<"send" | "sendLater">("send");
const [sending, setSending] = useState(false);

const [uploadedRecipients, setUploadedRecipients] =
  useState<string[]>([]);
const [uploadedFileName, setUploadedFileName] = useState("");

const uploadRef = useRef<HTMLInputElement>(null);

  // ============================================================
  // FETCH EMAILS
  // ============================================================

  const fetchEmails = async (tab = activeTab) => {

    
    //console.log("REFRESH STARTED", tab);
    

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/emails?status=${tab}`,
        {
          credentials: "include",
          cache: "no-store",
        }
      );

      if (!response.ok) {
        console.log("FETCH EMAILS FAILED:", response.status, response.statusText);
        throw new Error("Failed to fetch emails");
      }

      const data = await response.json();

      setEmails(data.emails || []);
    } catch (err) {
      console.error(err);

      setError(
        "Unable to load emails. Make sure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // FETCH COUNTS
  // ============================================================

 const fetchCounts = async () => {
  try {
    const [scheduledResponse, sentResponse] =
      await Promise.all([
        fetch(`${API_URL}/emails?status=scheduled`, {
          credentials: "include",
          cache: "no-store",
        }),

        fetch(`${API_URL}/emails?status=sent`, {
          credentials: "include",
          cache: "no-store",
        }),
      ]);

      if (scheduledResponse.ok) {
        const data = await scheduledResponse.json();

        setScheduledCount(
          (data.emails || []).length
        );
      }

      if (sentResponse.ok) {
        const data = await sentResponse.json();

        setSentCount(
          (data.emails || []).length
        );
      }
    } catch (err) {
      console.error(
        "Failed to fetch counts:",
        err
      );
    }
  };

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    if (!user) return;

    fetchEmails(activeTab);
    fetchCounts();
  }, [activeTab, user]);

  // ============================================================
  // RESET COMPOSE
  // ============================================================

  const resetCompose = () => {
    setRecipient("");
    setRecipientChips([]);
    setUploadedRecipients([]);
    setSubject("");
    setBody("");
    setScheduledAt("");
    setHourlyLimit("100");
    setDelayBetweenEmails("0");
    setSendLaterOpen(false);
    setSendMode("send");
    setUploadedFileName("");
  };

  // ============================================================
  // OPEN COMPOSE
  // ============================================================

  const openCompose = () => {
    setError("");
    setSuccessMessage("");

    resetCompose();

    setShowCompose(true);
  };

  // ============================================================
  // CLOSE COMPOSE
  // ============================================================

  const closeCompose = () => {
    if (sending) return;

    setShowCompose(false);
    setSendLaterOpen(false);
    setError("");
  };

  // ============================================================
  // ADD RECIPIENT
  // ============================================================

  const addRecipient = () => {
    const value = recipient
      .trim()
      .replace(/,$/, "");

    if (!value) return;

    if (!recipientChips.includes(value)) {
      setRecipientChips((current) => [
        ...current,
        value,
      ]);
    }

    setRecipient("");
  };

  // ============================================================
  // REMOVE RECIPIENT
  // ============================================================

  const removeRecipient = (value: string) => {
    setRecipientChips((current) =>
      current.filter((item) => item !== value)
    );
  };

  // ============================================================
// UPLOAD CSV
// ============================================================

const handleUploadCsv = async (file: File) => {
  setError("");
  setSuccessMessage("");

  if (!file) return;

  if (!file.name.toLowerCase().endsWith(".csv")) {
    setError("Please upload a CSV file.");
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    setError("CSV file must be smaller than 5 MB.");
    return;
  }

  try {
    setSending(true);

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(
      `${API_URL}/emails/parse-csv`,
      {
        method: "POST",
        credentials: "include",
        body: formData,
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Failed to upload CSV."
      );
    }

    setUploadedRecipients(
      data.recipients || []
    );
    setUploadedFileName(file.name);

    setSuccessMessage(
      `${data.count || 0} recipients loaded from CSV.`
    );

  } catch (err) {
    console.error(err);

    setError(
      err instanceof Error
        ? err.message
        : "Failed to upload CSV."
    );
  } finally {
    setSending(false);
  }
};

const removeUploadedCsv = () => {
  setUploadedRecipients([]);
  setUploadedFileName("");
  setSuccessMessage("");
};

  // ============================================================
  // SCHEDULE EMAILS
  // ============================================================

  const handleScheduleEmail = async () => {
    setError("");
    setSuccessMessage("");

    const recipients = [
  ...uploadedRecipients,
  ...recipientChips,
  ...(recipient.trim()
    ? [recipient.trim()]
    : []),
];

    // Remove duplicates
    const uniqueRecipients = [
      ...new Set(recipients),
    ];

    if (
      uniqueRecipients.length === 0 ||
      !subject.trim() ||
      !body.trim() ||
      !scheduledAt
    ) {
      setError(
        "Please add at least one recipient, subject, message and send time."
      );

      return;
    }

    const selectedDate = new Date(
      scheduledAt
    );

    if (
      Number.isNaN(
        selectedDate.getTime()
      )
    ) {
      setError(
        "Please select a valid date and time."
      );

      return;
    }

    if (
      selectedDate.getTime() <= Date.now()
    ) {
      setError(
        "Please select a future date and time."
      );

      return;
    }

    try {
      setSending(true);

      // --------------------------------------------------------
      // BULK SCHEDULING
      // --------------------------------------------------------

      const response = await fetch(
        `${API_URL}/emails/schedule-bulk`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          credentials: "include",

          body: JSON.stringify({
            emails: uniqueRecipients,
            subject: subject.trim(),
            body: body.trim(),
            scheduledAt:
              selectedDate.toISOString(),
            hourlyLimit:
              Number(hourlyLimit),
            delayBetweenEmails:
              Number(delayBetweenEmails),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
          "Failed to schedule emails"
        );
      }

      setSuccessMessage(
        `${uniqueRecipients.length} emails scheduled successfully!`
      );

      setShowCompose(false);

      resetCompose();

      setActiveTab("scheduled");

      await fetchEmails("scheduled");
      await fetchCounts();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to schedule emails."
      );
    } finally {
      setSending(false);
    }
  };

  // ============================================================
  // SEND NOW
  // ============================================================

  const handleSendNow = async () => {
    setError("");
    setSuccessMessage("");

    const recipients = [
  ...uploadedRecipients,
  ...recipientChips,
  ...(recipient.trim()
    ? [recipient.trim()]
    : []),
];

    // Remove duplicates
    const uniqueRecipients = [
      ...new Set(recipients),
    ];

    if (
      uniqueRecipients.length === 0 ||
      !subject.trim() ||
      !body.trim()
    ) {
      setError(
        "Please add at least one recipient, subject and message."
      );

      return;
    }

    try {
      setSending(true);

      // --------------------------------------------------------
      // BULK SEND
      // --------------------------------------------------------

      const response = await fetch(
        `${API_URL}/emails/schedule-bulk`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          credentials: "include",

          body: JSON.stringify({
            emails: uniqueRecipients,
            subject: subject.trim(),
            body: body.trim(),
            scheduledAt:
              new Date().toISOString(),
            hourlyLimit:
              Number(hourlyLimit),
            delayBetweenEmails:
              Number(delayBetweenEmails),
          }),
        }
      );

      const data = await response.json();
      //temporary comment for testing
      console.log("EMAILS RECEIVED", data);

      if (!response.ok) {
        throw new Error(
          data.message ||
          "Failed to send emails"
        );
      }

      setSuccessMessage(
        `${uniqueRecipients.length} emails sent/scheduled successfully!`
      );

      setShowCompose(false);

      resetCompose();

      setActiveTab("sent");

      setTimeout(async () => {
        await fetchEmails("sent");
        await fetchCounts();
      }, 700);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to send emails."
      );
    } finally {
      setSending(false);
    }
  };

  // ============================================================
  // QUICK SCHEDULE
  // ============================================================

  const setQuickSchedule = (
    hour: number
  ) => {
    const date = new Date();

    date.setDate(
      date.getDate() + 1
    );

    date.setHours(
      hour,
      0,
      0,
      0
    );

    const local = new Date(
      date.getTime() -
      date.getTimezoneOffset() * 60000
    )
      .toISOString()
      .slice(0, 16);

    setScheduledAt(local);

    setSendMode("sendLater");

    setSendLaterOpen(false);
  };

  // ============================================================
  // SCHEDULED DATE CHANGE
  // ============================================================

  const handleScheduledDateChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    setScheduledAt(
      event.target.value
    );

    if (event.target.value) {
      setSendMode("sendLater");

      setSendLaterOpen(false);
    }
  };

  // ============================================================
  // PRIMARY SEND BUTTON
  // ============================================================

  const handlePrimarySendClick = () => {
    if (sendMode === "send") {
      if (!sendLaterOpen) {
        setSendLaterOpen(true);
        return;
      }

      handleSendNow();

      return;
    }

    handleScheduleEmail();
  };

  // ============================================================
  // MAILBOX VIEW
  // ============================================================

  const openMailboxView = (
    view: Exclude<MailboxView, null>
  ) => {
    setMailboxView(view);
    setProfileMenuOpen(false);
    setSelectedEmail(null);
    setSearch("");
  };

  // ============================================================
  // TAB CHANGE
  // ============================================================

  const handleTabChange = (
    tab: "scheduled" | "sent"
  ) => {
    setMailboxView(null);
    setActiveTab(tab);
  };

  // ============================================================
  // AUTH LOADING
  // ============================================================

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-gray-500">
        Loading...
      </div>
    );
  }

  // ============================================================
  // LOGIN
  // ============================================================

  if (!user) {
    return <Login />;
  }

  // ============================================================
  // COMPOSE PAGE
  // ============================================================

  if (showCompose) {
    return (
      <Compose
        user={user}
        recipient={recipient}
        recipientChips={recipientChips}
        subject={subject}
        body={body}
        uploadedFileName={uploadedFileName}
uploadedRecipientsCount={uploadedRecipients.length}
onRemoveUploadedCsv={removeUploadedCsv}
        scheduledAt={scheduledAt}
        hourlyLimit={hourlyLimit}
        delayBetweenEmails={
          delayBetweenEmails
        }
        sendLaterOpen={sendLaterOpen}
        sendMode={sendMode}
        sending={sending}
        error={error}
        uploadRef={uploadRef}
        onUploadCsv={handleUploadCsv}
        onClose={closeCompose}
        onRecipientChange={
          setRecipient
        }
        onAddRecipient={
          addRecipient
        }
        onRemoveRecipient={
          removeRecipient
        }
        onSubjectChange={
          setSubject
        }
        onBodyChange={
          setBody
        }
        onHourlyLimitChange={
          setHourlyLimit
        }
        onDelayChange={
          setDelayBetweenEmails
        }
        onToggleSendLater={() =>
          setSendLaterOpen(
            (value) => !value
          )
        }
        onPrimarySend={
          handlePrimarySendClick
        }
        onScheduledDateChange={
          handleScheduledDateChange
        }
        onQuickSchedule={
          setQuickSchedule
        }
      />
    );
  }

  // ============================================================
  // DASHBOARD
  // ============================================================

  return (
    <Dashboard
      user={user}
      emails={emails}
      activeTab={activeTab}
      scheduledCount={
        scheduledCount
      }
      sentCount={sentCount}
      search={search}
      loading={loading}
      error={error}
      successMessage={
        successMessage
      }
      selectedEmail={
        selectedEmail
      }
      profileMenuOpen={
        profileMenuOpen
      }
      mailboxView={
        mailboxView
      }
      onOpenCompose={
        openCompose
      }
      onToggleProfile={() =>
        setProfileMenuOpen(
          (value) => !value
        )
      }
      onMailboxView={
        openMailboxView
      }
      onLogout={
        handleLogout
      }
      onTabChange={
        handleTabChange
      }
      onSearchChange={
        setSearch
      }
      onRefresh={() => {
        fetchEmails(
          activeTab
        );
        fetchCounts();
      }}
      onSelectEmail={
        setSelectedEmail
      }
      onCloseEmail={() =>
        setSelectedEmail(null)
      }
      onCloseMailbox={() =>
        setMailboxView(null)
      }
    />
  );
}

export default App;