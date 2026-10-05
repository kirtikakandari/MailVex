import type { Email, MailboxView } from "../types/email";
import ProfileMenu from "../components/ProfileMenu";
import EmailDetail from "../components/EmailDetail";

interface DashboardProps {
  user: any;
  emails: Email[];
  activeTab: "scheduled" | "sent";
  scheduledCount: number;
  sentCount: number;
  search: string;
  loading: boolean;
  error: string;
  successMessage: string;
  selectedEmail: Email | null;
  profileMenuOpen: boolean;
  mailboxView: MailboxView;
  onOpenCompose: () => void;
  onToggleProfile: () => void;
  onMailboxView: (view: Exclude<MailboxView, null>) => void;
  onLogout: () => void;
  onTabChange: (tab: "scheduled" | "sent") => void;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  onSelectEmail: (email: Email) => void;
  onCloseEmail: () => void;
  onCloseMailbox: () => void;
}

export default function Dashboard({
  user,
  emails,
  activeTab,
  scheduledCount,
  sentCount,
  search,
  loading,
  error,
  successMessage,
  selectedEmail,
  profileMenuOpen,
  mailboxView,
  onOpenCompose,
  onToggleProfile,
  onMailboxView,
  onLogout,
  onTabChange,
  onSearchChange,
  onRefresh,
  onSelectEmail,
  onCloseEmail,
  onCloseMailbox,
}: DashboardProps) {
  const filteredEmails = emails.filter((email) => {
    const query = search.toLowerCase().trim();
    if (!query) return true;
    return (
      email.recipient.toLowerCase().includes(query) ||
      email.subject.toLowerCase().includes(query) ||
      email.body.toLowerCase().includes(query)
    );
  });

  const formatRecipient = (value: string) => {
    if (!value.includes("@")) return value;
    return value
      .split("@")[0]
      .replace(/[._-]+/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const formatTime = (value: string) =>
    new Date(value).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    });

  const mailboxTitle =
    mailboxView === "received"
      ? "Received"
      : mailboxView === "starred"
        ? "Starred"
        : mailboxView === "deleted"
          ? "Deleted"
          : "";

  return (
    <div className="min-h-screen bg-white text-[#1f2937]">
      <div className="flex min-h-screen">
        <aside className="w-[184px] shrink-0 border-r border-[#edf0ef] bg-white px-3 py-3">
          <div className="mb-3 px-1">
            <div className="text-[27px] font-black leading-none tracking-[-2px] text-black">ONB</div>
          </div>

          <ProfileMenu
            open={profileMenuOpen}
            mailboxView={mailboxView}
            user={user}
            onToggle={onToggleProfile}
            onMailboxView={onMailboxView}
            onLogout={onLogout}
          />

          <button
            onClick={onOpenCompose}
            className="mb-5 flex h-[27px] w-full items-center justify-center rounded-full border border-[#20b86b] text-[12px] font-medium text-[#0b9b56] hover:bg-[#f0fff7]"
          >
            Compose
          </button>

          <div className="px-2">
            <div className="mb-1 text-[8px] font-medium uppercase tracking-[0.04em] text-[#a5aaa8]">Core</div>
            <button
              onClick={() => onTabChange("scheduled")}
              className={`flex h-[28px] w-full items-center justify-between rounded-[9px] px-2 text-[11px] ${activeTab === "scheduled" && !mailboxView ? "bg-[#e2f5eb] font-medium" : "hover:bg-[#f7f8f8]"}`}
            >
              <span className="flex items-center gap-2"><span className="text-[14px] text-[#68716d]">◷</span>Scheduled</span>
              <span className="text-[9px] text-[#82908a]">{scheduledCount}</span>
            </button>
            <button
              onClick={() => onTabChange("sent")}
              className={`mt-1 flex h-[28px] w-full items-center justify-between rounded-[9px] px-2 text-[11px] ${activeTab === "sent" && !mailboxView ? "bg-[#e2f5eb] font-medium" : "hover:bg-[#f7f8f8]"}`}
            >
              <span className="flex items-center gap-2"><span className="text-[13px] text-[#68716d]">➤</span>Sent</span>
              <span className="text-[9px] text-[#82908a]">{sentCount}</span>
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 bg-white">
          <div className="flex h-[60px] items-center gap-3 border-b border-[#f0f1f1] px-5">
            <div className="relative w-full max-w-[505px]">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-[#a0a7a4]">⌕</span>
              <input value={search} onChange={(e) => onSearchChange(e.target.value)} placeholder="Search" className="h-[31px] w-full rounded-full bg-[#f4f6f5] pl-8 pr-4 text-[11px] outline-none placeholder:text-[#9da5a1]" />
            </div>
            <button className="flex h-7 w-7 items-center justify-center text-[#9aa29e]">▽</button>
            <button onClick={onRefresh} className="flex h-7 w-7 items-center justify-center text-[#9aa29e]">↻</button>
          </div>

          {mailboxView && (
            <div className="flex h-[48px] items-center border-b border-[#f0f1f1] px-5">
              <button onClick={onCloseMailbox} className="mr-3 text-[15px] text-[#7f8984] hover:text-[#313a36]">←</button>
              <span className="text-[13px] font-semibold text-[#29312e]">{mailboxTitle}</span>
            </div>
          )}

          {successMessage && <div className="mx-5 mt-3 rounded-lg border border-[#c9ecd9] bg-[#f0fbf5] px-4 py-2.5 text-[11px] text-[#14834e]">{successMessage}</div>}
          {error && <div className="mx-5 mt-3 rounded-lg border border-red-100 bg-red-50 px-4 py-2.5 text-[11px] text-red-600">{error}</div>}

          <section className="px-5">
            {mailboxView ? (
              <div className="flex min-h-[280px] items-center justify-center">
                <div className="max-w-[360px] text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#f4f6f5] text-[20px] text-[#a3aba7]">
                    {mailboxView === "received" ? "✉" : mailboxView === "starred" ? "☆" : "⌫"}
                  </div>
                  <div className="text-[13px] font-semibold text-[#454e4a]">{mailboxTitle}</div>
                  <div className="mt-1 text-[10px] leading-5 text-[#9aa29e]">
                    {mailboxView === "received" ? "Incoming mailbox messages will appear here." : mailboxView === "starred" ? "Starred messages will appear here." : "Deleted messages will appear here."}
                  </div>
                </div>
              </div>
            ) : loading ? (
              <div className="flex h-[120px] items-center justify-center text-[11px] text-[#969e9a]">Loading emails...</div>
            ) : filteredEmails.length === 0 ? (
              <div className="flex min-h-[220px] items-center justify-center text-center">
                <div>
                  <div className="mb-2 text-[24px] text-[#c6cdca]">✉</div>
                  <div className="text-[12px] font-medium text-[#535c58]">No {activeTab} emails</div>
                  <div className="mt-1 text-[10px] text-[#9ca4a0]">{search ? "No emails match your search." : `There are no ${activeTab} emails yet.`}</div>
                </div>
              </div>
            ) : (
              <div>
                {filteredEmails.map((email) => (
                  <button key={email.id} onClick={() => onSelectEmail(email)} className="group flex min-h-[54px] w-full items-center border-b border-[#f0f1f1] text-left hover:bg-[#fafbfb]">
                    <div className="w-[155px] shrink-0 pl-4 pr-2 text-[11px] font-medium text-[#202925]">To: {formatRecipient(email.recipient)}</div>
                    <div className="w-[100px] shrink-0">
                      {activeTab === "scheduled" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#fff0e8] px-2 py-[4px] text-[9px] font-medium text-[#ed6e32]"><span>◷</span>{formatTime(email.scheduled_at)}</span>
                      ) : (
                        <span className="inline-flex rounded-full bg-[#eef1f1] px-2.5 py-[4px] text-[9px] font-medium text-[#65706b]">Sent</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 truncate pr-3 text-[11px]"><span className="font-semibold text-[#27302c]">{email.subject}</span><span className="mx-1 text-[#a6adaa]">-</span><span className="text-[#a0a7a4]">{email.body.replace(/\s+/g, " ").trim()}</span></div>
                    <div className="flex w-[30px] shrink-0 justify-center"><span className="text-[15px] text-[#c4cbc8]">☆</span></div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>

      {selectedEmail && <EmailDetail email={selectedEmail} onClose={onCloseEmail} />}
    </div>
  );
}
