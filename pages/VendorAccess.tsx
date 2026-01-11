
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
  Upload,
  Lock,
  ChevronRight,
  AlertTriangle,
  PlusCircle,
  MinusCircle,
  FlipHorizontal
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
      console.warn("Initial load sync failed", err);
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
        video: { facingMode: facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } }, 
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
    const d = calculateDistance(lat, lng, coords[0], coords[1] || 0);
    setDistanceToSite(d);
    setGpsVerified(d < 800); 
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
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

  const startCamera = (mode: 'user' | 'environment') => { setFacingMode(mode); setStreamActive(true); };
  const stopCamera = () => { setStreamActive(false); };
  const toggleCamera = () => setFacingMode(prev => prev === 'user' ? 'environment' : 'user');

  const handleRegisterSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!capturedPhoto) return notify('Photo ID required', 'error');
    const f = new FormData(e.currentTarget);
    const vendor: any = {
      id: `VND-${Date.now()}`,
      username: (f.get('username') as string).trim(),
      password: (f.get('password') as string),
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
        localStorage.setItem('fo_active_vendor_id', result.id);
        closeModals();
        notify('Registration successful', 'success');
      }
    } catch (err: any) { notify(err.message || 'Registration failed', 'error'); }
    finally { setIsSubmitting(false); }
  };

  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const username = (f.get('username') as string)?.trim();
    const password = f.get('password') as string;
    
    if (!username) return notify('Username required', 'error');
    if (!password) return notify('Password required', 'error');
    
    setIsSubmitting(true);
    try {
      const result = await apiService.loginVendor(username, password);
      if (result && result.id) {
        setActiveVendor(result);
        localStorage.setItem('fo_active_vendor_id', result.id);
        closeModals();
        notify('Access granted', 'success');
      } else { 
        notify('Invalid username or password', 'error'); 
      }
    } catch (err: any) { 
      notify(err.message || 'Authentication failed', 'error'); 
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
      rawaNumber: f.get('rawaNumber'),
      checkedBy: f.get('checkedBy'),
      startTime: f.get('startTime'),
      expectedEndTime: f.get('expectedEndTime'),
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

  const handleLogoutProtocolSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedSite || !capturedPhoto) return notify('Exit evidence required', 'error');
    const f = new FormData(e.currentTarget);
    setIsSubmitting(true);
    try {
      await apiService.checkOutVendor(selectedSite.id, capturedPhoto, {
        name: f.get('rocName') as string,
        time: f.get('rocTime') as string
      });
      notify('Operation logged out successfully', 'success');
      closeModals();
      loadInitialData();
    } catch (err) { notify('Checkout failed', 'error'); }
    finally { setIsSubmitting(false); }
  };

  const handleKeyReturnSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedSite || !capturedPhoto) return notify('Return evidence required', 'error');
    setIsSubmitting(true);
    try {
      await apiService.returnKey(selectedSite.id, capturedPhoto);
      notify('Key returned to vault', 'success');
      closeModals();
      loadInitialData();
    } catch (err) { notify('Return failed', 'error'); }
    finally { setIsSubmitting(false); }
  };

  const finalizeRequest = async () => {
    if (!selectedSite || !activeVendor) return;
    setIsSubmitting(true);
    try {
      if (waitingFor === 'SITE') {
        await apiService.requestAccess(selectedSite.id, {
          vendorId: activeVendor.id, 
          leadName: activeVendor.fullName, 
          contactNumber: activeVendor.contactNumber,
          personnel: loginFormValues.personnel, 
          vendor: activeVendor.company, 
          activity: loginFormValues.activity as string,
          rawaNumber: loginFormValues.rawaNumber as string,
          checkedBy: loginFormValues.checkedBy as string,
          startTime: loginFormValues.startTime as string,
          expectedEndTime: loginFormValues.expectedEndTime as string,
          photo: capturedPhoto || undefined,
          rocLogged: true, 
          rocName: loginFormValues.rocName as string,
          rocTime: loginFormValues.rocTime as string, 
          nocLogged: false
        });
      } else if (waitingFor === 'KEY') {
        await apiService.requestKeyBorrow(selectedSite.id, { 
          siteId: selectedSite.id, 
          siteName: selectedSite.name, 
          ...keyBorrowValues 
        });
      }
      setActiveModal('Waiting');
    } catch (err) { 
      notify('Network Error', 'error'); 
    } finally { 
      setIsSubmitting(false); 
    }
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

  const closeModals = () => { 
    setActiveModal(null); 
    setCapturedPhoto(null); 
    setWaitingFor(null); 
    setStreamActive(false); 
    setAdditionalPersonnel([]); 
  };

  const addPersonnelField = () => setAdditionalPersonnel([...additionalPersonnel, '']);
  const removePersonnelField = (index: number) => setAdditionalPersonnel(additionalPersonnel.filter((_, i) => i !== index));
  const updatePersonnelName = (index: number, name: string) => {
    const updated = [...additionalPersonnel];
    updated[index] = name;
    setAdditionalPersonnel(updated);
  };

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
               <div className="flex space-x-2">
                 <button onClick={toggleCamera} className="p-4 bg-black/60 text-white rounded-full hover:bg-blue-600 transition-colors"><FlipHorizontal size={24} /></button>
                 <button onClick={stopCamera} className="p-4 bg-black/60 text-white rounded-full hover:bg-rose-600 transition-colors"><X size={24} /></button>
               </div>
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
      {activeModal === 'LoginProtocol' && selectedSite && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
           <div className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl flex flex-col overflow-hidden max-h-[95vh]">
              <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                 <h2 className="text-2xl font-black uppercase tracking-tight">Entrance Protocol</h2>
                 <button onClick={closeModals} className="p-2 hover:bg-slate-50 rounded-full transition-colors"><X size={24} /></button>
              </div>
              <form onSubmit={handleLoginProtocolSubmit} className="p-8 overflow-y-auto space-y-6">
                 {/* FORENSIC PROOF */}
                 <div onClick={() => startCamera('user')} className="aspect-video bg-slate-100 rounded-[32px] overflow-hidden cursor-pointer border-2 border-dashed border-slate-300 flex items-center justify-center group relative">
                    {capturedPhoto ? <img src={capturedPhoto} className="w-full h-full object-cover" /> : <div className="text-center space-y-2 group-hover:scale-110 transition-transform"><Camera size={40} className="mx-auto text-slate-400" /><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Capture Full View Forensic ID</p></div>}
                    {capturedPhoto && <div className="absolute bottom-4 right-4 bg-blue-600 text-white p-2 rounded-xl text-[8px] font-black uppercase">RE-TAKE PHOTO</div>}
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                       <h3 className="text-xs font-black uppercase tracking-widest text-blue-600">Personnel Data</h3>
                       <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Team Leader</label>
                          <input readOnly defaultValue={activeVendor?.fullName} className="w-full p-4 bg-slate-100 rounded-2xl font-black text-sm uppercase outline-none border-2 border-transparent" />
                       </div>
                       <div className="space-y-2">
                          <div className="flex items-center justify-between ml-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Attending Personnel</label>
                            <button type="button" onClick={addPersonnelField} className="text-blue-600 hover:text-blue-800"><PlusCircle size={16} /></button>
                          </div>
                          <input readOnly defaultValue={activeVendor?.fullName} className="w-full p-4 bg-slate-100 rounded-2xl font-black text-sm uppercase outline-none border-2 border-transparent" />
                          {additionalPersonnel.map((name, idx) => (
                            <div key={idx} className="flex items-center space-x-2">
                               <input 
                                 placeholder="NAME OF PERSONNEL"
                                 value={name}
                                 onChange={(e) => updatePersonnelName(idx, e.target.value)}
                                 required
                                 className="flex-1 p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-black text-sm uppercase focus:border-blue-500 outline-none" 
                               />
                               <button type="button" onClick={() => removePersonnelField(idx)} className="text-rose-500 hover:text-rose-700"><MinusCircle size={20} /></button>
                            </div>
                          ))}
                       </div>
                    </div>

                    <div className="space-y-4">
                       <h3 className="text-xs font-black uppercase tracking-widest text-emerald-600">Task Details</h3>
                       <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Activity</label>
                          <input name="activity" required className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-black text-sm uppercase focus:border-blue-500 outline-none" placeholder="e.g. Battery Replacement" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">RAWA Number</label>
                          <input name="rawaNumber" required className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-black text-sm uppercase focus:border-blue-500 outline-none" placeholder="REF-2024-XXXX" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Checked By (Guard/Caretaker)</label>
                          <input name="checkedBy" required className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-black text-sm uppercase focus:border-blue-500 outline-none" placeholder="Full Name" />
                       </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Date/Time</label>
                       <input name="startTime" type="datetime-local" required className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-xs focus:border-blue-500 outline-none" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Expected End Date/Time</label>
                       <input name="expectedEndTime" type="datetime-local" required className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-xs focus:border-blue-500 outline-none" />
                    </div>
                 </div>

                 <div className="bg-slate-900 rounded-[32px] p-6 space-y-4 text-white">
                    <div className="flex items-center space-x-3">
                       <History className="text-blue-500" size={20} />
                       <h3 className="text-xs font-black uppercase tracking-widest">ROC Log-in Registry</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1">
                          <label className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">ROC Name</label>
                          <input name="rocName" required className="w-full p-3 bg-white/5 border border-white/10 rounded-xl font-bold text-xs text-white uppercase outline-none focus:border-blue-500" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Login Timestamp</label>
                          <input name="rocTime" type="datetime-local" required className="w-full p-3 bg-white/5 border border-white/10 rounded-xl font-bold text-xs text-white uppercase outline-none focus:border-blue-500" />
                       </div>
                    </div>
                 </div>

                 {/* SAFETY ALERT */}
                 <div className="p-5 bg-rose-50 border-2 border-rose-100 rounded-3xl flex items-start space-x-3">
                    <AlertTriangle className="text-rose-600 shrink-0 mt-1" size={20} />
                    <div>
                       <h4 className="text-[10px] font-black text-rose-900 uppercase tracking-widest">Operational Disruption Alert</h4>
                       <p className="text-[9px] font-medium text-rose-700 leading-relaxed mt-1 italic">
                         REMINDER: For highly critical activities that might cause site disruption, you MUST login to NOC and refer to your MOP document before proceeding.
                       </p>
                    </div>
                 </div>

                 <button type="submit" className="w-full py-5 bg-blue-600 text-white font-black rounded-3xl uppercase text-xs tracking-widest shadow-xl transition-all hover:bg-blue-700">Transmit to FO</button>
              </form>
           </div>
        </div>
      )}

      {/* OTHER MODALS (KEY, DISCLAIMER, ETC) REMAIN SAME BUT ENSURE THE NEW FIELDS PERSIST */}
      {/* ... keeping the rest of the modals as they were ... */}
      
      {activeModal === 'Registration' && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
           <div className="bg-white w-full max-w-lg rounded-[48px] shadow-2xl flex flex-col overflow-hidden max-h-[90vh] animate-in zoom-in duration-300">
              <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                 <h2 className="text-2xl font-black uppercase tracking-tight">Vendor Registration</h2>
                 <button onClick={closeModals} className="p-2 hover:bg-slate-50 rounded-full transition-colors"><X size={24} /></button>
              </div>
              <form onSubmit={handleRegisterSubmit} className="p-8 overflow-y-auto space-y-6">
                 <div onClick={() => startCamera('user')} className="aspect-video bg-slate-100 rounded-[32px] overflow-hidden cursor-pointer border-2 border-dashed border-slate-300 flex items-center justify-center group">
                    {capturedPhoto ? <img src={capturedPhoto} className="w-full h-full object-cover" /> : <div className="text-center space-y-2 group-hover:scale-110 transition-transform"><Camera size={40} className="mx-auto text-slate-400" /><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Capture Forensic ID Photo</p></div>}
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Username</label><input name="username" required className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-sm focus:border-blue-500 outline-none" /></div>
                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label><input name="password" type="password" required className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-sm focus:border-blue-500 outline-none" /></div>
                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label><input name="fullName" required className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-sm focus:border-blue-500 outline-none" /></div>
                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Company</label><input name="company" required className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-sm focus:border-blue-500 outline-none" /></div>
                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact No.</label><input name="contactNumber" required className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-sm focus:border-blue-500 outline-none" /></div>
                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Gov ID / License</label><input name="idNumber" required className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-sm focus:border-blue-500 outline-none" /></div>
                    <div className="space-y-1 md:col-span-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Specialization</label><input name="specialization" required className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-sm focus:border-blue-500 outline-none" /></div>
                 </div>
                 <button disabled={isSubmitting} type="submit" className="w-full py-5 bg-blue-600 text-white font-black rounded-3xl uppercase text-xs tracking-widest shadow-xl hover:bg-blue-700 transition-all">{isSubmitting ? 'Syncing...' : 'Complete Forensic Registration'}</button>
              </form>
           </div>
        </div>
      )}

      {activeModal === 'PersonnelLogin' && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
           <div className="bg-white w-full max-sm rounded-[48px] p-10 shadow-2xl space-y-8 animate-in zoom-in duration-300">
              <div className="text-center space-y-2">
                 <div className="h-16 w-16 bg-emerald-50 text-emerald-600 rounded-2xl mx-auto flex items-center justify-center"><User size={32} /></div>
                 <h2 className="text-2xl font-black uppercase tracking-tight">Personnel Login</h2>
              </div>
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Account Username</label>
                    <div className="relative">
                       <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                       <input name="username" required className="w-full p-4 pl-12 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-sm focus:border-emerald-500 outline-none" placeholder="Username" />
                    </div>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Secure Password</label>
                    <div className="relative">
                       <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                       <input name="password" type="password" required className="w-full p-4 pl-12 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-sm focus:border-emerald-500 outline-none" placeholder="Password" />
                    </div>
                 </div>
                 <button disabled={isSubmitting} type="submit" className="w-full py-5 bg-emerald-600 text-white font-black rounded-3xl uppercase text-xs tracking-widest shadow-xl hover:bg-emerald-700 transition-all">{isSubmitting ? 'Verifying...' : 'Authorize Kiosk Access'}</button>
                 <button type="button" onClick={closeModals} className="w-full py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cancel</button>
              </form>
           </div>
        </div>
      )}

      {activeModal === 'KeyBorrow' && selectedSite && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
           <div className="bg-white w-full max-w-lg rounded-[48px] shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
              <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                 <h2 className="text-2xl font-black uppercase tracking-tight">Key Request Protocol</h2>
                 <button onClick={closeModals} className="p-2 hover:bg-slate-50 rounded-full transition-colors"><X size={24} /></button>
              </div>
              <form onSubmit={handleKeyBorrowSubmit} className="p-8 overflow-y-auto space-y-6">
                 <div onClick={() => startCamera('environment')} className="aspect-video bg-slate-100 rounded-[32px] overflow-hidden cursor-pointer border-2 border-dashed border-slate-300 flex items-center justify-center group">
                    {capturedPhoto ? <img src={capturedPhoto} className="w-full h-full object-cover" /> : <div className="text-center space-y-2 group-hover:scale-110 transition-transform"><Camera size={40} className="mx-auto text-slate-400" /><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Capture Vault Location Proof</p></div>}
                 </div>
                 <div className="space-y-4">
                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Reason for Borrowing</label><input name="reason" required className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-black text-sm uppercase focus:border-amber-500 outline-none" placeholder="e.g. Cabinet Access" /></div>
                 </div>
                 <button type="submit" className="w-full py-5 bg-amber-600 text-white font-black rounded-3xl uppercase text-xs tracking-widest shadow-xl transition-all hover:bg-amber-700">Request Key Release</button>
              </form>
           </div>
        </div>
      )}

      {activeModal === 'LogoutProtocol' && selectedSite && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
           <div className="bg-white w-full max-w-lg rounded-[48px] shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
              <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                 <h2 className="text-2xl font-black uppercase tracking-tight">Exit Protocol</h2>
                 <button onClick={closeModals} className="p-2 hover:bg-slate-50 rounded-full transition-colors"><X size={24} /></button>
              </div>
              <form onSubmit={handleLogoutProtocolSubmit} className="p-8 overflow-y-auto space-y-6">
                 <div onClick={() => startCamera('environment')} className="aspect-video bg-slate-100 rounded-[32px] overflow-hidden cursor-pointer border-2 border-dashed border-slate-300 flex items-center justify-center group">
                    {capturedPhoto ? <img src={capturedPhoto} className="w-full h-full object-cover" /> : <div className="text-center space-y-2 group-hover:scale-110 transition-transform"><Camera size={40} className="mx-auto text-slate-400" /><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Capture "Site Restored" Evidence</p></div>}
                 </div>
                 <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">ROC Logout Lead</label><input name="rocName" required className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-sm focus:border-rose-500 outline-none" /></div>
                       <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">ROC Logout Time</label><input name="rocTime" type="datetime-local" required className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-xs focus:border-rose-500 outline-none" /></div>
                    </div>
                 </div>
                 <button type="submit" className="w-full py-5 bg-rose-600 text-white font-black rounded-3xl uppercase text-xs tracking-widest shadow-xl transition-all hover:bg-rose-700">Terminate Session</button>
              </form>
           </div>
        </div>
      )}

      {activeModal === 'KeyReturn' && selectedSite && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
           <div className="bg-white w-full max-w-lg rounded-[48px] shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
              <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                 <h2 className="text-2xl font-black uppercase tracking-tight">Return Protocol</h2>
                 <button onClick={closeModals} className="p-2 hover:bg-slate-50 rounded-full transition-colors"><X size={24} /></button>
              </div>
              <form onSubmit={handleKeyReturnSubmit} className="p-8 overflow-y-auto space-y-6">
                 <div onClick={() => startCamera('environment')} className="aspect-video bg-slate-100 rounded-[32px] overflow-hidden cursor-pointer border-2 border-dashed border-slate-300 flex items-center justify-center group">
                    {capturedPhoto ? <img src={capturedPhoto} className="w-full h-full object-cover" /> : <div className="text-center space-y-2 group-hover:scale-110 transition-transform"><Camera size={40} className="mx-auto text-slate-400" /><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Capture Key Back in Vault</p></div>}
                 </div>
                 <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 text-center space-y-3">
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Site: {selectedSite.name}</p>
                   <p className="text-xs font-bold text-slate-900">Ensure the vault is physically locked before submission.</p>
                 </div>
                 <button type="submit" className="w-full py-5 bg-emerald-600 text-white font-black rounded-3xl uppercase text-xs tracking-widest shadow-xl transition-all hover:bg-emerald-700">Complete Key Return</button>
              </form>
           </div>
        </div>
      )}

      {activeModal === 'Disclaimer' && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
           <div className="bg-white w-full max-w-md rounded-[48px] p-10 shadow-2xl space-y-8 animate-in zoom-in duration-300 border-2 border-blue-100">
              <div className="text-center space-y-4">
                 <div className="h-20 w-20 bg-blue-50 text-blue-600 rounded-3xl mx-auto flex items-center justify-center shadow-xl shadow-blue-500/10"><ShieldCheck size={40} /></div>
                 <h2 className="text-3xl font-black uppercase tracking-tighter">Confirm Transmission</h2>
              </div>
              <div className="space-y-4 text-center">
                 <p className="text-sm font-medium text-slate-500 leading-relaxed">
                   I hereby confirm that all forensic evidence provided is accurate and that I am currently physically present at the asset location.
                 </p>
                 <div className="p-4 bg-slate-50 rounded-2xl flex items-center space-x-3 text-left">
                   <AlertTriangle className="text-amber-500 shrink-0" size={20} />
                   <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 leading-normal">Operational liability is transferred upon FO authorization.</p>
                 </div>
              </div>
              <div className="flex flex-col space-y-3">
                 <button onClick={finalizeRequest} disabled={isSubmitting} className="w-full py-5 bg-blue-600 text-white font-black rounded-3xl uppercase text-xs tracking-widest shadow-2xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center space-x-2">
                   {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <><Check size={20} /> <span>Digitally Sign & Send</span></>}
                 </button>
                 <button onClick={() => setActiveModal(waitingFor === 'SITE' ? 'LoginProtocol' : 'KeyBorrow')} className="w-full py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest transition-colors hover:text-slate-600">Back to Protocol</button>
              </div>
           </div>
        </div>
      )}

      {activeModal === 'Waiting' && selectedSite && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-xl text-center">
           <div className="bg-white w-full max-w-lg rounded-[48px] p-12 space-y-8 shadow-2xl animate-in fade-in duration-300">
              <div className={`p-8 rounded-[40px] inline-block transition-all ${isAuthorized ? 'bg-emerald-600 text-white scale-110 shadow-emerald-500/20 shadow-2xl' : 'bg-slate-100 text-slate-400'}`}>
                {isAuthorized ? <Flag size={64} className="animate-bounce" /> : <Loader2 size={64} className="animate-spin" />}
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">{isAuthorized ? 'Access Granted' : 'Pending FO Approval'}</h2>
              {isAuthorized ? (
                <button onClick={confirmAccess} className="w-full py-5 bg-emerald-600 text-white font-black rounded-3xl uppercase text-xs tracking-widest shadow-xl hover:brightness-110 transition-all">Open Gate & Start Work</button>
              ) : (
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Polling secure connection every 3s...</p>
                  <button onClick={closeModals} className="text-[10px] font-black text-rose-500 uppercase tracking-widest transition-colors hover:text-rose-700">Terminate Request</button>
                </div>
              )}
           </div>
        </div>
      )}

      {activeModal === 'Profile' && activeVendor && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
           <div className="bg-white w-full max-w-sm rounded-[48px] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8 duration-300">
              <div className="h-48 bg-slate-900 relative">
                 {activeVendor.photo && <img src={activeVendor.photo} className="w-full h-full object-cover opacity-50" />}
                 <button onClick={closeModals} className="absolute top-6 right-6 p-2 bg-white/20 text-white rounded-full hover:bg-white/40 transition-colors"><X size={20} /></button>
                 <div className="absolute -bottom-10 left-10 h-24 w-24 rounded-3xl border-4 border-white overflow-hidden bg-slate-200">
                    <img src={activeVendor.photo} className="w-full h-full object-cover" />
                 </div>
              </div>
              <div className="p-10 pt-16 space-y-6">
                 <div>
                    <h2 className="text-2xl font-black uppercase tracking-tight">{activeVendor.fullName}</h2>
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">{activeVendor.company}</p>
                 </div>
                 <div className="space-y-3">
                    <div className="flex justify-between text-[10px] font-black uppercase border-b border-slate-50 pb-2"><span className="text-slate-400">ID Number</span><span>{activeVendor.idNumber}</span></div>
                    <div className="flex justify-between text-[10px] font-black uppercase border-b border-slate-50 pb-2"><span className="text-slate-400">Contact</span><span>{activeVendor.contactNumber}</span></div>
                    <div className="flex justify-between text-[10px] font-black uppercase border-b border-slate-50 pb-2"><span className="text-slate-400">Status</span><span className="text-emerald-500">Verified</span></div>
                 </div>
                 <button onClick={closeModals} className="w-full py-4 bg-slate-100 text-slate-900 font-black rounded-2xl uppercase text-[10px] tracking-widest transition-colors hover:bg-slate-200">Close Profile</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default VendorAccess;
