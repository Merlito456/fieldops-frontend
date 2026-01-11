
import React, { useState, useEffect, useRef } from 'react';
import { 
  LogIn, 
  LogOut, 
  Key, 
  UserCheck, 
  Camera, 
  Trash, 
  CheckCircle, 
  X, 
  TowerControl as Tower,
  Search,
  History,
  AlertCircle,
  ShieldCheck,
  Smartphone,
  Info,
  Clock,
  RotateCcw,
  Loader2,
  Check,
  MapPin,
  User,
  Shield,
  Fingerprint,
  Maximize2,
  Building2,
  BadgeCheck,
  PhoneCall,
  RefreshCw,
  Flag,
  Upload
} from 'lucide-react';
import { apiService } from '../services/apiService';
import { WorkSite, SiteVisitor, KeyLog, VendorProfile } from '../types';
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
  const [distanceToSite, setDistanceToSite] = useState<number | null>(null);

  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [loginFormValues, setLoginFormValues] = useState<any>(null);
  const [keyBorrowValues, setKeyBorrowValues] = useState<any>(null);
  const [additionalPersonnel, setAdditionalPersonnel] = useState<string[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const { notify } = useNotify();

  const loadInitialData = async () => {
    try {
      const fetchedSites = await apiService.getSites();
      const vendor = apiService.getActiveVendor();
      if (fetchedSites) setSites(fetchedSites);
      setActiveVendor(vendor);
    } catch (err) {
      console.error("Initial load sync failed", err);
      notify('Local Ledger Mode Active', 'info');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Polling for FO Authorization status when in Waiting modal
  useEffect(() => {
    let interval: number | null = null;
    if (activeModal === 'Waiting' && selectedSite) {
      interval = window.setInterval(async () => {
        try {
          const freshSites = await apiService.getSites();
          if (freshSites) setSites(freshSites);
        } catch (e) {
          console.warn("Polling bridge failed", e);
        }
      }, 3000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [activeModal, selectedSite]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    if (streamActive) {
      navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }, 
        audio: false 
      })
        .then(s => {
          stream = s;
          if (videoRef.current) videoRef.current.srcObject = s;
        })
        .catch(err => {
          notify('Camera access denied.', 'error');
          setStreamActive(false);
        });
    }
    return () => { if (stream) stream.getTracks().forEach(track => track.stop()); };
  }, [streamActive, facingMode]);

  useEffect(() => {
    if (streamActive && mapContainerRef.current && location && !mapRef.current) {
      const L = (window as any).L;
      if (!L) return;
      const mapInstance = L.map(mapContainerRef.current, { zoomControl: false, attributionControl: false }).setView([location.lat, location.lng], 16);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstance);
      L.marker([location.lat, location.lng]).addTo(mapInstance);
      mapRef.current = mapInstance;
    }
    return () => { if (!streamActive && mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, [streamActive, location]);

  useEffect(() => {
    let watchId: number | null = null;
    if (streamActive) {
      if ("geolocation" in navigator) {
        watchId = navigator.geolocation.watchPosition(
          (pos) => {
            const { latitude, longitude, accuracy } = pos.coords;
            setLocation({ lat: latitude, lng: longitude, accuracy });
            if (selectedSite) verifyProximity(latitude, longitude);
          },
          (err) => console.error(err),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      }
    }
    return () => { if (watchId !== null) navigator.geolocation.clearWatch(watchId); };
  }, [streamActive, selectedSite]);

  const verifyProximity = (lat: number, lng: number) => {
    if (!selectedSite?.gpsCoordinates) return setGpsVerified(true);
    const coords = selectedSite.gpsCoordinates.split(',').map(n => parseFloat(n.trim()));
    if (isNaN(coords[0])) return setGpsVerified(true);
    const R = 6371e3;
    const φ1 = lat * Math.PI/180;
    const φ2 = coords[0] * Math.PI/180;
    const Δφ = (coords[0]-lat) * Math.PI/180;
    const Δλ = (coords[1]-lng) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c;
    setDistanceToSite(d);
    setGpsVerified(d < 800); 
  };

  const capturePhoto = async () => {
    if (videoRef.current && location) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      const videoWidth = video.videoWidth || 1280;
      const videoHeight = video.videoHeight || 720;
      const stampHeight = 240; 
      canvas.width = videoWidth;
      canvas.height = videoHeight + stampHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.save();
      if (facingMode === 'user') { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
      ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
      ctx.restore();
      ctx.fillStyle = "#020617";
      ctx.fillRect(0, videoHeight, canvas.width, stampHeight);
      const ledger = [
        ["OPERATOR_ID", activeVendor?.idNumber || "SYNC_PENDING"],
        ["SITE_NAME", selectedSite?.name?.toUpperCase() || "ASSET_UNSPECIFIED"],
        ["GPS_FIX", `${location.lat.toFixed(8)}, ${location.lng.toFixed(8)}`],
        ["TIMESTAMP", new Date().toISOString()],
        ["VALIDATION", gpsVerified ? 'PROXIMITY_LOCK_CONFIRMED' : 'LOCATION_OUT_OF_BOUNDS'],
        ["SYSTEM_KEY", `OPS-${Math.random().toString(36).substring(7).toUpperCase()}`]
      ];
      ctx.textAlign = "left";
      ledger.forEach((row, i) => {
        ctx.font = "900 12px Inter"; ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.fillText(row[0], 60, videoHeight + 50 + (i * 24));
        ctx.font = "bold 13px Inter"; ctx.fillStyle = "#ffffff";
        ctx.fillText(row[1], 200, videoHeight + 50 + (i * 24));
      });
      setCapturedPhoto(canvas.toDataURL('image/jpeg', 0.95));
      stopCamera();
    }
  };

  const startCamera = (mode: string) => { setStreamActive(true); };
  const stopCamera = () => { setStreamActive(false); };

  const handleRegisterSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!capturedPhoto) return notify('Photo ID required', 'error');
    const f = new FormData(e.currentTarget);
    const vendor: any = {
      id: `VND-${Date.now()}`,
      username: f.get('username') as string,
      fullName: f.get('fullName') as string,
      company: f.get('company') as string,
      contactNumber: f.get('contactNumber') as string,
      idNumber: f.get('idNumber') as string,
      specialization: f.get('specialization') as string,
      photo: capturedPhoto,
      verified: true,
      createdAt: new Date().toISOString()
    };
    setIsSubmitting(true);
    try {
      const result = await apiService.registerVendor(vendor);
      if (result) {
        setActiveVendor(result);
        closeModals();
        notify('Registration successful', 'success');
      }
    } catch (err) { notify('Registration failed', 'error'); }
    finally { setIsSubmitting(false); }
  };

  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const username = (f.get('username') as string)?.trim();
    if (!username) return notify('Username required', 'error');
    
    setIsSubmitting(true);
    try {
      const result = await apiService.loginVendor(username);
      if (result && result.id) {
        setActiveVendor(result);
        closeModals();
        notify('Access granted', 'success');
      } else { 
        notify('Account not found in registry', 'error'); 
      }
    } catch (err) { 
      notify('Authentication node failure', 'error'); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const handleLoginProtocolSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!capturedPhoto) return notify('Evidence required', 'error');
    if (gpsVerified === false) return notify('Proximity Error (within 800m).', 'error');
    const f = new FormData(e.currentTarget);
    setLoginFormValues({ 
      activity: f.get('activity'),
      personnel: [activeVendor?.fullName, ...additionalPersonnel],
      rocName: f.get('rocName'),
      rocTime: f.get('rocTime')
    });
    setWaitingFor('SITE');
    setActiveModal('Disclaimer');
  };

  const handleKeyBorrowSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!capturedPhoto) return notify('Evidence required', 'error');
    const f = new FormData(e.currentTarget);
    setKeyBorrowValues({
      borrowerName: activeVendor?.fullName,
      borrowerId: activeVendor?.idNumber,
      borrowerContact: activeVendor?.contactNumber,
      vendor: activeVendor?.company,
      reason: f.get('reason'),
      borrowPhoto: capturedPhoto
    });
    setWaitingFor('KEY');
    setActiveModal('Disclaimer');
  };

  const finalizeRequest = async () => {
    if (!selectedSite || !activeVendor) return;
    setIsSubmitting(true);
    try {
      if (waitingFor === 'SITE') {
        await apiService.requestAccess(selectedSite.id, {
          vendorId: activeVendor.id, leadName: activeVendor.fullName, contactNumber: activeVendor.contactNumber,
          personnel: loginFormValues.personnel, vendor: activeVendor.company, activity: loginFormValues.activity as string,
          photo: capturedPhoto || undefined, rocLogged: true, rocName: loginFormValues.rocName as string,
          rocTime: loginFormValues.rocTime as string, nocLogged: false
        });
      } else if (waitingFor === 'KEY') {
        await apiService.requestKeyBorrow(selectedSite.id, { siteId: selectedSite.id, siteName: selectedSite.name, ...keyBorrowValues });
      }
      setActiveModal('Waiting');
    } catch (err) { notify('Network Error', 'error'); } finally { setIsSubmitting(false); }
  };

  const confirmAccess = async () => {
    if (!selectedSite) return;
    try {
      const freshSites = await apiService.getSites();
      const site = freshSites.find(s => s.id === selectedSite.id);
      if (waitingFor === 'SITE' && site?.pendingVisitor) {
        await apiService.checkInVendor(site.id, site.pendingVisitor);
        notify('Protocol Confirmed.', 'success');
      } else if (waitingFor === 'KEY' && site?.pendingKeyLog) {
        await apiService.confirmKeyBorrow(site.id);
        notify('Key Custody Transferred.', 'success');
      }
      closeModals();
      loadInitialData();
    } catch (err) { notify('Sync error', 'error'); }
  };

  const closeModals = () => { setActiveModal(null); setCapturedPhoto(null); setWaitingFor(null); setStreamActive(false); setAdditionalPersonnel([]); };

  const currentSiteState = selectedSite ? sites.find(s => s.id === selectedSite.id) : null;
  const isAuthorized = waitingFor === 'SITE' ? currentSiteState?.accessAuthorized : currentSiteState?.keyAccessAuthorized;

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      {/* CAMERA OVERLAY */}
      {streamActive && (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center">
          <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`} />
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8">
            <div className="flex justify-between items-start pointer-events-auto">
               <div className="w-48 h-48 bg-slate-900 rounded-3xl border border-white/15 p-1 overflow-hidden"><div ref={mapContainerRef} className="w-full h-full rounded-2xl"></div></div>
               <button onClick={stopCamera} className="p-4 bg-black/60 text-white rounded-full hover:bg-rose-600"><X size={24} /></button>
            </div>
            <div className="flex flex-col items-center space-y-6 pointer-events-auto">
               <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-colors ${gpsVerified ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border-rose-500/30'}`}>
                  {gpsVerified === null ? 'LOCATING ASSET...' : gpsVerified ? 'PROXIMITY_LOCKED' : 'ASSET_OUT_OF_BOUNDS'}
               </div>
               <button onClick={capturePhoto} className="w-24 h-24 bg-white rounded-full border-[6px] border-white/20 flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all">
                  <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white"><Camera size={32} /></div>
               </button>
            </div>
          </div>
        </div>
      )}

      {!activeVendor ? (
        <div className="max-w-xl mx-auto space-y-12 py-20 text-center">
           <div className="space-y-4">
              <div className="h-20 w-20 bg-slate-900 text-white rounded-2xl mx-auto flex items-center justify-center shadow-2xl"><Shield size={40} /></div>
              <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Vendor Protocol Hub</h1>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Digital Site Custody System</p>
           </div>
           <div className="grid grid-cols-2 gap-6">
              <button onClick={() => setActiveModal('Registration')} className="p-8 bg-white border border-slate-200 rounded-[32px] shadow-xl hover:border-blue-500 hover:shadow-2xl hover:-translate-y-1 transition-all flex flex-col items-center space-y-4">
                 <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Fingerprint size={32} /></div>
                 <h3 className="text-sm font-black uppercase tracking-tight">Register</h3>
              </button>
              <button onClick={() => setActiveModal('PersonnelLogin')} className="p-8 bg-white border border-slate-200 rounded-[32px] shadow-xl hover:border-emerald-500 hover:shadow-2xl hover:-translate-y-1 transition-all flex flex-col items-center space-y-4">
                 <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><LogIn size={32} /></div>
                 <h3 className="text-sm font-black uppercase tracking-tight">Login</h3>
              </button>
           </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
             <div className="text-left">
               <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Operational Portal</h1>
               <p className="text-blue-600 font-black uppercase text-[10px] tracking-widest mt-1">{activeVendor.fullName} • {activeVendor.company}</p>
             </div>
             <div className="flex items-center space-x-3">
                <button onClick={() => setActiveModal('Profile')} className="h-12 w-12 bg-white border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center shadow-sm">
                   {activeVendor.photo ? <img src={activeVendor.photo} className="w-full h-full object-cover" /> : <User size={20} />}
                </button>
                <button onClick={() => { apiService.logoutVendor(); setActiveVendor(null); }} className="p-3 bg-slate-900 text-white rounded-xl hover:bg-rose-600 transition-colors shadow-lg"><LogOut size={20} /></button>
             </div>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Filter sites by name or ID..."
              className="w-full pl-12 pr-6 py-4 bg-white border border-slate-100 rounded-2xl font-black text-sm uppercase outline-none focus:ring-4 focus:ring-blue-500/10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-10">
            {sites.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.id.toLowerCase().includes(searchQuery.toLowerCase())).map((site) => (
              <div key={site.id} className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:border-blue-500 transition-all hover:shadow-2xl hover:-translate-y-1">
                <div className="p-8 space-y-4 flex-1">
                  <div className="flex justify-between items-start">
                    <div className="p-3 bg-slate-50 rounded-xl text-slate-900"><Tower size={24} /></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{site.id}</span>
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">{site.name}</h3>
                  <div className="flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <MapPin size={12} className="mr-1.5" /> {site.address}
                  </div>
                </div>
                <div className="p-6 bg-slate-50 border-t border-slate-100 grid grid-cols-2 gap-3">
                   {site.currentVisitor ? (
                     <button onClick={() => { setSelectedSite(site); setActiveModal('LogoutProtocol'); }} className="col-span-2 py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:brightness-110">End Operation</button>
                   ) : (
                     <button onClick={() => { setSelectedSite(site); if (site.accessAuthorized) { setWaitingFor('SITE'); setActiveModal('Waiting'); } else setActiveModal('LoginProtocol'); }} className={`py-4 ${site.accessAuthorized ? 'bg-blue-600 animate-pulse' : 'bg-emerald-600'} text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:brightness-110 transition-all`}>
                       {site.accessAuthorized ? 'Authorized: Open Gate' : 'Request Entrance'}
                     </button>
                   )}
                   {site.keyStatus === 'Borrowed' ? (
                     <button onClick={() => { setSelectedSite(site); setActiveModal('KeyReturn'); }} className="py-4 bg-amber-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:brightness-110">Return Key</button>
                   ) : (
                     <button onClick={() => { setSelectedSite(site); if (site.keyAccessAuthorized) { setWaitingFor('KEY'); setActiveModal('Waiting'); } else setActiveModal('KeyBorrow'); }} className={`py-4 ${site.keyAccessAuthorized ? 'bg-blue-600 animate-pulse' : 'bg-slate-900'} text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:brightness-110 transition-all`}>
                       {site.keyAccessAuthorized ? 'Key: Confirm Release' : 'Borrow Key'}
                     </button>
                   )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* MODALS */}
      {activeModal === 'Registration' && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
           <div className="bg-white w-full max-w-lg rounded-[48px] shadow-2xl flex flex-col overflow-hidden max-h-[90vh] animate-in zoom-in duration-300">
              <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                 <h2 className="text-2xl font-black uppercase tracking-tight">Vendor Registration</h2>
                 <button onClick={closeModals} className="p-2 hover:bg-slate-50 rounded-full"><X size={24} /></button>
              </div>
              <form onSubmit={handleRegisterSubmit} className="p-8 overflow-y-auto space-y-6">
                 <div onClick={() => startCamera('user')} className="aspect-video bg-slate-100 rounded-[32px] overflow-hidden cursor-pointer border-2 border-dashed border-slate-300 flex items-center justify-center group">
                    {capturedPhoto ? <img src={capturedPhoto} className="w-full h-full object-cover" /> : <div className="text-center space-y-2 group-hover:scale-110 transition-transform"><Camera size={40} className="mx-auto text-slate-400" /><p className="text-[10px] font-black uppercase text-slate-400">Capture Forensic ID Photo</p></div>}
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Username</label><input name="username" required className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-sm focus:border-blue-500 outline-none" /></div>
                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label><input name="fullName" required className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-sm focus:border-blue-500 outline-none" /></div>
                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Company</label><input name="company" required className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-sm focus:border-blue-500 outline-none" /></div>
                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact No.</label><input name="contactNumber" required className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-sm focus:border-blue-500 outline-none" /></div>
                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Gov ID / License</label><input name="idNumber" required className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-sm focus:border-blue-500 outline-none" /></div>
                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Specialization</label><input name="specialization" required className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-sm focus:border-blue-500 outline-none" /></div>
                 </div>
                 <button disabled={isSubmitting} type="submit" className="w-full py-5 bg-blue-600 text-white font-black rounded-3xl uppercase text-xs tracking-widest shadow-xl hover:bg-blue-700 transition-all">{isSubmitting ? 'Syncing...' : 'Complete Forensic Registration'}</button>
              </form>
           </div>
        </div>
      )}

      {activeModal === 'PersonnelLogin' && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
           <div className="bg-white w-full max-w-sm rounded-[48px] p-10 shadow-2xl space-y-8 animate-in zoom-in duration-300">
              <div className="text-center space-y-2">
                 <div className="h-16 w-16 bg-emerald-50 text-emerald-600 rounded-2xl mx-auto flex items-center justify-center"><User size={32} /></div>
                 <h2 className="text-2xl font-black uppercase tracking-tight">Personnel Login</h2>
              </div>
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                 <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Account Username</label><input name="username" required className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-sm text-center focus:border-emerald-500 outline-none" placeholder="e.g. jdoe123" /></div>
                 <button disabled={isSubmitting} type="submit" className="w-full py-5 bg-emerald-600 text-white font-black rounded-3xl uppercase text-xs tracking-widest shadow-xl hover:bg-emerald-700 transition-all">{isSubmitting ? 'Verifying...' : 'Authorize Kiosk Access'}</button>
                 <button type="button" onClick={closeModals} className="w-full py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cancel</button>
              </form>
           </div>
        </div>
      )}

      {/* REMAINDER OF MODALS REPLICATED FOR ROBUSTNESS */}
      {activeModal === 'LoginProtocol' && selectedSite && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
           <div className="bg-white w-full max-w-lg rounded-[48px] shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
              <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                 <h2 className="text-2xl font-black uppercase tracking-tight">Entrance Protocol</h2>
                 <button onClick={closeModals} className="p-2 hover:bg-slate-50 rounded-full"><X size={24} /></button>
              </div>
              <form onSubmit={handleLoginProtocolSubmit} className="p-8 overflow-y-auto space-y-6">
                 <div onClick={() => startCamera('environment')} className="aspect-video bg-slate-100 rounded-[32px] overflow-hidden cursor-pointer border-2 border-dashed border-slate-300 flex items-center justify-center group">
                    {capturedPhoto ? <img src={capturedPhoto} className="w-full h-full object-cover" /> : <div className="text-center space-y-2 group-hover:scale-110 transition-transform"><Camera size={40} className="mx-auto text-slate-400" /><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Capture Gate Proof (GPS Match)</p></div>}
                 </div>
                 <div className="space-y-4">
                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Activity Purpose</label><input name="activity" required className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm" placeholder="e.g. Battery Replacement" /></div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">ROC Logged By</label><input name="rocName" required className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm" /></div>
                       <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">ROC Logged Time</label><input name="rocTime" type="datetime-local" required className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-xs" /></div>
                    </div>
                 </div>
                 <button type="submit" className="w-full py-5 bg-blue-600 text-white font-black rounded-3xl uppercase text-xs tracking-widest shadow-xl">Transmit to FO</button>
              </form>
           </div>
        </div>
      )}

      {activeModal === 'Waiting' && selectedSite && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-xl text-center">
           <div className="bg-white w-full max-w-lg rounded-[48px] p-12 space-y-8 shadow-2xl">
              <div className={`p-8 rounded-[40px] inline-block transition-all ${isAuthorized ? 'bg-emerald-600 text-white scale-110 shadow-2xl shadow-emerald-500/30' : 'bg-slate-100 text-slate-400'}`}>
                {isAuthorized ? <Flag size={64} className="animate-bounce" /> : <Loader2 size={64} className="animate-spin" />}
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">{isAuthorized ? 'Access Granted' : 'Pending FO Approval'}</h2>
              {isAuthorized ? (
                <button onClick={confirmAccess} className="w-full py-5 bg-emerald-600 text-white font-black rounded-3xl uppercase text-xs tracking-widest shadow-xl hover:brightness-110">Open Gate & Start Work</button>
              ) : (
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bridging secure nodes...</p>
                  <button onClick={closeModals} className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Terminate Request</button>
                </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export default VendorAccess;
