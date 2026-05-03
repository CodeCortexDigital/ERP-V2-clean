import { useState } from 'react'
import { Plus, Search, BookOpen, Users, Calendar, DollarSign, Eye, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'

interface Book {
  id: number
  isbn: string
  title: string
  author: string
  publisher: string
  year: number
  category: string
  total_copies: number
  available_copies: number
  location: string
  status: 'available' | 'borrowed' | 'damaged' | 'lost'
}

const SAMPLE_BOOKS: Book[] = [
  { id: 1, isbn: '978-0-13-235088-4', title: 'Clean Code', author: 'Robert C. Martin', publisher: 'Prentice Hall', year: 2008, category: 'Programming', total_copies: 5, available_copies: 3, location: 'A-101', status: 'available' },
  { id: 2, isbn: '978-0-201-63361-0', title: 'Design Patterns', author: 'Erich Gamma', publisher: 'Addison-Wesley', year: 1994, category: 'Programming', total_copies: 3, available_copies: 1, location: 'A-102', status: 'available' },
  { id: 3, isbn: '978-1-491-91205-8', title: 'Learning React', author: 'Alex Banks', publisher: 'O\'Reilly', year: 2017, category: 'Web Development', total_copies: 4, available_copies: 0, location: 'B-201', status: 'borrowed' },
]

export default function LibraryManagement() {
  const [books, setBooks] = useState(SAMPLE_BOOKS)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredBooks = books.filter(b => b.title.toLowerCase().includes(searchQuery.toLowerCase()) || b.author.toLowerCase().includes(searchQuery.toLowerCase()))

  const stats = { total: books.length, available: books.filter(b => b.available_copies > 0).length, borrowed: books.filter(b => b.status === 'borrowed').length, totalCopies: books.reduce((sum, b) => sum + b.total_copies, 0) }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center"><div><h1 className="text-2xl font-bold text-gray-900">Library Management</h1><p className="text-gray-500">Manage books, circulation, and library resources</p></div><Button><Plus className="h-4 w-4 mr-2" />Add Book</Button></div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4"><p className="text-sm text-gray-500">Total Books</p><p className="text-2xl font-bold">{stats.total}</p></div>
        <div className="bg-white rounded-lg border p-4"><p className="text-sm text-gray-500">Available</p><p className="text-2xl font-bold text-green-600">{stats.available}</p></div>
        <div className="bg-white rounded-lg border p-4"><p className="text-sm text-gray-500">Borrowed</p><p className="text-2xl font-bold text-yellow-600">{stats.borrowed}</p></div>
        <div className="bg-white rounded-lg border p-4"><p className="text-sm text-gray-500">Total Copies</p><p className="text-2xl font-bold text-blue-600">{stats.totalCopies}</p></div>
      </div>
      <div className="flex gap-4"><div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><Input placeholder="Search books..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" /></div></div>
      <div className="border rounded-lg overflow-hidden"><table className="w-full"><thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left">Title</th><th className="px-4 py-3 text-left">Author</th><th className="px-4 py-3 text-left">ISBN</th><th className="px-4 py-3 text-left">Category</th><th className="px-4 py-3 text-center">Copies</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-center">Actions</th></tr></thead>
        <tbody>{filteredBooks.map(b => (<tr key={b.id} className="border-t hover:bg-gray-50"><td className="px-4 py-3 font-medium">{b.title}</td><td className="px-4 py-3">{b.author}</td><td className="px-4 py-3 font-mono text-sm">{b.isbn}</td><td className="px-4 py-3">{b.category}</td><td className="px-4 py-3 text-center">{b.available_copies}/{b.total_copies}</td><td className="px-4 py-3"><Badge variant={b.status === 'available' ? 'success' : b.status === 'borrowed' ? 'warning' : 'destructive'}>{b.status}</Badge></td><td className="px-4 py-3 text-center"><div className="flex justify-center gap-2"><button className="text-blue-600"><Eye className="h-4 w-4" /></button><button className="text-green-600"><Edit className="h-4 w-4" /></button><button className="text-red-600"><Trash2 className="h-4 w-4" /></button></div></td></tr>))}</tbody>
        </table>
      </div>
    </div>
  )
}
