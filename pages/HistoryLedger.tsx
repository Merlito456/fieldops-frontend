
import React, { useState, useEffect } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  UserCheck, 
  Key, 
  MapPin, 
  Clock, 
  Maximize2, 
  X, 
  Camera, 
  ShieldCheck, 
  ArrowRight,
  Calendar,
  Download,
  FileText,
  Users,
  Terminal,
  LogOut,
  Loader2,
  AlertTriangle,
  Hash,
  ShieldAlert,
  HardHat,
  Cpu
} from 'lucide-react';
import { storageService } from '../services/storageService';
import { apiService } from '../services/apiService';
import { WorkSite, SiteVisitor, KeyLog } from '../types';
import { useNotify } from '../App';

const HistoryLedger: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'VISITORS' | 'KEYS'>('VISITORS');
  const [sites, setSites] = useState<WorkSite[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { notify } = useNotify();

  const loadData = async () => {
    try {
      const data = await apiService.getSites();
      if (Array.isArray(data)) setSites(data);
    } catch (err) {
      const localData = storageService.getSites();
      setSites(localData || []);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const allVisitorHistory = sites.flatMap(s => 
    (s?.visitorHistory || []).map(v => ({ 
      ...v, 
      siteName: s?.name || 'Unknown Site', 
      siteId: s?.id || 'N/A' 
    }))
  ).sort((a, b) => new Date(b.checkOutTime || 0).getTime() - new Date(a.checkOutTime || 0).getTime());

  const allKeyHistory = sites.flatMap(s => 
    (s?.keyHistory || []).map(k => ({ 
      ...k, 
      siteName: s?.name || 'Unknown Site' 
    }))
  ).sort((a, b) => new Date(b.returnTime || 0).getTime() - new Date(a.returnTime || 0).getTime());

  const filteredVisitors = allVisitorHistory.filter(v => {
    const query = searchQuery.toLowerCase();
    return v.leadName?.toLowerCase().includes(query) || 
           v.vendor?.toLowerCase().includes(query) || 
           v.raawaNumber?.toLowerCase().includes(query) || 
           v.siteName?.toLowerCase().includes(query);
  });

  const filteredKeys = allKeyHistory.filter(k => {
    const query = searchQuery.toLowerCase();
    return k.borrowerName?.toLowerCase().includes(query) || 
           k.raawaNumber?.toLowerCase().includes(query) || 
           k.siteName?.toLowerCase().includes(query);
  });

  const safeFormatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
    } catch { return 'Invalid'; }
  };

  if (isLoading) return <div className="h-full flex flex-col items-center justify-center space-y-4"><Loader2 size={48} className="text-blue-600 animate-spin" /><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Recovering Ledger Data...</p></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {fullScreenImage && (
        <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-10" onClick={() => setFullScreenImage(null)}>
          <button className="absolute top-0 right-0 p-4 text-white"><X size={32} /></button>
          <img src={fullScreenImage} className="max-w-full max-h-full rounded-[40px] shadow-2xl object-contain" />
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div><h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Operational Ledger</h1><p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Audit-ready Forensic Records</p></div>
        <div className="relative w-full md:w-80">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
          <input type="text" placeholder="SEARCH AUDIT LOGS..." className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-tight outline-none focus:ring-4 focus:ring-blue-500/10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
      </div>

      <div className="flex bg-slate-100 p-1.5 rounded-[28px] w-full max-w-md mx-auto sm:mx-0">
        <button onClick={() => setActiveTab('VISITORS')} className={`flex-1 flex items-center justify-center space-x-2 py-4 rounded-[22px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'VISITORS' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}><UserCheck size={16} /><span>Vendor Access</span></button>
        <button onClick={() => setActiveTab('KEYS')} className={`flex-1 flex items-center justify-center space-x-2 py-4 rounded-[22px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'KEYS' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-400'}`}><Key size={16} /><span>Key History</span></button>
      </div>

      <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
        {activeTab === 'VISITORS' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="bg-slate-50/50 border-b border-slate-100"><th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase">Evidence</th><th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase">RAAWA & Lead</th><th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase">Node Info</th><th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase">Compliance</th><th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase">NOC Registry</th></tr></thead>
              <tbody className="divide-y divide-slate-50">
                {filteredVisitors.map((visit) => (
                  <tr key={visit.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-6"><div className="flex items-center space-x-2">{visit.photo && <img src={visit.photo} onClick={() => setFullScreenImage(visit.photo!)} className="h-10 w-10 rounded-lg object-cover cursor-zoom-in" />}{visit.exitPhoto && <img src={visit.exitPhoto} onClick={() => setFullScreenImage(visit.exitPhoto!)} className="h-10 w-10 rounded-lg object-cover cursor-zoom-in" />}</div></td>
                    <td className="px-8 py-6"><div className="flex items-center space-x-1.5 text-blue-600 mb-1"><Hash size={10} /><span className="text-[10px] font-black uppercase">{visit.raawaNumber || 'NO_RAAWA'}</span></div><p className="text-sm font-black text-slate-900 uppercase">{visit.leadName}</p><p className="text-[9px] font-bold text-slate-400 uppercase">{visit.vendor}</p></td>
                    <td className="px-8 py-6"><p className="text-xs font-black text-slate-700 uppercase">{visit.siteName}</p><p className="text-[9px] font-mono text-slate-400">{visit.siteId}</p></td>
                    <td className="px-8 py-6"><div className="space-y-2"><div className="space-y-0.5"><p className="text-[10px] font-black text-blue-600 uppercase">IN: {visit.rocName}</p><p className="text-[8px] font-bold text-slate-400">{safeFormatDate(visit.rocTime)}</p></div>{visit.rocLogoutName && <div className="space-y-0.5 border-t border-slate-50 pt-1"><p className="text-[10px] font-black text-rose-600 uppercase">OUT: {visit.rocLogoutName}</p><p className="text-[8px] font-bold text-slate-400">{safeFormatDate(visit.rocLogoutTime)}</p></div>}</div></td>
                    <td className="px-8 py-6">{visit.nocLogged ? <div className="space-y-1"><p className="text-[9px] font-black text-emerald-600 uppercase">Verified: {visit.nocLoginName}</p><p className="text-[8px] font-bold text-slate-400 uppercase italic">Referenced MOP Doc</p></div> : <span className="text-[9px] font-black text-slate-300 uppercase">Standard Ops</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="bg-slate-50/50 border-b border-slate-100"><th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase">Stamp</th><th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase">RAAWA & Borrower</th><th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase">Node</th><th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase">Released By</th><th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase">Status</th></tr></thead>
              <tbody className="divide-y divide-slate-50">
                {filteredKeys.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-6"><img src={log.borrowPhoto} onClick={() => setFullScreenImage(log.borrowPhoto)} className="h-10 w-14 rounded-lg object-cover cursor-zoom-in" /></td>
                    <td className="px-8 py-6"><div className="flex items-center space-x-1.5 text-amber-600 mb-1"><Hash size={10} /><span className="text-[10px] font-black uppercase">{log.raawaNumber || 'NO_RAAWA'}</span></div><p className="text-sm font-black text-slate-900 uppercase">{log.borrowerName}</p><p className="text-[9px] font-bold text-slate-400 uppercase">Reason: {log.reason}</p></td>
                    <td className="px-8 py-6"><p className="text-xs font-black text-slate-700 uppercase">{log.siteName}</p></td>
                    <td className="px-8 py-6"><div className="space-y-1"><p className="text-[10px] font-black text-slate-500 uppercase">{log.releasedBy || 'SYSTEM'}</p><p className="text-[9px] font-bold text-slate-400">{safeFormatDate(log.borrowTime)}</p></div></td>
                    <td className="px-8 py-6">{log.returnTime ? <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase rounded-lg">Restored</span> : <span className="px-3 py-1 bg-amber-100 text-amber-700 text-[9px] font-black uppercase rounded-lg animate-pulse">In Custody</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryLedger;
