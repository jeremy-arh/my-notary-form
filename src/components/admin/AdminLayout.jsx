import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { supabase } from '../../lib/supabase';

const AdminLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const menuItems = [
    { path: '/admin/dashboard', name: 'Dashboard', icon: 'heroicons:chart-bar' },
    { path: '/admin/submissions', name: 'Submissions', icon: 'heroicons:document-text' },
    { path: '/admin/profile', name: 'Profile', icon: 'heroicons:user' }
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Sidebar */}
      <aside className="hidden lg:block w-80 bg-[#F3F4F6] border-r border-gray-200 fixed left-0 top-0 h-screen overflow-y-auto">
        <div className="p-8">
          {/* Logo */}
          <div className="mb-10 animate-fade-in flex items-center justify-center">
            <div className="relative">
              <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="60" cy="60" r="58" stroke="url(#gradient)" strokeWidth="3"/>
                <path d="M60 25 L60 95 M40 45 L60 25 L80 45" stroke="url(#gradient)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="60" cy="85" r="8" fill="url(#gradient)"/>
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#000000" />
                    <stop offset="100%" stopColor="#4B5563" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">Admin Panel</h2>

          {/* Menu Items */}
          <div className="space-y-2">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center p-4 rounded-xl transition-all duration-300 ${
                    isActive
                      ? 'bg-black text-white shadow-lg'
                      : 'bg-white text-gray-700 hover:bg-gray-50 hover:shadow-md'
                  }`}
                >
                  <Icon icon={item.icon} className={`w-6 h-6 mr-3 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="mt-8 w-full flex items-center justify-center p-4 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all"
          >
            <Icon icon="heroicons:arrow-right-on-rectangle" className="w-6 h-6 mr-2" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Toggle */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-3 bg-black text-white rounded-xl shadow-lg"
      >
        <Icon icon={isSidebarOpen ? 'heroicons:x-mark' : 'heroicons:bars-3'} className="w-6 h-6" />
      </button>

      {/* Mobile Sidebar */}
      {isSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50" onClick={() => setIsSidebarOpen(false)}>
          <aside className="w-80 bg-[#F3F4F6] h-full overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-8">
              <div className="mb-10 flex items-center justify-center">
                <div className="relative">
                  <svg width="80" height="80" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="60" cy="60" r="58" stroke="url(#gradient-mobile)" strokeWidth="3"/>
                    <path d="M60 25 L60 95 M40 45 L60 25 L80 45" stroke="url(#gradient-mobile)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="60" cy="85" r="8" fill="url(#gradient-mobile)"/>
                    <defs>
                      <linearGradient id="gradient-mobile" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#000000" />
                        <stop offset="100%" stopColor="#4B5563" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>

              <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">Admin Panel</h2>

              <div className="space-y-2">
                {menuItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsSidebarOpen(false)}
                      className={`flex items-center p-4 rounded-xl transition-all duration-300 ${
                        isActive
                          ? 'bg-black text-white shadow-lg'
                          : 'bg-white text-gray-700 hover:bg-gray-50 hover:shadow-md'
                      }`}
                    >
                      <Icon icon={item.icon} className={`w-6 h-6 mr-3 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  );
                })}
              </div>

              <button
                onClick={handleLogout}
                className="mt-8 w-full flex items-center justify-center p-4 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all"
              >
                <Icon icon="heroicons:arrow-right-on-rectangle" className="w-6 h-6 mr-2" />
                Logout
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:ml-80 min-h-screen bg-white">
        <div className="p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
