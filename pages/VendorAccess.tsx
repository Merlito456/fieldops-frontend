
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
  
  // NOC Requirements State
  const [requiresNoc, setRequiresNoc] = useState(false);
  
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { notify } = useNotify();

  const loadInitialData = async () => {
    try {
      const fetchedSites = await apiService.getSites();
      const vendorFromStorage = apiService.getActiveVendor();
      if (fetchedSites) setSites(fetchedSites);
      
      // Persist vendor session if found in storage and not already set
      if (!activeVendor && vendorFromStorage) {
        setActiveVendor(vendorFromStorage);
      }
    } catch (err) { 
      notify('Link Stability: Partial', 'info'); 
    } finally { 
      setIsLoading(false); 
    }
  };

  useEffect(() => { 
    loadInitialData(); 
    const interval = setInterval(loadInitialData, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let interval: number | null = null;
    if (showChat && activeVendor) {
      const fetchMsgs = async () => {
        try {
          const msgs = await apiService.getMessages(activeVendor.id);
          if (msgs) setChatMessages(msgs);
        } catch (e) { 
          console.error("Comm Lag..."); 
        }
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
        .catch(() => { notify('Forensic Hub: Access Denied', 'error'); setStreamActive(false); });
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
          // Haversine formula for 500m allowance
          const R = 6371e3; // metres
          const φ1 = latitude * Math.PI/180;
          const φ2 = coords[0] * Math.PI/180;
          const Δφ = (coords[0]-latitude) * Math.PI/180;
          const Δλ = (coords[1]-longitude) * Math.PI/180;
          const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                    Math.cos(φ1) * Math.cos(φ2) *
                    Math.sin(Δλ/2) * Math.sin(Δλ/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          const distance = R * c;
          
          setGpsVerified(distance <= 500);
        } else setGpsVerified(true);
      });
    }
    return () => { if (watchId !== null) navigator.geolocation.clearWatch(watchId); };
  }, [streamActive, selectedSite]);

  const capturePhoto = () => {
    if (videoRef.current && location) {
      const v = videoRef.current;
      const c = document.createElement('canvas');
      
      // Proportional Stamp Height (20% of image height)
      const stampHeight = Math.floor(v.videoHeight * 0.20);
      c.width = v.videoWidth; 
      c.height = v.videoHeight + stampHeight;
      
      const ctx = c.getContext('2d');
      if (!ctx) return;
      
      ctx.save();
      if (facingMode === 'user') { ctx.translate(c.width, 0); ctx.scale(-1, 1); }
      ctx.drawImage(v, 0, 0, v.videoWidth, v.videoHeight);
      ctx.restore();
      
      // Stamp Background
      ctx.fillStyle = "#0f172a"; 
      ctx.fillRect(0, v.videoHeight, c.width, stampHeight);
      
      const opStatus = activeModal === 'LogoutProtocol' ? 'EXIT_PROTOCOL' : 
                       activeModal === 'KeyReturn' ? 'KEY_RETURN' : 
                       activeModal === 'KeyBorrow' ? 'KEY_BORROW' : 'ENTRY_PROTOCOL';

      const ledger = [
        ["OPERATOR", activeVendor?.fullName?.toUpperCase() || "NEW_VENDOR"], 
        ["VENDOR", activeVendor?.company?.toUpperCase() || "N/A"],
        ["SITE", selectedSite?.name?.toUpperCase() || "N/A"], 
        ["SITE ID", selectedSite?.id?.toUpperCase() || "N/A"],
        ["GPS", gpsVerified ? "LOCATION VERIFIED" : "OUT OF BOUNDS"],
        ["TIME/DATE", new Date().toLocaleString()],
        ["STATUS", opStatus]
      ];
      
      // Proportional Typography
      const fontSize = Math.max(12, Math.floor(c.width / 42));
      const lineSpacing = Math.floor(stampHeight / 8.5);
      const startY = v.videoHeight + Math.floor(stampHeight * 0.15);
      
      ctx.textAlign = "left";
      ledger.forEach((r, i) => {
        // Label
        ctx.font = `900 ${fontSize * 0.8}px Inter`; 
        ctx.fillStyle = "rgba(255,255,255,0.4)"; 
        ctx.fillText(r[0], fontSize * 2, startY + (i * lineSpacing));
        
        // Value
        ctx.font = `bold ${fontSize}px Inter`; 
        if (r[0] === "GPS") {
          ctx.fillStyle = gpsVerified ? "#10b981" : "#ef4444";
        } else {
          ctx.fillStyle = "#ffffff";
        }
        ctx.fillText(r[1], fontSize * 11, startY + (i * lineSpacing));
      });
      
      setCapturedPhoto(c.toDataURL('image/jpeg', 0.9)); 
      setStreamActive(false);
    }
  };

  const handleSendMessage = async () => {
    const currentVendor = activeVendor || apiService.getActiveVendor();
    if (!chatInput.trim() || !currentVendor) return;
    
    const msg = { 
      vendorId: currentVendor.id, 
      senderId: currentVendor.id, 
      senderName: currentVendor.fullName, 
      role: 'VENDOR' as const, 
      content: chatInput, 
      siteId: selectedSite?.id 
    };
    
    const originalInput = chatInput;
    setChatInput('');
    try {
      await apiService.sendMessage(msg);
      const msgs = await apiService.getMessages(currentVendor.id);
      if (msgs) setChatMessages(msgs);
    } catch (err: any) { 
      setChatInput(originalInput); 
      notify(`Signal Drop: ${err.message}`, 'error'); 
    }
  };

  const startCamera = (mode: 'user' | 'environment') => {
    setFacingMode(mode);
    setStreamActive(true);
    setCapturedPhoto(null);
  };

  const finalizeRequest = async () => {
    const currentVendor = activeVendor || apiService.getActiveVendor();
    if (!selectedSite || !currentVendor) return;
    setIsSubmitting(true);
    try {
      if (waitingFor === 'SITE') {
        await apiService.requestAccess(selectedSite.id, {
          vendorId: currentVendor.id, leadName: currentVendor.fullName, contactNumber: currentVendor.contactNumber,
          personnel: [currentVendor.fullName, ...additionalPersonnel], vendor: currentVendor.company, 
          activity: loginFormValues.activity, raawaNumber: loginFormValues.raawaNumber, checkedBy: loginFormValues.checkedBy,
          startTime: loginFormValues.startTime, expectedEndTime: loginFormValues.expectedEndTime, photo: capturedPhoto || undefined,
          rocLogged: true, rocName: loginFormValues.rocName, rocTime: loginFormValues.rocTime, nocLogged: false
        });
      } else if (waitingFor === 'KEY') {
        await apiService.requestKeyBorrow(selectedSite.id, { 
          siteId: selectedSite.id, siteName: selectedSite.name, ...keyBorrowValues, borrowerId: currentVendor.id 
        });
      }
      setActiveModal('Waiting');
    } catch (err) { notify('Link Failure: Signal Lost', 'error'); }
    finally { setIsSubmitting(false); }
  };

  const confirmAccess = async () => {
    if (!selectedSite) return;
    setIsSubmitting(true);
    try {
      const freshSites = await apiService.getSites();
      const site = freshSites.find(s => s.id === selectedSite.id);
      if (waitingFor === 'SITE' && site?.pendingVisitor) {
        await apiService.checkInVendor(site.id, site.pendingVisitor);
        notify('Mission Hub: Access Logged', 'success');
      } else if (waitingFor === 'KEY' && site?.pendingKeyLog) {
        await apiService.confirmKeyBorrow(site.id);
        notify('Asset Released: Key Secured', 'success');
      }
      
      // SUCCESS: Preserve session, only reset operational UI
      setActiveModal(null);
      setWaitingFor(null);
      setCapturedPhoto(null);
      setStreamActive(false);
      setAdditionalPersonnel([]);
      setShowChat(false);
      setSelectedSite(null);
      loadInitialData();
    } catch (err) {
      notify('Handshake Sync Error', 'error');
    } finally {
      setIsSubmitting(false);
    }
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
      notify('Identity Hub: Verified', 'success');
      setActiveModal(null);
    } catch (err) { notify('Identity Collision', 'error'); } 
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
        notify(`Authorized: ${vendor.fullName}`, 'success');
        setActiveModal(null);
      } else { notify('Credentials Invalid', 'error'); }
    } catch (err) { notify('Auth Link Failure', 'error'); } 
    finally { setIsSubmitting(false); }
  };

  const handleLogoutSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!capturedPhoto || !selectedSite) return notify('Forensic Frame Missing', 'error');
    setIsSubmitting(true);
    const f = new FormData(e.currentTarget);
    try {
      // Corrected property names 'rocLogoutName' and 'rocLogoutTime' to match Partial<SiteVisitor> in apiService.checkOutVendor
      await apiService.checkOutVendor(selectedSite.id, capturedPhoto, {
        rocLogoutName: f.get('rocName') as string,
        rocLogoutTime: f.get('rocTime') as string,
        activityRemarks: f.get('remarks') as string,
        nocLogged: requiresNoc,
        nocLoginName: f.get('nocLoginName') as string,
        nocLoginTime: f.get('nocLoginTime') as string,
        nocLogoutName: f.get('nocLogoutName') as string,
        nocLogoutTime: f.get('nocLogoutTime') as string,
      });
      notify('Log Closed: Protocol Finalized', 'success');
      
      // SUCCESS: Preserve session, only reset operational UI
      setActiveModal(null);
      setSelectedSite(null);
      setCapturedPhoto(null);
      setRequiresNoc(false);
      loadInitialData();
    } catch (err) { notify('Transmission Failure', 'error'); }
    finally { setIsSubmitting(false); }
  };

  const handleKeyReturnSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!capturedPhoto || !selectedSite) return notify('Key Restore Frame Missing', 'error');
    setIsSubmitting(true);
    try {
      await apiService.returnKey(selectedSite.id, capturedPhoto);
      notify('Asset Hub: Physical Key Restored', 'success');
      
      // SUCCESS: Preserve session, only reset operational UI
      setActiveModal(null);
      setSelectedSite(null);
      setCapturedPhoto(null);
      loadInitialData();
    } catch (err) { notify('Handover Sync Error', 'error'); }
    finally { setIsSubmitting(false); }
  };

  const closeModals = () => { 
    setActiveModal(null); 
    setWaitingFor(null); 
    setCapturedPhoto(null); 
    setStreamActive(false); 
    setAdditionalPersonnel([]); 
    setShowChat(false); 
    setSelectedSite(null); 
    setRequiresNoc(false);
  };

  const currentSiteState = selectedSite ? sites.find(s => s.id === selectedSite.id) : null;
  const isAuthorized = waitingFor === 'SITE' ? currentSiteState?.accessAuthorized : currentSiteState?.keyAccessAuthorized;

  const unreadCount = chatMessages.filter(m => m.role === 'FO' && !m.isRead).length;

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;

  return (
    <div className="relative min-h-full space-y-10 animate-in fade-in duration-700 pb-20">
      {/* CAMERA OVERLAY */}
      {streamActive && (
        <div className="fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center">
          <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`} />
          <div className="absolute inset-0 p-8 flex flex-col justify-between pointer-events-none">
            <div className="flex justify-end pointer-events-auto gap-2">
              <button onClick={() => setFacingMode(f => f === 'user' ? 'environment' : 'user')} className="p-4 bg-black/60 text-white rounded-full"><FlipHorizontal size={24} /></button>
              <button onClick={() => setStreamActive(false)} className="p-4 bg-black/60 text-white rounded-full"><X size={24} /></button>
            </div>
            <div className="flex flex-col items-center pointer-events-auto gap-6">
              <span className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest border ${gpsVerified ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                {gpsVerified === null ? 'SYNCING SAT_LINK...' : gpsVerified ? 'LOCATION_VERIFIED' : 'OUT_OF_BOUNDS'}
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
        <div className="fixed bottom-24 right-8 z-[550] w-full max-sm h-[500px] bg-white rounded-[40px] shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4">
          <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-blue-600 rounded-2xl flex items-center justify-center"><Shield size={20} /></div>
              <div><p className="text-xs font-black uppercase leading-tight">FO Command Hub</p><p className="text-[9px] text-blue-400 font-bold uppercase">{activeVendor.fullName}</p></div>
            </div>
            <button onClick={() => setShowChat(false)} className="p-2 hover:bg-white/10 rounded-full"><X size={20} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
            {chatMessages.length === 0 && <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest mt-10">Establishing Bridge Link...</p>}
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
            <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSendMessage()} placeholder="Signal Field Officer..." className="flex-1 px-4 py-3 bg-slate-50 rounded-2xl text-xs font-black outline-none focus:ring-2 focus:ring-blue-600 transition-all" />
            <button onClick={handleSendMessage} className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20 transition-all active:scale-95"><Send size={18} /></button>
          </div>
        </div>
      )}

      {/* FAB */}
      {activeVendor && !showChat && (
        <button onClick={() => setShowChat(true)} className="fixed bottom-8 right-8 z-[540] h-16 w-16 bg-blue-600 text-white rounded-3xl shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-blue-500/30 group">
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
              <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter text-wrap">Protocol Entry Kiosk</h1>
              <p className="text-xs font-bold text-blue-600 uppercase tracking-widest leading-relaxed">Infrastructure Authority Link</p>
           </div>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 px-4">
              <button onClick={() => setActiveModal('Registration')} className="group p-10 bg-white border border-slate-200 rounded-[48px] shadow-xl hover:shadow-2xl hover:border-blue-500 transition-all flex flex-col items-center gap-6">
                 <div className="p-5 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all"><Fingerprint size={40} /></div>
                 <div><h3 className="text-sm font-black uppercase tracking-tight">Identity Registry</h3><p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Enrollment Hub</p></div>
              </button>
              <button onClick={() => setActiveModal('PersonnelLogin')} className="group p-10 bg-white border border-slate-200 rounded-[48px] shadow-xl hover:shadow-2xl hover:border-emerald-500 transition-all flex flex-col items-center gap-6">
                 <div className="p-5 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-all"><LogIn size={40} /></div>
                 <div><h3 className="text-sm font-black uppercase tracking-tight">Personnel Entry</h3><p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Active Link</p></div>
              </button>
           </div>
        </div>
      ) : (
        <div className="px-4 space-y-10">
          <div className="flex flex-col md:flex-row justify-between items-center bg-white p-8 rounded-[48px] shadow-sm border border-slate-100 gap-6">
             <div className="flex items-center gap-6">
                <div onClick={() => setActiveModal('Profile')} className="h-16 w-16 bg-slate-50 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-slate-100 cursor-pointer hover:border-blue-500 transition-all shadow-sm">
                   {activeVendor.photo ? <img src={activeVendor.photo} className="w-full h-full object-cover" /> : <User size={28} className="text-slate-400" />}
                </div>
                <div className="text-center md:text-left"><h1 className="text-2xl font-black uppercase tracking-tight leading-none">{activeVendor.fullName}</h1><p className="text-blue-600 font-black uppercase text-[10px] tracking-widest mt-1.5">{activeVendor.company} • VENDOR UNIT</p></div>
             </div>
             <button onClick={() => { apiService.logoutVendor(); setActiveVendor(null); closeModals(); }} className="flex items-center gap-3 px-6 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-rose-600 transition-all shadow-xl shadow-slate-900/10">
               <LogOut size={16} /> <span>Terminate Protocol</span>
             </button>
          </div>

          <div className="relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={24} />
            <input 
              type="text" 
              placeholder="SEARCH ASSET HUB..."
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
                     <button onClick={() => { setSelectedSite(s); setActiveModal('LogoutProtocol'); }} className="col-span-2 py-5 bg-rose-600 text-white rounded-[24px] font-black text-[11px] uppercase shadow-lg hover:brightness-110 active:scale-95 transition-all">Close Registry</button>
                   ) : (
                     <button onClick={() => { setSelectedSite(s); if (s.accessAuthorized) { setWaitingFor('SITE'); setActiveModal('Waiting'); } else setActiveModal('LoginProtocol'); }} className={`py-5 ${s.accessAuthorized ? 'bg-blue-600 animate-pulse' : 'bg-emerald-600'} text-white rounded-[24px] font-black text-[11px] uppercase shadow-lg hover:brightness-110 active:scale-95 transition-all`}>
                       {s.accessAuthorized ? 'Authorized: IN' : 'Request Entry'}
                     </button>
                   )}
                   <button onClick={() => { setSelectedSite(s); if (s.keyStatus === 'Borrowed') setActiveModal('KeyReturn'); else if (s.keyAccessAuthorized) { setWaitingFor('KEY'); setActiveModal('Waiting'); } else setActiveModal('KeyBorrow'); }} className={`py-5 ${s.keyStatus === 'Borrowed' ? 'bg-amber-600' : s.keyAccessAuthorized ? 'bg-blue-600 animate-pulse' : 'bg-slate-900'} text-white rounded-[24px] font-black text-[11px] uppercase shadow-lg hover:brightness-110 active:scale-95 transition-all`}>
                     {s.keyStatus === 'Borrowed' ? 'Key OUT' : s.keyAccessAuthorized ? 'Authorized: KEY' : 'Request KEY'}
                   </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL SYSTEM */}
      {activeModal === 'PersonnelLogin' && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xl">
           <div className="bg-white w-full max-md rounded-[56px] p-12 shadow-2xl space-y-10 animate-in zoom-in duration-300">
              <div className="text-center space-y-4">
                 <div className="h-20 w-20 bg-emerald-50 text-emerald-600 rounded-3xl mx-auto flex items-center justify-center shadow-sm"><LogIn size={36} /></div>
                 <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900">Portal Link</h2>
              </div>
              <form onSubmit={handleLoginSubmit} className="space-y-6">
                 <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Username</label><input name="username" required className="w-full p-5 bg-slate-50 border-2 border-transparent rounded-3xl font-black uppercase outline-none focus:border-emerald-600 focus:bg-white transition-all" /></div>
                 <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Password</label><input name="password" type="password" required className="w-full p-5 bg-slate-50 border-2 border-transparent rounded-3xl font-black uppercase outline-none focus:border-emerald-600 focus:bg-white transition-all" /></div>
                 <button disabled={isSubmitting} type="submit" className="w-full py-6 bg-emerald-600 text-white font-black rounded-[32px] uppercase text-xs shadow-2xl shadow-emerald-600/20 tracking-widest">{isSubmitting ? 'Verifying...' : 'Authorize Access'}</button>
                 <button type="button" onClick={closeModals} className="w-full py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cancel</button>
              </form>
           </div>
        </div>
      )}

      {activeModal === 'Registration' && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xl">
           <div className="bg-white w-full max-w-2xl rounded-[56px] shadow-2xl flex flex-col overflow-hidden max-h-[95vh] animate-in zoom-in duration-300">
              <div className="p-10 border-b border-slate-50 flex items-center justify-between"><h2 className="text-3xl font-black uppercase tracking-tight text-slate-900">Enrollment Hub</h2><button onClick={closeModals} className="p-2 hover:bg-slate-50 rounded-full"><X size={24} /></button></div>
              <form onSubmit={handleRegisterSubmit} className="p-10 overflow-y-auto space-y-10 custom-scrollbar">
                 <div onClick={() => startCamera('user')} className="aspect-video bg-slate-50 rounded-[40px] overflow-hidden cursor-pointer border-4 border-dashed border-slate-200 flex flex-col items-center justify-center gap-4 hover:border-blue-500 transition-all">
                    {capturedPhoto ? <img src={capturedPhoto} className="w-full h-full object-cover" /> : <div className="text-center space-y-3"><Camera size={52} className="mx-auto text-slate-300" /><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Forensic Identity Enrollment</p></div>}
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Full Name</label><input name="fullName" required className="w-full p-5 bg-slate-50 rounded-3xl font-black text-sm uppercase" /></div>
                      <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Organization</label><input name="company" required className="w-full p-5 bg-slate-50 rounded-3xl font-black text-sm uppercase" /></div>
                      <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Contact</label><input name="contactNumber" required className="w-full p-5 bg-slate-50 rounded-3xl font-black text-sm uppercase" /></div>
                    </div>
                    <div className="space-y-6">
                      <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">ID Reference</label><input name="idNumber" required className="w-full p-5 bg-slate-50 rounded-3xl font-black text-sm uppercase" /></div>
                      <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Kiosk User</label><input name="username" required className="w-full p-5 bg-slate-50 rounded-3xl font-black text-sm uppercase" /></div>
                      <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Kiosk Pass</label><input name="password" type="password" required className="w-full p-5 bg-slate-50 rounded-3xl font-black text-sm uppercase" /></div>
                    </div>
                    <div className="col-span-full space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Domain Expertise</label><input name="specialization" required placeholder="RF, MW, FIBER, RIGGER, ETC" className="w-full p-5 bg-slate-50 rounded-3xl font-black text-sm uppercase" /></div>
                 </div>
                 <button type="submit" disabled={isSubmitting} className="w-full py-6 bg-slate-900 text-white font-black rounded-[32px] uppercase text-xs shadow-2xl tracking-widest">{isSubmitting ? 'Syncing...' : 'Complete Enrollment'}</button>
              </form>
           </div>
        </div>
      )}

      {activeModal === 'Waiting' && selectedSite && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-slate-900/85 backdrop-blur-2xl">
           <div className="bg-white w-full max-md rounded-[56px] p-12 text-center space-y-10 animate-in zoom-in shadow-2xl">
              <div className={`h-28 w-28 mx-auto rounded-[32px] flex items-center justify-center shadow-xl ${isAuthorized ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600 animate-pulse'}`}>
                 {isAuthorized ? <ShieldCheck size={56} /> : <Loader2 className="animate-spin" size={56} />}
              </div>
              <div className="space-y-4">
                 <h2 className="text-3xl font-black uppercase tracking-tighter">{isAuthorized ? 'GRANTED' : 'PENDING'}</h2>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                    {isAuthorized ? 'Authorized signal received. Proceed to execute mission parameters.' : 'Bridge active. Awaiting FO operational approval signal...'}
                 </p>
              </div>
              {isAuthorized ? (
                <button onClick={confirmAccess} disabled={isSubmitting} className="w-full py-6 bg-emerald-600 text-white font-black rounded-[32px] uppercase text-xs shadow-2xl tracking-widest">Execute Entry</button>
              ) : (
                <div className="space-y-4">
                  <button onClick={() => setShowChat(true)} className="w-full py-5 border-2 border-blue-600 text-blue-600 font-black rounded-[32px] uppercase text-[10px] tracking-widest hover:bg-blue-600 hover:text-white transition-all">Command Link</button>
                  <button onClick={closeModals} className="w-full py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Abort</button>
                </div>
              )}
           </div>
        </div>
      )}
      
      {activeModal === 'LogoutProtocol' && selectedSite && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xl">
           <div className="bg-white w-full max-w-2xl rounded-[56px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-300 max-h-[95vh]">
              <div className="p-10 border-b border-slate-50 flex items-center justify-between"><h2 className="text-3xl font-black uppercase tracking-tight text-slate-900">Terminus Protocol</h2><button onClick={closeModals} className="p-2 hover:bg-slate-50 rounded-full"><X size={24} /></button></div>
              <form onSubmit={handleLogoutSubmit} className="p-10 space-y-8 overflow-y-auto">
                 <div onClick={() => startCamera('environment')} className="aspect-video bg-slate-50 rounded-[40px] overflow-hidden cursor-pointer border-4 border-dashed border-slate-200 flex flex-col items-center justify-center gap-4 hover:border-blue-500 transition-all">
                    {capturedPhoto ? <img src={capturedPhoto} className="w-full h-full object-cover" /> : <div className="text-center space-y-3"><Camera size={48} className="mx-auto text-slate-300" /><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Capture Terminus Frame</p></div>}
                 </div>
                 
                 <div className="space-y-6">
                    <input name="rocName" required className="w-full p-5 bg-slate-50 rounded-3xl font-black text-sm uppercase outline-none focus:ring-2 focus:ring-rose-500" placeholder="Sign-off Officer" />
                    <input name="rocTime" type="datetime-local" required className="w-full p-5 bg-slate-50 rounded-3xl font-bold text-xs" />
                    
                    <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-3xl">
                      <input 
                        type="checkbox" 
                        id="requiresNoc" 
                        checked={requiresNoc} 
                        onChange={(e) => setRequiresNoc(e.target.checked)}
                        className="w-5 h-5 accent-blue-600"
                      />
                      <label htmlFor="requiresNoc" className="text-xs font-black uppercase text-blue-900 cursor-pointer">Activity requires NOC login/logout?</label>
                    </div>

                    {requiresNoc && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50 rounded-[32px] border border-slate-100 animate-in slide-in-from-top-2">
                        <div className="space-y-4">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">NOC Login</p>
                           <input name="nocLoginName" required placeholder="Login Operator Name" className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase" />
                           <input name="nocLoginTime" type="datetime-local" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-[10px] font-bold" />
                        </div>
                        <div className="space-y-4">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">NOC Logout</p>
                           <input name="nocLogoutName" required placeholder="Logout Operator Name" className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase" />
                           <input name="nocLogoutTime" type="datetime-local" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-[10px] font-bold" />
                        </div>
                      </div>
                    )}

                    <textarea name="remarks" className="w-full p-5 bg-slate-50 rounded-3xl font-medium text-sm italic min-h-[100px]" placeholder="Summary of Activity..."></textarea>
                 </div>
                 <button type="submit" disabled={isSubmitting} className="w-full py-6 bg-rose-600 text-white font-black rounded-[32px] uppercase text-xs shadow-2xl tracking-widest">{isSubmitting ? 'Syncing...' : 'Finalize Logout'}</button>
              </form>
           </div>
        </div>
      )}
      
      {activeModal === 'KeyBorrow' && selectedSite && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xl">
           <div className="bg-white w-full max-lg rounded-[56px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-300">
              <div className="p-10 border-b border-slate-50 flex items-center justify-between"><h2 className="text-3xl font-black uppercase tracking-tight">Key Handover</h2><button onClick={closeModals} className="p-2 hover:bg-slate-50 rounded-full"><X size={24} /></button></div>
              <form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); if (!capturedPhoto) return notify('Asset Frame Required', 'error'); setKeyBorrowValues({ borrowerName: activeVendor?.fullName, borrowerId: activeVendor?.idNumber, borrowerContact: activeVendor?.contactNumber, vendor: activeVendor?.company, reason: f.get('reason'), raawaNumber: f.get('raawaNumber'), releasedBy: f.get('releasedBy'), borrowPhoto: capturedPhoto }); setWaitingFor('KEY'); setActiveModal('Disclaimer'); }} className="p-10 space-y-8 overflow-y-auto">
                 <div onClick={() => startCamera('environment')} className="aspect-video bg-slate-50 rounded-[40px] overflow-hidden cursor-pointer border-4 border-dashed border-slate-200 flex flex-col items-center justify-center gap-4 hover:border-amber-500 transition-all">{capturedPhoto ? <img src={capturedPhoto} className="w-full h-full object-cover" /> : <div className="text-center space-y-3"><Camera size={44} className="mx-auto text-slate-300" /><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Evidence of Release</p></div>}</div>
                 <div className="space-y-6">
                    <input name="raawaNumber" required className="w-full p-5 bg-slate-50 rounded-3xl font-black text-sm uppercase" placeholder="RAAWA Reference" />
                    <input name="reason" required className="w-full p-5 bg-slate-50 rounded-3xl font-black text-sm uppercase" placeholder="Purpose for Release" />
                    <input name="releasedBy" required className="w-full p-5 bg-slate-50 rounded-3xl font-black text-sm uppercase" placeholder="Sign-off Officer" />
                 </div>
                 <button type="submit" className="w-full py-6 bg-amber-600 text-white font-black rounded-[32px] uppercase text-xs shadow-2xl tracking-widest">Request Release</button>
              </form>
           </div>
        </div>
      )}

      {activeModal === 'KeyReturn' && selectedSite && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xl">
           <div className="bg-white w-full max-md rounded-[56px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-300">
              <div className="p-10 border-b border-slate-50 flex items-center justify-between"><h2 className="text-3xl font-black uppercase tracking-tight text-slate-900">Key Restore</h2><button onClick={closeModals} className="p-2 hover:bg-slate-50 rounded-full"><X size={24} /></button></div>
              <form onSubmit={handleKeyReturnSubmit} className="p-10 space-y-8 overflow-y-auto">
                 <div onClick={() => startCamera('environment')} className="aspect-video bg-slate-50 rounded-[40px] overflow-hidden cursor-pointer border-4 border-dashed border-slate-200 flex flex-col items-center justify-center gap-4 hover:border-amber-500 transition-all">
                    {capturedPhoto ? <img src={capturedPhoto} className="w-full h-full object-cover" /> : <div className="text-center space-y-3"><Camera size={48} className="mx-auto text-slate-300" /><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Evidence of Key Return</p></div>}
                 </div>
                 <button type="submit" disabled={isSubmitting} className="w-full py-6 bg-amber-600 text-white font-black rounded-[32px] uppercase text-xs shadow-2xl tracking-widest">{isSubmitting ? 'Syncing...' : 'Confirm Restore'}</button>
              </form>
           </div>
        </div>
      )}

      {activeModal === 'Disclaimer' && (
        <div className="fixed inset-0 z-[800] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-2xl">
           <div className="bg-white w-full max-w-lg rounded-[56px] p-12 space-y-10 animate-in zoom-in shadow-2xl">
              <div className="flex items-center gap-5 text-rose-600">
                <div className="p-4 bg-rose-50 rounded-2xl"><AlertTriangle size={36} /></div>
                <h2 className="text-3xl font-black uppercase tracking-tight">Compliance Link</h2>
              </div>
              <div className="space-y-5 text-sm font-medium text-slate-600 leading-relaxed max-h-[35vh] overflow-y-auto pr-4 custom-scrollbar">
                <p>1. PPE MANDATE: Certify all mission personnel possess required safety gear.</p>
                <p>2. RAAWA SCOPE: All works will be strictly within the approved RAAWA parameters.</p>
                <p>3. MONITORING: Forensic frames are transmitted directly to FO Engineering.</p>
              </div>
              <div className="flex gap-4">
                <button onClick={() => setActiveModal(waitingFor === 'SITE' ? 'LoginProtocol' : 'KeyBorrow')} className="flex-1 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Back</button>
                <button onClick={finalizeRequest} disabled={isSubmitting} className="flex-[2] py-6 bg-slate-900 text-white font-black rounded-[32px] uppercase text-xs shadow-2xl tracking-widest hover:brightness-110 active:scale-95 transition-all">
                  {isSubmitting ? 'Transmitting...' : 'Digitally Verify'}
                </button>
              </div>
           </div>
        </div>
      )}

      {activeModal === 'LoginProtocol' && selectedSite && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xl">
           <div className="bg-white w-full max-w-2xl rounded-[56px] shadow-2xl flex flex-col overflow-hidden max-h-[95vh] animate-in zoom-in duration-300">
              <div className="p-10 border-b border-slate-50 flex items-center justify-between"><h2 className="text-3xl font-black uppercase tracking-tight text-slate-900">Entry Matrix</h2><button onClick={closeModals} className="p-2 hover:bg-slate-50 rounded-full"><X size={24} /></button></div>
              <form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); if (!capturedPhoto) return notify('Identification Required', 'error'); setLoginFormValues({ activity: f.get('activity'), raawaNumber: f.get('raawaNumber'), checkedBy: f.get('checkedBy'), startTime: f.get('startTime'), expectedEndTime: f.get('expectedEndTime'), rocName: f.get('rocName'), rocTime: f.get('rocTime') }); setWaitingFor('SITE'); setActiveModal('Disclaimer'); }} className="p-10 overflow-y-auto space-y-8">
                 <div onClick={() => startCamera('user')} className="aspect-video bg-slate-50 rounded-[40px] overflow-hidden cursor-pointer border-4 border-dashed border-slate-200 flex flex-col items-center justify-center gap-4 hover:border-blue-500 transition-all">{capturedPhoto ? <img src={capturedPhoto} className="w-full h-full object-cover" /> : <div className="text-center space-y-3"><Camera size={44} className="mx-auto text-slate-300" /><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Enroll Lead Operator Photo</p></div>}</div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <h3 className="text-xs font-black uppercase text-blue-600 tracking-widest ml-2">Team Unit</h3>
                      <input readOnly defaultValue={activeVendor?.fullName} className="w-full p-5 bg-slate-100 rounded-3xl font-black text-sm uppercase" />
                      <div className="space-y-4">
                        {additionalPersonnel.map((p, i) => (
                          <div key={i} className="flex gap-3">
                            <input value={p} onChange={e => { const updated = [...additionalPersonnel]; updated[i] = e.target.value; setAdditionalPersonnel(updated); }} className="flex-1 p-5 bg-slate-50 rounded-3xl font-black text-sm uppercase outline-none focus:ring-2 focus:ring-blue-600 transition-all" placeholder="Unit Member" />
                            <button type="button" onClick={() => setAdditionalPersonnel(prev => prev.filter((_, idx) => idx !== i))} className="p-4 text-rose-500 bg-rose-50 rounded-2xl"><MinusCircle size={20} /></button>
                          </div>
                        ))}
                        <button type="button" onClick={() => setAdditionalPersonnel(p => [...p, ''])} className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-widest ml-2"><PlusCircle size={16} /> Deploy Additional</button>
                      </div>
                    </div>
                    <div className="space-y-6">
                      <h3 className="text-xs font-black uppercase text-emerald-600 tracking-widest ml-2">Parameters</h3>
                      <input name="activity" placeholder="Core Mission Activity" required className="w-full p-5 bg-slate-50 rounded-3xl font-black text-sm uppercase outline-none focus:ring-2 focus:ring-emerald-600 transition-all" />
                      <input name="raawaNumber" placeholder="RAAWA Ref #" required className="w-full p-5 bg-slate-50 rounded-3xl font-black text-sm uppercase outline-none focus:ring-2 focus:ring-emerald-600 transition-all" />
                      <input name="checkedBy" placeholder="Guard Verification" required className="w-full p-5 bg-slate-50 rounded-3xl font-black text-sm uppercase outline-none focus:ring-2 focus:ring-emerald-600 transition-all" />
                    </div>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Expected IN</label><input name="startTime" type="datetime-local" required className="w-full p-5 bg-slate-50 rounded-3xl font-bold text-xs" /></div>
                   <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Expected OUT</label><input name="expectedEndTime" type="datetime-local" required className="w-full p-5 bg-slate-50 rounded-3xl font-bold text-xs" /></div>
                 </div>
                 <div className="bg-slate-900 rounded-[40px] p-8 text-white space-y-6">
                   <h3 className="text-xs font-black uppercase text-blue-500 tracking-widest">Operational Sign-off</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <input name="rocName" placeholder="ROC Name" required className="w-full p-4 bg-white/5 rounded-2xl text-xs uppercase font-black" />
                     <input name="rocTime" type="datetime-local" required className="w-full p-4 bg-white/5 rounded-2xl text-xs font-bold" />
                   </div>
                 </div>
                 <button type="submit" className="w-full py-6 bg-blue-600 text-white font-black rounded-[32px] uppercase text-xs shadow-2xl tracking-widest hover:brightness-110 active:scale-95 transition-all">Transmit Entry Protocol</button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default VendorAccess;
