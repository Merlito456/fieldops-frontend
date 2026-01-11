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
  Loader2
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
      setSites(data);
    } catch (err) {
      setSites(storageService.getSites());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Aggregation Logic
  const allVisitorHistory = sites.flatMap(s => 
    (s.visitorHistory || []).map(v => ({ ...v, siteName: s.name, siteId: s.id }))
  ).sort((a, b) => new Date(b.checkOutTime || '').getTime() - new Date(a.checkOutTime || '').getTime());

  const allKeyHistory = sites.flatMap(s => 
    (s.keyHistory || []).map(k => ({ ...k, siteName: s.name }))
  ).sort((a, b) => new Date(b.returnTime || '').getTime() - new Date(a.returnTime || '').getTime());

  const filteredVisitors = allVisitorHistory.filter(v => 
    v.leadName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.siteName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (v.personnel && v.personnel.some(p => p.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const filteredKeys = allKeyHistory.filter(k => 
    k.borrowerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    k.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
    k.siteName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExport = () => {
    notify(`Exporting ${activeTab === 'VISITORS' ? 'Access' : 'Key'} Ledger...`, 'info');
    setTimeout(() => notify('Ledger exported successfully', 'success'), 1500);
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4">
        <Loader2 size={48} className="text-blue-600 animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Recovering Operational Logs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {/* Full Screen Image Viewer */}
      {fullScreenImage && (
        <div 
          className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-10"
          onClick={() => setFullScreenImage(null)}
        >
          <div className="relative max-w-5xl w-full h-full flex flex-col items-center justify-center">
            <button className="absolute top-0 right-0 p-4 text-white hover:text-rose-400"><X size={32} /></button>
            <img src={fullScreenImage} className="max-w-full max-h-full rounded-[40px] shadow-2xl border-4 border-white/10 object-contain" />
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Operational Ledger</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Forensic Site Entry & Key Custody Records</p>
        </div>
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
            <input 
              type="text" 
              placeholder="SEARCH AUDIT LOGS..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black text-slate-900 uppercase tracking-tight focus:ring-4 focus:ring-blue-500/10 outline-none placeholder:text-slate-200"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button 
            onClick={handleExport}
            className="p-3.5 bg-white border border-slate-200 text-slate-900 rounded-2xl hover:bg-slate-50 shadow-sm transition-all"
          >
            <Download size={20} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 p-1.5 rounded-[28px] w-full max-w-md mx-auto sm:mx-0">
        <button 
          onClick={() => setActiveTab('VISITORS')}
          className={`flex-1 flex items-center justify-center space-x-2 py-4 rounded-[22px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'VISITORS' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <UserCheck size={16} />
          <span>Vendor Access</span>
        </button>
        <button 
          onClick={() => setActiveTab('KEYS')}
          className={`flex-1 flex items-center justify-center space-x-2 py-4 rounded-[22px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'KEYS' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Key size={16} />
          <span>Key History</span>
        </button>
      </div>

      <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
        {activeTab === 'VISITORS' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Evidence</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Lead & Personnel</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Site Node</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">ROC Details (Login/Logout)</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Compliance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredVisitors.length > 0 ? filteredVisitors.map((visit) => (
                  <tr key={visit.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center space-x-3">
                        <div 
                          onClick={() => setFullScreenImage(visit.photo || null)}
                          className="h-12 w-12 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 cursor-zoom-in relative group"
                        >
                          <img src={visit.photo} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/20 transition-all flex items-center justify-center"><Camera size={12} className="text-white opacity-0 group-hover:opacity-100" /></div>
                        </div>
                        {visit.exitPhoto && (
                          <div 
                            onClick={() => setFullScreenImage(visit.exitPhoto || null)}
                            className="h-12 w-12 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 cursor-zoom-in relative group"
                          >
                            <img src={visit.exitPhoto} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-rose-600/0 group-hover:bg-rose-600/20 transition-all flex items-center justify-center"><Camera size={12} className="text-white opacity-0 group-hover:opacity-100" /></div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm font-black text-slate-900 uppercase leading-none">{visit.leadName}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{visit.vendor}</p>
                      {visit.personnel && visit.personnel.length > 1 && (
                         <div className="mt-2 flex items-center space-x-1.5">
                            <Users size={10} className="text-blue-500" />
                            <span className="text-[9px] font-black text-slate-500 uppercase">+{visit.personnel.length - 1} OTHER STAFF</span>
                         </div>
                      )}
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center space-x-2">
                        <MapPin size={12} className="text-blue-500" />
                        <span className="text-xs font-black text-slate-700 uppercase">{visit.siteName}</span>
                      </div>
                      <p className="text-[9px] font-mono text-slate-400 mt-1">{visit.siteId}</p>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col space-y-3">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <Terminal size={10} className="text-blue-600" />
                            <span className="text-[10px] font-black text-slate-900 uppercase">IN: {visit.rocName || 'N/A'}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Clock size={10} className="text-slate-400" />
                            <span className="text-[9px] font-bold text-slate-500 uppercase">{visit.rocTime ? new Date(visit.rocTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'N/A'}</span>
                          </div>
                        </div>
                        {visit.rocLogoutName && (
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <LogOut size={10} className="text-rose-600" />
                              <span className="text-[10px] font-black text-slate-900 uppercase">OUT: {visit.rocLogoutName}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Clock size={10} className="text-slate-400" />
                              <span className="text-[9px] font-bold text-slate-500 uppercase">{new Date(visit.rocLogoutTime!).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest rounded-lg border border-emerald-100 flex items-center justify-center w-fit">
                         <ShieldCheck size={12} className="mr-1.5" />
                         Forensic Seal
                       </span>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="p-20 text-center"><p className="text-sm font-black text-slate-300 uppercase tracking-widest">No access logs recovered</p></td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Evidence Stamping</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Borrower Information</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Site Node</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Duration</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredKeys.length > 0 ? filteredKeys.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center space-x-3">
                        <div 
                          onClick={() => setFullScreenImage(log.borrowPhoto || null)}
                          className="h-12 w-12 bg-slate-100 rounded-xl overflow-hidden border border-amber-200 cursor-zoom-in relative group"
                        >
                          <img src={log.borrowPhoto} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-amber-600/0 group-hover:bg-amber-600/20 transition-all flex items-center justify-center"><Camera size={12} className="text-white opacity-0 group-hover:opacity-100" /></div>
                        </div>
                        {log.returnPhoto && (
                          <div 
                            onClick={() => setFullScreenImage(log.returnPhoto || null)}
                            className="h-12 w-12 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 cursor-zoom-in relative group"
                          >
                            <img src={log.returnPhoto} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-emerald-600/0 group-hover:bg-emerald-600/20 transition-all flex items-center justify-center"><Camera size={12} className="text-white opacity-0 group-hover:opacity-100" /></div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm font-black text-slate-900 uppercase">{log.borrowerName}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{log.vendor}</p>
                      <p className="text-[9px] font-mono text-blue-500 mt-1">{log.borrowerContact}</p>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center space-x-2">
                        <Key size={12} className="text-amber-500" />
                        <span className="text-xs font-black text-slate-700 uppercase">{log.siteName}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-500 uppercase">BORROWED: {new Date(log.borrowTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</p>
                          {log.returnTime && <p className="text-[10px] font-black text-emerald-600 uppercase">RETURNED: {new Date(log.returnTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</p>}
                       </div>
                    </td>
                    <td className="px-8 py-6">
                       {log.returnTime ? (
                         <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase rounded-lg border border-emerald-200">Vaulted</span>
                       ) : (
                         <span className="px-3 py-1 bg-amber-100 text-amber-700 text-[9px] font-black uppercase rounded-lg border border-amber-200 animate-pulse">In Custody</span>
                       )}
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="p-20 text-center"><p className="text-sm font-black text-slate-300 uppercase tracking-widest">No key logs recovered</p></td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryLedger;