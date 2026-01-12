
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
    if ((activeModal === 'Waiting' || showChat) && selectedSite) {
      interval = window.setInterval(async () => {
        const freshSites = await apiService.getSites();
        if (freshSites) setSites(freshSites);
      }, 3000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [activeModal, showChat, selectedSite]);

  useEffect(() => {
    let interval: number | null = null;
    if (showChat && selectedSite) {
      const fetchMsgs = async () => {
        try {
          const msgs = await apiService.getMessages(selectedSite.id);
          if (msgs) setChatMessages(msgs);
        } catch (e) {
          console.error("Chat fetch error:", e);
        }
      };
      fetchMsgs();
      interval = window.setInterval(fetchMsgs, 3000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [showChat, selectedSite]);

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
    if (!chatInput.trim() || !selectedSite || !activeVendor) return;
    const msg = { siteId: selectedSite.id, senderId: activeVendor.id, senderName: activeVendor.fullName, role: 'VENDOR' as const, content: chatInput };
    setChatInput('');
    try {
      await apiService.sendMessage(msg);
      const msgs = await apiService.getMessages(selectedSite.id);
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
          siteId: selectedSite.id, siteName: selectedSite.name, ...keyBorrowValues 
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
    } catch (err) {
      notify('Registration Failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
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
      } else {
        notify('Invalid Credentials', 'error');
      }
    } catch (err) {
      notify('Authentication Failure', 'error');
    } finally {
      setIsSubmitting(false);
    }
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
      {showChat && selectedSite && (
        <div className="fixed bottom-24 right-8 z-[200] w-full max-w-sm h-[500px] bg-white rounded-[40px] shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4">
          <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-blue-600 rounded-2xl flex items-center justify-center"><Shield size={20} /></div>
              <div><p className="text-xs font-black uppercase leading-tight">FO Command Link</p><p className="text-[9px] text-blue-400 font-bold uppercase">{selectedSite.name}</p></div>
            </div>
            <button onClick={() => setShowChat(false)} className="p-2 hover:bg-white/10 rounded-full"><X size={20} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
            {chatMessages.length === 0 && <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest mt-10">Waiting for FO transmission...</p>}
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
      {activeVendor && selectedSite && !showChat && (
        <button onClick={() => setShowChat(true)} className="fixed bottom-8 right-8 z-[190] h-16 w-16 bg-blue-600 text-white rounded-3xl shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-blue-500/30">
          <div className="relative">
            <MessageSquare size={28} />
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-rose-500 rounded-full border-2 border-white animate-pulse"></span>
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
                       <button onClick={() => { setSelectedSite(s); setShowChat(true); }} className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><MessageSquare size={16} /></button>
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

      {/* MODAL SYSTEM */}
      {activeModal === 'PersonnelLogin' && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
           <div className="bg-white w-full max-w-md rounded-[56px] p-12 shadow-2xl space-y-10 animate-in zoom-in duration-300">
              <div className="text-center space-y-4">
                 <div className="h-20 w-20 bg-emerald-50 text-emerald-600 rounded-3xl mx-auto flex items-center justify-center shadow-sm"><LogIn size={36} /></div>
                 <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900">Portal Entry</h2>
              </div>
              <form onSubmit={handleLoginSubmit} className="space-y-6">
                 <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Access Username</label><input name="username" required className="w-full p-5 bg-slate-50 border-2 border-transparent rounded-3xl font-black uppercase outline-none focus:border-emerald-600 focus:bg-white transition-all" /></div>
                 <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Secret Key</label><input name="password" type="password" required className="w-full p-5 bg-slate-50 border-2 border-transparent rounded-3xl font-black uppercase outline-none focus:border-emerald-600 focus:bg-white transition-all" /></div>
                 <button disabled={isSubmitting} type="submit" className="w-full py-6 bg-emerald-600 text-white font-black rounded-[32px] uppercase text-xs shadow-2xl shadow-emerald-600/20 tracking-[0.2em]">{isSubmitting ? 'Verifying...' : 'Authorize'}</button>
                 <button type="button" onClick={closeModals} className="w-full py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Abort</button>
              </form>
           </div>
        </div>
      )}

      {/* ADDITIONAL MODALS (Waiting, Disclaimer, Logout, KeyReturn, Profile, KeyBorrow, LoginProtocol, Registration) */}
      {/* ... keeping logic for the rest of the modals but ensuring they are correctly hooked up to state ... */}
      
      {activeModal === 'Profile' && activeVendor && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
           <div className="bg-white w-full max-w-md rounded-[56px] overflow-hidden shadow-2xl animate-in zoom-in duration-300">
              <div className="p-12 bg-slate-900 text-white text-center space-y-6">
                 <div className="h-32 w-32 mx-auto rounded-[32px] overflow-hidden border-4 border-white/10 shadow-2xl">
                    <img src={activeVendor.photo} className="w-full h-full object-cover" />
                 </div>
                 <div>
                    <h2 className="text-3xl font-black uppercase tracking-tight">{activeVendor.fullName}</h2>
                    <p className="text-blue-500 font-black uppercase text-[10px] tracking-widest mt-1">{activeVendor.company}</p>
                 </div>
              </div>
              <div className="p-12 space-y-8">
                 <div className="grid grid-cols-2 gap-8">
                    <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Reg ID</p><p className="text-sm font-black text-slate-900">{activeVendor.idNumber}</p></div>
                    <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Contact</p><p className="text-sm font-black text-slate-900">{activeVendor.contactNumber}</p></div>
                    <div className="col-span-2"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Expertise Matrix</p><p className="text-sm font-black text-slate-900 uppercase">{activeVendor.specialization}</p></div>
                 </div>
                 <button onClick={closeModals} className="w-full py-5 bg-slate-100 text-slate-900 font-black rounded-3xl uppercase text-[11px] tracking-widest">Close Record</button>
              </div>
           </div>
        </div>
      )}

      {/* WAITING MODAL */}
      {activeModal === 'Waiting' && selectedSite && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/85 backdrop-blur-2xl">
           <div className="bg-white w-full max-md rounded-[56px] p-12 text-center space-y-10 animate-in zoom-in shadow-2xl">
              <div className={`h-28 w-28 mx-auto rounded-[32px] flex items-center justify-center shadow-xl ${isAuthorized ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600 animate-pulse'}`}>
                 {isAuthorized ? <ShieldCheck size={56} /> : <Loader2 className="animate-spin" size={56} />}
              </div>
              <div className="space-y-4">
                 <h2 className="text-3xl font-black uppercase tracking-tighter">{isAuthorized ? 'GRANTED' : 'PENDING'}</h2>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                    {isAuthorized ? 'The Field Officer has electronically authorized your request. Proceed to site.' : 'Communication established. Awaiting FO operational approval signal...'}
                 </p>
              </div>
              {isAuthorized ? (
                <button onClick={confirmAccess} className="w-full py-6 bg-emerald-600 text-white font-black rounded-[32px] uppercase text-xs shadow-2xl shadow-emerald-600/20 tracking-widest">Execute Entry</button>
              ) : (
                <div className="space-y-4">
                  <button onClick={() => setShowChat(true)} className="w-full py-5 border-2 border-blue-600 text-blue-600 font-black rounded-[32px] uppercase text-[10px] tracking-widest hover:bg-blue-600 hover:text-white transition-all">Open Chat Support</button>
                  <button onClick={closeModals} className="w-full py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Abort Transmission</button>
                </div>
              )}
           </div>
        </div>
      )}

      {/* DISCLAIMER MODAL */}
      {activeModal === 'Disclaimer' && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/85 backdrop-blur-2xl">
           <div className="bg-white w-full max-w-lg rounded-[56px] p-12 space-y-10 animate-in zoom-in shadow-2xl">
              <div className="flex items-center gap-5 text-rose-600">
                <div className="p-4 bg-rose-50 rounded-2xl"><AlertTriangle size={36} /></div>
                <h2 className="text-3xl font-black uppercase tracking-tight">Compliance</h2>
              </div>
              <div className="space-y-5 text-sm font-medium text-slate-600 leading-relaxed max-h-[35vh] overflow-y-auto pr-4 custom-scrollbar">
                <p>1. PPE MANDATE: By clicking "I Agree", you certify that all site personnel are equipped with standard safety gear.</p>
                <p>2. RAAWA ADHERENCE: You certify that the active RAAWA has been reviewed by all team members on-site.</p>
                <p>3. MONITORING: You acknowledge that all site activities are recorded via NOC telemetry and forensic imagery.</p>
                <p>4. HARDWARE: No unauthorized hardware modifications are permitted without explicit FO Engineering approval.</p>
              </div>
              <div className="flex gap-4">
                <button onClick={() => setActiveModal(waitingFor === 'SITE' ? 'LoginProtocol' : 'KeyBorrow')} className="flex-1 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Back</button>
                <button onClick={finalizeRequest} className="flex-[2] py-6 bg-slate-900 text-white font-black rounded-[32px] uppercase text-xs shadow-2xl tracking-[0.2em]">Digitally Sign</button>
              </div>
           </div>
        </div>
      )}

      {/* LOGOUT PROTOCOL MODAL */}
      {activeModal === 'LogoutProtocol' && selectedSite && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
           <div className="bg-white w-full max-w-xl rounded-[56px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-300">
              <div className="p-10 border-b border-slate-50 flex items-center justify-between"><h2 className="text-3xl font-black uppercase tracking-tight text-slate-900">Mission Termination</h2><button onClick={closeModals} className="p-2 hover:bg-slate-50 rounded-full"><X size={24} /></button></div>
              <form onSubmit={handleLogoutSubmit} className="p-10 space-y-8 overflow-y-auto max-h-[75vh]">
                 <div onClick={() => startCamera('environment')} className="aspect-video bg-slate-50 rounded-[40px] overflow-hidden cursor-pointer border-4 border-dashed border-slate-200 flex flex-col items-center justify-center gap-4 hover:border-blue-500 transition-all">
                    {capturedPhoto ? <img src={capturedPhoto} className="w-full h-full object-cover" /> : <div className="text-center space-y-3"><Camera size={48} className="mx-auto text-slate-300" /><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Exit Forensic Capture</p></div>}
                 </div>
                 <div className="space-y-6">
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">ROC Release Officer</label><input name="rocName" required className="w-full p-5 bg-slate-50 rounded-3xl font-black text-sm uppercase outline-none focus:ring-2 focus:ring-rose-500" placeholder="Sign-off Officer" /></div>
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Release Time</label><input name="rocTime" type="datetime-local" required className="w-full p-5 bg-slate-50 rounded-3xl font-bold text-xs" /></div>
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Final Status Brief</label><textarea name="remarks" className="w-full p-5 bg-slate-50 rounded-3xl font-medium text-sm italic min-h-[100px]" placeholder="Summary of work completed..."></textarea></div>
                 </div>
                 <button type="submit" className="w-full py-6 bg-rose-600 text-white font-black rounded-[32px] uppercase text-xs shadow-2xl shadow-rose-600/20 tracking-widest">Verify & Close Registry</button>
              </form>
           </div>
        </div>
      )}

      {/* KEY RETURN MODAL */}
      {activeModal === 'KeyReturn' && selectedSite && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
           <div className="bg-white w-full max-w-md rounded-[56px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-300">
              <div className="p-10 border-b border-slate-50 flex items-center justify-between"><h2 className="text-3xl font-black uppercase tracking-tight text-slate-900">Key Custody</h2><button onClick={closeModals} className="p-2 hover:bg-slate-50 rounded-full"><X size={24} /></button></div>
              <form onSubmit={handleKeyReturnSubmit} className="p-10 space-y-8">
                 <div onClick={() => startCamera('environment')} className="aspect-video bg-slate-50 rounded-[40px] overflow-hidden cursor-pointer border-4 border-dashed border-slate-200 flex flex-col items-center justify-center gap-4 hover:border-amber-500 transition-all">
                    {capturedPhoto ? <img src={capturedPhoto} className="w-full h-full object-cover" /> : <div className="text-center space-y-3"><Camera size={48} className="mx-auto text-slate-300" /><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Verify Key Position</p></div>}
                 </div>
                 <button type="submit" className="w-full py-6 bg-amber-600 text-white font-black rounded-[32px] uppercase text-xs shadow-2xl shadow-amber-600/20 tracking-widest">Restore Node Control</button>
              </form>
           </div>
        </div>
      )}

      {/* KEY REQUEST MODAL */}
      {activeModal === 'KeyBorrow' && selectedSite && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
           <div className="bg-white w-full max-w-lg rounded-[56px] shadow-2xl flex flex-col overflow-hidden max-h-[95vh] animate-in zoom-in duration-300">
              <div className="p-10 border-b border-slate-50 flex items-center justify-between"><h2 className="text-3xl font-black uppercase tracking-tight">Key Requisition</h2><button onClick={closeModals} className="p-2 hover:bg-slate-50 rounded-full"><X size={24} /></button></div>
              <form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); if (!capturedPhoto) return notify('Asset Photo Required', 'error'); setKeyBorrowValues({ borrowerName: activeVendor?.fullName, borrowerId: activeVendor?.idNumber, borrowerContact: activeVendor?.contactNumber, vendor: activeVendor?.company, reason: f.get('reason'), raawaNumber: f.get('raawaNumber'), releasedBy: f.get('releasedBy'), borrowPhoto: capturedPhoto }); setWaitingFor('KEY'); setActiveModal('Disclaimer'); }} className="p-10 overflow-y-auto space-y-8">
                 <div onClick={() => startCamera('environment')} className="aspect-video bg-slate-50 rounded-[40px] overflow-hidden cursor-pointer border-4 border-dashed border-slate-200 flex flex-col items-center justify-center gap-4 hover:border-amber-500 transition-all">{capturedPhoto ? <img src={capturedPhoto} className="w-full h-full object-cover" /> : <div className="text-center space-y-3"><Camera size={44} className="mx-auto text-slate-300" /><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Evidence Capture</p></div>}</div>
                 <div className="space-y-6">
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">RAAWA Reference</label><div className="relative"><Hash className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={16} /><input name="raawaNumber" required className="w-full p-5 pl-12 bg-slate-50 rounded-3xl font-black text-sm uppercase focus:ring-2 focus:ring-amber-500 outline-none" placeholder="REF-XXXX" /></div></div>
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Purpose of Borrowing</label><div className="relative"><FileText className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={16} /><input name="reason" required className="w-full p-5 pl-12 bg-slate-50 rounded-3xl font-black text-sm uppercase focus:ring-2 focus:ring-amber-500 outline-none" placeholder="Task Detail" /></div></div>
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Key Controller (Guard)</label><div className="relative"><UserPlus className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={16} /><input name="releasedBy" required className="w-full p-5 pl-12 bg-slate-50 rounded-3xl font-black text-sm uppercase focus:ring-2 focus:ring-amber-500 outline-none" placeholder="Officer Name" /></div></div>
                 </div>
                 <button type="submit" className="w-full py-6 bg-amber-600 text-white font-black rounded-[32px] uppercase text-xs shadow-2xl tracking-[0.2em] transition-all hover:bg-amber-700">Request Release</button>
              </form>
           </div>
        </div>
      )}

      {/* ACCESS REQUEST MODAL */}
      {activeModal === 'LoginProtocol' && selectedSite && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
           <div className="bg-white w-full max-w-2xl rounded-[56px] shadow-2xl flex flex-col overflow-hidden max-h-[95vh] animate-in zoom-in duration-300">
              <div className="p-10 border-b border-slate-50 flex items-center justify-between"><h2 className="text-3xl font-black uppercase tracking-tight">Entry Protocol</h2><button onClick={closeModals} className="p-2 hover:bg-slate-50 rounded-full"><X size={24} /></button></div>
              <form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); if (!capturedPhoto) return notify('Forensic ID Required', 'error'); setLoginFormValues({ activity: f.get('activity'), raawaNumber: f.get('raawaNumber'), checkedBy: f.get('checkedBy'), startTime: f.get('startTime'), expectedEndTime: f.get('expectedEndTime'), rocName: f.get('rocName'), rocTime: f.get('rocTime') }); setWaitingFor('SITE'); setActiveModal('Disclaimer'); }} className="p-10 overflow-y-auto space-y-8">
                 <div onClick={() => startCamera('user')} className="aspect-video bg-slate-50 rounded-[40px] overflow-hidden cursor-pointer border-4 border-dashed border-slate-200 flex flex-col items-center justify-center gap-4 hover:border-blue-500 transition-all">{capturedPhoto ? <img src={capturedPhoto} className="w-full h-full object-cover" /> : <div className="text-center space-y-3"><Camera size={44} className="mx-auto text-slate-300" /><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Identify Lead Engineer</p></div>}</div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <h3 className="text-xs font-black uppercase text-blue-600 tracking-widest ml-2">Team Matrix</h3>
                      <input readOnly defaultValue={activeVendor?.fullName} className="w-full p-5 bg-slate-100 rounded-3xl font-black text-sm uppercase" />
                      <div className="space-y-4">
                        {additionalPersonnel.map((p, i) => (
                          <div key={i} className="flex gap-3">
                            <input value={p} onChange={e => { const updated = [...additionalPersonnel]; updated[i] = e.target.value; setAdditionalPersonnel(updated); }} className="flex-1 p-5 bg-slate-50 rounded-3xl font-black text-sm uppercase outline-none focus:ring-2 focus:ring-blue-600 transition-all" placeholder="Team Member Name" />
                            <button type="button" onClick={() => setAdditionalPersonnel(prev => prev.filter((_, idx) => idx !== i))} className="p-4 text-rose-500 bg-rose-50 rounded-2xl"><MinusCircle size={20} /></button>
                          </div>
                        ))}
                        <button type="button" onClick={() => setAdditionalPersonnel(p => [...p, ''])} className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-widest ml-2"><PlusCircle size={16} /> Add Personnel</button>
                      </div>
                    </div>
                    <div className="space-y-6">
                      <h3 className="text-xs font-black uppercase text-emerald-600 tracking-widest ml-2">Mission Parameters</h3>
                      <input name="activity" placeholder="Mission Detailed Activity" required className="w-full p-5 bg-slate-50 rounded-3xl font-black text-sm uppercase outline-none focus:ring-2 focus:ring-emerald-600 transition-all" />
                      <input name="raawaNumber" placeholder="RAAWA Reference" required className="w-full p-5 bg-slate-50 rounded-3xl font-black text-sm uppercase outline-none focus:ring-2 focus:ring-emerald-600 transition-all" />
                      <input name="checkedBy" placeholder="Guard Verification" required className="w-full p-5 bg-slate-50 rounded-3xl font-black text-sm uppercase outline-none focus:ring-2 focus:ring-emerald-600 transition-all" />
                    </div>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Expected IN</label><input name="startTime" type="datetime-local" required className="w-full p-5 bg-slate-50 rounded-3xl font-bold text-xs" /></div>
                   <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Expected OUT</label><input name="expectedEndTime" type="datetime-local" required className="w-full p-5 bg-slate-50 rounded-3xl font-bold text-xs" /></div>
                 </div>
                 <div className="bg-slate-900 rounded-[40px] p-8 text-white space-y-6">
                   <h3 className="text-xs font-black uppercase text-blue-500 tracking-widest">Compliance Hub Signature</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <input name="rocName" placeholder="ROC Officer" required className="w-full p-4 bg-white/5 rounded-2xl text-xs uppercase font-black" />
                     <input name="rocTime" type="datetime-local" required className="w-full p-4 bg-white/5 rounded-2xl text-xs font-bold" />
                   </div>
                 </div>
                 <button type="submit" className="w-full py-6 bg-blue-600 text-white font-black rounded-[32px] uppercase text-xs shadow-2xl tracking-[0.2em] transition-all hover:bg-blue-700">Initiate Transmission</button>
              </form>
           </div>
        </div>
      )}

      {/* REGISTRATION MODAL */}
      {activeModal === 'Registration' && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
           <div className="bg-white w-full max-w-2xl rounded-[56px] shadow-2xl flex flex-col overflow-hidden max-h-[95vh] animate-in zoom-in duration-300">
              <div className="p-10 border-b border-slate-50 flex items-center justify-between"><h2 className="text-3xl font-black uppercase tracking-tight text-slate-900">Vendor Registry</h2><button onClick={closeModals} className="p-2 hover:bg-slate-50 rounded-full"><X size={24} /></button></div>
              <form onSubmit={handleRegisterSubmit} className="p-10 overflow-y-auto space-y-10 custom-scrollbar">
                 <div onClick={() => startCamera('user')} className="aspect-video bg-slate-50 rounded-[40px] overflow-hidden cursor-pointer border-4 border-dashed border-slate-200 flex flex-col items-center justify-center gap-4 hover:border-blue-500 transition-all">
                    {capturedPhoto ? <img src={capturedPhoto} className="w-full h-full object-cover" /> : <div className="text-center space-y-3"><Camera size={52} className="mx-auto text-slate-300" /><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Biometric Enrollment Photo</p></div>}
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Full Name</label><input name="fullName" required className="w-full p-5 bg-slate-50 rounded-3xl font-black text-sm uppercase" /></div>
                      <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Company Organization</label><input name="company" required className="w-full p-5 bg-slate-50 rounded-3xl font-black text-sm uppercase" /></div>
                      <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Contact Phone</label><input name="contactNumber" required className="w-full p-5 bg-slate-50 rounded-3xl font-black text-sm uppercase" /></div>
                    </div>
                    <div className="space-y-6">
                      <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Identification (PRC/GOV)</label><input name="idNumber" required className="w-full p-5 bg-slate-50 rounded-3xl font-black text-sm uppercase" /></div>
                      <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Username (FO LINK)</label><input name="username" required className="w-full p-5 bg-slate-50 rounded-3xl font-black text-sm uppercase" /></div>
                      <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Registry Password</label><input name="password" type="password" required className="w-full p-5 bg-slate-50 rounded-3xl font-black text-sm uppercase" /></div>
                    </div>
                    <div className="col-span-full space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Primary Specialization</label><input name="specialization" required placeholder="e.g. MW ENGINEER, RF TECHNICIAN, RIGGER" className="w-full p-5 bg-slate-50 rounded-3xl font-black text-sm uppercase" /></div>
                 </div>
                 <button type="submit" disabled={isSubmitting} className="w-full py-6 bg-slate-900 text-white font-black rounded-[32px] uppercase text-xs shadow-2xl tracking-[0.2em]">{isSubmitting ? 'Syncing with Registry...' : 'Initialize Identity'}</button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default VendorAccess;
