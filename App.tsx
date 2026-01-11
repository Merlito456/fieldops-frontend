import React, { useState, createContext, useContext, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Menu, 
  X, 
  Bell, 
  Search,
  LogOut,
  Info,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  ChevronRight,
  MapPin,
  FileText,
  Settings as SettingsIcon,
  Home,
  Shield,
  Key,
  Lock,
  Loader2,
  Database,
  Wifi,
  WifiOff
} from 'lucide-react';
import { NAV_ITEMS } from './constants';
import Dashboard from './pages/Dashboard';
import TaskManager from './pages/TaskManager';
import Inventory from './pages/Inventory';
import SiteManager from './pages/SiteManager';
import VendorAccess from './pages/VendorAccess';
import LandingPage from './pages/LandingPage';
import HistoryLedger from './pages/HistoryLedger';
import Settings from './pages/Settings';
import { storageService } from './services/storageService';
import { apiService } from './services/apiService';

// Simple Notification System
type NotificationType = 'success' | 'info' | 'error';
interface Notification {
  id: number;
  message: string;
  type: NotificationType;
}

const NotificationContext = createContext({
  notify: (message: string, type: NotificationType = 'info') => {},
});

export const useNotify = () => useContext(NotificationContext);

// FO Auth Guard
const FOAuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(sessionStorage.getItem('fo_session_active') === 'true');
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPassword = storageService.getFOPassword();
    if (passwordInput === correctPassword) {
      sessionStorage.setItem('fo_session_active', 'true');
      setIsAuthenticated(true);
    } else {
      setError(true);
      setTimeout(() => setError(false), 1000);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-[1000] bg-slate-900 flex items-center justify-center p-6 overflow-hidden">
        {/* Decorative background for FO Login */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden opacity-10">
           <Shield size={600} className="absolute -top-40 -left-40 text-blue-500" />
           <Lock size={400} className="absolute -bottom-20 -right-20 text-slate-500" />
        </div>

        <div className="relative w-full max-w-md space-y-8 animate-in zoom-in duration-300">
           <div className="text-center space-y-4">
              <div className="h-20 w-20 bg-blue-600 rounded-[28px] mx-auto flex items-center justify-center shadow-2xl shadow-blue-500/20">
                 <Key size={36} className="text-white" />
              </div>
              <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Workspace Lock</h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Authorized Personnel Only</p>
           </div>

           <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative group">
                 <input 
                    type="password" 
                    placeholder="ENTER ACCESS KEY" 
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    autoFocus
                    className={`w-full p-6 bg-slate-800/50 border-2 rounded-3xl font-black text-center text-white text-lg tracking-[0.5em] outline-none transition-all placeholder:tracking-widest placeholder:text-slate-600 ${error ? 'border-rose-500 animate-shake' : 'border-slate-700 focus:border-blue-500'}`}
                 />
                 {error && <p className="absolute -bottom-6 left-0 w-full text-center text-[9px] font-black text-rose-500 uppercase tracking-widest">Authentication Failed</p>}
              </div>
              <button type="submit" className="w-full py-5 bg-blue-600 text-white font-black rounded-3xl uppercase text-xs tracking-widest shadow-xl hover:bg-blue-700 transition-all">Unlock Console</button>
              <button type="button" onClick={() => navigate('/')} className="w-full py-3 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:text-white transition-colors">Abort Access</button>
           </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

const FOLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState<'LIVE' | 'LOCAL'>('LIVE');
  const location = useLocation();
  const foName = storageService.getFOName();

  useEffect(() => {
    storageService.init();
    const checkStatus = () => {
      setDbStatus(apiService.isOffline ? 'LOCAL' : 'LIVE');
    };
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <FOAuthGuard>
      <div className="flex h-screen bg-gray-50 overflow-hidden text-slate-900">
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`
          fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="flex flex-col h-full">
            <div className="p-6 flex items-center space-x-3 border-b border-gray-50">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Briefcase className="text-white" size={24} />
              </div>
              <div className="flex flex-col">
                <h1 className="text-lg font-black tracking-tight leading-none text-slate-900 uppercase">FO Workspace</h1>
                <span className="text-[9px] text-blue-600 font-black uppercase mt-1 tracking-widest">Operations Portal</span>
              </div>
            </div>

            <nav className="flex-1 px-4 space-y-1 mt-6">
              <Link
                to="/"
                className="flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all duration-200"
              >
                <Home size={20} className="text-slate-400" />
                <span className="font-black text-xs uppercase tracking-tight">Return Home</span>
              </Link>

              <div className="h-px bg-gray-100 my-4 mx-4"></div>

              {NAV_ITEMS.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                      isActive 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 translate-x-1' 
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span className={isActive ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
                    <span className="font-black text-xs uppercase tracking-tight">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-gray-100">
              <button 
                onClick={() => {
                  sessionStorage.removeItem('fo_session_active');
                  window.location.reload();
                }}
                className="flex items-center space-x-3 w-full px-4 py-3 text-slate-400 hover:text-rose-600 transition-colors"
              >
                <LogOut size={20} />
                <span className="font-black text-xs uppercase tracking-tight">Lock Console</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-10">
            <div className="flex items-center space-x-4">
              <button 
                className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu size={24} />
              </button>

              <div className="hidden md:flex items-center space-x-2">
                <span className="text-slate-900 font-black uppercase tracking-widest text-[10px] bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">ALPHA SECTOR</span>
                <ChevronRight size={14} className="text-slate-300" />
                
                {/* Connection Status Badge */}
                <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border transition-all ${
                  dbStatus === 'LIVE' 
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                    : 'bg-amber-50 text-amber-600 border-amber-100 animate-pulse'
                }`}>
                  {dbStatus === 'LIVE' ? <Wifi size={12} /> : <WifiOff size={12} />}
                  <span className="text-[9px] font-black uppercase tracking-widest">
                    {dbStatus === 'LIVE' ? 'Live MySQL Sync' : 'Local Ledger Mode'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3 pl-2">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-black text-gray-900 uppercase leading-tight">{foName}</p>
                  <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">ECE • Field Engineer</p>
                </div>
                <div className="h-10 w-10 bg-slate-900 rounded-xl flex items-center justify-center overflow-hidden border-2 border-white shadow-lg">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${foName}&backgroundColor=b6e3f4`} alt="FO Identity" />
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 lg:p-10">
            {children}
          </main>
        </div>
      </div>
    </FOAuthGuard>
  );
};

const VendorLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 md:p-12">
      <div className="max-w-7xl mx-auto flex flex-col space-y-8">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2 text-slate-400 hover:text-slate-900 transition-colors font-black uppercase text-[10px] tracking-widest">
            <Home size={16} />
            <span>Exit Kiosk</span>
          </Link>
          <div className="flex flex-col items-end">
             <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Live Kiosk Console</span>
             </div>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const notify = (message: string, type: NotificationType = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  };

  useEffect(() => {
    storageService.init();
  }, []);

  return (
    <NotificationContext.Provider value={{ notify }}>
      <Router>
        <Routes>
          {/* Public Landing Page */}
          <Route path="/" element={<LandingPage />} />

          {/* Vendor Portal - Separate Layout */}
          <Route path="/vendor-access" element={<VendorLayout><VendorAccess /></VendorLayout>} />

          {/* FO Portal - Workspace Layout */}
          <Route path="/dashboard" element={<FOLayout><Dashboard /></FOLayout>} />
          <Route path="/tasks" element={<FOLayout><TaskManager /></FOLayout>} />
          <Route path="/inventory" element={<FOLayout><Inventory /></FOLayout>} />
          <Route path="/sites" element={<FOLayout><SiteManager /></FOLayout>} />
          <Route path="/reports" element={<FOLayout><HistoryLedger /></FOLayout>} />
          <Route path="/settings" element={<FOLayout><Settings /></FOLayout>} />
        </Routes>

        {/* Global Notifications Toast */}
        <div className="fixed bottom-8 right-8 z-[2000] flex flex-col gap-3">
          {notifications.map(n => (
            <div 
              key={n.id} 
              className={`flex items-center space-x-4 px-6 py-4 rounded-2xl shadow-2xl border-l-4 animate-in slide-in-from-bottom duration-300 backdrop-blur-md ${
                n.type === 'success' ? 'bg-emerald-50/90 border-emerald-500 text-emerald-900' :
                n.type === 'error' ? 'bg-rose-50/90 border-rose-500 text-rose-900' :
                'bg-blue-50/90 border-blue-500 text-blue-900'
              }`}
            >
              {n.type === 'success' ? <CheckCircle2 size={20} /> : n.type === 'error' ? <AlertCircle size={20} /> : <Info size={20} />}
              <span className="text-xs font-black uppercase tracking-tight">{n.message}</span>
            </div>
          ))}
        </div>
      </Router>
    </NotificationContext.Provider>
  );
};

export default App;