function MessageEntry({ message }) {
  const roleLabel =
    message.role === "user"
      ? "You"
      : message.role === "error"
        ? "Error"
        : "System";

  const statusLabel = message.status ? ` (${message.status})` : "";

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold text-neutral-700">
          {roleLabel}
          {statusLabel}
        </div>
      </div>
      <div className="mt-1 whitespace-pre-wrap text-sm text-neutral-900">
        {message.text}
      </div>
      {message.url && (
        <a
          href={message.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 block break-all text-xs text-indigo-600 underline"
        >
          {message.url}
        </a>
      )}
    </div>
  );
}

export default MessageEntry;

