import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { supabase } from '../lib/supabase';
import Logo from '../assets/Logo';
import Notifications from './Notifications';

const ClientLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [clientId, setClientId] = useState(null);

  const fetchUnreadCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: client } = await supabase
        .from('client')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!client) return;

      // Count unread messages in submissions for this client
      const { data: messages } = await supabase
        .from('message')
        .select('message_id, submission_id')
        .eq('read', false)
        .neq('sender_type', 'client');

      if (!messages) return;

      // Filter messages for submissions belonging to this client
      const { data: submissions } = await supabase
        .from('submission')
        .select('id')
        .eq('client_id', client.id);

      const submissionIds = submissions?.map(s => s.id) || [];
      const unread = messages.filter(m => submissionIds.includes(m.submission_id));

      setUnreadCount(unread.length);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const menuItems = [
    { path: '/dashboard', name: 'My Requests', icon: 'heroicons:document-text' },
    { path: '/messages', name: 'Messages', icon: 'heroicons:chat-bubble-left-right', badge: unreadCount },
    { path: '/profile', name: 'Settings', icon: 'heroicons:cog-6-tooth' }
  ];

  useEffect(() => {
    fetchClientId();
    fetchUnreadCount();

    // Subscribe to message changes
    const channel = supabase
      .channel('message-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'message'
      }, () => {
        fetchUnreadCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchClientId = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: client } = await supabase
        .from('client')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (client) {
        setClientId(client.id);
      }
    } catch (error) {
      console.error('Error fetching client ID:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-white overflow-x-hidden w-full max-w-full">
      {/* Mobile Header - Fixed at top */}
      <header className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50 h-16">
        <div className="flex items-center justify-between h-full px-4">
          <Logo width={80} height={80} />
          <div className="flex items-center gap-2">
            {clientId && (
              <Notifications clientId={clientId} />
            )}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Icon icon={isSidebarOpen ? 'heroicons:x-mark' : 'heroicons:bars-3'} className="w-6 h-6 text-gray-900" />
            </button>
          </div>
        </div>
      </header>

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
                  className={`flex items-center justify-between px-3 h-[50px] rounded-lg transition-all duration-300 ${
                    isActive
                      ? 'bg-black text-white shadow-lg'
                      : 'bg-white text-gray-700 hover:bg-gray-100 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center">
                    <Icon icon={item.icon} className={`w-5 h-5 mr-2 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  {item.badge > 0 && (
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      isActive ? 'bg-white text-black' : 'bg-black text-white'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Logout Button - Fixed at bottom */}
        <div className="mt-auto p-6 border-t border-gray-200 bg-[#F3F4F6]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <Icon icon="heroicons:arrow-right-on-rectangle" className="w-5 h-5 mr-2" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {isSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50 top-16" onClick={() => setIsSidebarOpen(false)}>
          <aside className="w-full max-w-sm bg-[#F3F4F6] h-full flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex-1 overflow-y-auto p-8 pb-0">
              <div className="space-y-1.5 pb-8">
                {menuItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsSidebarOpen(false)}
                      className={`flex items-center justify-between px-3 h-[50px] rounded-lg transition-all duration-300 ${
                        isActive
                          ? 'bg-black text-white shadow-lg'
                          : 'bg-white text-gray-700 hover:bg-gray-100 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center">
                        <Icon icon={item.icon} className={`w-5 h-5 mr-2 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                        <span className="text-sm font-medium">{item.name}</span>
                      </div>
                      {item.badge > 0 && (
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          isActive ? 'bg-white text-black' : 'bg-black text-white'
                        }`}>
                          {item.badge}
                        </span>
                      )}
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
      <main className="flex-1 lg:ml-80 min-h-screen bg-white pt-16 lg:pt-0 overflow-x-hidden">
        {/* Top Navigation Bar - Desktop only */}
        <div className="hidden lg:flex sticky top-0 z-30 bg-white border-b border-gray-200 px-6 py-4 items-center justify-end">
          {clientId && (
            <Notifications clientId={clientId} />
          )}
        </div>
        
        <div className="w-full overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  );
};

export default ClientLayout;
