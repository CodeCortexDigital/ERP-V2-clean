import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import messaging from '@/services/messaging.service';

/** Header envelope with the number of unread messages. */
export default function MessagesBadge({ className = '' }: { className?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const load = () => messaging.unread().then((u) => setCount(u.messages)).catch(() => undefined);
    load();
    const t = window.setInterval(load, 30000);
    return () => window.clearInterval(t);
  }, []);
  return (
    <Link to="/messages" className={`relative ${className}`} aria-label={count ? `Messages, ${count} unread` : 'Messages'} title="Messages">
      <Mail className="w-[18px] h-[18px]" />
      {count > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">{count > 99 ? '99+' : count}</span>}
    </Link>
  );
}
