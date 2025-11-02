import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { supabase } from '../lib/supabase';
import { Logo } from '../../../shared/assets';

const ClientLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const menuItems = [
    { path: '/dashboard', name: 'My Requests', icon: 'heroicons:document-text' },
    { path: '/profile', name: 'Settings', icon: 'heroicons:cog-6-tooth' }
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-80 bg-[#F3F4F6] border-r border-gray-200 fixed left-0 top-0 h-screen flex flex-col">
        <div className="flex-1 overflow-y-auto p-8 pb-0">
          {/* Logo */}
          <div className="mb-10 animate-fade-in flex flex-col items-center justify-center">
            <Logo width={150} height={150} />
          </div>

          {/* Menu Items */}
          <div className="space-y-1.5 pb-8">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center px-3 h-[50px] rounded-lg transition-all duration-300 ${
                    isActive
                      ? 'bg-black text-white shadow-lg'
                      : 'bg-white text-gray-700 hover:bg-gray-100 hover:shadow-md'
                  }`}
                >
                  <Icon icon={item.icon} className={`w-5 h-5 mr-2 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                  <span className="text-sm font-medium">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Logout Button - Fixed at bottom */}
        <div className="p-6 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <Icon icon="heroicons:arrow-right-on-rectangle" className="w-5 h-5 mr-2" />
            <span className="text-sm font-medium">Logout</span>
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
          <aside className="w-80 bg-[#F3F4F6] h-full flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex-1 overflow-y-auto p-8 pb-0">
              <div className="mb-10 flex flex-col items-center justify-center">
                <Logo width={150} height={150} />
              </div>

              <div className="space-y-1.5 pb-8">
                {menuItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsSidebarOpen(false)}
                      className={`flex items-center px-3 h-[50px] rounded-lg transition-all duration-300 ${
                        isActive
                          ? 'bg-black text-white shadow-lg'
                          : 'bg-white text-gray-700 hover:bg-gray-100 hover:shadow-md'
                      }`}
                    >
                      <Icon icon={item.icon} className={`w-5 h-5 mr-2 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                      <span className="text-sm font-medium">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Logout Button - Fixed at bottom */}
            <div className="p-6 border-t border-gray-200">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <Icon icon="heroicons:arrow-right-on-rectangle" className="w-5 h-5 mr-2" />
                <span className="text-sm font-medium">Logout</span>
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

export default ClientLayout;
