
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
  Globe,
  Users,
  Timer,
  Eye,
  ArrowUpRight,
  Lock,
  Unlock,
  // Added Info to fix 'Cannot find name Info' error
  Info
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
      setTasks(fetchedTasks || []);
      setSites(fetchedSites || []);
      
      const insights = logicEngine.analyzeOperations(fetchedTasks || [], fetchedSites || []);
      setLocalInsights(insights);
    } catch (err) {
      notify('Dashboard Sync Failure', 'error');
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
      notify('Site Access Authorized', 'success');
    } catch (e) { notify('Authorization failed', 'error'); }
  };

  const handleAuthorizeKey = async (siteId: string) => {
    try {
      await apiService.authorizeKeyBorrow(siteId);
      loadData();
      notify('Key Custody Authorized', 'success');
    } catch (e) { notify('Key Authorization failed', 'error'); }
  };

  const handleDenyAccess = async (siteId: string) => {
    await apiService.cancelAccessRequest(siteId);
    loadData();
    notify('Request Revoked', 'info');
  };

  const handleDenyKey = async (siteId: string) => {
    await apiService.cancelKeyBorrowRequest(siteId);
    loadData();
    notify('Key Request Revoked', 'info');
  };

  const myTasks = tasks.filter(t => t.assignedTo === 'FO-JCR' || t.assignedTo === 'FO-001' || t.assignedTo === 'ECE-2024');
  const pendingAccess = sites.filter(s => s.pendingVisitor && !s.accessAuthorized);
  const pendingKeys = sites.filter(s => s.pendingKeyLog && !s.keyAccessAuthorized);
  const activeKeyBorrows = sites.filter(s => s.keyStatus === 'Borrowed');
  const activeVisitors = sites.filter(s => s.currentVisitor);

  const formatUptime = (startTime: string) => {
    const start = new Date(startTime).getTime();
    const now = new Date().getTime();
    const diff = Math.floor((now - start) / 1000 / 60); // minutes
    if (diff < 60) return `${diff}m`;
    const hours = Math.floor(diff / 60);
    return `${hours}h ${diff % 60}m`;
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4">
        <Loader2 size={48} className="text-blue-600 animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Booting Command Center...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      {fullScreenImage && (
        <div className="fixed inset-0 z-[100] bg-slate-900/98 backdrop-blur-xl flex items-center justify-center p-10" onClick={() => setFullScreenImage(null)}>
          <button className="absolute top-8 right-8 p-3 bg-white/10 text-white rounded-full hover:bg-rose-600 transition-colors"><CloseIcon size={32} /></button>
          <img src={fullScreenImage} className="max-w-full max-h-full rounded-[40px] shadow-2xl object-contain border-4 border-white/5" />
        </div>
      )}

      {/* TOP: ACTION REQUIRED (Authorization Hub) */}
      {(pendingAccess.length > 0 || pendingKeys.length > 0) && (
        <div className="bg-white border-2 border-rose-100 p-8 rounded-[48px] shadow-2xl shadow-rose-500/5 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
              <ShieldAlert size={160} className="text-rose-900" />
           </div>
           
           <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-4">
                <div className="h-14 w-14 bg-rose-600 text-white rounded-3xl flex items-center justify-center shadow-lg shadow-rose-500/20 animate-pulse">
                   <ShieldAlert size={28} />
                </div>
                <div>
                   <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Access Control Required</h2>
                   <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Awaiting Verification & Signing</p>
                </div>
              </div>
              <div className="hidden md:flex px-4 py-2 bg-rose-50 rounded-2xl border border-rose-100 items-center space-x-2">
                 <div className="h-2 w-2 bg-rose-500 rounded-full animate-ping"></div>
                 <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">{pendingAccess.length + pendingKeys.length} Pending Actions</span>
              </div>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {pendingAccess.map(site => (
                <div key={`acc-${site.id}`} className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 flex flex-col md:flex-row items-center gap-6 group hover:bg-white hover:border-blue-200 transition-all">
                   <div className="relative shrink-0">
                      <img 
                        src={site.pendingVisitor?.photo} 
                        className="h-24 w-24 rounded-3xl object-cover cursor-zoom-in ring-4 ring-white shadow-xl transition-transform group-hover:scale-105" 
                        onClick={() => setFullScreenImage(site.pendingVisitor?.photo || null)} 
                      />
                      <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-2 rounded-xl shadow-lg"><Camera size={12} /></div>
                   </div>
                   <div className="flex-1 space-y-2 text-center md:text-left">
                      <p className="text-xs font-black text-blue-600 uppercase tracking-widest">Entry Request</p>
                      <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight leading-none">{site.name}</h4>
                      <div className="flex flex-wrap justify-center md:justify-start gap-2 pt-1">
                         <span className="text-[10px] font-bold text-slate-500 uppercase px-2 py-1 bg-white rounded-lg border border-slate-200">{site.pendingVisitor?.vendor}</span>
                         <span className="text-[10px] font-bold text-slate-500 uppercase px-2 py-1 bg-white rounded-lg border border-slate-200">{site.pendingVisitor?.leadName}</span>
                      </div>
                   </div>
                   <div className="flex space-x-3">
                      <button onClick={() => handleAuthorizeAccess(site.id)} className="h-14 w-14 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 hover:scale-105 transition-all flex items-center justify-center"><Check size={24} /></button>
                      <button onClick={() => handleDenyAccess(site.id)} className="h-14 w-14 bg-white border border-slate-200 text-slate-400 rounded-2xl hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-all flex items-center justify-center"><CloseIcon size={24} /></button>
                   </div>
                </div>
              ))}
              
              {pendingKeys.map(site => (
                <div key={`key-${site.id}`} className="bg-amber-50/50 p-6 rounded-[32px] border border-amber-100 flex flex-col md:flex-row items-center gap-6 group hover:bg-white hover:border-amber-300 transition-all">
                   <div className="relative shrink-0">
                      <img 
                        src={site.pendingKeyLog?.borrowPhoto} 
                        className="h-24 w-24 rounded-3xl object-cover cursor-zoom-in ring-4 ring-white shadow-xl transition-transform group-hover:scale-105" 
                        onClick={() => setFullScreenImage(site.pendingKeyLog?.borrowPhoto || null)} 
                      />
                      <div className="absolute -bottom-2 -right-2 bg-amber-500 text-white p-2 rounded-xl shadow-lg"><Key size={12} /></div>
                   </div>
                   <div className="flex-1 space-y-2 text-center md:text-left">
                      <p className="text-xs font-black text-amber-600 uppercase tracking-widest">Key Custody Request</p>
                      <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight leading-none">{site.name}</h4>
                      <p className="text-[10px] font-bold text-amber-500 uppercase italic">Reason: {site.pendingKeyLog?.reason}</p>
                   </div>
                   <div className="flex space-x-3">
                      <button onClick={() => handleAuthorizeKey(site.id)} className="h-14 w-14 bg-amber-600 text-white rounded-2xl shadow-lg shadow-amber-500/20 hover:bg-amber-700 hover:scale-105 transition-all flex items-center justify-center"><Check size={24} /></button>
                      <button onClick={() => handleDenyKey(site.id)} className="h-14 w-14 bg-white border border-slate-200 text-slate-400 rounded-2xl hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-all flex items-center justify-center"><CloseIcon size={24} /></button>
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* STATS OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard title="My Active Tasks" value={myTasks.length} icon={<Zap size={24} className="text-blue-600" />} change="On Schedule" isPositive={true} colorClass="bg-blue-50" />
        <StatsCard title="Site Visitors" value={activeVisitors.length} icon={<UserCheck size={24} className="text-indigo-600" />} change={`${activeVisitors.length} Active Presences`} isPositive={true} colorClass="bg-indigo-50" />
        <StatsCard title="Key Borrows" value={activeKeyBorrows.length} icon={<Key size={24} className="text-amber-600" />} change={`${activeKeyBorrows.length} Keys Outside`} isPositive={false} colorClass="bg-amber-50" />
        <StatsCard title="System Node" value="Live" icon={<Activity size={24} className="text-emerald-600" />} change="Registry Stable" isPositive={true} colorClass="bg-emerald-50" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* CENTER: LIVE SITE MONITORING */}
        <div className="xl:col-span-2 space-y-8">
           <div className="bg-white rounded-[48px] border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                 <div className="flex items-center space-x-3">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Users size={24} /></div>
                    <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">Live Site Presences</h3>
                 </div>
                 <div className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span>Real-time Monitoring</span>
                 </div>
              </div>
              <div className="p-8">
                 {activeVisitors.length > 0 ? (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {activeVisitors.map(site => (
                        <div key={site.id} className="bg-slate-50/50 border border-slate-100 p-6 rounded-[32px] flex flex-col space-y-4 hover:shadow-xl transition-all hover:bg-white hover:border-blue-100 group">
                           <div className="flex items-start justify-between">
                              <div className="flex items-center space-x-3">
                                 <img src={site.currentVisitor?.photo} className="h-12 w-12 rounded-xl object-cover ring-2 ring-white shadow-md" />
                                 <div>
                                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{site.currentVisitor?.leadName}</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">{site.currentVisitor?.vendor}</p>
                                 </div>
                              </div>
                              <div className="flex flex-col items-end">
                                 <div className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase rounded-lg border border-emerald-100 flex items-center space-x-1">
                                    <div className="h-1 w-1 bg-emerald-500 rounded-full animate-ping"></div>
                                    <span>Active Session</span>
                                 </div>
                                 <div className="mt-2 flex items-center text-[10px] font-black text-slate-400 space-x-1">
                                    <Timer size={10} />
                                    <span>{formatUptime(site.currentVisitor?.checkInTime || '')}</span>
                                 </div>
                              </div>
                           </div>
                           <div className="h-px bg-slate-100"></div>
                           <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                 <Tower size={14} className="text-blue-600" />
                                 <span className="text-[10px] font-black text-slate-900 uppercase">{site.name}</span>
                              </div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase italic">Act: {site.currentVisitor?.activity}</p>
                           </div>
                        </div>
                      ))}
                   </div>
                 ) : (
                   <div className="py-20 text-center space-y-4">
                      <div className="h-20 w-20 bg-slate-50 text-slate-200 rounded-[32px] mx-auto flex items-center justify-center"><UserCheck size={40} /></div>
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">No external personnel currently on site</p>
                   </div>
                 )}
              </div>
           </div>

           {/* KEY CUSTODY LEDGER */}
           <div className="bg-white rounded-[48px] border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                 <div className="flex items-center space-x-3">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl"><Key size={24} /></div>
                    <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">Active Key Custody</h3>
                 </div>
              </div>
              <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead>
                       <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                          <th className="px-8 py-5">Forensic Proof</th>
                          <th className="px-8 py-5">Custody Lead</th>
                          <th className="px-8 py-5">Asset Node</th>
                          <th className="px-8 py-5">Elapsed</th>
                          <th className="px-8 py-5"></th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {activeKeyBorrows.length > 0 ? activeKeyBorrows.map(site => (
                         <tr key={`live-key-${site.id}`} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-8 py-6">
                               <img 
                                 src={site.currentKeyLog?.borrowPhoto} 
                                 className="h-10 w-14 rounded-lg object-cover cursor-zoom-in border border-slate-200" 
                                 onClick={() => setFullScreenImage(site.currentKeyLog?.borrowPhoto || null)} 
                               />
                            </td>
                            <td className="px-8 py-6">
                               <p className="text-xs font-black text-slate-900 uppercase leading-none">{site.currentKeyLog?.borrowerName}</p>
                               <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">{site.currentKeyLog?.vendor}</p>
                            </td>
                            <td className="px-8 py-6">
                               <span className="text-[10px] font-black text-slate-700 uppercase">{site.name}</span>
                            </td>
                            <td className="px-8 py-6">
                               <span className="text-[10px] font-black text-amber-600 uppercase">{formatUptime(site.currentKeyLog?.borrowTime || '')}</span>
                            </td>
                            <td className="px-8 py-6 text-right">
                               <button className="p-2 text-slate-300 hover:text-blue-600"><Eye size={16} /></button>
                            </td>
                         </tr>
                       )) : (
                         <tr><td colSpan={5} className="p-16 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">All vault keys present and verified</td></tr>
                       )}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>

        {/* RIGHT: OPERATIONAL INSIGHTS & TASKS */}
        <div className="space-y-8">
           <div className="bg-slate-900 rounded-[48px] p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none text-white"><BrainCircuit size={100} /></div>
              <div className="flex items-center space-x-3 mb-8">
                 <div className="h-10 w-10 bg-blue-500 rounded-2xl flex items-center justify-center text-white"><Cpu size={20} /></div>
                 <h3 className="text-lg font-black uppercase tracking-tight text-white">Logic Engine</h3>
              </div>
              <div className="space-y-4">
                 {localInsights.map((insight, idx) => (
                   <div key={idx} className={`p-5 rounded-3xl border ${
                     insight.severity === 'high' ? 'bg-rose-500/10 border-rose-500/20 text-rose-100' :
                     insight.severity === 'medium' ? 'bg-amber-500/10 border-amber-500/20 text-amber-100' :
                     'bg-blue-500/10 border-blue-500/20 text-blue-100'
                   } flex items-start space-x-3`}>
                     <div className="mt-1">
                        {insight.type === 'RISK' ? <ShieldAlert size={16} /> : 
                         insight.type === 'SAFETY' ? <AlertTriangle size={16} /> :
                         <Info size={16} />}
                     </div>
                     <p className="text-xs font-medium leading-relaxed">{insight.message}</p>
                   </div>
                 ))}
              </div>
           </div>

           <div className="bg-white rounded-[48px] border border-slate-100 p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                 <h3 className="text-lg font-black uppercase tracking-tight text-slate-900">Critical Missions</h3>
                 <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">View All</button>
              </div>
              <div className="space-y-4">
                 {myTasks.length > 0 ? myTasks.slice(0, 3).map(task => (
                   <div key={task.id} className="p-4 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between group cursor-pointer hover:bg-white hover:border-blue-200 transition-all">
                      <div className="flex items-center space-x-4">
                         <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                           task.priority === 'Critical' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'
                         }`}><Zap size={18} /></div>
                         <div>
                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight truncate w-32">{task.title}</h4>
                            <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">{task.id} • {task.status}</p>
                         </div>
                      </div>
                      <ArrowUpRight size={16} className="text-slate-300 group-hover:text-blue-600 transition-colors" />
                   </div>
                 )) : (
                   <p className="text-center py-6 text-[10px] font-black text-slate-300 uppercase tracking-widest">No active deployments</p>
                 )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
