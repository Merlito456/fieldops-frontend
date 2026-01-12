
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
    if (activeModal === 'Waiting' && selectedSite) {
      interval = window.setInterval(async () => {
        const freshSites = await apiService.getSites();
        if (freshSites) setSites(freshSites);
      }, 3000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [activeModal, selectedSite]);

  useEffect(() => {
    let interval: number | null = null;
    if (showChat && selectedSite) {
      const fetchMsgs = async () => {
        const msgs = await apiService.getMessages(selectedSite.id);
        if (msgs) setChatMessages(msgs);
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

  // Added missing handleRegisterSubmit function to process vendor signups
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

  // Added missing handleLoginSubmit function to process vendor authentication
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
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      {/* CAMERA OVERLAY */}
      {streamActive && (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center">
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
        <div className="fixed bottom-24 right-8 z-[180] w-full max-w-sm h-[500px] bg-white rounded-[40px] shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4">
          <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-blue-600 rounded-2xl flex items-center justify-center"><Shield size={20} /></div>
              <div><p className="text-xs font-black uppercase leading-tight">FO Support</p><p className="text-[9px] text-blue-400 font-bold uppercase">{selectedSite.name}</p></div>
            </div>
            <button onClick={() => setShowChat(false)} className="p-2 hover:bg-white/10 rounded-full"><X size={20} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
            {chatMessages.length === 0 && <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest mt-10">No messages yet. Direct link to Field Officer active.</p>}
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
            <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSendMessage()} placeholder="Message Field Officer..." className="flex-1 px-4 py-3 bg-slate-50 rounded-2xl text-xs font-black uppercase outline-none focus:ring-2 focus:ring-blue-600" />
            <button onClick={handleSendMessage} className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20"><Send size={18} /></button>
          </div>
        </div>
      )}

      {/* FLOATING CHAT BUTTON */}
      {activeVendor && selectedSite && !showChat && (
        <button onClick={() => setShowChat(true)} className="fixed bottom-8 right-8 z-[170] h-16 w-16 bg-blue-600 text-white rounded-3xl shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all animate-bounce">
          <MessageSquare size={28} />
        </button>
      )}

      {!activeVendor ? (
        <div className="max-w-xl mx-auto space-y-12 py-20 text-center animate-in zoom-in">
           <div className="space-y-4">
              <div className="h-20 w-20 bg-slate-900 text-white rounded-2xl mx-auto flex items-center justify-center shadow-2xl"><Shield size={40} /></div>
              <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Vendor Protocol Hub</h1>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-blue-600">Secure Protocol Gateway</p>
           </div>
           <div className="grid grid-cols-2 gap-6">
              <button onClick={() => setActiveModal('Registration')} className="p-8 bg-white border border-slate-200 rounded-[32px] shadow-xl hover:border-blue-500 transition-all flex flex-col items-center gap-4">
                 <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Fingerprint size={32} /></div>
                 <h3 className="text-sm font-black uppercase tracking-tight">Register</h3>
              </button>
              <button onClick={() => setActiveModal('PersonnelLogin')} className="p-8 bg-white border border-slate-200 rounded-[32px] shadow-xl hover:border-emerald-500 transition-all flex flex-col items-center gap-4">
                 <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><LogIn size={32} /></div>
                 <h3 className="text-sm font-black uppercase tracking-tight">Login</h3>
              </button>
           </div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center bg-white p-6 rounded-[40px] shadow-sm border border-slate-100">
             <div><h1 className="text-2xl font-black uppercase tracking-tight leading-none">{activeVendor.fullName}</h1><p className="text-blue-600 font-black uppercase text-[10px] tracking-widest mt-1">{activeVendor.company}</p></div>
             <div className="flex gap-2">
                <button onClick={() => setActiveModal('Profile')} className="h-12 w-12 bg-slate-50 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-200">
                   {activeVendor.photo ? <img src={activeVendor.photo} className="w-full h-full object-cover" /> : <User size={20} />}
                </button>
                <button onClick={() => { apiService.logoutVendor(); setActiveVendor(null); }} className="p-3 bg-slate-900 text-white rounded-2xl hover:bg-rose-600 transition-colors"><LogOut size={20} /></button>
             </div>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Search Site Registry..."
              className="w-full pl-12 pr-6 py-4 bg-white border border-slate-100 rounded-3xl font-black text-sm uppercase outline-none focus:ring-4 focus:ring-blue-500/10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sites.filter(s => s.name.toUpperCase().includes(searchQuery.toUpperCase()) || s.id.toUpperCase().includes(searchQuery.toUpperCase())).map(s => (
              <div key={s.id} className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-2xl hover:border-blue-500 transition-all group">
                <div className="p-8 flex-1 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors"><Tower size={24} /></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{s.id}</span>
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-tight leading-tight">{s.name}</h3>
                  <div className="flex items-center text-[10px] font-bold text-slate-400 uppercase"><MapPin size={12} className="mr-1" /> {s.address}</div>
                </div>
                <div className="p-6 bg-slate-50 border-t border-slate-100 grid grid-cols-2 gap-3">
                   {s.currentVisitor ? (
                     <button onClick={() => { setSelectedSite(s); setActiveModal('LogoutProtocol'); }} className="col-span-2 py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg hover:brightness-110">End Operation</button>
                   ) : (
                     <button onClick={() => { setSelectedSite(s); if (s.accessAuthorized) { setWaitingFor('SITE'); setActiveModal('Waiting'); } else setActiveModal('LoginProtocol'); }} className={`py-4 ${s.accessAuthorized ? 'bg-blue-600 animate-pulse' : 'bg-emerald-600'} text-white rounded-2xl font-black text-[10px] uppercase shadow-lg hover:brightness-110`}>
                       {s.accessAuthorized ? 'Authorized: Check-in' : 'Request Access'}
                     </button>
                   )}
                   <button onClick={() => { setSelectedSite(s); if (s.keyStatus === 'Borrowed') setActiveModal('KeyReturn'); else if (s.keyAccessAuthorized) { setWaitingFor('KEY'); setActiveModal('Waiting'); } else setActiveModal('KeyBorrow'); }} className={`py-4 ${s.keyStatus === 'Borrowed' ? 'bg-amber-600' : s.keyAccessAuthorized ? 'bg-blue-600 animate-pulse' : 'bg-slate-900'} text-white rounded-2xl font-black text-[10px] uppercase shadow-lg hover:brightness-110`}>
                     {s.keyStatus === 'Borrowed' ? 'Return Key' : s.keyAccessAuthorized ? 'Authorized: Take Key' : 'Borrow Key'}
                   </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* WAITING MODAL */}
      {activeModal === 'Waiting' && selectedSite && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xl">
           <div className="bg-white w-full max-md rounded-[48px] p-10 text-center space-y-8 animate-in zoom-in">
              <div className={`h-24 w-24 mx-auto rounded-full flex items-center justify-center ${isAuthorized ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600 animate-pulse'}`}>
                 {isAuthorized ? <ShieldCheck size={48} /> : <Loader2 className="animate-spin" size={48} />}
              </div>
              <div className="space-y-2">
                 <h2 className="text-2xl font-black uppercase tracking-tight">{isAuthorized ? 'Authorization Granted' : 'Pending FO Approval'}</h2>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                    {isAuthorized ? 'Field Officer has electronically signed your request. You may proceed.' : 'Your forensic request has been transmitted. FO Engineering is reviewing your credentials.'}
                 </p>
              </div>
              {isAuthorized ? (
                <button onClick={confirmAccess} className="w-full py-5 bg-emerald-600 text-white font-black rounded-3xl uppercase text-xs shadow-xl tracking-widest">Confirm & Proceed</button>
              ) : (
                <button onClick={closeModals} className="w-full py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cancel Request</button>
              )}
           </div>
        </div>
      )}

      {/* DISCLAIMER MODAL */}
      {activeModal === 'Disclaimer' && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xl">
           <div className="bg-white w-full max-lg rounded-[48px] p-10 space-y-8 animate-in zoom-in">
              <div className="flex items-center gap-4 text-rose-600">
                <AlertTriangle size={32} />
                <h2 className="text-2xl font-black uppercase tracking-tight">Compliance Oath</h2>
              </div>
              <div className="space-y-4 text-sm font-medium text-slate-600 leading-relaxed max-h-[40vh] overflow-y-auto pr-4">
                <p>By proceeding, you certify that all personnel on site are properly equipped with mandated PPE and have reviewed the active RAAWA documentation.</p>
                <p>You acknowledge that all activities are monitored by NOC and any unauthorized hardware modifications will be reported to FO Engineering.</p>
                <p>Entry photo and GPS data will be stored as permanent forensic evidence in the site ledger.</p>
              </div>
              <div className="flex gap-4">
                <button onClick={() => setActiveModal(waitingFor === 'SITE' ? 'LoginProtocol' : 'KeyBorrow')} className="flex-1 py-4 text-[10px] font-black uppercase text-slate-400">Back</button>
                <button onClick={finalizeRequest} className="flex-[2] py-5 bg-blue-600 text-white font-black rounded-3xl uppercase text-xs shadow-xl tracking-widest">I Agree & Sign</button>
              </div>
           </div>
        </div>
      )}

      {/* LOGOUT PROTOCOL MODAL */}
      {activeModal === 'LogoutProtocol' && selectedSite && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
           <div className="bg-white w-full max-xl rounded-[48px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-300">
              <div className="p-8 border-b border-gray-100 flex items-center justify-between"><h2 className="text-2xl font-black uppercase tracking-tight">Termination Protocol</h2><button onClick={closeModals} className="p-2 hover:bg-slate-50 rounded-full"><X size={24} /></button></div>
              <form onSubmit={handleLogoutSubmit} className="p-8 space-y-6">
                 <div onClick={() => startCamera('environment')} className="aspect-video bg-slate-100 rounded-[32px] overflow-hidden cursor-pointer border-2 border-dashed border-slate-300 flex items-center justify-center">
                    {capturedPhoto ? <img src={capturedPhoto} className="w-full h-full object-cover" /> : <div className="text-center space-y-2"><Camera size={40} className="mx-auto text-slate-400" /><p className="text-[10px] font-black uppercase text-slate-400">Exit Evidence Photo</p></div>}
                 </div>
                 <div className="space-y-4">
                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">ROC Logout Officer</label><input name="rocName" required className="w-full p-4 bg-slate-50 rounded-2xl font-black text-sm uppercase" placeholder="Officer Name" /></div>
                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">ROC Logout Time</label><input name="rocTime" type="datetime-local" required className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-xs" /></div>
                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Final Remarks</label><textarea name="remarks" className="w-full p-4 bg-slate-50 rounded-2xl font-medium text-sm italic" placeholder="Activity summary..."></textarea></div>
                 </div>
                 <button type="submit" className="w-full py-5 bg-rose-600 text-white font-black rounded-3xl uppercase text-xs shadow-xl tracking-widest">Terminate Operation</button>
              </form>
           </div>
        </div>
      )}

      {/* KEY RETURN MODAL */}
      {activeModal === 'KeyReturn' && selectedSite && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
           <div className="bg-white w-full max-md rounded-[48px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-300">
              <div className="p-8 border-b border-gray-100 flex items-center justify-between"><h2 className="text-2xl font-black uppercase tracking-tight">Key Restoration</h2><button onClick={closeModals} className="p-2 hover:bg-slate-50 rounded-full"><X size={24} /></button></div>
              <form onSubmit={handleKeyReturnSubmit} className="p-8 space-y-6">
                 <div onClick={() => startCamera('environment')} className="aspect-video bg-slate-100 rounded-[32px] overflow-hidden cursor-pointer border-2 border-dashed border-slate-300 flex items-center justify-center">
                    {capturedPhoto ? <img src={capturedPhoto} className="w-full h-full object-cover" /> : <div className="text-center space-y-2"><Camera size={40} className="mx-auto text-slate-400" /><p className="text-[10px] font-black uppercase text-slate-400">Photo of Key in Cabinet</p></div>}
                 </div>
                 <button type="submit" className="w-full py-5 bg-amber-600 text-white font-black rounded-3xl uppercase text-xs shadow-xl tracking-widest">Restore Key Control</button>
              </form>
           </div>
        </div>
      )}

      {/* PROFILE MODAL */}
      {activeModal === 'Profile' && activeVendor && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
           <div className="bg-white w-full max-md rounded-[48px] overflow-hidden shadow-2xl animate-in zoom-in duration-300">
              <div className="p-10 bg-slate-900 text-white text-center space-y-4">
                 <div className="h-24 w-24 mx-auto rounded-3xl overflow-hidden border-4 border-white/20 shadow-xl">
                    <img src={activeVendor.photo} className="w-full h-full object-cover" />
                 </div>
                 <div>
                    <h2 className="text-2xl font-black uppercase tracking-tight">{activeVendor.fullName}</h2>
                    <p className="text-blue-400 font-black uppercase text-[10px] tracking-widest">{activeVendor.company}</p>
                 </div>
              </div>
              <div className="p-10 space-y-6">
                 <div className="grid grid-cols-2 gap-6">
                    <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">ID Number</p><p className="text-sm font-black text-slate-900">{activeVendor.idNumber}</p></div>
                    <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Contact</p><p className="text-sm font-black text-slate-900">{activeVendor.contactNumber}</p></div>
                    <div className="col-span-2"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Specialization</p><p className="text-sm font-black text-slate-900 uppercase">{activeVendor.specialization}</p></div>
                 </div>
                 <button onClick={closeModals} className="w-full py-4 bg-slate-100 text-slate-900 font-black rounded-3xl uppercase text-[10px] tracking-widest">Close Profile</button>
              </div>
           </div>
        </div>
      )}

      {/* KEY REQUEST MODAL */}
      {activeModal === 'KeyBorrow' && selectedSite && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
           <div className="bg-white w-full max-lg rounded-[48px] shadow-2xl flex flex-col overflow-hidden max-h-[95vh] animate-in zoom-in duration-300">
              <div className="p-8 border-b border-gray-100 flex items-center justify-between"><h2 className="text-2xl font-black uppercase tracking-tight">Key Release Protocol</h2><button onClick={closeModals} className="p-2 hover:bg-slate-50 rounded-full"><X size={24} /></button></div>
              <form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); if (!capturedPhoto) return notify('Release Proof Required', 'error'); setKeyBorrowValues({ borrowerName: activeVendor?.fullName, borrowerId: activeVendor?.idNumber, borrowerContact: activeVendor?.contactNumber, vendor: activeVendor?.company, reason: f.get('reason'), raawaNumber: f.get('raawaNumber'), releasedBy: f.get('releasedBy'), borrowPhoto: capturedPhoto }); setWaitingFor('KEY'); setActiveModal('Disclaimer'); }} className="p-8 overflow-y-auto space-y-6">
                 <div onClick={() => startCamera('environment')} className="aspect-video bg-slate-100 rounded-[32px] overflow-hidden cursor-pointer border-2 border-dashed border-slate-300 flex items-center justify-center group relative">{capturedPhoto ? <img src={capturedPhoto} className="w-full h-full object-cover" /> : <div className="text-center space-y-2"><Camera size={40} className="mx-auto text-slate-400" /><p className="text-[10px] font-black uppercase text-slate-400">Capture Proof</p></div>}</div>
                 <div className="space-y-4">
                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">RAAWA Number</label><div className="relative"><Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} /><input name="raawaNumber" required className="w-full p-4 pl-10 bg-slate-50 rounded-2xl font-black text-sm uppercase focus:border-amber-500 outline-none" placeholder="REF-2024-XXXX" /></div></div>
                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Reason</label><div className="relative"><FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} /><input name="reason" required className="w-full p-4 pl-10 bg-slate-50 rounded-2xl font-black text-sm uppercase focus:border-amber-500 outline-none" placeholder="Purpose of borrowing" /></div></div>
                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Released By</label><div className="relative"><UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} /><input name="releasedBy" required className="w-full p-4 pl-10 bg-slate-50 rounded-2xl font-black text-sm uppercase focus:border-amber-500 outline-none" placeholder="Guard or Caretaker Name" /></div></div>
                 </div>
                 <button type="submit" className="w-full py-5 bg-amber-600 text-white font-black rounded-3xl uppercase text-xs shadow-xl transition-all hover:bg-amber-700">Request Release</button>
              </form>
           </div>
        </div>
      )}

      {/* ACCESS REQUEST MODAL */}
      {activeModal === 'LoginProtocol' && selectedSite && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
           <div className="bg-white w-full max-2xl rounded-[48px] shadow-2xl flex flex-col overflow-hidden max-h-[95vh] animate-in zoom-in duration-300">
              <div className="p-8 border-b border-gray-100 flex items-center justify-between"><h2 className="text-2xl font-black uppercase tracking-tight">Entrance Protocol</h2><button onClick={closeModals} className="p-2 hover:bg-slate-50 rounded-full"><X size={24} /></button></div>
              <form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); if (!capturedPhoto) return notify('ID Photo Required', 'error'); setLoginFormValues({ activity: f.get('activity'), raawaNumber: f.get('raawaNumber'), checkedBy: f.get('checkedBy'), startTime: f.get('startTime'), expectedEndTime: f.get('expectedEndTime'), rocName: f.get('rocName'), rocTime: f.get('rocTime') }); setWaitingFor('SITE'); setActiveModal('Disclaimer'); }} className="p-8 overflow-y-auto space-y-6">
                 <div onClick={() => startCamera('user')} className="aspect-video bg-slate-100 rounded-[32px] overflow-hidden cursor-pointer border-2 border-dashed border-slate-300 flex items-center justify-center">{capturedPhoto ? <img src={capturedPhoto} className="w-full h-full object-cover" /> : <div className="text-center space-y-2"><Camera size={40} className="mx-auto text-slate-400" /><p className="text-[10px] font-black uppercase text-slate-400">Forensic ID</p></div>}</div>
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4"><h3 className="text-xs font-black uppercase text-blue-600 tracking-widest">Personnel</h3><input readOnly defaultValue={activeVendor?.fullName} className="w-full p-4 bg-slate-100 rounded-2xl font-black text-sm uppercase" /><button type="button" onClick={() => setAdditionalPersonnel(p => [...p, ''])} className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-widest"><PlusCircle size={14} /> Add Additional Team</button>{additionalPersonnel.map((p, i) => <div key={i} className="flex gap-2"><input value={p} onChange={e => { const updated = [...additionalPersonnel]; updated[i] = e.target.value; setAdditionalPersonnel(updated); }} className="flex-1 p-4 bg-slate-50 rounded-2xl font-black text-sm uppercase outline-none focus:border-blue-600" /><button type="button" onClick={() => setAdditionalPersonnel(prev => prev.filter((_, idx) => idx !== i))} className="text-rose-500"><MinusCircle size={20} /></button></div>)}</div>
                    <div className="space-y-4"><h3 className="text-xs font-black uppercase text-emerald-600 tracking-widest">Task Matrix</h3><input name="activity" placeholder="Detailed Activity" required className="w-full p-4 bg-slate-50 rounded-2xl font-black text-sm uppercase outline-none focus:border-emerald-600" /><input name="raawaNumber" placeholder="RAAWA Reference" required className="w-full p-4 bg-slate-50 rounded-2xl font-black text-sm uppercase outline-none focus:border-emerald-600" /><input name="checkedBy" placeholder="On-Site Guard Name" required className="w-full p-4 bg-slate-50 rounded-2xl font-black text-sm uppercase outline-none focus:border-emerald-600" /></div>
                 </div>
                 <div className="grid grid-cols-2 gap-4"><div><label className="text-[9px] font-black text-slate-400 uppercase">Start Time</label><input name="startTime" type="datetime-local" required className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-xs" /></div><div><label className="text-[9px] font-black text-slate-400 uppercase">Estimated Exit</label><input name="expectedEndTime" type="datetime-local" required className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-xs" /></div></div>
                 <div className="bg-slate-900 rounded-[32px] p-6 text-white space-y-4"><h3 className="text-xs font-black uppercase text-blue-500 tracking-widest">ROC Compliance</h3><div className="grid grid-cols-2 gap-4"><input name="rocName" placeholder="ROC Officer" required className="w-full p-3 bg-white/5 rounded-xl text-xs uppercase" /><input name="rocTime" type="datetime-local" required className="w-full p-3 bg-white/5 rounded-xl text-xs" /></div></div>
                 <button type="submit" className="w-full py-5 bg-blue-600 text-white font-black rounded-3xl uppercase text-xs shadow-xl tracking-widest">Confirm & Sign Transmission</button>
              </form>
           </div>
        </div>
      )}

      {/* REGISTRATION MODAL */}
      {activeModal === 'Registration' && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
           <div className="bg-white w-full max-2xl rounded-[48px] shadow-2xl flex flex-col overflow-hidden max-h-[95vh] animate-in zoom-in duration-300">
              <div className="p-8 border-b border-gray-100 flex items-center justify-between"><h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">Vendor Registry</h2><button onClick={closeModals} className="p-2 hover:bg-slate-50 rounded-full"><X size={24} /></button></div>
              <form onSubmit={handleRegisterSubmit} className="p-8 overflow-y-auto space-y-6">
                 <div onClick={() => startCamera('user')} className="aspect-video bg-slate-100 rounded-[32px] overflow-hidden cursor-pointer border-2 border-dashed border-slate-300 flex items-center justify-center">
                    {capturedPhoto ? <img src={capturedPhoto} className="w-full h-full object-cover" /> : <div className="text-center space-y-2"><Camera size={40} className="mx-auto text-slate-400" /><p className="text-[10px] font-black uppercase text-slate-400">Profile Identity Photo</p></div>}
                 </div>
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Full Name</label><input name="fullName" required className="w-full p-4 bg-slate-50 rounded-2xl font-black text-sm uppercase" /></div>
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Company</label><input name="company" required className="w-full p-4 bg-slate-50 rounded-2xl font-black text-sm uppercase" /></div>
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Contact No.</label><input name="contactNumber" required className="w-full p-4 bg-slate-50 rounded-2xl font-black text-sm uppercase" /></div>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Govt ID Number</label><input name="idNumber" required className="w-full p-4 bg-slate-50 rounded-2xl font-black text-sm uppercase" /></div>
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Username (CAPS)</label><input name="username" required className="w-full p-4 bg-slate-50 rounded-2xl font-black text-sm uppercase" /></div>
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Password (CAPS)</label><input name="password" type="password" required className="w-full p-4 bg-slate-50 rounded-2xl font-black text-sm uppercase" /></div>
                    </div>
                    <div className="col-span-2 space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Specialization</label><input name="specialization" required placeholder="e.g. Microwave Engineer, Rigger, Electrician" className="w-full p-4 bg-slate-50 rounded-2xl font-black text-sm uppercase" /></div>
                 </div>
                 <button type="submit" disabled={isSubmitting} className="w-full py-5 bg-blue-600 text-white font-black rounded-3xl uppercase text-xs shadow-xl tracking-widest">{isSubmitting ? 'Writing to Registry...' : 'Initialize Identity'}</button>
              </form>
           </div>
        </div>
      )}

      {/* PERSONNEL LOGIN MODAL */}
      {activeModal === 'PersonnelLogin' && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
           <div className="bg-white w-full max-sm rounded-[48px] p-10 shadow-2xl space-y-8 animate-in zoom-in duration-300">
              <div className="text-center space-y-2"><div className="h-16 w-16 bg-emerald-50 text-emerald-600 rounded-2xl mx-auto flex items-center justify-center"><LogIn size={32} /></div><h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 leading-none">Personnel Login</h2></div>
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                 <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Digital Username</label><input name="username" required className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold uppercase outline-none focus:border-emerald-600" /></div>
                 <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Access Password</label><input name="password" type="password" required className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold uppercase outline-none focus:border-emerald-600" /></div>
                 <button disabled={isSubmitting} type="submit" className="w-full py-5 bg-emerald-600 text-white font-black rounded-3xl uppercase text-xs shadow-xl tracking-widest">{isSubmitting ? 'Verifying...' : 'Authorize Access'}</button>
                 <button type="button" onClick={closeModals} className="w-full py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cancel</button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default VendorAccess;
