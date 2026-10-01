export function normalizeApiUrl(input, idInstance) {
  if (input && input.trim()) {
    return input.trim().replace(/\/$/, '');
  }
  const prefix = String(idInstance || '').slice(0, 4);
  return prefix ? `https://${prefix}.api.green-api.com` : '';
}

export function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '');
}

export function phoneToChatId(phone, checkChatId) {
  if (checkChatId) return String(checkChatId);
  return `${normalizePhone(phone)}@c.us`;
}

async function parseResponse(res) {
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg =
      (data && (data.message || data.error || data.reason)) ||
      (typeof data === 'string' ? data : res.statusText);
    throw new Error(`HTTP ${res.status}: ${msg}`);
  }
  return data;
}

export async function getStateInstance({ apiUrl, idInstance, apiTokenInstance }) {
  const url = `${apiUrl}/waInstance${idInstance}/getStateInstance/${apiTokenInstance}`;
  const res = await fetch(url);
  return parseResponse(res);
}

export async function checkAccount({ apiUrl, idInstance, apiTokenInstance, phoneNumber }) {
  const body = JSON.stringify({ phoneNumber: Number(normalizePhone(phoneNumber)) });
  const headers = { 'Content-Type': 'application/json' };
  try {
    const res = await fetch(`${apiUrl}/waInstance${idInstance}/checkWhatsapp/${apiTokenInstance}`, {
      method: 'POST',
      headers,
      body
    });
    const data = await parseResponse(res);
    if (typeof data?.existsWhatsapp === 'boolean') {
      return { exist: data.existsWhatsapp, chatId: data.chatId || '' };
    }
    if (typeof data?.exist === 'boolean') return data;
  } catch {
  }
  const res = await fetch(`${apiUrl}/waInstance${idInstance}/checkAccount/${apiTokenInstance}`, {
    method: 'POST',
    headers,
    body
  });
  return parseResponse(res);
}

export async function sendMessage({ apiUrl, idInstance, apiTokenInstance, chatId, message }) {
  const url = `${apiUrl}/waInstance${idInstance}/sendMessage/${apiTokenInstance}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId, message })
  });
  return parseResponse(res);
}

export async function receiveNotification({ apiUrl, idInstance, apiTokenInstance, timeout = 5 }) {
  const t = Math.min(60, Math.max(5, timeout || 5));
  const url = `${apiUrl}/waInstance${idInstance}/receiveNotification/${apiTokenInstance}?receiveTimeout=${t}`;
  const res = await fetch(url);
  return parseResponse(res);
}

export async function deleteNotification({ apiUrl, idInstance, apiTokenInstance, receiptId }) {
  const url = `${apiUrl}/waInstance${idInstance}/deleteNotification/${apiTokenInstance}/${receiptId}`;
  const res = await fetch(url, { method: 'DELETE' });
  return parseResponse(res);
}

export function extractTextMessage(notificationBody) {
  if (!notificationBody) return null;
  const { typeWebhook, senderData, messageData, timestamp, idMessage } = notificationBody;

  if (typeWebhook !== 'incomingMessageReceived' && typeWebhook !== 'outgoingMessageReceived' && typeWebhook !== 'outgoingAPIMessageReceived') {
    const stChatId = notificationBody.chatId || senderData?.chatId || null;
    return { skip: true, typeWebhook, chatId: stChatId ? String(stChatId) : null, idMessage: notificationBody.idMessage || null };
  }

  const md = messageData || {};
  let text = null;
  if (md.typeMessage === 'textMessage' && md.textMessageData) {
    text = md.textMessageData.textMessage;
  } else if (md.typeMessage === 'extendedTextMessage' && md.extendedTextMessageData) {
    text = md.extendedTextMessageData.text;
  } else if (md.typeMessage === 'quotedMessage' && md.quotedMessageData) {
    text = md.quotedMessageData.textMessage || '[цитата]';
  }

  const chatId = senderData?.chatId || senderData?.sender || null;
  const sender = senderData?.sender || chatId;
  const senderName = senderData?.senderName || senderData?.chatName || sender || 'Собеседник';
  const isOutgoing =
    typeWebhook === 'outgoingMessageReceived' ||
    typeWebhook === 'outgoingAPIMessageReceived' ||
    senderData?.senderType === 'system' ||
    false;

  if (!text) {
    return { skip: true, typeWebhook, chatId: chatId ? String(chatId) : null, idMessage: idMessage || null };
  }

  return {
    chatId: String(chatId),
    sender: String(sender || ''),
    senderName,
    senderPhone: senderData?.senderPhoneNumber || senderData?.senderPhone || senderData?.phone || null,
    text,
    timestamp: timestamp ? timestamp * 1000 : Date.now(),
    idMessage: idMessage || `${Date.now()}`,
    isOutgoing: typeWebhook !== 'incomingMessageReceived' ? true : false,
    typeWebhook
  };
}
