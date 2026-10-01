import { useCallback, useEffect, useRef, useState } from 'react';
import { normalizePhone, phoneToChatId, checkAccount, sendMessage } from '../api/greenApi.js';

const LS_CHATS = 'tg_greenapi_chats';

function loadLs(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function useChats(buildBase) {
  const [chats, setChats] = useState(() => loadLs(LS_CHATS, []));
  const [activeChatId, setActiveChatId] = useState(null);

  const chatsRef = useRef(chats);
  chatsRef.current = chats;
  const activeChatIdRef = useRef(activeChatId);
  activeChatIdRef.current = activeChatId;
  const aliasesRef = useRef({});

  useEffect(() => {
    localStorage.setItem(LS_CHATS, JSON.stringify(chats));
  }, [chats]);

  const activeChat = chats.find((c) => c.chatId === activeChatId) || null;
  const totalUnread = chats.reduce((sum, c) => sum + (c.unread || 0), 0);

  const markRead = useCallback((chatId) => {
    setChats((prev) => prev.map((c) => (c.chatId === chatId ? { ...c, unread: 0 } : c)));
  }, []);

  const selectChat = useCallback((chatId) => {
    setActiveChatId(chatId);
    setChats((prev) => prev.map((c) => (c.chatId === chatId ? { ...c, unread: 0 } : c)));
  }, []);

  const resolveRealId = useCallback((chatId, senderPhone) => {
    const known = aliasesRef.current[chatId];
    if (known && chatsRef.current.some((c) => c.chatId === known)) return known;
    if (chatsRef.current.some((c) => c.chatId === chatId)) return chatId;
    if (senderPhone) {
      const byPhone = chatsRef.current.find(
        (c) => c.phone && normalizePhone(c.phone) === normalizePhone(senderPhone)
      );
      if (byPhone) {
        aliasesRef.current[chatId] = byPhone.chatId;
        return byPhone.chatId;
      }
    }
    return chatId;
  }, []);

  const upsertMessage = useCallback((chatId, msg) => {
    const realId = resolveRealId(chatId, msg.senderPhone);
    setChats((prev) => {
      let idx = prev.findIndex((c) => c.chatId === realId);
      if (idx === -1 && realId !== chatId) idx = prev.findIndex((c) => c.chatId === chatId);
      if (idx === -1) {
        return [
          {
            chatId: realId,
            phone: msg.senderPhone ? normalizePhone(msg.senderPhone) : (msg.phone || ''),
            name: msg.senderName || realId,
            messages: [msg],
            lastText: msg.text,
            lastTime: msg.time,
            unread: 1
          },
          ...prev
        ];
      }
      const next = [...prev];
      const chat = { ...next[idx] };
      if (chat.messages.some((m) => m.id === msg.id)) return prev;
      chat.messages = [...chat.messages, msg];
      chat.lastText = msg.text;
      chat.lastTime = msg.time;
      if (msg.senderName && (chat.name === chatId || chat.name === realId)) chat.name = msg.senderName;
      next.splice(idx, 1);
      const unread = msg.fromMe ? 0 : (chat.unread || 0) + (realId === activeChatIdRef.current ? 0 : 1);
      return [{ ...chat, unread }, ...next];
    });
  }, [resolveRealId]);

  const learnAlias = useCallback((statusChatId, msgId) => {
    const owner = chatsRef.current.find((c) => c.messages.some((m) => m.id === msgId));
    if (owner && owner.chatId !== statusChatId) {
      aliasesRef.current[statusChatId] = owner.chatId;
    }
  }, []);

  const createChat = useCallback(
    async (rawPhone) => {
      const phone = normalizePhone(rawPhone);
      if (phone.length < 7 || phone.length > 15) {
        throw new Error('Введите номер в международном формате, например 79991234567');
      }
      let chatId = phoneToChatId(phone, null);
      try {
        const check = await checkAccount({ ...buildBase(), phoneNumber: phone });
        if (check && check.exist === false) throw new Error('На этом номере нет аккаунта');
        if (check?.chatId) chatId = String(check.chatId);
      } catch (err) {
        if (/нет аккаунта/i.test(err.message)) throw err;
        console.warn('checkAccount warning:', err);
      }
      setChats((prev) =>
        prev.some((c) => c.chatId === chatId)
          ? prev
          : [{ chatId, phone, name: phone, messages: [], lastText: '', lastTime: null, unread: 0 }, ...prev]
      );
      selectChat(chatId);
      return chatId;
    },
    [buildBase, selectChat]
  );

  const sendText = useCallback(
    async (chatId, text) => {
      const tmpId = `tmp_${Date.now()}`;
      const msg = { id: tmpId, text, fromMe: true, time: Date.now() };
      setChats((prev) =>
        prev.map((c) =>
          c.chatId === chatId
            ? { ...c, messages: [...c.messages, msg], lastText: text, lastTime: msg.time }
            : c
        )
      );
      try {
        if (text.length > 20000) throw new Error('Сообщение длиннее 20000 символов');
        const res = await sendMessage({ ...buildBase(), chatId, message: text });
        if (res?.idMessage) {
          setChats((prev) =>
            prev.map((c) =>
              c.chatId === chatId
                ? {
                    ...c,
                    messages: c.messages.map((m) =>
                      m.id === tmpId ? { ...m, id: String(res.idMessage) } : m
                    )
                  }
                : c
            )
          );
        }
        return { ok: true };
      } catch (err) {
        setChats((prev) =>
          prev.map((c) =>
            c.chatId === chatId
              ? { ...c, messages: c.messages.map((m) => (m.id === tmpId ? { ...m, failed: true } : m)) }
              : c
          )
        );
        return { ok: false, error: err.message || 'Не удалось отправить' };
      }
    },
    [buildBase]
  );

  return {
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
  };
}
