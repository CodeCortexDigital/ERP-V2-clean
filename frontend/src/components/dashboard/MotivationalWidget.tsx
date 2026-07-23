import { useState, useEffect } from 'react';
import { Quote } from 'lucide-react';

const quotes = [
  { text: 'Education is the most powerful weapon which you can use to change the world.', author: 'Nelson Mandela' },
  { text: 'The beautiful thing about learning is that nobody can take it away from you.', author: 'B.B. King' },
  { text: 'Education is not preparation for life; education is life itself.', author: 'John Dewey' },
  { text: 'The more that you read, the more things you will know. The more that you learn, the more places you will go.', author: 'Dr. Seuss' },
  { text: 'Intelligence plus character — that is the goal of true education.', author: 'Martin Luther King Jr.' },
  { text: 'Learning never exhausts the mind.', author: 'Leonardo da Vinci' },
  { text: 'The mind is not a vessel to be filled, but a fire to be kindled.', author: 'Plutarch' },
  { text: 'Education is the passport to the future, for tomorrow belongs to those who prepare for it today.', author: 'Malcolm X' },
  { text: 'Success is not final, failure is not fatal: it is the courage to continue that counts.', author: 'Winston Churchill' },
  { text: 'Believe you can and you are halfway there.', author: 'Theodore Roosevelt' },
];

export default function MotivationalWidget() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % quotes.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  const q = quotes[index];

  return (
    <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-5 rounded-2xl shadow-sm text-white overflow-hidden relative">
      <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/5" />
      <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full bg-white/5" />

      <div className="relative z-10">
        <Quote className="w-6 h-6 text-white/30 mb-2" />
        <p className="text-sm font-semibold leading-relaxed text-white/90 min-h-[60px]">
          &ldquo;{q.text}&rdquo;
        </p>
        <p className="text-[11px] font-medium text-white/60 mt-3">&mdash; {q.author}</p>
      </div>

      <div className="flex gap-1.5 mt-4 relative z-10">
        {quotes.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all duration-500 ${i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/30'}`}
          />
        ))}
      </div>
    </div>
  );
}
