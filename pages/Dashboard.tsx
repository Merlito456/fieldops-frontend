
import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  BrainCircuit,
  Zap,
  ChevronRight,
  TrendingUp,
  Briefcase,
  RefreshCw,
  FileDown,
  CalendarDays,
  UserCheck,
  History,
  TowerControl as Tower,
  ShieldAlert,
  ShieldCheck,
  Check,
  X as CloseIcon,
  Maximize2,
  Camera,
  Key,
  Smartphone,
  User,
  ExternalLink,
  Loader2,
  Cpu,
  Globe
} from 'lucide-react';
import StatsCard from '../components/StatsCard';
import { generateTaskOptimizations } from '../services/geminiService';
import { logicEngine, OperationalInsight } from '../services/logicEngine';
import { useNotify } from '../App';
import { apiService } from '../services/apiService';
import { WorkSite, WorkTask } from '../types';

const Dashboard: React.FC = () => {
  const [localInsights, setLocalInsights] = useState<OperationalInsight[]>([]);
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [sites, setSites] = useState<WorkSite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const { notify } = useNotify();

  const loadData = async () => {
    try {
      const [fetchedTasks, fetchedSites] = await Promise.all([
        apiService.getTasks(),
        apiService.getSites()
      ]);
      setTasks(fetchedTasks);
      setSites(fetchedSites);
      
      const insights = logicEngine.analyzeOperations(fetchedTasks, fetchedSites);
      setLocalInsights(insights);
    } catch (err) {
      notify('Database sync failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); 
    return () => clearInterval(interval);
  }, []);

  const handleAuthorizeAccess = async (siteId: string) => {
    try {
      await apiService.authorizeAccess(siteId);
      loadData();
      notify('Access Authorized.', 'success');
    } catch (e) { notify('Authorization failed', 'error'); }
  };

  const handleAuthorizeKey = async (siteId: string) => {
    try {
      await apiService.authorizeKeyBorrow(siteId);
      loadData();
      notify('Key Authorization Granted.', 'success');
    } catch (e) { notify('Key Authorization failed', 'error'); }
  };

  const handleDenyAccess = async (siteId: string) => {
    await apiService.cancelAccessRequest(siteId);
    loadData();
    notify('Request Revoked.', 'info');
  };

  const handleDenyKey = async (siteId: string) => {
    await apiService.cancelKeyBorrowRequest(siteId);
    loadData();
    notify('Key Request Revoked.', 'info');
  };

  const myTasks = tasks.filter(t => t.assignedTo === 'FO-JCR' || t.assignedTo === 'FO-001');
  const pendingAccess = sites.filter(s => s.pendingVisitor && !s.accessAuthorized);
  const pendingKeys = sites.filter(s => s.pendingKeyLog && !s.keyAccessAuthorized);
  const activeKeyBorrows = sites.filter(s => s.keyStatus === 'Borrowed');
  const activeVisitors = sites.filter(s => s.currentVisitor);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 size={48} className="text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10">
      {fullScreenImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-10" onClick={() => setFullScreenImage(null)}>
          <button className="absolute top-8 right-8 text-white"><CloseIcon size={32} /></button>
          <img src={fullScreenImage} className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain" />
        </div>
      )}

      {/* Authorization Section */}
      {(pendingAccess.length > 0 || pendingKeys.length > 0) && (
        <div className="bg-rose-50 border-2 border-rose-100 p-8 rounded-[40px]">
           <div className="flex items-center space-x-3 mb-6">
              <ShieldAlert className="text-rose-600" size={28} />
              <h2 className="text-2xl font-black text-slate-900 uppercase">Awaiting FO Authorization</h2>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingAccess.map(site => (
                <div key={`acc-${site.id}`} className="bg-white p-5 rounded-3xl border border-rose-100 flex items-center justify-between">
                   <div className="flex items-center space-x-4">
                      <img src={site.pendingVisitor?.photo} className="h-14 w-14 rounded-xl object-cover cursor-zoom-in" onClick={() => setFullScreenImage(site.pendingVisitor?.photo || null)} />
                      <div>
                         <p className="text-xs font-black text-slate-900 uppercase">{site.name}</p>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{site.pendingVisitor?.vendor} | ACCESS</p>
                      </div>
                   </div>
                   <div className="flex space-x-2">
                      <button onClick={() => handleAuthorizeAccess(site.id)} className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700"><Check size={20} /></button>
                      <button onClick={() => handleDenyAccess(site.id)} className="p-3 bg-slate-100 text-slate-400 rounded-xl hover:bg-rose-100 hover:text-rose-600"><CloseIcon size={20} /></button>
                   </div>
                </div>
              ))}
              {pendingKeys.map(site => (
                <div key={`key-${site.id}`} className="bg-white p-5 rounded-3xl border border-amber-200 ring-2 ring-amber-500 ring-offset-2 flex items-center justify-between">
                   <div className="flex items-center space-x-4">
                      <img src={site.pendingKeyLog?.borrowPhoto} className="h-14 w-14 rounded-xl object-cover cursor-zoom-in" onClick={() => setFullScreenImage(site.pendingKeyLog?.borrowPhoto || null)} />
                      <div>
                         <p className="text-xs font-black text-slate-900 uppercase">{site.name}</p>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{site.pendingKeyLog?.vendor} | KEY CUSTODY</p>
                      </div>
                   </div>
                   <div className="flex space-x-2">
                      <button onClick={() => handleAuthorizeKey(site.id)} className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700"><Check size={20} /></button>
                      <button onClick={() => handleDenyKey(site.id)} className="p-3 bg-slate-100 text-slate-400 rounded-xl hover:bg-rose-100 hover:text-rose-600"><CloseIcon size={20} /></button>
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* REMAINDER OF DASHBOARD */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard title="My Missions" value={myTasks.length} icon={<Zap size={24} className="text-blue-600" />} change="On Schedule" isPositive={true} colorClass="bg-blue-50" />
        <StatsCard title="Site Visitors" value={activeVisitors.length} icon={<UserCheck size={24} className="text-indigo-600" />} change={`${activeVisitors.length} Active`} isPositive={true} colorClass="bg-indigo-50" />
        <StatsCard title="Key Borrows" value={activeKeyBorrows.length} icon={<Key size={24} className="text-amber-600" />} change={`${activeKeyBorrows.length} Out`} isPositive={false} colorClass="bg-amber-50" />
        <StatsCard title="System Node" value="Live" icon={<Activity size={24} className="text-emerald-600" />} change="Stable" isPositive={true} colorClass="bg-emerald-50" />
      </div>
      
      {/* ... Task Optimizations and Key Custody Ledger sections ... */}
    </div>
  );
};

export default Dashboard;
