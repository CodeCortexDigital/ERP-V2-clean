import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, ShoppingBag, BookOpen, User, CreditCard, CheckCircle, ArrowLeft, Trash2, Plus, Minus, Clipboard, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { cur } from '@/utils/currency';

interface StoreItem {
  id: string;
  name: string;
  category: 'uniform' | 'book' | 'stationery' | 'sports';
  price: number;
  image: string;
  description: string;
  stock: number;
}

interface CartItem {
  item: StoreItem;
  quantity: number;
}

interface PurchaseRecord {
  id: string;
  date: string;
  items: { name: string; qty: number; price: number }[];
  total: number;
  status: 'Added to Fee Challan' | 'Paid';
}

export default function OnlineStorePage() {
  const navigate = useNavigate();
  const { role, user } = useAuth();
  const isStudent = role === 'student';

  const [activeCategory, setActiveCategory] = useState<'all' | 'uniform' | 'book' | 'stationery' | 'sports'>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);

  // Pre-seeded products
  const storeItems: StoreItem[] = [
    {
      id: 'prod-1',
      name: 'Official School Blazer',
      category: 'uniform',
      price: 2500,
      image: '👔',
      description: 'Navy blue premium wool-blend blazer with embroidered school crest.',
      stock: 15
    },
    {
      id: 'prod-2',
      name: 'Oxford English Dictionary',
      category: 'book',
      price: 850,
      image: '📖',
      description: 'Latest edition OXFORD English dictionary for high school students.',
      stock: 20
    },
    {
      id: 'prod-3',
      name: 'Geometry & Math Kit',
      category: 'stationery',
      price: 450,
      image: '📐',
      description: 'Complete mathematical drawing instruments set including compass & divider.',
      stock: 35
    },
    {
      id: 'prod-4',
      name: 'School Backpack (Waterproof)',
      category: 'sports',
      price: 1800,
      image: '🎒',
      description: 'Ergonomic, multi-pocket, heavy-duty waterproof school backpack.',
      stock: 8
    },
    {
      id: 'prod-5',
      name: 'Sports T-Shirt (House Red)',
      category: 'uniform',
      price: 650,
      image: '👕',
      description: 'Breathable sports jersey for physical training activities.',
      stock: 22
    },
    {
      id: 'prod-6',
      name: 'Chemistry Lab Coat',
      category: 'uniform',
      price: 750,
      image: '🥼',
      description: 'White cotton protective lab coat for chemistry & physics practicals.',
      stock: 12
    }
  ];

  useEffect(() => {
    // Load purchase history
    const savedPurchases = localStorage.getItem('store_purchases_v1');
    if (savedPurchases) {
      setPurchases(JSON.parse(savedPurchases));
    } else {
      const defaultPurchases: PurchaseRecord[] = [
        {
          id: 'pur-101',
          date: '2026-06-15',
          items: [{ name: 'Official School Blazer', qty: 1, price: 2500 }],
          total: 2500,
          status: 'Paid'
        }
      ];
      localStorage.setItem('store_purchases_v1', JSON.stringify(defaultPurchases));
      setPurchases(defaultPurchases);
    }
  }, []);

  const handleAddToCart = (item: StoreItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.item.id === item.id);
      if (existing) {
        return prev.map(i => i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { item, quantity: 1 }];
    });
    toast.success(`${item.name} added to cart`);
  };

  const handleUpdateQty = (itemId: string, delta: number) => {
    setCart(prev => {
      return prev.map(i => {
        if (i.item.id === itemId) {
          const newQty = i.quantity + delta;
          return newQty > 0 ? { ...i, quantity: newQty } : null;
        }
        return i;
      }).filter(Boolean) as CartItem[];
    });
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;

    const total = cart.reduce((sum, i) => sum + i.item.price * i.quantity, 0);
    const newPurchase: PurchaseRecord = {
      id: `pur-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      items: cart.map(i => ({ name: i.item.name, qty: i.quantity, price: i.item.price })),
      total,
      status: 'Added to Fee Challan'
    };

    const updated = [newPurchase, ...purchases];
    setPurchases(updated);
    localStorage.setItem('store_purchases_v1', JSON.stringify(updated));

    // Append to student's pending invoices in LocalStorage so it appears on their fee page!
    const savedInvoices = localStorage.getItem('local_invoices') || '[]';
    try {
      const invoices = JSON.parse(savedInvoices);
      const customStudents = JSON.parse(localStorage.getItem('custom_students') || '[]');
      const matched = customStudents.find((s: any) => 
        String(s.id) === String(user?.id) || 
        String(s.student_id) === String(user?.id) ||
        s.full_name?.toLowerCase() === user?.full_name?.toLowerCase()
      );
      const stdId = matched?.id || 'st-1';
      
      invoices.push({
        id: `inv-${Date.now()}`,
        student: stdId,
        invoice_number: `INV-STORE-${Date.now().toString().slice(-4)}`,
        title: `Store Purchase: ${cart.map(c => c.item.name).join(', ')}`,
        total_amount: total,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'unpaid'
      });
      localStorage.setItem('local_invoices', JSON.stringify(invoices));
    } catch (e) {}

    setCart([]);
    setShowCart(false);
    toast.success('Purchase successful! The total amount has been added to your next fee challan.');
  };

  const filteredItems = storeItems.filter(item => activeCategory === 'all' || item.category === activeCategory);
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);
  const cartTotal = cart.reduce((sum, i) => sum + i.item.price * i.quantity, 0);

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-4 text-slate-800 pb-12">
      {/* Breadcrumbs Top Bar */}
      <div className="flex items-center justify-between text-xs font-bold text-slate-400 bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-850 font-extrabold text-sm border-r border-slate-200 pr-3.5 mr-1 hover:underline cursor-pointer" onClick={() => navigate(isStudent ? '/student' : '/dashboard')}>Store</span>
          <ShoppingBag className="w-4 h-4 text-slate-450" />
          <span>Home - Student Online Store</span>
        </div>

        <button
          onClick={() => setShowCart(!showCart)}
          className="relative px-4 h-9.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-black flex items-center gap-2 shadow-sm transition-colors text-xs"
        >
          <ShoppingCart className="w-4 h-4" />
          Cart ({cartCount})
          {cartCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center animate-bounce">
              {cartCount}
            </span>
          )}
        </button>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Categories Sidebar */}
        <div className="lg:col-span-3 space-y-4">
          <Card className="border border-slate-200 shadow-3xs bg-white rounded-2xl p-4">
            <CardHeader className="p-0 pb-3 border-b border-slate-100 mb-3">
              <CardTitle className="text-xs font-black uppercase text-slate-400 tracking-wider">Categories</CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-1">
              {[
                { id: 'all', label: 'All Items', emoji: '🛍️' },
                { id: 'uniform', label: 'Uniforms', emoji: '👔' },
                { id: 'book', label: 'Books', emoji: '📚' },
                { id: 'stationery', label: 'Stationery', emoji: '📐' },
                { id: 'sports', label: 'Accessories', emoji: '🎒' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id as any)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2.5 ${
                    activeCategory === cat.id
                      ? 'bg-blue-50 text-blue-600 shadow-3xs border border-blue-100/50'
                      : 'hover:bg-slate-50 text-slate-655 border border-transparent'
                  }`}
                >
                  <span className="text-sm">{cat.emoji}</span>
                  {cat.label}
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Products Grid & Checkout Panel */}
        <div className="lg:col-span-9 space-y-6">
          {showCart && (
            <Card className="border-blue-200 bg-blue-50/20 rounded-2xl shadow-sm border p-6 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-blue-100">
                <h3 className="text-xs font-black text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
                  <ShoppingCart className="w-4 h-4" /> Shopping Cart
                </h3>
                <button onClick={() => setShowCart(false)} className="text-xs font-bold text-slate-400 hover:text-slate-600">Close</button>
              </div>

              {cart.length === 0 ? (
                <p className="text-xs text-slate-455 font-bold text-center py-6">Your shopping cart is empty.</p>
              ) : (
                <div className="space-y-4">
                  <div className="divide-y divide-blue-100">
                    {cart.map(c => (
                      <div key={c.item.id} className="py-3 flex items-center justify-between text-xs font-semibold text-slate-750">
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg">{c.item.image}</span>
                          <div>
                            <p className="font-bold text-slate-800">{c.item.name}</p>
                            <p className="text-[10px] text-slate-400 font-bold">{cur()} {c.item.price} each</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 bg-white rounded-lg border border-slate-200 p-1">
                            <button onClick={() => handleUpdateQty(c.item.id, -1)} className="p-1 hover:bg-slate-100 rounded text-slate-500"><Minus className="w-3 h-3" /></button>
                            <span className="font-bold px-1">{c.quantity}</span>
                            <button onClick={() => handleUpdateQty(c.item.id, 1)} className="p-1 hover:bg-slate-100 rounded text-slate-500"><Plus className="w-3 h-3" /></button>
                          </div>
                          <span className="font-bold text-slate-800 w-16 text-right">{cur()} {c.item.price * c.quantity}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-blue-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold text-slate-500">Total Bill Amount:</p>
                      <p className="text-lg font-black text-blue-700">{cur()} {cartTotal}</p>
                    </div>

                    <button
                      onClick={handleCheckout}
                      className="px-6 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-sm flex items-center justify-center gap-2"
                    >
                      <CreditCard className="w-4 h-4" /> Add to Student Challan
                    </button>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Products List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {filteredItems.map(item => (
              <Card key={item.id} className="border border-slate-200 hover:border-blue-200 rounded-2xl shadow-3xs hover:shadow-md transition-all overflow-hidden flex flex-col bg-white">
                <div className="h-40 bg-slate-50/50 flex items-center justify-center text-5xl border-b border-slate-100 select-none">
                  {item.image}
                </div>
                <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-655 text-[8px] font-black uppercase tracking-wider">
                      {item.category}
                    </span>
                    <h4 className="text-xs font-black text-slate-850 leading-tight">{item.name}</h4>
                    <p className="text-[10px] text-slate-450 leading-relaxed font-bold">{item.description}</p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold block uppercase leading-none">Price</span>
                      <span className="text-sm font-black text-blue-600">{cur()} {item.price}</span>
                    </div>

                    <button
                      onClick={() => handleAddToCart(item)}
                      className="h-8 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 font-black text-[10px] uppercase shadow-3xs flex items-center gap-1 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Purchase History Ledger */}
          {purchases.length > 0 && (
            <Card className="border border-slate-200 shadow-3xs bg-white rounded-2xl overflow-hidden mt-8">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-4">
                <CardTitle className="text-xs font-black uppercase text-slate-455 tracking-wider">Purchase History Ledger</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-455 font-bold">
                      <tr>
                        <th className="px-4 py-2.5">Date</th>
                        <th className="px-4 py-2.5">Item Description</th>
                        <th className="px-4 py-2.5 text-center">Total Price</th>
                        <th className="px-4 py-2.5 text-center">Fee Ledger Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {purchases.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 text-slate-500 font-mono">{p.date}</td>
                          <td className="px-4 py-3 font-bold text-slate-800">
                            {p.items.map(i => `${i.name} (x${i.qty})`).join(', ')}
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-blue-650">{cur()} {p.total}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                              p.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
