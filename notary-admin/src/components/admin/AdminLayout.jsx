import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { supabase } from '../../lib/supabase';
import Logo from '../../assets/Logo';
import Notifications from './Notifications';

const AdminLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [adminInfo, setAdminInfo] = useState(null);

  const menuItems = [
    { path: '/dashboard', name: 'Dashboard', icon: 'heroicons:chart-bar' },
    { path: '/users', name: 'Users', icon: 'heroicons:users' },
    { path: '/crm', name: 'CRM', icon: 'heroicons:user-circle' },
    { path: '/notary', name: 'Notaries', icon: 'heroicons:user-group' },
    { path: '/stripe', name: 'Stripe Payments', icon: 'heroicons:credit-card' },
    { path: '/cashflow', name: 'Trésorerie', icon: 'heroicons:banknotes' },
    { path: '/analytics', name: 'Analytics', icon: 'heroicons:chart-pie' },
    { path: '/cms', name: 'CMS', icon: 'heroicons:document-duplicate' },
    { path: '/messages', name: 'Messages', icon: 'heroicons:chat-bubble-left-right', badge: unreadCount },
    { path: '/profile', name: 'Profile', icon: 'heroicons:user' }
  ];

  useEffect(() => {
    fetchAdminInfo();
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

  const fetchAdminInfo = async () => {
    try {
      let userId = null;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id;
      } catch (error) {
        // Silently handle
      }

      if (userId) {
        const { data: admin } = await supabase
          .from('admin_user')
          .select('id, user_id')
          .eq('user_id', userId)
          .single();

        if (admin) {
          setAdminInfo(admin);
        }
      } else {
        // Get first admin as fallback
        const { data: admin } = await supabase
          .from('admin_user')
          .select('id')
          .limit(1)
          .single();

        if (admin) {
          setAdminInfo(admin);
        }
      }
    } catch (error) {
      console.error('Error fetching admin info:', error);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      // Try to get user (may fail with service role key)
      let userId = null;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id;
      } catch (error) {
        // Silently handle - service role key doesn't have user session
      }

      // Check if user is admin
      let isAdmin = false;
      if (userId) {
        const { data: admin } = await supabase
          .from('admin_user')
          .select('id')
          .eq('user_id', userId)
          .single();
        isAdmin = !!admin;
      } else {
        // If no user, assume admin (service role key)
        isAdmin = true;
      }

      if (isAdmin) {
        // Count all unread messages (not from admin)
        const { data: messages } = await supabase
          .from('message')
          .select('message_id')
          .eq('read', false)
          .neq('sender_type', 'admin');

        setUnreadCount(messages?.length || 0);
      } else {
        // Check if notary
        if (!userId) return;

        const { data: notary } = await supabase
          .from('notary')
          .select('id')
          .eq('user_id', userId)
          .single();

        if (!notary) return;

        // Count unread messages in submissions assigned to this notary
        const { data: messages } = await supabase
          .from('message')
          .select('message_id, submission_id')
          .eq('read', false)
          .neq('sender_type', 'notary');

        if (!messages) return;

        // Filter messages for submissions assigned to this notary
        const { data: submissions } = await supabase
          .from('submission')
          .select('id')
          .eq('assigned_notary_id', notary.id);

        const submissionIds = submissions?.map(s => s.id) || [];
        const unread = messages.filter(m => submissionIds.includes(m.submission_id));

        setUnreadCount(unread.length);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Sidebar */}
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
        className="lg:hidden fixed top-4 left-4 z-50 p-3 bg-black text-white rounded-xl shadow-lg hover:bg-gray-800 transition-colors"
        aria-label="Toggle sidebar"
      >
        <Icon icon={isSidebarOpen ? 'heroicons:x-mark' : 'heroicons:bars-3'} className="w-6 h-6" />
      </button>

      {/* Mobile Sidebar */}
      {isSidebarOpen && (
        <>
          <div className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50" onClick={() => setIsSidebarOpen(false)} />
          <aside className="lg:hidden fixed left-0 top-0 h-full w-[85vw] max-w-sm bg-[#F3F4F6] z-50 overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 sm:p-8">
              <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center justify-center flex-1">
                  <Logo width={120} height={120} className="sm:w-[150px] sm:h-[150px]" />
                </div>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition-colors"
                  aria-label="Close sidebar"
                >
                  <Icon icon="heroicons:x-mark" className="w-6 h-6" />
                </button>
              </div>

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
                        <Icon icon={item.icon} className={`w-5 h-5 mr-2 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                        <span className="text-sm font-medium truncate">{item.name}</span>
                      </div>
                      {item.badge > 0 && (
                        <span className={`px-2 py-1 rounded-full text-xs font-bold flex-shrink-0 ml-2 ${
                          isActive ? 'bg-white text-black' : 'bg-black text-white'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>

              <div className="pt-6 border-t border-gray-200">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors py-2"
                >
                  <Icon icon="heroicons:arrow-right-on-rectangle" className="w-5 h-5 mr-2" />
                  <span className="text-sm font-medium">Logout</span>
                </button>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:ml-80 min-h-screen bg-white overflow-x-hidden">
        {/* Top Navigation Bar */}
        <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between lg:justify-end">
          <div className="lg:hidden flex items-center">
            <h1 className="text-lg font-semibold text-gray-900 truncate">Admin</h1>
          </div>
          {adminInfo && (
            <Notifications userId={adminInfo.id} userType="admin" />
          )}
        </div>
        
        <div className="p-4 sm:p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
