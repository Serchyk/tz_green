import { useState } from 'react';

export default function NewChatModal({ open, onClose, onCreate }) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onCreate(phone);
      setPhone('');
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Новый чат</h3>
        <p className="muted small">Введите номер телефона получателя в международном формате</p>
        <form onSubmit={handleSubmit} className="form">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="79991234567"
            inputMode="tel"
            autoFocus
          />
          {error && <div className="error">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Отмена</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Проверка…' : 'Создать чат'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
