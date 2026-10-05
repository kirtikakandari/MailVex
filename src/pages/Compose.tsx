import type { ChangeEvent, RefObject } from "react";

interface ComposeProps {
  user: any;
  recipient: string;
  recipientChips: string[];
  subject: string;
  body: string;

  uploadedFileName: string;
  uploadedRecipientsCount: number;
  onRemoveUploadedCsv: () => void;

  scheduledAt: string;
  hourlyLimit: string;
  delayBetweenEmails: string;
  sendLaterOpen: boolean;
  sendMode: "send" | "sendLater";
  sending: boolean;
  error: string;
  uploadRef: RefObject<HTMLInputElement | null>;
  onUploadCsv: (file: File) => void;
  onClose: () => void;
  onRecipientChange: (value: string) => void;
  onAddRecipient: () => void;
  onRemoveRecipient: (value: string) => void;
  onSubjectChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onHourlyLimitChange: (value: string) => void;
  onDelayChange: (value: string) => void;
  onToggleSendLater: () => void;
  onPrimarySend: () => void;
  onScheduledDateChange: (
    event: ChangeEvent<HTMLInputElement>
  ) => void;
  onQuickSchedule: (hour: number) => void;
}

export default function Compose({
  user,
  recipient,
  recipientChips,
  subject,
  body,
  uploadedFileName,
  uploadedRecipientsCount,
  onRemoveUploadedCsv,
  scheduledAt,
  hourlyLimit,
  delayBetweenEmails,
  sendLaterOpen,
  sendMode,
  sending,
  error,
  uploadRef,
  onUploadCsv,
  onClose,
  onRecipientChange,
  onAddRecipient,
  onRemoveRecipient,
  onSubjectChange,
  onBodyChange,
  onHourlyLimitChange,
  onDelayChange,
  onToggleSendLater,
  onPrimarySend,
  onScheduledDateChange,
  onQuickSchedule,
}: ComposeProps) {
  const fromEmail = user?.email || "oliver.brown@domain.io";

  return (
    <div className="min-h-screen bg-white text-[#1f2933]">
      <div className="relative min-h-screen overflow-hidden">

        {/* Header */}
        <header className="flex h-[68px] items-center justify-between px-5 md:px-7">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-[18px] text-[#20262b]"
          >
            <span className="text-[25px] leading-none">←</span>
            <span>Compose New Email</span>
          </button>

          <div className="flex items-center gap-4">
            <button
              className="text-[#08a44e]"
              title="Attach file"
              onClick={() => uploadRef.current?.click()}
            >
              <span className="text-[20px]">📎</span>
            </button>

            <button
              className="text-[#08a44e]"
              title="Choose send time"
              onClick={onToggleSendLater}
            >
              <span className="text-[19px]">◷</span>
            </button>

            <button
              onClick={onPrimarySend}
              disabled={sending}
              className={`rounded-full border px-4 py-[6px] text-[11px] font-medium transition disabled:opacity-50 ${
                sendMode === "sendLater"
                  ? "border-[#0bae54] bg-[#0bae54] text-white hover:bg-[#079c4a]"
                  : "border-[#0bae54] text-[#079c4a] hover:bg-[#f1fff7]"
              }`}
            >
              {sending
                ? sendMode === "sendLater"
                  ? "Scheduling..."
                  : "Sending..."
                : sendMode === "sendLater"
                  ? "Send Later"
                  : "Send"}
            </button>
          </div>
        </header>

        {/* Hidden CSV input */}
        <input
          ref={uploadRef}
          type="file"
          className="hidden"
          accept=".csv"
          onChange={(event) => {
            const file = event.target.files?.[0];

            if (file) {
              onUploadCsv(file);
            }

            event.currentTarget.value = "";
          }}
        />

        <main className="mx-auto w-full max-w-[790px] px-4 pb-16 pt-2">

          {/* Error */}
          {error && (
            <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-[10px] text-red-600">
              {error}
            </div>
          )}

          {/* From */}
          <div className="flex min-h-[48px] items-center border-b border-[#e7eae8]">
            <div className="w-[40px] shrink-0 text-[11px]">
              From
            </div>

            <button className="ml-2 flex items-center gap-2 rounded-[7px] bg-[#f4f5f5] px-3 py-[7px] text-[11px] text-[#404946]">
              {fromEmail}
              <span className="text-[#9ba29f]">⌄</span>
            </button>
          </div>

          {/* To */}
          <div className="flex min-h-[48px] items-center border-b border-[#e7eae8]">
            <div className="w-[40px] shrink-0 text-[11px]">
              To
            </div>

            <div className="ml-2 flex min-w-0 flex-1 flex-wrap items-center gap-1.5 py-2">
              {recipientChips.map((chip) => (
                <span
                  key={chip}
                  className="inline-flex items-center gap-1 rounded-full border border-[#13b85d] bg-[#f5fff9] px-2 py-[3px] text-[10px] text-[#147642]"
                >
                  {chip}

                  <button
                    type="button"
                    onClick={() => onRemoveRecipient(chip)}
                  >
                    ×
                  </button>
                </span>
              ))}

              <input
                type="email"
                placeholder={
                  recipientChips.length
                    ? ""
                    : "recipient@example.com"
                }
                value={recipient}
                onChange={(event) =>
                  onRecipientChange(event.target.value)
                }
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" ||
                    event.key === ","
                  ) {
                    event.preventDefault();
                    onAddRecipient();
                  }
                }}
                onBlur={onAddRecipient}
                className="min-w-[180px] flex-1 bg-transparent text-[11px] outline-none placeholder:text-[#a7aeaa]"
              />
            </div>

            <button
              type="button"
              onClick={() => uploadRef.current?.click()}
              className="ml-3 flex shrink-0 items-center gap-1 text-[11px] text-[#08a44e]"
            >
              <span className="text-[15px]">⇧</span>
              Upload List
            </button>
          </div>

          {/* Subject */}
          <div className="flex min-h-[48px] items-center border-b border-[#e7eae8]">
            <div className="w-[40px] shrink-0 text-[11px]">
              Subject
            </div>

            <input
              value={subject}
              onChange={(event) =>
                onSubjectChange(event.target.value)
              }
              placeholder="Subject"
              className="ml-2 min-w-0 flex-1 bg-transparent text-[11px] outline-none placeholder:text-[#a7aeaa]"
            />
          </div>

          {/* Delay + Hourly Limit */}
          <div className="flex min-h-[52px] items-center gap-5">
            <label className="flex items-center gap-2 text-[11px]">
              Delay between 2 emails

              <input
                type="number"
                min="0"
                value={delayBetweenEmails}
                onChange={(event) =>
                  onDelayChange(event.target.value)
                }
                className="h-[30px] w-[54px] rounded-[6px] border border-[#dfe4e1] px-2 text-[11px] outline-none focus:border-[#11aa56]"
              />
            </label>

            <label className="flex items-center gap-2 text-[11px]">
              Hourly Limit

              <input
                type="number"
                min="1"
                value={hourlyLimit}
                onChange={(event) =>
                  onHourlyLimitChange(event.target.value)
                }
                className="h-[30px] w-[54px] rounded-[6px] border border-[#dfe4e1] px-2 text-[11px] outline-none focus:border-[#11aa56]"
              />
            </label>
          </div>

          {/* Email body */}
          <div className="overflow-hidden rounded-[9px] bg-[#fafafa]">
            <div className="px-3 pt-3">
              <textarea
                value={body}
                onChange={(event) =>
                  onBodyChange(event.target.value)
                }
                placeholder="Type Your Reply..."
                rows={2}
                className="h-[42px] w-full resize-none bg-transparent text-[11px] outline-none placeholder:text-[#a7aeaa]"
              />
            </div>

            {/* Formatting toolbar */}
            <div className="mx-3 flex h-[35px] items-center gap-0 overflow-hidden rounded-full bg-white px-2 text-[#7e8582]">
              {[
                "↶",
                "↷",
                "Tᵀ",
                "B",
                "I",
                "U",
                "≡",
                "↕",
                "1≡",
                "•≡",
                "≻",
                "≺",
                "“",
                "▣",
                "S",
              ].map((icon, index) => (
                <button
                  type="button"
                  key={`${icon}-${index}`}
                  className="px-2 text-[14px]"
                >
                  {icon}
                </button>
              ))}
            </div>

            <div className="h-[285px]" />
          </div>

          {/* CSV attachment / recipient list */}
          {uploadedFileName && (
            <div className="mt-3 flex w-full max-w-[360px] items-center gap-3 rounded-[8px] border border-[#dfe8e2] bg-[#f7fbf8] px-3 py-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] bg-[#e7f7ed] text-[18px]">
                📄
              </div>

              <div className="min-w-0 flex-1">
                <div className="truncate text-[11px] font-medium text-[#303936]">
                  {uploadedFileName}
                </div>

                <div className="text-[9px] text-[#7c8781]">
                  {uploadedRecipientsCount} recipient
                  {uploadedRecipientsCount !== 1
                    ? "s"
                    : ""}{" "}
                  loaded
                </div>
              </div>

              <button
                type="button"
                onClick={onRemoveUploadedCsv}
                className="shrink-0 rounded-full px-2 py-1 text-[15px] text-[#8b9590] hover:bg-[#eaf0ec] hover:text-red-500"
                title="Remove CSV"
              >
                ×
              </button>
            </div>
          )}

          {/* Send Later popup */}
          {sendLaterOpen && (
            <div className="absolute right-5 top-[70px] z-50 w-[240px] rounded-[8px] border border-[#e0e4e2] bg-white p-3 shadow-[0_5px_18px_rgba(0,0,0,0.16)]">
              <div className="mb-3 text-[12px] font-medium">
                Send Later
              </div>

              <label className="mb-1 block text-[9px] text-[#909894]">
                Pick date & time
              </label>

              <input
                type="datetime-local"
                value={scheduledAt}
                min={new Date()
                  .toISOString()
                  .slice(0, 16)}
                onChange={onScheduledDateChange}
                className="mb-3 h-[30px] w-full border-b border-[#e6e9e7] bg-transparent text-[10px] outline-none"
              />

              <div className="border-t border-[#f0f1f1] pt-1">
                <button
                  type="button"
                  onClick={() => onQuickSchedule(10)}
                  className="block w-full rounded px-1 py-2 text-left text-[10px] text-[#59635e] hover:bg-[#f5f7f6]"
                >
                  Tomorrow, 10:00 AM
                </button>

                <button
                  type="button"
                  onClick={() => onQuickSchedule(11)}
                  className="block w-full rounded px-1 py-2 text-left text-[10px] text-[#59635e] hover:bg-[#f5f7f6]"
                >
                  Tomorrow, 11:00 AM
                </button>

                <button
                  type="button"
                  onClick={() => onQuickSchedule(15)}
                  className="block w-full rounded px-1 py-2 text-left text-[10px] text-[#59635e] hover:bg-[#f5f7f6]"
                >
                  Tomorrow, 3:00 PM
                </button>
              </div>

              <div className="mt-3 flex justify-end gap-4 border-t border-[#f0f1f1] pt-3">
                <button
                  type="button"
                  onClick={onToggleSendLater}
                  className="text-[10px]"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}