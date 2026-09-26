import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, HelpCircle, LifeBuoy, Loader2, PlayCircle, Search, ThumbsDown, ThumbsUp } from 'lucide-react';
import { toast } from 'sonner';
import support, { Article } from '@/services/support.service';
import ArticleBody from '@/components/support/ArticleBody';

const card = 'bg-white rounded-xl border border-slate-200 shadow-sm';
const KIND_ICON = { guide: BookOpen, faq: HelpCircle, video: PlayCircle };

/** Help centre (P15): guides and questions for the person's role, searchable, with a way to contact support. */
export default function HelpCentrePage() {
  const { slug } = useParams();
  return slug ? <ArticleView slug={slug} /> : <HelpHome />;
}

function ContactBox({ canOpen }: { canOpen: boolean }) {
  return (
    <div className={`${card} p-4 flex flex-wrap items-center justify-between gap-3`}>
      <div className="flex items-start gap-3">
        <LifeBuoy className="mt-0.5 text-blue-600" />
        <div>
          <p className="font-semibold text-slate-800">Still stuck?</p>
          <p className="text-sm text-slate-600">{canOpen ? 'Ask our support team. You will get an email when they reply.'
            : 'Please contact your school office. They can help, and reach our support team if needed.'}</p>
        </div>
      </div>
      {canOpen && (
        <div className="flex gap-2">
          <Link to="/help/tickets" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700">My tickets</Link>
          <Link to="/help/tickets?new=1" className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white">Contact support</Link>
        </div>
      )}
    </div>
  );
}

function HelpHome() {
  const [q, setQ] = useState('');
  const [module, setModule] = useState('');
  const [data, setData] = useState<Awaited<ReturnType<typeof support.help>> | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => support.help(q, module).then(setData).catch(() => toast.error('Could not load help.')).finally(() => setLoading(false)), q ? 250 : 0);
    return () => clearTimeout(t);
  }, [q, module]);
  // Browsing: grouped by topic. Searching: one list, best match first (the server's order).
  const groups: Record<string, Article[]> = {};
  if (q) groups[''] = data?.articles || [];
  else (data?.articles || []).forEach((a) => { (groups[a.module_label] ||= []).push(a); });
  const used = new Set((data?.articles || []).map((a) => a.module));
  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900"><LifeBuoy /> Help & support</h1>
        <p className="text-sm text-slate-500">Guides and answers for your part of the school system.</p>
      </div>
      <label className="relative block">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search help, e.g. “reset password” or “collect fees”" aria-label="Search help"
          className="w-full rounded-xl border border-slate-300 bg-white py-3 ps-10 pe-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none" />
      </label>
      {data && !q && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Topics">
          <button onClick={() => setModule('')} className={`rounded-full px-3 py-1 text-xs font-semibold ${!module ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>All topics</button>
          {data.modules.filter((m) => used.has(m.key) || m.key === module).map((m) => (
            <button key={m.key} onClick={() => setModule(m.key === module ? '' : m.key)} aria-pressed={m.key === module}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${m.key === module ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>{m.label}</button>
          ))}
        </div>
      )}
      {!data ? <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" /></div> : (
        <div className={`space-y-5 ${loading ? 'opacity-60' : ''}`}>
          {q && <p className="text-sm text-slate-600">{data.articles.length} result{data.articles.length === 1 ? '' : 's'} for “{q}”</p>}
          {Object.entries(groups).map(([label, items]) => (
            <section key={label || 'results'} aria-label={label || 'Search results'}>
              {!q && <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">{label}</h2>}
              <ul className="grid gap-2 sm:grid-cols-2">
                {items.map((a) => {
                  const Icon = KIND_ICON[a.kind] || BookOpen;
                  return (
                    <li key={a.id}>
                      <Link to={`/help/article/${a.slug}`} className={`${card} flex h-full items-start gap-3 p-3 hover:border-blue-300`}>
                        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                        <span><span className="block text-sm font-semibold text-slate-800">{a.title}</span>
                          {a.summary && <span className="block text-xs text-slate-500">{a.summary}</span>}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          {!data.articles.length && <p className={`${card} p-6 text-center text-sm text-slate-500`}>Nothing found. Try other words, or contact us below.</p>}
          <ContactBox canOpen={data.can_open_tickets} />
        </div>
      )}
    </div>
  );
}

function ArticleView({ slug }: { slug: string }) {
  const navigate = useNavigate();
  const [data, setData] = useState<Awaited<ReturnType<typeof support.article>> | null>(null);
  const [voted, setVoted] = useState(false);
  const [canOpen, setCanOpen] = useState(false);
  useEffect(() => {
    setData(null); setVoted(false);
    support.article(slug).then(setData).catch(() => { toast.error('That article is not available.'); navigate('/help'); });
    support.help().then((d) => setCanOpen(d.can_open_tickets)).catch(() => undefined);
  }, [slug, navigate]);
  if (!data) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" /></div>;
  const a = data.article;
  const vote = async (helpful: boolean) => {
    try { toast.success((await support.vote(slug, helpful)).message); setVoted(true); } catch { toast.error('Could not save.'); }
  };
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
      <Link to="/help" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700"><ArrowLeft size={14} className="rtl:rotate-180" /> Help & support</Link>
      <article className={`${card} p-5 space-y-3`}>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{a.module_label}</p>
        <h1 className="text-xl font-bold text-slate-900">{a.title}</h1>
        {a.summary && <p className="text-sm text-slate-600">{a.summary}</p>}
        {a.video_url && <a href={a.video_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700"><PlayCircle size={15} /> Watch the video</a>}
        <ArticleBody text={a.body || ''} />
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-sm text-slate-600">
          {voted ? 'Thanks for telling us.' : (<>Was this helpful?
            <button onClick={() => vote(true)} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1"><ThumbsUp size={13} /> Yes</button>
            <button onClick={() => vote(false)} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1"><ThumbsDown size={13} /> No</button></>)}
        </div>
      </article>
      {data.related.length > 0 && (
        <div className={`${card} p-4`}>
          <h2 className="mb-2 text-sm font-bold text-slate-700">More about {a.module_label.toLowerCase()}</h2>
          <ul className="space-y-1">{data.related.map((r) => <li key={r.id}><Link to={`/help/article/${r.slug}`} className="text-sm text-blue-700 hover:underline">{r.title}</Link></li>)}</ul>
        </div>
      )}
      <ContactBox canOpen={canOpen} />
    </div>
  );
}
