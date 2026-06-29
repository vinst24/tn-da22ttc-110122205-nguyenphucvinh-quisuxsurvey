import {
  BarChart3,
  Bell,
  FileText,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Ticket,
  Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { PATHS } from '../constants/paths';
import { useAuth } from '../contexts/AuthContext';

const navigation = [
  { name: 'Tổng quan', href: PATHS.ADMIN_DASHBOARD, icon: LayoutDashboard },
  { name: 'Quản lý khảo sát', href: PATHS.ADMIN_SURVEYS, icon: FileText },
  { name: 'Quản lý câu hỏi', href: PATHS.ADMIN_QUESTIONS, icon: HelpCircle },
  { name: 'Người tham gia', href: PATHS.ADMIN_PARTICIPANTS, icon: Users },
  { name: 'Phân tích', href: PATHS.ADMIN_ANALYTICS, icon: BarChart3 },
  { name: 'Mã khảo sát', href: PATHS.ADMIN_TOKENS, icon: Ticket },
] as const;

export const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const sidebarWidthClass = sidebarOpen ? 'w-64' : 'w-20';
  const mainMarginClass = sidebarOpen ? 'ml-64' : 'ml-20';

  const userLabel = useMemo(() => {
    const name = user?.fullName ?? user?.email ?? 'Admin';
    const email = user?.email ?? 'admin@quis.com';
    return {
      name,
      email,
      avatarLetter: (name?.charAt(0) || email.charAt(0) || 'A').toUpperCase(),
    };
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate(PATHS.LOGIN);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <aside
        className={`fixed top-0 left-0 h-full bg-white border-r border-slate-200 transition-all duration-300 z-40 ${sidebarWidthClass}`}
      >
        <div className="flex flex-col h-full">
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 px-6 py-5 border-b border-slate-200">
              <BarChart3 className="w-8 h-8 text-blue-600 flex-shrink-0" />
              {sidebarOpen && <span className="font-semibold text-lg text-slate-900">QUIS Admin</span>}
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    title={!sidebarOpen ? item.name : undefined}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                      isActive
                        ? 'bg-blue-100 text-blue-700 font-semibold border-l-4 border-blue-600'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && <span className="font-medium">{item.name}</span>}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-slate-200 p-4">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
                    {userLabel.avatarLetter}
                  </div>
                  {sidebarOpen && (
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium text-slate-900">{userLabel.name}</div>
                      <div className="text-xs text-slate-500">{userLabel.email}</div>
                    </div>
                  )}
                </button>

                {userMenuOpen && (
                  <div
                    className="absolute bottom-12 left-0 w-full rounded-lg border border-slate-200 bg-white shadow-lg overflow-hidden"
                    role="menu"
                  >
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-slate-700 hover:bg-slate-50"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className={`transition-all duration-300 ${mainMarginClass}`}>
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
          <div className="flex items-center justify-between px-6 py-4">
            <button
              type="button"
              onClick={() => setSidebarOpen((v) => !v)}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Toggle sidebar"
            >
              <Menu className="w-5 h-5 text-slate-600" />
            </button>

            <div className="flex items-center gap-4">
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm trong admin..."
                  className="pl-10 pr-4 py-2 w-64 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                />
              </div>

              <button
                type="button"
                className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5 text-slate-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-red-600 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden sm:inline">Đăng xuất</span>
              </button>
            </div>
          </div>
        </header>

        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
