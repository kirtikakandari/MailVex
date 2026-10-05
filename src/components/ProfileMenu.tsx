import type { MailboxView } from "../types/email";

interface ProfileMenuProps {
  open: boolean;
  mailboxView: MailboxView;
  user: any;
  onToggle: () => void;
  onMailboxView: (view: Exclude<MailboxView, null>) => void;
  onLogout: () => void;
}

export default function ProfileMenu({
  open,
  mailboxView,
  user,
  onToggle,
  onMailboxView,
  onLogout,
}: ProfileMenuProps) {
  const name = user?.name || "Oliver Brown";
  const email = user?.email || "oliver.brown@domain.io";
  const initials = name
    .split(" ")
    .map((part: string) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative mb-2">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2 rounded-[13px] bg-[#f5f7f6] px-2 py-2 text-left"
      >
        {user?.profile_picture ? (
          <img
            src={user.profile_picture}
            alt={name}
            className="h-8 w-8 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#dedfdd] text-[10px] font-semibold text-[#555]">
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12px] font-medium">{name}</div>
          <div className="truncate text-[8px] text-[#929896]">{email}</div>
        </div>
        <span
          className={`text-[12px] text-[#9aa09e] transition-transform ${
            open ? "rotate-180" : ""
          }`}
        >
          ⌄
        </span>
      </button>

      {open && (
        <div className="absolute left-0 top-[43px] z-30 w-[170px] overflow-hidden rounded-[11px] border border-[#e3e7e5] bg-white p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
          <div className="px-2 py-1.5 text-[8px] uppercase tracking-wide text-[#a0a8a4]">
            Mailbox
          </div>

          {[
            ["received", "✉", "Received"],
            ["starred", "☆", "Starred"],
            ["deleted", "⌫", "Deleted"],
          ].map(([view, icon, label]) => (
            <button
              key={view}
              onClick={() => onMailboxView(view as Exclude<MailboxView, null>)}
              className={`flex w-full items-center gap-2 rounded-[8px] px-2 py-2 text-left text-[10px] ${
                mailboxView === view
                  ? "bg-[#e2f5eb] text-[#197447]"
                  : "text-[#4b5551] hover:bg-[#f5f7f6]"
              }`}
            >
              <span className="text-[13px]">{icon}</span>
              {label}
            </button>
          ))}

          <div className="my-1 border-t border-[#eef0ef]" />

          <button
            onClick={onLogout}
            className="flex w-full items-center gap-2 rounded-[8px] px-2 py-2 text-left text-[10px] text-red-600 hover:bg-red-50"
          >
            <span>↪</span>
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
