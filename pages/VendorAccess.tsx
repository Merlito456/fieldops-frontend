
import React, { useState, useEffect, useRef } from 'react';
import { 
  LogIn, LogOut, Key, UserCheck, Camera, X, TowerControl as Tower, Search, AlertCircle, ShieldCheck, 
  Loader2, Check, MapPin, User, Shield, Fingerprint, FlipHorizontal, FileText, Hash, UserPlus, 
  MessageSquare, Send, PlusCircle, MinusCircle, AlertTriangle, Clock, Info, CheckCircle2
} from 'lucide-react';
import { apiService } from '../services/apiService';
import { WorkSite, SiteVisitor, KeyLog, VendorProfile, ChatMessage } from '../types';
import { useNotify } from '../App';

const VendorAccess: React.FC = () => {
  const [activeVendor, setActiveVendor] = useState<VendorProfile | null>(null);
  const [sites, setSites] = useState<WorkSite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSite, setSelectedSite] = useState<WorkSite | null>(null);
  const [activeModal, setActiveModal] = useState<'LoginProtocol' | 'LogoutProtocol' | 'KeyBorrow' | 'KeyReturn' | 'Disclaimer' | 'Waiting' | 'Registration' | 'Profile' | 'PersonnelLogin' | null>(null);
  const [waitingFor, setWaitingFor] = useState<'SITE' | 'KEY' | null>(null);
  
  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [gpsVerified, setGpsVerified] = useState<boolean | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [loginFormValues, setLoginFormValues] = useState<any>(null);
  const [keyBorrowValues, setKeyBorrowValues] = useState<any>(null);
  const [additionalPersonnel, setAdditionalPersonnel] = useState<string[]>([]);
  
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { notify } = useNotify();

  const loadInitialData = async () => {
    try {
      const fetchedSites = await apiService.getSites();
      const vendor = apiService.getActiveVendor();
      if (fetchedSites) setSites(fetchedSites);
      setActiveVendor(vendor);
    } catch (err) { notify('Local Ledger Mode', 'info'); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { 
    loadInitialData(); 
    const interval = setInterval(async () => {
      const fetchedSites = await apiService.getSites();
      if (fetchedSites) setSites(fetchedSites);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let interval: number | null = null;
    if (showChat && activeVendor) {
      const fetchMsgs = async () => {
        try {
          const msgs = await apiService.getMessages(activeVendor.id);
          if (msgs) setChatMessages(msgs);
        } catch (e) { console.error("Chat sync error"); }
      };
      fetchMsgs();
      interval = window.setInterval(fetchMsgs, 3000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [showChat, activeVendor]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    if (streamActive) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: false })
        .then(s => { stream = s; if (videoRef.current) videoRef.current.srcObject = s; })
        .catch(() => { notify('Camera access denied', 'error'); setStreamActive(false); });
    }
    return () => stream?.getTracks().forEach(t => t.stop());
  }, [streamActive, facingMode]);

  useEffect(() => {
    let watchId: number | null = null;
    if (streamActive && "geolocation" in navigator) {
      watchId = navigator.geolocation.watchPosition((pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setLocation({ lat: latitude, lng: longitude, accuracy });
        if (selectedSite?.gpsCoordinates) {
          const coords = selectedSite.gpsCoordinates.split(',').map(n => parseFloat(n.trim()));
          const d = 6371e3 * 2 * Math.atan2(Math.sqrt(Math.sin((coords[0]-latitude)*Math.PI/360)**2 + Math.cos(latitude*Math.PI/180)*Math.cos(coords[0]*Math.PI/180)*Math.sin((coords[1]-longitude)*Math.PI/360)**2), Math.sqrt(1-(Math.sin((coords[0]-latitude)*Math.PI/360)**2 + Math.cos(latitude*Math.PI/180)*Math.cos(coords[0]*Math.PI/180)*Math.sin((coords[1]-longitude)*Math.PI/360)**2)));
          setGpsVerified(d < 800);
        } else setGpsVerified(true);
      });
    }
    return () => { if (watchId !== null) navigator.geolocation.clearWatch(watchId); };
  }, [streamActive, selectedSite]);

  const capturePhoto = () => {
    if (videoRef.current && location) {
      const v = videoRef.current;
      const c = document.createElement('canvas');
      c.width = v.videoWidth; c.height = v.videoHeight + 350;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.save();
      if (facingMode === 'user') { ctx.translate(c.width, 0); ctx.scale(-1, 1); }
      ctx.drawImage(v, 0, 0, v.videoWidth, v.videoHeight);
      ctx.restore();
      ctx.fillStyle = "#0f172a"; ctx.fillRect(0, v.videoHeight, c.width, 350);
      const ledger = [["OPERATOR", activeVendor?.fullName?.toUpperCase() || "NEW_VENDOR"], ["SITE", selectedSite?.name?.toUpperCase() || "N/A"], ["GPS", `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`], ["TIME", new Date().toLocaleString()]];
      ctx.textAlign = "left";
      ledger.forEach((r, i) => {
        ctx.font = "900 24px Inter"; ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.fillText(r[0], 60, v.videoHeight + 70 + (i * 42));
        ctx.font = "bold 26px Inter"; ctx.fillStyle = "#ffffff"; ctx.fillText(r[1], 300, v.videoHeight + 70 + (i * 42));
      });
      setCapturedPhoto(c.toDataURL('image/jpeg', 0.9)); setStreamActive(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !activeVendor) return;
    const msg = { vendorId: activeVendor.id, senderId: activeVendor.id, senderName: activeVendor.fullName, role: 'VENDOR' as const, content: chatInput, siteId: selectedSite?.id };
    setChatInput('');
    try {
      await apiService.sendMessage(msg);
      const msgs = await apiService.getMessages(activeVendor.id);
      if (msgs) setChatMessages(msgs);
    } catch (err) { notify('Message failed to send', 'error'); }
  };

  const startCamera = (mode: 'user' | 'environment') => {
    setFacingMode(mode);
    setStreamActive(true);
    setCapturedPhoto(null);
  };

  const finalizeRequest = async () => {
    if (!selectedSite || !activeVendor) return;
    setIsSubmitting(true);
    try {
      if (waitingFor === 'SITE') {
        await apiService.requestAccess(selectedSite.id, {
          vendorId: activeVendor.id, leadName: activeVendor.fullName, contactNumber: activeVendor.contactNumber,
          personnel: [activeVendor.fullName, ...additionalPersonnel], vendor: activeVendor.company, 
          activity: loginFormValues.activity, raawaNumber: loginFormValues.raawaNumber, checkedBy: loginFormValues.checkedBy,
          startTime: loginFormValues.startTime, expectedEndTime: loginFormValues.expectedEndTime, photo: capturedPhoto || undefined,
          rocLogged: true, rocName: loginFormValues.rocName, rocTime: loginFormValues.rocTime, nocLogged: false
        });
      } else if (waitingFor === 'KEY') {
        await apiService.requestKeyBorrow(selectedSite.id, { 
          siteId: selectedSite.id, siteName: selectedSite.name, ...keyBorrowValues, borrowerId: activeVendor.id 
        });
      }
      setActiveModal('Waiting');
    } catch (err) { notify('Transmission Failed', 'error'); }
    finally { setIsSubmitting(false); }
  };

  const confirmAccess = async () => {
    if (!selectedSite) return;
    const freshSites = await apiService.getSites();
    const site = freshSites.find(s => s.id === selectedSite.id);
    if (waitingFor === 'SITE' && site?.pendingVisitor) await apiService.checkInVendor(site.id, site.pendingVisitor);
    else if (waitingFor === 'KEY' && site?.pendingKeyLog) await apiService.confirmKeyBorrow(site.id);
    closeModals();
    loadInitialData();
  };

  const handleRegisterSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const f = new FormData(e.currentTarget);
    const vendorData: VendorProfile = {
      id: `VND-${Date.now()}`,
      username: (f.get('username') as string).toUpperCase(),
      password: (f.get('password') as string).toUpperCase(),
      fullName: f.get('fullName') as string,
      company: f.get('company') as string,
      contactNumber: f.get('contactNumber') as string,
      idNumber: f.get('idNumber') as string,
      specialization: f.get('specialization') as string,
      photo: capturedPhoto || undefined,
      verified: true,
      createdAt: new Date().toISOString()
    };
    try {
      const registered = await apiService.registerVendor(vendorData);
      setActiveVendor(registered);
      notify('Identity Initialized', 'success');
      closeModals();
    } catch (err) { notify('Registration Failed', 'error'); } 
    finally { setIsSubmitting(false); }
  };

  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const f = new FormData(e.currentTarget);
    const username = f.get('username') as string;
    const password = f.get('password') as string;
    try {
      const vendor = await apiService.loginVendor(username, password);
      if (vendor) {
        setActiveVendor(vendor);
        notify(`Welcome back, ${vendor.fullName}`, 'success');
        closeModals();
      } else { notify('Invalid Credentials', 'error'); }
    } catch (err) { notify('Authentication Failure', 'error'); } 
    finally { setIsSubmitting(false); }
  };

  const handleLogoutSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!capturedPhoto || !selectedSite) return notify('Exit Photo Required', 'error');
    setIsSubmitting(true);
    const f = new FormData(e.currentTarget);
    try {
      await apiService.checkOutVendor(selectedSite.id, capturedPhoto, {
        rocLogoutName: f.get('rocName') as string,
        rocLogoutTime: f.get('rocTime') as string,
        activityRemarks: f.get('remarks') as string
      });
      notify('Operation Successfully Terminated', 'success');
      closeModals();
      loadInitialData();
    } catch (err) { notify('Logout Failed', 'error'); }
    finally { setIsSubmitting(false); }
  };

  const handleKeyReturnSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!capturedPhoto || !selectedSite) return notify('Return Photo Required', 'error');
    setIsSubmitting(true);
    try {
      await apiService.returnKey(selectedSite.id, capturedPhoto);
      notify('Key Restored to Site Locker', 'success');
      closeModals();
      loadInitialData();
    } catch (err) { notify('Key Return Failed', 'error'); }
    finally { setIsSubmitting(false); }
  };

  const closeModals = () => { setActiveModal(null); setWaitingFor(null); setCapturedPhoto(null); setStreamActive(false); setAdditionalPersonnel([]); setShowChat(false); setSelectedSite(null); };

  const currentSiteState = selectedSite ? sites.find(s => s.id === selectedSite.id) : null;
  const isAuthorized = waitingFor === 'SITE' ? currentSiteState?.accessAuthorized : currentSiteState?.keyAccessAuthorized;

  const unreadCount = chatMessages.filter(m => m.role === 'FO' && !m.isRead).length;

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;

  return (
    <div className="relative min-h-full space-y-10 animate-in fade-in duration-700 pb-20">
      {/* CAMERA OVERLAY */}
      {streamActive && (
        <div className="fixed inset-0 z-[250] bg-black flex flex-col items-center justify-center">
          <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`} />
          <div className="absolute inset-0 p-8 flex flex-col justify-between pointer-events-none">
            <div className="flex justify-end pointer-events-auto gap-2">
              <button onClick={() => setFacingMode(f => f === 'user' ? 'environment' : 'user')} className="p-4 bg-black/60 text-white rounded-full"><FlipHorizontal size={24} /></button>
              <button onClick={() => setStreamActive(false)} className="p-4 bg-black/60 text-white rounded-full"><X size={24} /></button>
            </div>
            <div className="flex flex-col items-center pointer-events-auto gap-6">
              <span className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest border ${gpsVerified ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                {gpsVerified === null ? 'LOCATING...' : gpsVerified ? 'PROXIMITY_LOCK' : 'ASSET_OUT_OF_BOUNDS'}
              </span>
              <button onClick={capturePhoto} className="w-24 h-24 bg-white rounded-full border-[6px] border-white/20 flex items-center justify-center shadow-2xl">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white"><Camera size={32} /></div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHAT BOX */}
      {showChat && activeVendor && (
        <div className="fixed bottom-24 right-8 z-[200] w-full max-w-sm h-[500px] bg-white rounded-[40px] shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4">
          <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-blue-600 rounded-2xl flex items-center justify-center"><Shield size={20} /></div>
              <div><p className="text-xs font-black uppercase leading-tight">FO Command Link</p><p className="text-[9px] text-blue-400 font-bold uppercase">{activeVendor.fullName}</p></div>
            </div>
            <button onClick={() => setShowChat(false)} className="p-2 hover:bg-white/10 rounded-full"><X size={20} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
            {chatMessages.length === 0 && <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest mt-10">HANDSHAKE ACTIVE. DIRECT LINK ESTABLISHED.</p>}
            {chatMessages.map(m => (
              <div key={m.id} className={`flex ${m.role === 'VENDOR' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-4 rounded-3xl text-xs font-medium shadow-sm ${m.role === 'VENDOR' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'}`}>
                  <p>{m.content}</p>
                  <p className={`text-[8px] mt-2 font-bold ${m.role === 'VENDOR' ? 'text-blue-200' : 'text-slate-400'}`}>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="p-4 bg-white border-t border-slate-100 flex gap-2">
            <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSendMessage()} placeholder="Message Field Officer..." className="flex-1 px-4 py-3 bg-slate-50 rounded-2xl text-xs font-black outline-none focus:ring-2 focus:ring-blue-600 transition-all" />
            <button onClick={handleSendMessage} className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20 transition-all active:scale-95"><Send size={18} /></button>
          </div>
        </div>
      )}

      {/* PERSISTENT FLOATING MESSENGER BUTTON */}
      {activeVendor && !showChat && (
        <button onClick={() => setShowChat(true)} className="fixed bottom-8 right-8 z-[190] h-16 w-16 bg-blue-600 text-white rounded-3xl shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-blue-500/30 group">
          <div className="relative">
            <MessageSquare size={28} className="group-hover:rotate-12 transition-transform" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-rose-500 rounded-full border-2 border-white animate-pulse"></span>
            )}
          </div>
        </button>
      )}

      {!activeVendor ? (
        <div className="max-w-xl mx-auto space-y-12 py-20 text-center animate-in zoom-in">
           <div className="space-y-4">
              <div className="h-24 w-24 bg-slate-900 text-white rounded-[32px] mx-auto flex items-center justify-center shadow-2xl animate-pulse"><Shield size={48} /></div>
              <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Protocol Entry Kiosk</h1>
              <p className="text-xs font-bold text-blue-600 uppercase tracking-widest leading-relaxed">Infrastructure Security Hub</p>
           </div>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <button onClick={() => setActiveModal('Registration')} className="group p-10 bg-white border border-slate-200 rounded-[48px] shadow-xl hover:shadow-2xl hover:border-blue-500 transition-all flex flex-col items-center gap-6">
                 <div className="p-5 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all"><Fingerprint size={40} /></div>
                 <div><h3 className="text-sm font-black uppercase tracking-tight">Initialize Identity</h3><p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Register as Vendor</p></div>
              </button>
              <button onClick={() => setActiveModal('PersonnelLogin')} className="group p-10 bg-white border border-slate-200 rounded-[48px] shadow-xl hover:shadow-2xl hover:border-emerald-500 transition-all flex flex-col items-center gap-6">
                 <div className="p-5 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-all"><LogIn size={40} /></div>
                 <div><h3 className="text-sm font-black uppercase tracking-tight">Personnel Entry</h3><p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Secure Credentials</p></div>
              </button>
           </div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center bg-white p-8 rounded-[48px] shadow-sm border border-slate-100">
             <div className="flex items-center gap-6">
                <div onClick={() => setActiveModal('Profile')} className="h-16 w-16 bg-slate-50 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-slate-100 cursor-pointer hover:border-blue-500 transition-all shadow-sm">
                   {activeVendor.photo ? <img src={activeVendor.photo} className="w-full h-full object-cover" /> : <User size={28} className="text-slate-400" />}
                </div>
                <div><h1 className="text-2xl font-black uppercase tracking-tight leading-none">{activeVendor.fullName}</h1><p className="text-blue-600 font-black uppercase text-[10px] tracking-widest mt-1.5">{activeVendor.company} • VENDOR UNIT</p></div>
             </div>
             <button onClick={() => { apiService.logoutVendor(); setActiveVendor(null); closeModals(); }} className="flex items-center gap-3 px-6 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-rose-600 transition-all shadow-xl shadow-slate-900/10">
               <LogOut size={16} /> <span>Terminate Session</span>
             </button>
          </div>

          <div className="relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={24} />
            <input 
              type="text" 
              placeholder="FILTER SITE REGISTRY..."
              className="w-full pl-16 pr-8 py-5 bg-white border border-slate-100 rounded-[32px] font-black text-sm uppercase outline-none focus:ring-4 focus:ring-blue-500/5 transition-all shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sites.filter(s => s.name.toUpperCase().includes(searchQuery.toUpperCase()) || s.id.toUpperCase().includes(searchQuery.toUpperCase())).map(s => (
              <div key={s.id} className="bg-white rounded-[48px] border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-2xl hover:border-blue-500 transition-all group">
                <div className="p-10 flex-1 space-y-6">
                  <div className="flex justify-between items-start">
                    <div className="p-4 bg-slate-50 rounded-2xl group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors shadow-sm"><Tower size={28} /></div>
                    <div className="flex flex-col items-end gap-2">
                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">{s.id}</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black uppercase tracking-tight leading-tight mb-2">{s.name}</h3>
                    <div className="flex items-center text-[10px] font-black text-slate-400 uppercase tracking-widest"><MapPin size={12} className="mr-2" /> {s.address}</div>
                  </div>
                </div>
                <div className="p-8 bg-slate-50 border-t border-slate-100 grid grid-cols-2 gap-4">
                   {s.currentVisitor ? (
                     <button onClick={() => { setSelectedSite(s); setActiveModal('LogoutProtocol'); }} className="col-span-2 py-5 bg-rose-600 text-white rounded-[24px] font-black text-[11px] uppercase shadow-lg hover:brightness-110 active:scale-95 transition-all">End Mission</button>
                   ) : (
                     <button onClick={() => { setSelectedSite(s); if (s.accessAuthorized) { setWaitingFor('SITE'); setActiveModal('Waiting'); } else setActiveModal('LoginProtocol'); }} className={`py-5 ${s.accessAuthorized ? 'bg-blue-600 animate-pulse' : 'bg-emerald-600'} text-white rounded-[24px] font-black text-[11px] uppercase shadow-lg hover:brightness-110 active:scale-95 transition-all`}>
                       {s.accessAuthorized ? 'Authorized: IN' : 'Request IN'}
                     </button>
                   )}
                   <button onClick={() => { setSelectedSite(s); if (s.keyStatus === 'Borrowed') setActiveModal('KeyReturn'); else if (s.keyAccessAuthorized) { setWaitingFor('KEY'); setActiveModal('Waiting'); } else setActiveModal('KeyBorrow'); }} className={`py-5 ${s.keyStatus === 'Borrowed' ? 'bg-amber-600' : s.keyAccessAuthorized ? 'bg-blue-600 animate-pulse' : 'bg-slate-900'} text-white rounded-[24px] font-black text-[11px] uppercase shadow-lg hover:brightness-110 active:scale-95 transition-all`}>
                     {s.keyStatus === 'Borrowed' ? 'Key OUT' : s.keyAccessAuthorized ? 'Authorized: KEY' : 'Request KEY'}
                   </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {/* ... keeping logic for the rest of the modals ... */}
    </div>
  );
};

export default VendorAccess;
