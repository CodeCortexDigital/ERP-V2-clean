import { useState } from 'react';
import { BookOpen, Search } from 'lucide-react';

export default function QuestionChaptersPage() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg">
          <BookOpen className="h-6 w-6 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Question Chapters</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Organize questions by chapter and subject</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search chapters..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">No chapters yet</p>
          <p className="text-sm mt-1">Add chapters to organize your questions</p>
        </div>
      </div>
    </div>
  );
}
