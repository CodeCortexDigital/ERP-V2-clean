import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Copy, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import cafeteria, { byCategory, errorText, Food, MenuMeal } from '@/services/cafeteria.service';
import { Modal } from '@/components/ui/Modal';
import { formatMoney } from '@/utils/currency';

const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm';
const card = 'bg-white rounded-xl border border-slate-200 shadow-sm p-4';
const MEALS: Array<[MenuMeal['meal'], string]> = [['breakfast', 'Breakfast'], ['lunch', 'Lunch'], ['snack', 'Snack']];
const CATS: Array<[string, string]> = [['meal', 'Meal'], ['snack', 'Snack'], ['drink', 'Drink'], ['fruit', 'Fruit'], ['dessert', 'Dessert'], ['other', 'Other']];
const iso = (d: Date) => d.toLocaleDateString('sv');
const monday = (d: Date) => { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };

function FoodForm({ f, onSaved }: { f?: Food; onSaved: () => void }) {
  const [v, setV] = useState<Partial<Food>>(f || { category: 'meal', is_halal: true, is_available: true });
  const save = async () => { try { await cafeteria.saveItem(v); toast.success('Saved.'); onSaved(); } catch (e) { toast.error(errorText(e, 'Could not save.')); } };
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Name<input className={`${input} mt-1`} value={v.name || ''} onChange={(e) => setV({ ...v, name: e.target.value })} /></label>
      <label className="text-xs font-semibold text-slate-600">Category<select className={`${input} mt-1`} value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })}>{CATS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
      <label className="text-xs font-semibold text-slate-600">Price<input type="number" min={0} className={`${input} mt-1`} value={v.price ?? ''} onChange={(e) => setV({ ...v, price: e.target.value as unknown as number })} /></label>
      <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Allergens (comma separated: nuts, milk, egg, gluten, fish, soy…)<input className={`${input} mt-1`} value={v.allergens || ''} onChange={(e) => setV({ ...v, allergens: e.target.value })} /></label>
      <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Description<input className={`${input} mt-1`} value={v.description || ''} onChange={(e) => setV({ ...v, description: e.target.value })} /></label>
      <div className="sm:col-span-2 flex flex-wrap gap-4 text-xs font-semibold text-slate-600">
        {([['is_vegetarian', 'Vegetarian'], ['is_halal', 'Halal'], ['is_available', 'On sale']] as const).map(([k, l]) => (
          <label key={k} className="inline-flex items-center gap-1.5"><input type="checkbox" checked={!!v[k]} onChange={(e) => setV({ ...v, [k]: e.target.checked })} /> {l}</label>
        ))}
      </div>
      <div className="sm:col-span-2 flex justify-end"><button onClick={save} disabled={!v.name} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold disabled:opacity-50">Save</button></div>
    </div>
  );
}

