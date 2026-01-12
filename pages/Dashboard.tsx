
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
import { WorkSite, WorkTask, ChatMessage, VendorProfile } from '../types';

const Dashboard: React.FC = () => {
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [sites, setSites] = useState<WorkSite[]>([]);
  const [vendors, setVendors] = useState<VendorProfile[]>([]);
  const [allMessages, setAllMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  
  const [activeChatVendorId, setActiveChatVendorId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showFloatingChat, setShowFloatingChat] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { notify } = useNotify();

  const loadData = async () => {
    try {
      const [fetchedTasks, fetchedSites, fetchedVendors, fetchedMsgs] = await Promise.all([
        apiService.getTasks(), 
        apiService.getSites(),
        apiService.getVendors(),
        apiService.getAllMessages()
      ]);
      setTasks(fetchedTasks || []); 
      setSites(fetchedSites || []);
      setVendors(fetchedVendors || []);
      setAllMessages(fetchedMsgs || []);
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
    if (activeChatVendorId) {
      const vendorMsgs = allMessages.filter(m => m.vendorId === activeChatVendorId);
      setChatMessages(vendorMsgs);
      // Automatically mark as read if the chat is open
      if (showFloatingChat && vendorMsgs.some(m => m.role === 'VENDOR' && !m.isRead)) {
        apiService.markMessagesAsRead(activeChatVendorId);
      }
    }
  }, [allMessages, activeChatVendorId, showFloatingChat]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const handleAuthorizeAccess = async (siteId: string) => { await apiService.authorizeAccess(siteId); loadData(); notify('Authorized', 'success'); };
  const handleAuthorizeKey = async (siteId: string) => { await apiService.authorizeKeyBorrow(siteId); loadData(); notify('Authorized', 'success'); };
  const handleDenyAccess = async (siteId: string) => { await apiService.request(`/access/cancel/${siteId}`, { method: 'POST' }); loadData(); };

  const handleSendChat = async () => {
    if (!chatInput.trim() || !activeChatVendorId) return;
    const msg = { vendorId: activeChatVendorId, senderId: 'FO-001', senderName: 'FO ENG', role: 'FO' as const, content: chatInput };
    setChatInput('');
    try {
      await apiService.sendMessage(msg);
      loadData();
    } catch (err) {
      notify('Failed to send message', 'error');
    }
  };

  // Sort vendors by latest message timestamp (FB Messenger style)
  const getSortedVendors = () => {
    return [...vendors].sort((a, b) => {
      const aMsgs = allMessages.filter(m => m.vendorId === a.id);
      const bMsgs = allMessages.filter(m => m.vendorId === b.id);
      const aTime = aMsgs.length > 0 ? new Date(aMsgs[aMsgs.length - 1].timestamp).getTime() : 0;
      const bTime = bMsgs.length > 0 ? new Date(bMsgs[bMsgs.length - 1].timestamp).getTime() : 0;
      return bTime - aTime;
    });
  };

  const getUnreadCount = (vendorId: string) => {
    return allMessages.filter(m => m.vendorId === vendorId && m.role === 'VENDOR' && !m.isRead).length;
  };

  const pendingAccess = sites.filter(s => s.pendingVisitor && !s.accessAuthorized);
  const pendingKeys = sites.filter(s => s.pendingKeyLog && !s.keyAccessAuthorized);
  const activeVisitors = sites.filter(s => s.currentVisitor);
  
  const totalUnreadMessages = vendors.reduce((acc, v) => acc + getUnreadCount(v.id), 0);

  if (isLoading) return <div className="h-full flex items-center justify-center"><Loader2 size={48} className="text-blue-600 animate-spin" /></div>;

  return (
    <div className="relative min-h-full space-y-10 animate-in fade-in duration-700 pb-20">
      {fullScreenImage && <div className="fixed inset-0 z-[100] bg-slate-900/98 backdrop-blur-xl flex items-center justify-center p-10" onClick={() => setFullScreenImage(null)}><button className="absolute top-8 right-8 text-white"><X size={32} /></button><img src={fullScreenImage} className="max-w-full max-h-full rounded-[40px] shadow-2xl" /></div>}

      {/* FLOATING MESSENGER FO SIDE */}
      {showFloatingChat && (
        <div className="fixed bottom-24 right-8 z-[150] w-full max-w-sm h-[550px] bg-white rounded-[40px] shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4">
          <div className="p-6 bg-slate-900 text-white flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare size={18} className="text-blue-500" />
                <h3 className="text-xs font-black uppercase tracking-tight">Personnel Comms</h3>
              </div>
              <button onClick={() => setShowFloatingChat(false)} className="p-2 hover:bg-white/10 rounded-full"><X size={18} /></button>
            </div>
            
            {/* SCROLLABLE VENDOR LIST (FB MESSENGER STYLE) */}
            <div className="flex flex-col gap-1 max-h-40 overflow-y-auto custom-scrollbar pr-1">
              {getSortedVendors().length === 0 && <p className="text-[8px] font-black uppercase text-slate-500 text-center py-4">No Registered Units</p>}
              {getSortedVendors().map(v => {
                const unread = getUnreadCount(v.id);
                const isActive = activeChatVendorId === v.id;
                const lastMsg = allMessages.filter(m => m.vendorId === v.id).pop();
                
                return (
                  <button 
                    key={v.id} 
                    onClick={() => { setActiveChatVendorId(v.id); apiService.markMessagesAsRead(v.id); }}
                    className={`flex items-center justify-between p-3 rounded-2xl transition-all group ${isActive ? 'bg-blue-600 shadow-lg' : 'bg-white/5 hover:bg-white/10'}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                       <div className="relative flex-shrink-0">
                         <div className="h-9 w-9 rounded-full bg-slate-800 border border-white/20 overflow-hidden shadow-inner">
                            <img src={v.photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${v.fullName}`} className="h-full w-full object-cover" />
                         </div>
                         {unread > 0 && !isActive && (
                           <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-blue-500 border-2 border-slate-900 rounded-full animate-pulse shadow-lg"></span>
                         )}
                       </div>
                       <div className="text-left min-w-0">
                          <p className={`text-[10px] font-black uppercase leading-none truncate ${isActive ? 'text-white' : 'text-slate-100'}`}>{v.fullName}</p>
                          <p className={`text-[8px] font-bold mt-1 truncate ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                            {lastMsg ? lastMsg.content : 'Open link...'}
                          </p>
                       </div>
                    </div>
                    {unread > 0 && !isActive && (
                      <span className="text-[8px] font-black bg-blue-500 text-white px-1.5 py-0.5 rounded-md ml-2">{unread}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
            {!activeChatVendorId ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 p-8">
                <div className="h-16 w-16 bg-white rounded-[24px] border border-slate-100 flex items-center justify-center text-slate-300 shadow-sm">
                  <Users size={32} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">System Ready</p>
                  <p className="text-[9px] text-slate-400 font-bold mt-1">Select a vendor from the list above to view transmission history.</p>
                </div>
              </div>
            ) : (
              <>
                {chatMessages.length === 0 && <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest mt-10">Waiting for first signal...</p>}
                {chatMessages.map(m => (
                  <div key={m.id} className={`flex ${m.role === 'FO' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-4 rounded-3xl text-[11px] font-medium shadow-sm ${m.role === 'FO' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'}`}>
                      <p className={`text-[8px] font-black uppercase mb-1 ${m.role === 'FO' ? 'text-blue-200' : 'text-blue-600'}`}>{m.senderName}</p>
                      <p className="leading-relaxed">{m.content}</p>
                      <p className={`text-[7px] mt-1.5 font-bold ${m.role === 'FO' ? 'text-blue-300' : 'text-slate-400'}`}>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </>
            )}
          </div>

          <div className="p-4 bg-white border-t border-slate-100 flex gap-2">
            <input 
              value={chatInput} 
              onChange={e => setChatInput(e.target.value)} 
              onKeyPress={e => e.key === 'Enter' && handleSendChat()} 
              disabled={!activeChatVendorId}
              placeholder="Send mission directive..." 
              className="flex-1 px-4 py-3 bg-slate-50 rounded-2xl text-[11px] font-black outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50" 
            />
            <button 
              onClick={handleSendChat} 
              disabled={!activeChatVendorId || !chatInput.trim()}
              className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}

      {/* FO FLOATING CHAT BUTTON */}
      {!showFloatingChat && (
        <button 
          onClick={() => setShowFloatingChat(true)} 
          className="fixed bottom-8 right-8 z-[140] h-16 w-16 bg-slate-900 text-white rounded-3xl shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group"
        >
          <div className="relative">
            <MessageSquare size={28} className="group-hover:rotate-12 transition-transform" />
            {totalUnreadMessages > 0 && (
              <span className="absolute -top-2 -right-2 h-6 w-6 bg-rose-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-slate-900 animate-bounce">
                {totalUnreadMessages}
              </span>
            )}
          </div>
        </button>
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
                        <div className="flex gap-2 mt-3">
                          <span className="text-[8px] font-black uppercase px-2 py-1 bg-white rounded border">{s.pendingVisitor?.vendor}</span>
                          <button onClick={() => { setActiveChatVendorId(s.pendingVisitor?.vendorId || null); setShowFloatingChat(true); }} className="text-[8px] font-black uppercase px-2 py-1 bg-blue-600 text-white rounded flex items-center gap-1"><MessageSquare size={10} /> Message</button>
                        </div>
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
                      <div className="flex gap-2"><button onClick={() => handleAuthorizeKey(s.id)} className="h-14 w-14 bg-amber-600 text-white rounded-2xl shadow-lg flex items-center justify-center"><Check size={24} /></button><button onClick={() => { setActiveChatVendorId(s.pendingKeyLog?.borrowerId || null); setShowFloatingChat(true); }} className="h-14 w-14 bg-white border text-blue-600 rounded-2xl flex items-center justify-center"><MessageSquare size={24} /></button></div>
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
                      <button onClick={() => { setActiveChatVendorId(s.currentVisitor?.vendorId || null); setShowFloatingChat(true); }} className="relative p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/10 group-hover:scale-110 transition-transform">
                        <MessageSquare size={16} />
                        {getUnreadCount(s.currentVisitor?.vendorId || '') > 0 && (
                          <span className="absolute -top-1 -right-1 h-3 w-3 bg-rose-500 rounded-full border-2 border-white animate-pulse"></span>
                        )}
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
