import { useEffect, useState } from 'react';
import { Volume2, Square } from 'lucide-react';

export default function ReadAloudControl({ text, label = 'Read aloud' }) {
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState('');
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  useEffect(() => () => { if (supported) window.speechSynthesis.cancel(); }, [supported, text]);
  if (!supported) return null;
  const speak = () => {
    window.speechSynthesis.cancel();
    if (speaking) { setSpeaking(false); return; }
    setError('');
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.85;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = (event) => {
      setSpeaking(false);
      if (!['canceled', 'interrupted'].includes(event.error)) setError('Voice unavailable');
    };
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };
  return <span className="read-aloud-control">
    <button type="button" className="read-aloud-button" onClick={speak} disabled={!text.trim()}
      aria-label={speaking ? 'Stop reading' : label} title={speaking ? 'Stop reading' : label}>
      {speaking ? <Square size={22} /> : <Volume2 size={22} />}
    </button>
    {error && <span role="status">{error}</span>}
  </span>;
}
