import { useEffect, useRef, useState } from 'react';
import { avatarColor, formatTime, formatDay } from '../utils.js';

const INLINE_SRC =
  '\\[([^\\[\\]]*(?:\\[[^\\[\\]]*\\][^\\[\\]]*)*)\\]\\((tg:\\/\\/[^\\s)]+|https?:\\/\\/[^\\s)]+)\\)|\\*\\*([^*\\n]+)\\*\\*|\\*([^*\\n]+)\\*|(https?:\\/\\/[^\\s<]+)';

function renderBold(rawInner, state) {
  const inner = rawInner.replace(/^\s+/, '');
  const url = inner.trim();
  if (/^https?:\/\/\S+$/.test(url)) {
    return (
      <b key={state.key++}>
        <a className="mention" href={url} target="_blank" rel="noreferrer">
          {url}
        </a>
      </b>
    );
  }
  return <b key={state.key++}>{renderInline(inner, state)}</b>;
}

function renderInline(raw, state) {
  const s = String(raw ?? '');
  const re = new RegExp(INLINE_SRC, 'g');
  const out = [];
  let last = 0;
  let m;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    if (m[1] !== undefined) {
      const label = m[1];
      const href = m[2];
      out.push(
        <a key={state.key++} className="mention" href={href} target="_blank" rel="noreferrer">
          {renderInline(label, state)}
        </a>
      );
    } else if (m[3] !== undefined) {
      out.push(renderBold(m[3], state));
    } else if (m[4] !== undefined) {
      out.push(renderBold(m[4], state));
    } else if (m[5] !== undefined) {
      const url = m[5];
      const trimmed = url.replace(/[.,;!?]+$/, '');
      if (trimmed !== url) out.push(url.slice(trimmed.length));
      out.push(
        <a key={state.key++} className="mention" href={trimmed} target="_blank" rel="noreferrer">
          {trimmed}
        </a>
      );
    }
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}

function normalizeLine(line) {
  let s = line;
  const stars = (s.match(/\*/g) || []).length;
  if (s.startsWith('*') && s.includes('**') && stars % 2 === 1 && s.endsWith('*')) {
    s = s.slice(0, -1);
  }
  if (!/^\*[^*\n]+\*/.test(s) && /^\*(?!\*)/.test(s) && s.includes('**')) {
    s = s.slice(1);
  }
  return s;
}

function renderBlocks(text) {
  const lines = String(text ?? '').split(/\r?\n/);
  const out = [];
  const state = { key: 0 };
  let buffer = [];
  let i = 0;

  const flush = () => {
    if (buffer.length) {
      out.push(renderInline(buffer.join('\n'), state));
      buffer = [];
    }
  };

  while (i < lines.length) {
    if (/^\s*>/.test(lines[i])) {
      flush();
      const quoteLines = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      out.push(
        <blockquote key={state.key++} className="quote">
          {renderInline(quoteLines.join('\n'), state)}
        </blockquote>
      );
      continue;
    }
    buffer.push(normalizeLine(lines[i]));
    i += 1;
  }
  flush();
  return out;
}

export default function ChatWindow({ chat, onBack, onSearchClick, onNewChat, sendText }) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    setDraft('');
    setSendError('');
  }, [chat?.chatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [chat?.messages?.length, chat?.chatId]);

  const handleSend = async (e) => {
    e?.preventDefault();
    const text = draft.trim();
    if (!text || !chat || sending) return;
    setSendError('');
    setSending(true);
    setDraft('');
    const res = await sendText(chat.chatId, text);
    if (!res.ok) setSendError(res.error);
    setSending(false);
  };

  if (!chat) {
    return (
      <main className="chat-window">
        <div className="no-chat">
          <div className="no-chat-card">
            <div className="no-chat-title">Выберите чат или создайте новый</div>
            <div className="muted small">Введите номер телефона получателя (кнопка +) и отправьте текст — ответ собеседника придёт сам.</div>
            <button className="btn-primary" onClick={onNewChat}>Новый чат</button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="chat-window">
      <header className="chat-header">
        <button className="back" onClick={onBack} title="К списку чатов">←</button>
        <div className="avatar sm" style={{ background: avatarColor(chat.name) }}>
          {(chat.name || '?').slice(0, 1).toUpperCase()}
        </div>
        <div className="header-meta">
          <div className="header-name">{chat.name}</div>
          <div className="header-status">{chat.phone ? `+${chat.phone}` : chat.chatId}</div>
        </div>
        <button className="icon-btn" title="Поиск по чатам" onClick={onSearchClick}>
          🔍
        </button>
      </header>

      <div className="messages">
        {chat.messages.length === 0 ? (
          <div className="empty-chat">
            <div className="empty-card">
              <div className="empty-title">Сообщений пока нет</div>
              <div className="empty-sub">Напишите сообщение или отправьте этот стикер</div>
              <div className="mascot">✈️</div>
            </div>
            <div className="date-pill">{formatDay(Date.now())}</div>
            <div className="sys-msg">Напишите первое сообщение! ✈</div>
          </div>
        ) : (
          <>
            <div className="date-pill">{formatDay(chat.messages[0]?.time || Date.now())}</div>
            {chat.messages.map((m) => (
              <div key={m.id} className={`msg-row ${m.fromMe ? 'me' : 'them'}`}>
                <div className={`bubble ${m.failed ? 'failed' : ''}`}>
                  <div className="bubble-text">{renderBlocks(m.text)}</div>
                  <div className="bubble-time">
                    {formatTime(m.time)} {m.fromMe ? (m.failed ? '⚠' : '✓✓') : ''}
                  </div>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {sendError && <div className="send-error">{sendError}</div>}
      <form className="composer" onSubmit={handleSend}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Сообщение"
          maxLength={20000}
        />
        <button type="submit" disabled={sending || !draft.trim()} className="send-btn" title="Отправить">
          {sending ? '…' : '➤'}
        </button>
      </form>
    </main>
  );
}
