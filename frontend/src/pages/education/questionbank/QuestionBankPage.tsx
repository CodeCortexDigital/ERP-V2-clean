import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Library, Search, Plus, Trash2, Edit } from 'lucide-react';

export default function QuestionBankPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
            <Library className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold dark:text-white">Question Bank</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Manage question papers and question sets</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/education/question-bank/create')}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> New Paper
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search question papers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          <Library className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">No question papers yet</p>
          <p className="text-sm mt-1">Create your first question paper to get started</p>
        </div>
      </div>
    </div>
  );
}
