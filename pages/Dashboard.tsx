
import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, Clock, CheckCircle, AlertTriangle, BrainCircuit, Zap, ChevronRight, Briefcase, 
  RefreshCw, UserCheck, Key, TowerControl as Tower, ShieldAlert, ShieldCheck, Check, X, 
  Maximize2, Camera, Smartphone, User, Loader2, Cpu, Users, Timer, Eye, ArrowUpRight, 
  Lock, Unlock, Info, Hash, Calendar, MessageSquare, Send
} from 'lucide-react';
import StatsCard from '../components/StatsCard';
import { useNotify } from '../App';
import { apiService } from '../services/apiService';
import { WorkSite, WorkTask, ChatMessage } from '../types';

const Dashboard: React.FC = () => {
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [sites, setSites] = useState<WorkSite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  
  const [activeChatSiteId, setActiveChatSiteId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { notify } = useNotify();

  const loadData = async () => {
    try {
      const [fetchedTasks, fetchedSites] = await Promise.all([apiService.getTasks(), apiService.getSites()]);
      setTasks(fetchedTasks || []); 
      setSites(fetchedSites || []);
    } catch (err) { 
      notify('Sync Failure', 'error'); 
    } finally { 
      setIsLoading(false); 
    }
  };

  useEffect(() => { 
    loadData(); 
    const interval = setInterval(loadData, 5000); 
    return () => clearInterval(interval); 
  }, []);

  useEffect(() => {
    let interval: number | null = null;
    if (activeChatSiteId) {
      const fetchMsgs = async () => {
        const msgs = await apiService.getMessages(activeChatSiteId);
        if (msgs) setChatMessages(msgs);
      };
      fetchMsgs(); // Initial fetch
      interval = window.setInterval(fetchMsgs, 3000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [activeChatSiteId]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const handleAuthorizeAccess = async (siteId: string) => { await apiService.authorizeAccess(siteId); loadData(); notify('Authorized', 'success'); };
  const handleAuthorizeKey = async (siteId: string) => { await apiService.authorizeKeyBorrow(siteId); loadData(); notify('Authorized', 'success'); };
  const handleDenyAccess = async (siteId: string) => { await apiService.request(`/access/cancel/${siteId}`, { method: 'POST' }); loadData(); };

  const handleSendChat = async () => {
    if (!chatInput.trim() || !activeChatSiteId) return;
    const msg = { siteId: activeChatSiteId, senderId: 'FO-001', senderName: 'FO ENG', role: 'FO' as const, content: chatInput };
    setChatInput('');
    await apiService.sendMessage(msg);
    const msgs = await apiService.getMessages(activeChatSiteId);
    if (msgs) setChatMessages(msgs);
  };

  const pendingAccess = sites.filter(s => s.pendingVisitor && !s.accessAuthorized);
  const pendingKeys = sites.filter(s => s.pendingKeyLog && !s.keyAccessAuthorized);
  const activeVisitors = sites.filter(s => s.currentVisitor);

  if (isLoading) return <div className="h-full flex items-center justify-center"><Loader2 size={48} className="text-blue-600 animate-spin" /></div>;

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      {fullScreenImage && <div className="fixed inset-0 z-[100] bg-slate-900/98 backdrop-blur-xl flex items-center justify-center p-10" onClick={() => setFullScreenImage(null)}><button className="absolute top-8 right-8 text-white"><X size={32} /></button><img src={fullScreenImage} className="max-w-full max-h-full rounded-[40px] shadow-2xl" /></div>}

      {/* CHAT MODAL FO SIDE */}
      {activeChatSiteId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-xl h-[80vh] rounded-[48px] shadow-2xl flex flex-col overflow-hidden">
            <div className="p-8 bg-blue-600 text-white flex justify-between items-center">
              <div><h2 className="text-2xl font-black uppercase">Vendor Comms Hub</h2><p className="text-[10px] font-black text-blue-100 uppercase">{sites.find(s => s.id === activeChatSiteId)?.name}</p></div>
              <button onClick={() => setActiveChatSiteId(null)} className="p-2 hover:bg-white/10 rounded-full"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/50">
              {chatMessages.length === 0 && <p className="text-center py-20 text-[10px] font-black text-slate-400 uppercase tracking-widest">Awaiting Vendor communication link...</p>}
              {chatMessages.map(m => (
                <div key={m.id} className={`flex ${m.role === 'FO' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-5 rounded-3xl text-sm font-medium shadow-sm ${m.role === 'FO' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'}`}>
                    <p className={`text-[8px] font-black uppercase mb-1 ${m.role === 'FO' ? 'text-blue-100' : 'text-blue-600'}`}>{m.senderName}</p>
                    <p>{m.content}</p>
                    <p className={`text-[8px] mt-2 font-bold ${m.role === 'FO' ? 'text-blue-200' : 'text-slate-400'}`}>{new Date(m.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="p-6 bg-white border-t border-slate-100 flex gap-4">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSendChat()} placeholder="Direct message to Vendor..." className="flex-1 px-6 py-4 bg-slate-50 rounded-2xl text-sm font-black outline-none focus:ring-4 focus:ring-blue-600/10" />
              <button onClick={handleSendChat} className="p-4 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-500/20"><Send size={24} /></button>
            </div>
          </div>
        </div>
      )}

      {(pendingAccess.length > 0 || pendingKeys.length > 0) && (
        <div className="bg-white border-2 border-rose-100 p-8 rounded-[48px] shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 p-8 opacity-[0.03]"><ShieldAlert size={160} className="text-rose-900" /></div>
           <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-4"><div className="h-14 w-14 bg-rose-600 text-white rounded-3xl flex items-center justify-center shadow-lg"><ShieldAlert size={28} /></div><div><h2 className="text-2xl font-black text-slate-900 uppercase">Access Control Hub</h2><p className="text-[10px] font-black text-rose-500 uppercase">Sign Verification Requests</p></div></div>
           </div>
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {pendingAccess.map(s => (
                <div key={s.id} className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 hover:border-blue-200 transition-all flex flex-col gap-6">
                   <div className="flex items-center gap-6">
                      {s.pendingVisitor?.photo ? <img src={s.pendingVisitor.photo} onClick={() => setFullScreenImage(s.pendingVisitor?.photo || null)} className="h-24 w-24 rounded-3xl object-cover cursor-zoom-in shadow-xl" /> : <div className="h-24 w-24 rounded-3xl bg-slate-200 flex items-center justify-center text-slate-400"><User size={32} /></div>}
                      <div className="flex-1">
                        <p className="text-xs font-black text-blue-600 uppercase mb-1">{s.pendingVisitor?.raawaNumber || 'NO_RAAWA'}</p>
                        <h4 className="text-lg font-black text-slate-900 uppercase leading-none">{s.name}</h4>
                        <div className="flex gap-2 mt-3"><span className="text-[8px] font-black uppercase px-2 py-1 bg-white rounded border">{s.pendingVisitor?.vendor}</span><button onClick={() => setActiveChatSiteId(s.id)} className="text-[8px] font-black uppercase px-2 py-1 bg-blue-600 text-white rounded flex items-center gap-1"><MessageSquare size={10} /> Message</button></div>
                      </div>
                      <div className="flex gap-2"><button onClick={() => handleAuthorizeAccess(s.id)} className="h-14 w-14 bg-emerald-600 text-white rounded-2xl shadow-lg flex items-center justify-center"><Check size={24} /></button><button onClick={() => handleDenyAccess(s.id)} className="h-14 w-14 bg-white border text-slate-400 rounded-2xl flex items-center justify-center"><X size={24} /></button></div>
                   </div>
                </div>
              ))}
              {pendingKeys.map(s => (
                <div key={s.id} className="bg-amber-50/50 p-6 rounded-[32px] border border-amber-100 flex flex-col gap-6">
                   <div className="flex items-center gap-6">
                      <img src={s.pendingKeyLog?.borrowPhoto} onClick={() => setFullScreenImage(s.pendingKeyLog?.borrowPhoto || null)} className="h-24 w-24 rounded-3xl object-cover cursor-zoom-in shadow-xl" />
                      <div className="flex-1">
                        <p className="text-xs font-black text-amber-600 uppercase mb-1">{s.pendingKeyLog?.raawaNumber || 'NO_RAAWA'}</p>
                        <h4 className="text-lg font-black text-slate-900 uppercase leading-none">{s.name}</h4>
                        <p className="text-[9px] font-bold text-amber-500 uppercase mt-2 italic">Release: {s.pendingKeyLog?.releasedBy}</p>
                      </div>
                      <div className="flex gap-2"><button onClick={() => handleAuthorizeKey(s.id)} className="h-14 w-14 bg-amber-600 text-white rounded-2xl shadow-lg flex items-center justify-center"><Check size={24} /></button><button onClick={() => setActiveChatSiteId(s.id)} className="h-14 w-14 bg-white border text-blue-600 rounded-2xl flex items-center justify-center"><MessageSquare size={24} /></button></div>
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard title="Personnel on Site" value={activeVisitors.length} icon={<UserCheck size={24} className="text-indigo-600" />} change="Live Registry" isPositive={true} colorClass="bg-indigo-50" />
        <StatsCard title="Key Borrows" value={sites.filter(s => s.keyStatus === 'Borrowed').length} icon={<Key size={24} className="text-amber-600" />} change="External Custody" isPositive={false} colorClass="bg-amber-50" />
        <StatsCard title="Asset Nodes" value={sites.length} icon={<Tower size={24} className="text-blue-600" />} change="Global Sync" isPositive={true} colorClass="bg-blue-50" />
        <StatsCard title="System Link" value="Active" icon={<Activity size={24} className="text-emerald-600" />} change="Stable" isPositive={true} colorClass="bg-emerald-50" />
      </div>

      <div className="bg-white rounded-[48px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between"><h3 className="text-xl font-black uppercase tracking-tight">Active Operation Feed</h3></div>
        <div className="p-8">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeVisitors.map(s => (
                <div key={s.id} className="bg-slate-50/50 border border-slate-100 p-6 rounded-[32px] space-y-4 hover:shadow-xl transition-all group">
                   <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                         {s.currentVisitor?.photo && <img src={s.currentVisitor.photo} className="h-12 w-12 rounded-xl object-cover shadow-md" />}
                         <div><h4 className="text-sm font-black uppercase tracking-tight">{s.currentVisitor?.leadName}</h4><p className="text-[9px] font-bold text-slate-400 uppercase">{s.currentVisitor?.vendor}</p></div>
                      </div>
                      <button onClick={() => setActiveChatSiteId(s.id)} className="relative p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/10 group-hover:scale-110 transition-transform">
                        <MessageSquare size={16} />
                        <span className="absolute -top-1 -right-1 h-3 w-3 bg-rose-500 rounded-full border-2 border-white animate-pulse"></span>
                      </button>
                   </div>
                   <div className="h-px bg-slate-200"></div>
                   <div className="flex justify-between items-center text-[10px] font-black uppercase">
                      <div className="flex items-center gap-1.5"><Tower size={12} className="text-blue-600" /><span>{s.name}</span></div>
                      <div className="flex items-center gap-1 text-slate-400"><Clock size={12} /><span>{s.currentVisitor?.raawaNumber}</span></div>
                   </div>
                </div>
              ))}
              {activeVisitors.length === 0 && <p className="col-span-full py-20 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">No active missions detected on site.</p>}
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
