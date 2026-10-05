import type { Email } from "../types/email";

interface EmailDetailProps {
  email: Email;
  onClose: () => void;
}

export default function EmailDetail({ email, onClose }: EmailDetailProps) {
  return (
    <div className="fixed inset-0 z-40 bg-black/20">
      <div className="absolute right-0 top-0 h-full w-full max-w-[520px] border-l border-[#e7eae8] bg-white shadow-2xl">
        <div className="flex h-[60px] items-center justify-between border-b border-[#edf0ef] px-5">
          <div className="text-[13px] font-semibold">Email details</div>
          <button
            onClick={onClose}
            className="px-2 text-[20px] text-[#8f9793]"
          >
            ×
          </button>
        </div>
        <div className="space-y-5 px-6 py-6">
          <div>
            <div className="text-[9px] uppercase tracking-wide text-[#9ca4a0]">To</div>
            <div className="mt-1 text-[12px]">{email.recipient}</div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-wide text-[#9ca4a0]">Subject</div>
            <div className="mt-1 text-[13px] font-semibold">{email.subject}</div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-wide text-[#9ca4a0]">Message</div>
            <div className="mt-2 whitespace-pre-wrap rounded-xl bg-[#f7f8f8] p-4 text-[11px] leading-5 text-[#4d5752]">
              {email.body}
            </div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-wide text-[#9ca4a0]">Status</div>
            <div className="mt-1 text-[10px]">{email.status}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
