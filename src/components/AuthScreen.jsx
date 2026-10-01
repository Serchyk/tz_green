import { useState } from 'react';

export default function AuthScreen({ creds, onCredsChange, error, loading, onSubmit }) {
  const [showToken, setShowToken] = useState(false);
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">✈</div>
        <h1>Чат через GREEN-API</h1>
        <p className="muted">Введите учётные данные инстанса из личного кабинета GREEN-API. Только текстовые сообщения.</p>
        <form onSubmit={onSubmit} className="form">
          <label>
            idInstance
            <input
              value={creds.idInstance}
              onChange={(e) => onCredsChange({ ...creds, idInstance: e.target.value })}
              placeholder="ID инстанса"
              inputMode="numeric"
            />
          </label>
          <label>
            apiTokenInstance
            <span className="input-wrap">
              <input
                value={creds.apiTokenInstance}
                onChange={(e) => onCredsChange({ ...creds, apiTokenInstance: e.target.value })}
                placeholder="токен инстанса"
                type={showToken ? 'text' : 'password'}
              />
              <button
                type="button"
                className="eye-btn"
                title={showToken ? 'Скрыть токен' : 'Показать токен'}
                onClick={() => setShowToken((v) => !v)}
              >
                {showToken ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                    <path d="m1 1 22 22" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </span>
          </label>
          <label>
            apiUrl <span className="muted small">(необязательно, по умолчанию из id)</span>
            <input
              value={creds.apiUrl}
              onChange={(e) => onCredsChange({ ...creds, apiUrl: e.target.value })}
              placeholder="https://xxxx.api.green-api.com"
            />
          </label>
          {error && <div className="error">{error}</div>}
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Подключение…' : 'Войти в чат'}
          </button>
        </form>
      </div>
    </div>
  );
}
