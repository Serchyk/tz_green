import { avatarColor, formatTime } from '../utils.js';

export default function ChatList({
  chats,
  activeChatId,
  onSelect,
  onNewChat,
  totalUnread,
  search,
  onSearchChange,
  searchRef,
  instanceState,
  pollStatus,
  pollError,
  polling,
  onTogglePolling,
  onLogout
}) {
  const q = search.trim().toLowerCase();
  const visible = q
    ? chats.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.phone || '').includes(q.replace(/\D/g, '')) ||
          (c.lastText || '').toLowerCase().includes(q)
      )
    : chats;

  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <div className="chats-title">Чаты</div>
        <div className="head-right">
          <div className={`me-avatar ${totalUnread > 0 ? 'has-unread' : ''}`} title={`Непрочитанных сообщений: ${totalUnread}`}>
            {totalUnread}
          </div>
          <button className="fab" onClick={onNewChat} title="Новый чат">+</button>
        </div>
      </div>
      <div className="search">
        <input ref={searchRef} value={search} onChange={(e) => onSearchChange(e.target.value)} placeholder="Найти" />
      </div>
      {String(instanceState).toLowerCase().includes('notauthor') && (
        <div className="state warn">Инстанс notAuthorized — авторизуйте его в console.green-api.com через QR-код, иначе отправка встанет в очередь, а получение не заработает.</div>
      )}

      <div className="chat-list">
        {visible.length === 0 && <div className="empty-list muted">Чатов пока нет. Нажмите + и введите номер телефона.</div>}
        {visible.map((c) => (
          <button key={c.chatId} className={`chat-item ${c.chatId === activeChatId ? 'active' : ''}`} onClick={() => onSelect(c.chatId)}>
            <div className="avatar" style={{ background: avatarColor(c.name) }}>
              {(c.name || '?').slice(0, 1).toUpperCase()}
            </div>
            <div className="chat-meta">
              <div className="chat-top">
                <span className="chat-name">{c.name}</span>
                <span className="chat-time">{c.lastTime ? formatTime(c.lastTime) : ''}</span>
              </div>
              <div className="chat-bottom">
                <span className="chat-preview">{c.lastText || c.phone || c.chatId}</span>
                {!!c.unread && <span className="unread">{c.unread}</span>}
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="sidebar-foot">
        <span className={`dot ${pollError ? 'red' : 'green'}`} />
        <span className="foot-text" title={pollError || pollStatus}>{pollError ? pollError : pollStatus}</span>
        <button className={`toggle ${polling ? 'on' : ''}`} onClick={onTogglePolling} title="Вкл/выкл получение уведомлений">
          {polling ? '⏸' : '▶'}
        </button>
        <button className="logout" onClick={onLogout} title="Выйти (сменить инстанс)">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
