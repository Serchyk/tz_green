# GREEN-API Chat

A minimal messenger-style web chat (dark theme) with text-only messaging through the [GREEN-API](https://green-api.com) HTTP API. Built with React + Vite.

[Русская версия README](./README.ru.md)

## Features

- Login with your own GREEN-API instance credentials (`idInstance`, `apiTokenInstance`, optional `apiUrl`)
- Create a chat by phone number (`CheckWhatsapp` with `<phone>@c.us` fallback)
- Send text messages via `SendMessage`
- Receive messages by polling `ReceiveNotification` (long poll, ~5 s) and acknowledging them with `DeleteNotification`
- Unread counters, chat search, incoming messages from unknown chat IDs automatically create new chats
- Message formatting: `*bold*` / `**bold**`, `> quotes`, clickable links (including `[label](url)`)
- Text only — no files, groups, or calls

## Requirements

- Node.js 18+ and npm
- A GREEN-API instance at [console.green-api.com](https://console.green-api.com)

## Getting started

```bash
npm install
npm run dev
```

Open the URL printed by Vite (by default `http://127.0.0.1:5173`).

Production build:

```bash
npm run build
npm run preview
```

## Configuration

On the login screen enter:

| Field | Required | Description |
| --- | --- | --- |
| `idInstance` | yes | Instance ID from the GREEN-API dashboard |
| `apiTokenInstance` | yes | Instance API token |
| `apiUrl` | no | Defaults to `https://<first 4 digits of idInstance>.api.green-api.com` |

Credentials are stored only in the browser's `localStorage` — nothing is hardcoded in the source.

## GREEN-API instance requirements

- The instance must be **authorized** (scan the QR code in the dashboard), otherwise outgoing messages queue for up to 24 h. The UI shows a warning when the instance is `notAuthorized`.
- For HTTP API receiving, enable `incomingWebhook` / `outgoingWebhook` / `stateWebhook` in instance settings and keep `webhookUrl` empty.

## Usage scenario

1. Open the app, enter `idInstance` + `apiTokenInstance`, click **Log in**.
2. Click **+**, enter the recipient's phone number, click **Create chat**.
3. Select the chat, type a message, press **Enter** or ➤.
4. Reply from the recipient's phone.
5. The reply appears automatically (polling every ~5 s). Messages from unknown chat IDs create a new chat at the top of the list.

For a full test you need a **second phone number** — sending to yourself will not come back as an incoming message.

## Project structure

```
src/
  App.jsx                     App shell: auth, layout, hooks wiring
  main.jsx                    Entry point
  api/greenApi.js             GREEN-API client (send, receive, phone/chat helpers)
  hooks/useChats.js           Chat list state, aliases, sending, persistence
  hooks/usePolling.js         ReceiveNotification → DeleteNotification loop
  components/AuthScreen.jsx   Login form
  components/ChatList.jsx     Sidebar: search, chat list, unread badges, footer
  components/ChatWindow.jsx   Messages, formatting renderer, composer
  components/NewChatModal.jsx Create-chat dialog
  utils.js                    Avatar colors, time/date formatting
  styles.css                  Dark messenger theme
```
