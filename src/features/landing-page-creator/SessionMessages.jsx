import MessageEntry from "./MessageEntry";

function SessionMessages({ messages }) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4">
      {messages.length === 0 ? (
        <div className="text-sm text-neutral-500">
          Ask for an AI edit and the conversation will show up here.
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((m) => (
            <MessageEntry key={m.id} message={m} />
          ))}
        </div>
      )}
    </div>
  );
}

export default SessionMessages;

