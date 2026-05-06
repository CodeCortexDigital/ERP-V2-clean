import { useState, useEffect } from 'react';
import { Bell, User, LogOut, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Header() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button className="lg:hidden text-gray-600">
            <Menu className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold text-gray-800">Dashboard</h2>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-gray-600 hover:text-gray-800">
            <Bell className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-medium text-gray-700">{user?.email || 'Admin'}</p>
              <p className="text-xs text-gray-500">Administrator</p>
            </div>
          </div>
          <button onClick={handleLogout} className="text-gray-600 hover:text-red-600">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
