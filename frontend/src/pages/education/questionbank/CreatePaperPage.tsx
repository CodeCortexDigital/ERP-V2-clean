import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FilePlus, ArrowLeft } from 'lucide-react';

export default function CreatePaperPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/education/question-bank')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
          <ArrowLeft className="h-5 w-5 dark:text-white" />
        </button>
        <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-lg">
          <FilePlus className="h-6 w-6 text-amber-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Create Question Paper</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Design a new question paper</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          <FilePlus className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">Paper creation coming soon</p>
          <p className="text-sm mt-1">This feature is under development</p>
        </div>
      </div>
    </div>
  );
}