/** Office: the food list (prices, allergens) and the weekly menu, meal by meal. */
export default function CafeteriaMenuPage() {
  const [food, setFood] = useState<Food[]>([]);
  const [week, setWeek] = useState(() => monday(new Date()));
  const [days, setDays] = useState<MenuMeal[]>([]);
  const [editing, setEditing] = useState<Food | 'new' | null>(null);
  const [cell, setCell] = useState<{ date: string; meal: MenuMeal['meal'] } | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const loadFood = () => cafeteria.items().then((f) => setFood([...f].sort(byCategory))).catch(() => undefined);
  const loadWeek = () => cafeteria.menu(iso(week)).then((r) => setDays(r.days)).catch(() => undefined);
  useEffect(() => { loadFood(); }, []);
  useEffect(() => { loadWeek(); }, [week]); // eslint-disable-line react-hooks/exhaustive-deps

  const dates = Array.from({ length: 5 }, (_, i) => { const d = new Date(week); d.setDate(d.getDate() + i); return d; });
  const at = (date: string, meal: string) => days.find((m) => m.date === date && m.meal === meal);
  const openCell = (date: string, meal: MenuMeal['meal']) => { setCell({ date, meal }); setChosen(at(date, meal)?.items.map((i) => i.id) || []); };
  const saveCell = async () => {
    if (!cell) return;
    try { await cafeteria.setMenu(cell.date, cell.meal, chosen); setCell(null); loadWeek(); } catch (e) { toast.error(errorText(e, 'Could not save the menu.')); }
  };
  const copyToNext = async () => {
    const next = new Date(week); next.setDate(next.getDate() + 7);
    try { const r = await cafeteria.copyWeek(iso(week), iso(next)); toast.success(`${r.copied} meal(s) copied to next week.`); } catch (e) { toast.error(errorText(e, 'Could not copy.')); }
  };
  const move = (n: number) => { const d = new Date(week); d.setDate(d.getDate() + n * 7); setWeek(d); };

  return (
    <div className="space-y-4">
      <section className={card}>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <h2 className="font-black text-slate-900 mr-auto">Weekly menu</h2>
          <button onClick={() => move(-1)} aria-label="Previous week" className="rounded-lg border border-slate-200 p-1.5"><ChevronLeft size={15} /></button>
          <span className="text-sm font-semibold">Week of {week.toLocaleDateString([], { day: 'numeric', month: 'short' })}</span>
          <button onClick={() => move(1)} aria-label="Next week" className="rounded-lg border border-slate-200 p-1.5"><ChevronRight size={15} /></button>
          <button onClick={copyToNext} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold inline-flex items-center gap-1"><Copy size={12} /> Copy to next week</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead><tr><th className="w-24" />{dates.map((d) => <th key={iso(d)} className="text-left text-xs font-black text-slate-500 pb-2">{d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}</th>)}</tr></thead>
            <tbody>
              {MEALS.map(([meal, label]) => (
                <tr key={meal} className="align-top">
                  <td className="text-xs font-black uppercase tracking-wider text-slate-400 pt-2">{label}</td>
                  {dates.map((d) => {
                    const m = at(iso(d), meal);
                    return (
                      <td key={iso(d)} className="p-1">
                        <button onClick={() => openCell(iso(d), meal)} className="w-full min-h-16 rounded-lg border border-dashed border-slate-200 hover:border-blue-300 p-2 text-left text-xs">
                          {m?.items.length ? [...m.items].sort(byCategory).map((i) => <span key={i.id} className="block">{i.name}</span>) : <span className="text-slate-300">+ add</span>}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className={card}>
        <div className="flex items-center mb-2"><h2 className="font-black text-slate-900 mr-auto">Food & drinks</h2><button onClick={() => setEditing('new')} className="text-xs font-bold text-blue-600 inline-flex items-center gap-1"><Plus size={12} /> Add</button></div>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-400"><th className="py-1">Name</th><th>Category</th><th>Price</th><th>Allergens</th><th /></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {food.map((f) => (
              <tr key={f.id} className={f.is_available ? '' : 'opacity-50'}>
                <td className="py-2 font-semibold">{f.name}{f.is_vegetarian && <span className="ml-1 text-[10px] font-black text-emerald-700">VEG</span>}{!f.is_halal && <span className="ml-1 text-[10px] font-black text-amber-700">NOT HALAL</span>}</td>
                <td>{f.category_label}</td><td>{formatMoney(f.price)}</td><td className="text-xs text-rose-700">{f.allergen_list.join(', ')}</td>
                <td className="text-right space-x-2">
                  <button onClick={() => setEditing(f)} className="text-xs font-bold text-blue-600">Edit</button>
                  <button onClick={async () => { if (window.confirm(`Delete ${f.name}?`)) { await cafeteria.removeItem(f.id); loadFood(); loadWeek(); } }} aria-label={`Delete ${f.name}`} className="text-rose-600"><Trash2 size={13} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {food.length === 0 && <p className="text-sm text-slate-500">Nothing yet.</p>}
      </section>
      {editing && <Modal open onClose={() => setEditing(null)} title={editing === 'new' ? 'Add food or a drink' : editing.name} size="lg"><FoodForm f={editing === 'new' ? undefined : editing} onSaved={() => { setEditing(null); loadFood(); }} /></Modal>}
      {cell && (
        <Modal open onClose={() => setCell(null)} title={`${MEALS.find((m) => m[0] === cell.meal)?.[1]} · ${new Date(`${cell.date}T00:00:00`).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' })}`} size="md">
          <div className="space-y-2">
            {food.filter((f) => f.is_available).map((f) => (
              <label key={f.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={chosen.includes(f.id)} onChange={(e) => setChosen(e.target.checked ? [...chosen, f.id] : chosen.filter((x) => x !== f.id))} />
                {f.name} <span className="text-xs text-slate-400">{formatMoney(f.price)}</span>
              </label>
            ))}
            <div className="flex justify-end"><button onClick={saveCell} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold">Save</button></div>
          </div>
        </Modal>
      )}
    </div>
  );
}
