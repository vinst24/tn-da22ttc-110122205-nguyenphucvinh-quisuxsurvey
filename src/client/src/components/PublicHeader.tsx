import { BarChart3, ClipboardList, LayoutDashboard, LogOut, Menu as MenuIcon, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PATHS } from '../constants/paths';
import { useAuth } from '../contexts/AuthContext';

export const PublicHeader = () => {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleLogout = async () => {
    setOpen(false);
    try {
      await logout();
    } finally {
      navigate(PATHS.HOME);
    }
  };

  const initial = (user?.fullName?.trim() || user?.email || '?').charAt(0).toUpperCase();

  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to={PATHS.HOME} className="flex items-center gap-2">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            <span className="font-semibold text-xl text-slate-900">QUIS Survey System</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link to={PATHS.SURVEY} className="text-slate-600 hover:text-blue-600 transition-colors">
              Khảo sát
            </Link>

            {loading ? (
              <div className="w-9 h-9 rounded-full bg-slate-100 animate-pulse" aria-hidden />
            ) : user ? (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-2 py-1 pr-3 shadow-sm hover:shadow-md transition-all"
                  aria-haspopup="menu"
                  aria-expanded={open}
                >
                  <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-semibold">
                    {initial}
                  </span>
                  <span className="hidden sm:block text-sm font-medium max-w-[10rem] truncate">
                    {user.fullName || user.email}
                  </span>
                </button>

                {open && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-64 rounded-xl bg-white shadow-lg border border-slate-200 py-2 z-50"
                  >
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {user.fullName || 'Người dùng'}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>

                    {user.role === 'ADMIN' && (
                      <MenuLink
                        to={PATHS.ADMIN_DASHBOARD}
                        icon={<LayoutDashboard className="w-4 h-4" />}
                        label="Trang quản trị"
                        onClick={() => setOpen(false)}
                      />
                    )}
                    <MenuLink
                      to={PATHS.MY_SURVEYS}
                      icon={<ClipboardList className="w-4 h-4" />}
                      label="Khảo sát của tôi"
                      onClick={() => setOpen(false)}
                    />
                    <MenuLink
                      to={PATHS.PROFILE}
                      icon={<User className="w-4 h-4" />}
                      label="Thông tin cá nhân"
                      onClick={() => setOpen(false)}
                    />

                    <div className="border-t border-slate-100 my-1" />
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to={PATHS.LOGIN} className="text-slate-600 hover:text-blue-600 transition-colors">
                  Đăng nhập
                </Link>
                <Link
                  to={PATHS.REGISTER}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-sm"
                >
                  Đăng ký
                </Link>
              </>
            )}
          </nav>

          {/* Mobile fallback: only an icon that links to profile/login */}
          <div className="md:hidden">
            {user ? (
              <Link
                to={PATHS.PROFILE}
                className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white flex items-center justify-center font-semibold"
                aria-label="Tài khoản"
              >
                {initial}
              </Link>
            ) : (
              <Link
                to={PATHS.LOGIN}
                className="p-2 text-slate-600"
                aria-label="Đăng nhập"
              >
                <MenuIcon className="w-6 h-6" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

function MenuLink({
  to,
  icon,
  label,
  onClick,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
      role="menuitem"
    >
      {icon}
      {label}
    </Link>
  );
}
