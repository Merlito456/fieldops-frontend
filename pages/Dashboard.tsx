
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
      
      // RUN LOCAL "FREE" INTELLIGENCE IMMEDIATELY
      const insights = logicEngine.analyzeOperations(fetchedTasks, fetchedSites);
      setLocalInsights(insights);
      
    } catch (err) {
      notify('Database sync failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeepAnalysis = async () => {
    setLoadingAi(true);
    try {
      const insights = await generateTaskOptimizations(tasks);
      setAiInsights(insights);
      notify('Advanced AI synthesis complete', 'success');
    } catch (err) {
      notify('Cloud AI unavailable', 'error');
    } finally {
      setLoadingAi(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); 
    return () => clearInterval(interval);
  }, []);

  const handleAuthorizeAccess = async (siteId: string) => {
    await apiService.authorizeAccess(siteId);
    loadData();
    notify('Access Authorized in Database.', 'success');
  };

  const handleDenyAccess = async (siteId: string) => {
    await apiService.cancelAccessRequest(siteId);
    loadData();
    notify('Request Revoked.', 'info');
  };

  const handleAuthorizeKey = async (siteId: string) => {
    await apiService.authorizeKeyBorrow(siteId);
    loadData();
    notify('Key Authorization Updated.', 'success');
  };

  const handleDenyKey = async (siteId: string) => {
    await apiService.cancelKeyBorrowRequest(siteId);
    loadData();
    notify('Key Request Revoked.', 'info');
  };

  // Metrics Logic
  const myTasks = tasks.filter(t => t.assignedTo === 'FO-JCR' || t.assignedTo === 'FO-001');
  const pendingAccess = sites.filter(s => s.pendingVisitor && !s.accessAuthorized);
  const pendingKeys = sites.filter(s => s.pendingKeyLog && !s.keyAccessAuthorized);
  const activeKeyBorrows = sites.filter(s => s.keyStatus === 'Borrowed');
  const activeVisitors = sites.filter(s => s.currentVisitor);

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4">
        <Loader2 size={48} className="text-blue-600 animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Initializing Operational Node...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10">
      {fullScreenImage && (
        <div 
          className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300"
          onClick={() => setFullScreenImage(null)}
        >
          <div className="relative max-w-5xl w-full h-full flex flex-col items-center justify-center">
            <button className="absolute top-0 right-0 p-4 text-white hover:text-rose-400 z-[110]" onClick={() => setFullScreenImage(null)}><CloseIcon size={32} /></button>
            <div className="w-full h-full flex items-center justify-center p-4"><img src={fullScreenImage} className="max-w-full max-h-full rounded-[40px] shadow-2xl border-4 border-white/10 object-contain" /></div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Operational Dashboard</h1>
          <p className="text-slate-500 font-bold uppercase text-xs tracking-wide">Infrastructure Oversight Node</p>
        </div>
        <div className="flex items-center space-x-3 text-[10px] font-black text-emerald-600 uppercase bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
           <div className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
           <span>Cloud Sync: Active</span>
        </div>
      </div>

      {/* Authorization Section */}
      {(pendingAccess.length > 0 || pendingKeys.length > 0) && (
        <div className="bg-rose-50 border-2 border-rose-200 p-8 rounded-[40px] shadow-2xl shadow-rose-500/10">
           <div className="flex items-center space-x-3 mb-6">
              <ShieldAlert className="text-rose-600" size={28} />
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Awaiting Authorization</h2>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingAccess.map(site => (
                <div key={`acc-${site.id}`} className="bg-white p-6 rounded-3xl shadow-sm border border-rose-100 flex items-center justify-between">
                   <div className="flex items-center space-x-4">
                      <div onClick={() => setFullScreenImage(site.pendingVisitor?.photo || null)} className="h-14 w-14 rounded-2xl overflow-hidden border-2 border-rose-100 cursor-zoom-in group relative">
                        <img src={site.pendingVisitor?.photo} className="w-full h-full object-cover group-hover:scale-110" />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Maximize2 size={16} className="text-white" /></div>
                      </div>
                      <div>
                         <div className="flex items-center space-x-2 mb-1"><span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[8px] font-black uppercase rounded">ACCESS_REQ</span><p className="text-xs font-black text-slate-900 uppercase">{site.name}</p></div>
                         <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{site.pendingVisitor?.vendor} | {site.pendingVisitor?.leadName}</p>
                      </div>
                   </div>
                   <div className="flex space-x-2">
                      <button onClick={() => handleAuthorizeAccess(site.id)} className="p-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-all shadow-lg"><Check size={20} /></button>
                      <button onClick={() => handleDenyAccess(site.id)} className="p-3 bg-slate-200 text-slate-600 rounded-2xl hover:bg-rose-100 hover:text-rose-600 transition-all"><CloseIcon size={20} /></button>
                   </div>
                </div>
              ))}
              {pendingKeys.map(site => (
                <div key={`key-${site.id}`} className="bg-white p-6 rounded-3xl shadow-sm border border-amber-200 flex items-center justify-between ring-2 ring-amber-500 ring-offset-2">
                   <div className="flex items-center space-x-4">
                      <div onClick={() => setFullScreenImage(site.pendingKeyLog?.borrowPhoto || null)} className="h-14 w-14 rounded-2xl overflow-hidden border-2 border-amber-200 cursor-zoom-in group relative">
                        <img src={site.pendingKeyLog?.borrowPhoto} className="w-full h-full object-cover group-hover:scale-110" />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Maximize2 size={16} className="text-white" /></div>
                      </div>
                      <div>
                         <div className="flex items-center space-x-2 mb-1"><span className="px-2 py-0.5 bg-amber-600 text-white text-[8px] font-black uppercase rounded">KEY_REQ</span><p className="text-xs font-black text-slate-900 uppercase">{site.name}</p></div>
                         <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{site.pendingKeyLog?.vendor} | {site.pendingKeyLog?.borrowerName}</p>
                      </div>
                   </div>
                   <div className="flex space-x-2">
                      <button onClick={() => handleAuthorizeKey(site.id)} className="p-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all shadow-lg"><Check size={20} /></button>
                      <button onClick={() => handleDenyKey(site.id)} className="p-3 bg-slate-200 text-slate-600 rounded-2xl hover:bg-rose-100 hover:text-rose-600 transition-all"><CloseIcon size={20} /></button>
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard title="Database Missions" value={myTasks.length} icon={<Zap size={24} className="text-blue-600" />} change="On Schedule" isPositive={true} colorClass="bg-blue-50" />
        <StatsCard title="Active Visitors" value={activeVisitors.length} icon={<UserCheck size={24} className="text-indigo-600" />} change={`${activeVisitors.length} Vendors`} isPositive={true} colorClass="bg-indigo-50" />
        <StatsCard title="Storage Utilization" value="12.4GB" icon={<CheckCircle size={24} className="text-emerald-600" />} change="Free Tier" isPositive={true} colorClass="bg-emerald-50" />
        <StatsCard title="Critical Alerts" value={tasks.filter(t => t.priority === 'Critical').length} icon={<AlertTriangle size={24} className="text-rose-600" />} change="Clear" isPositive={true} colorClass="bg-rose-50" />
      </div>

      {/* Primary Dashboard Blocks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          
          {/* Key Custody Monitoring */}
          <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-amber-50/30">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl"><Key size={24} /></div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">Key Custody Ledger</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Real-time custody tracking</p>
                </div>
              </div>
            </div>
            <div className="divide-y divide-slate-50">
              {activeKeyBorrows.length > 0 ? (
                activeKeyBorrows.map((site) => (
                  <div key={site.id} className="p-8 hover:bg-slate-50/50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center space-x-5">
                      <div onClick={() => setFullScreenImage(site.currentKeyLog?.borrowPhoto || null)} className="h-20 w-20 bg-slate-100 rounded-[24px] overflow-hidden border-2 border-amber-100 cursor-zoom-in group relative shadow-md">
                        <img src={site.currentKeyLog?.borrowPhoto} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Maximize2 size={16} className="text-white" /></div>
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 uppercase tracking-tight text-lg">{site.name}</h4>
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1.5"><User size={12} className="text-amber-500" /><span className="text-xs font-black text-slate-700 uppercase">{site.currentKeyLog?.borrowerName}</span></div>
                          <div className="flex items-center space-x-1.5"><Briefcase size={12} className="text-slate-400" /><span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{site.currentKeyLog?.vendor}</span></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-16 text-center text-slate-400 uppercase font-black text-xs tracking-widest">Vault Secured</div>
              )}
            </div>
          </div>
        </div>

        {/* Intelligence Mode (Free & Advanced) */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden flex flex-col h-full">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20"><BrainCircuit size={24} /></div>
                <div>
                   <h3 className="font-black text-xl tracking-tight text-slate-900 uppercase">Operational Intel</h3>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                     <Cpu size={10} className="mr-1" /> Free Local Mode
                   </p>
                </div>
              </div>
              <button 
                onClick={handleDeepAnalysis} 
                disabled={loadingAi}
                className={`p-3 rounded-xl border-2 transition-all ${aiInsights ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-blue-500 hover:text-blue-500'}`}
              >
                {loadingAi ? <RefreshCw className="animate-spin" size={18} /> : <Globe size={18} />}
              </button>
            </div>
            
            <div className="space-y-4 flex-1 overflow-y-auto pr-2 max-h-[500px]">
              {/* Local Insights (Instant/Free) */}
              {localInsights.map((insight, idx) => (
                <div key={`local-${idx}`} className={`p-4 rounded-3xl border-l-4 shadow-sm animate-in slide-in-from-right-4 duration-300 delay-${idx * 100} ${
                  insight.severity === 'high' ? 'bg-rose-50 border-rose-500' : 
                  insight.severity === 'medium' ? 'bg-amber-50 border-amber-500' : 
                  'bg-blue-50 border-blue-500'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">{insight.type} Node Analysis</span>
                    {insight.severity === 'high' && <AlertTriangle size={12} className="text-rose-500" />}
                  </div>
                  <p className="text-xs font-black text-slate-800 leading-relaxed uppercase tracking-tight">{insight.message}</p>
                </div>
              ))}

              {/* Advanced AI Synthesis (Gemini Option) */}
              {aiInsights && (
                <div className="p-6 bg-slate-900 rounded-[32px] text-white shadow-xl animate-in zoom-in duration-300 mt-4 border border-white/10">
                   <div className="flex items-center space-x-2 mb-3 text-blue-400">
                      <Zap size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Advanced Deep Synthesis</span>
                   </div>
                   <div className="text-[11px] font-bold text-slate-300 leading-relaxed whitespace-pre-line italic">
                     {aiInsights}
                   </div>
                </div>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
               <div className="flex items-center space-x-2">
                  <div className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-[9px] font-black text-emerald-600 uppercase">Live Audit Active</span>
               </div>
               <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">v2.4 Logic Node</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
