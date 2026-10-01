import { useEffect, useRef, useState } from 'react';
import { receiveNotification, deleteNotification, extractTextMessage } from '../api/greenApi.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function usePolling({ enabled, buildBase, onMeta, onMessage }) {
  const [polling, setPolling] = useState(true);
  const [pollStatus, setPollStatus] = useState('ожидание');
  const [pollError, setPollError] = useState('');

  const pollRef = useRef(true);
  pollRef.current = polling && enabled;
  const onMetaRef = useRef(onMeta);
  onMetaRef.current = onMeta;
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!enabled) setPollStatus('остановлен');
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    let stopped = false;

    async function loop() {
      setPollStatus('опрос очереди…');
      while (!stopped) {
        if (!pollRef.current) {
          setPollStatus('на паузе');
          await sleep(1000);
          continue;
        }
        try {
          const base = buildBase();
          setPollStatus('ожидание сообщений…');
          const notif = await receiveNotification({ ...base, timeout: 5 });
          if (stopped) break;
          if (!notif) continue;
          const { receiptId, body } = notif;
          try {
            const parsed = extractTextMessage(body);
            if (parsed && parsed.skip) {
              onMetaRef.current(parsed);
            } else if (parsed && parsed.text && parsed.typeWebhook !== 'outgoingAPIMessageReceived') {
              onMessageRef.current(parsed, receiptId);
            }
          } finally {
            try {
              await deleteNotification({ ...base, receiptId });
            } catch (delErr) {
              console.warn('DeleteNotification failed', delErr);
            }
          }
          setPollError('');
        } catch (err) {
          if (stopped) break;
          setPollError(err.message || 'Ошибка получения');
          setPollStatus('ошибка, повтор через 5с');
          await sleep(5000);
        }
      }
    }

    loop();
    return () => {
      stopped = true;
    };
  }, [enabled, buildBase]);

  return { polling, setPolling, pollStatus, pollError };
}
