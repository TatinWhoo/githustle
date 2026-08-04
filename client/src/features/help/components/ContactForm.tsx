import { useState } from 'react';
import { useToast } from '@/hooks/useToast';

const CATEGORIES = ['Billing', 'Bug', 'Feature', 'Other'] as const;

export function ContactForm() {
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('');
  const [message, setMessage] = useState('');
  const { push } = useToast();

  const canSend = subject.trim() !== '' && category !== '' && message.trim() !== '';

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSend) return;
    push({ intent: 'success', message: 'Ticket queued' });
    setSubject('');
    setCategory('');
    setMessage('');
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Subject"
        required
        aria-label="Ticket subject"
        className="border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gh-teal"
      />
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        required
        aria-label="Ticket category"
        className="border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gh-teal"
      >
        <option value="">Category…</option>
        {CATEGORIES.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Message"
        required
        aria-label="Ticket message"
        className="border border-border rounded-md px-3 py-2 text-sm min-h-[100px] resize-y focus:outline-none focus:ring-2 focus:ring-gh-teal"
      />
      <button
        type="submit"
        disabled={!canSend}
        className={`self-start px-4 py-2 rounded-md text-sm font-semibold text-white transition-colors ${
          canSend ? 'bg-gh-teal hover:bg-gh-teal-hover' : 'bg-gh-teal/40 cursor-not-allowed'
        }`}
      >
        Submit ticket
      </button>
    </form>
  );
}
