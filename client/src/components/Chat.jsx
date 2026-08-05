import { useEffect, useState } from 'react';
import { api, fmtDateTime } from '../api.js';

// Embedded chat thread with the translate / edit / delete dropdown from the handbook.
export default function Chat({ threadId }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [openMenu, setOpenMenu] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.chat(threadId).then((list) => !cancelled && setMessages(list));
    return () => {
      cancelled = true;
    };
  }, [threadId]);

  async function send(e) {
    e.preventDefault();
    if (!draft.trim()) return;
    const message = await api.sendChat(threadId, draft);
    setMessages((prev) => [...prev, message]);
    setDraft('');
  }

  async function translate(message) {
    const { translated } = await api.translate(message.text);
    setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, text: translated } : m)));
    setOpenMenu(null);
  }

  function edit(message) {
    const next = window.prompt('Edit message', message.text);
    if (next !== null) {
      setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, text: next } : m)));
    }
    setOpenMenu(null);
  }

  function remove(message) {
    setMessages((prev) => prev.filter((m) => m.id !== message.id));
    setOpenMenu(null);
  }

  return (
    <div className="chat">
      <h3>Chat</h3>
      <div className="chat-log">
        {messages.length === 0 && <div className="muted">No messages yet.</div>}
        {messages.map((m) => (
          <div key={m.id} className="chat-msg">
            <div className="chat-meta">
              <strong>{m.author}</strong>
              <span>{fmtDateTime(m.at)}</span>
              <button className="chat-caret" onClick={() => setOpenMenu(openMenu === m.id ? null : m.id)}>
                ▼
              </button>
            </div>
            <div className="chat-text">{m.text}</div>
            {openMenu === m.id && (
              <div className="chat-menu">
                <button onClick={() => translate(m)}>Translate</button>
                <button onClick={() => edit(m)}>Edit</button>
                <button onClick={() => remove(m)}>Delete</button>
              </div>
            )}
          </div>
        ))}
      </div>
      <form className="chat-input" onSubmit={send}>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type a message…" />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
