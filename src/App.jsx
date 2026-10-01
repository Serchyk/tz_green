import { useCallback, useRef, useState } from 'react';
import { normalizeApiUrl, getStateInstance } from './api/greenApi.js';
import { useChats } from './hooks/useChats.js';
import { usePolling } from './hooks/usePolling.js';
import AuthScreen from './components/AuthScreen.jsx';
import ChatList from './components/ChatList.jsx';
import ChatWindow from './components/ChatWindow.jsx';
import NewChatModal from './components/NewChatModal.jsx';

const LS_CREDS = 'tg_greenapi_creds';

const DEFAULT_CREDS = {
  idInstance: '',
  apiTokenInstance: '',
  apiUrl: ''
};

function loadLs(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [creds, setCreds] = useState(() => ({ ...DEFAULT_CREDS, ...loadLs(LS_CREDS, {}) }));
  const [loggedIn, setLoggedIn] = useState(() => !!loadLs(LS_CREDS, null)?.apiTokenInstance);
  const [instanceState, setInstanceState] = useState(null);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);

  const credsRef = useRef(creds);
  credsRef.current = creds;
  const searchRef = useRef(null);

  const credsSnapshot = useCallback(
    () => ({
      apiUrl: normalizeApiUrl(credsRef.current.apiUrl, credsRef.current.idInstance),
      idInstance: String(credsRef.current.idInstance || '').trim(),
      apiTokenInstance: String(credsRef.current.apiTokenInstance || '').trim()
    }),
    []
  );

  const {
    chats,
    activeChatId,
    activeChat,
    totalUnread,
    setActiveChatId,
    selectChat,
    upsertMessage,
    learnAlias,
    createChat,
    sendText
  } = useChats(credsSnapshot);

  const handleIncoming = useCallback(
    (parsed, receiptId) => {
      upsertMessage(String(parsed.chatId), {
        id: String(parsed.idMessage || `${Date.now()}_${receiptId}`),
        text: parsed.text,
        fromMe: !!parsed.isOutgoing,
        time: parsed.timestamp,
        senderName: parsed.senderName,
        senderPhone: parsed.senderPhone || null
      });
    },
    [upsertMessage]
  );

  const handleMeta = useCallback(
    (parsed) => {
      if (parsed.chatId && parsed.idMessage) {
        learnAlias(String(parsed.chatId), String(parsed.idMessage));
      }
    },
    [learnAlias]
  );

  const { polling, setPolling, pollStatus, pollError } = usePolling({
    enabled: loggedIn,
    buildBase: credsSnapshot,
    onMeta: handleMeta,
    onMessage: handleIncoming
  });

  const handleLogin = async (e) => {
    e?.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const base = credsSnapshot();
      if (!base.idInstance || !base.apiTokenInstance) throw new Error('Введите idInstance и apiTokenInstance');
      const state = await getStateInstance(base);
      setInstanceState(state?.stateInstance || state);
      localStorage.setItem(LS_CREDS, JSON.stringify({ ...creds, apiUrl: base.apiUrl }));
      setLoggedIn(true);
    } catch (err) {
      setAuthError(err.message || 'Не удалось подключиться. Проверьте данные.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setLoggedIn(false);
    localStorage.removeItem(LS_CREDS);
  };

  const handleSearchClick = () => {
    setActiveChatId(null);
    searchRef.current?.focus();
  };

  if (!loggedIn) {
    return (
      <AuthScreen
        creds={creds}
        onCredsChange={setCreds}
        error={authError}
        loading={authLoading}
        onSubmit={handleLogin}
      />
    );
  }

  return (
    <div className="max-root">
      <ChatList
        chats={chats}
        activeChatId={activeChatId}
        onSelect={selectChat}
        onNewChat={() => setShowNewChat(true)}
        totalUnread={totalUnread}
        search={search}
        onSearchChange={setSearch}
        searchRef={searchRef}
        instanceState={instanceState}
        pollStatus={pollStatus}
        pollError={pollError}
        polling={polling}
        onTogglePolling={() => setPolling((v) => !v)}
        onLogout={handleLogout}
      />

      <ChatWindow
        chat={activeChat}
        onBack={() => setActiveChatId(null)}
        onSearchClick={handleSearchClick}
        onNewChat={() => setShowNewChat(true)}
        sendText={sendText}
      />

      <NewChatModal open={showNewChat} onClose={() => setShowNewChat(false)} onCreate={createChat} />
    </div>
  );
}
