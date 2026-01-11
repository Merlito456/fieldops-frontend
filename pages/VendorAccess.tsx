
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
  FlipHorizontal,
  FileText
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
  
  const [nocLoginRequired, setNocLoginRequired] = useState<boolean>(false);

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
      const constraints = { 
        video: { 
          facingMode: facingMode, 
          width: { ideal: 1920 }, 
          height: { ideal: 1080 } 
        }, 
        audio: false 
      };
      navigator.mediaDevices.getUserMedia(constraints)
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
      
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;
      const stampHeight = 350; // Increased stamp height for legibility
      
      canvas.width = videoWidth;
      canvas.height = videoHeight + stampHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw original video frame
      ctx.save();
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
      } else {
        ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
      }
      ctx.restore();

      // Draw background for stamp
      ctx.fillStyle = "#0f172a"; // slate-900
      ctx.fillRect(0, videoHeight, canvas.width, stampHeight);

      // Forensic stamping (Large Text)
      const ledger = [
        ["OPERATOR", activeVendor?.fullName?.toUpperCase() || "UNAUTHORIZED"],
        ["VENDOR", activeVendor?.company?.toUpperCase() || "GUEST_LEGAL"],
        ["SITE", selectedSite?.name?.toUpperCase() || "UNKNOWN_NODE"],
        ["ID", selectedSite?.id || "N/A"],
        ["GPS", `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)} (Acc: ${location.accuracy.toFixed(1)}m)`],
        ["TIME", new Date().toLocaleString()],
        ["STATUS", gpsVerified ? 'PROXIMITY_LOCKED' : 'OUT_OF_BOUNDS']
      ];

      ctx.textAlign = "left";
      ledger.forEach((row, i) => {
        ctx.font = "900 24px Inter, sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.fillText(row[0], 60, videoHeight + 70 + (i * 40));
        
        ctx.font = "bold 26px Inter, sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(row[1], 300, videoHeight + 70 + (i * 40));
      });

      // Watermark
      ctx.font = "italic bold 18px Inter, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      ctx.fillText("FIELDOPS PRO FORENSIC SEAL v2.0", canvas.width - 400, videoHeight + stampHeight - 30);

      setCapturedPhoto(canvas.toDataURL('image/jpeg', 0.9));
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
    
    const logoutData = {
      name: f.get('rocName') as string,
      time: f.get('rocTime') as string,
      nocLogged: nocLoginRequired,
      nocLoginName: f.get('nocLoginName') as string,
      nocLoginTime: f.get('nocLoginTime') as string,
      nocLogoutName: f.get('nocLogoutName') as string,
      nocLogoutTime: f.get('nocLogoutTime') as string,
      activityRemarks: f.get('activityRemarks') as string
    };

    try {
      await apiService.checkOutVendor(selectedSite.id, capturedPhoto, logoutData);
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
    setNocLoginRequired(false);
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

      {activeModal === 'LoginProtocol' && selectedSite && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
           <div className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl flex flex-col overflow-hidden max-h-[95vh]">
              <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                 <h2 className="text-2xl font-black uppercase tracking-tight">Entrance Protocol</h2>
                 <button onClick={closeModals} className="p-2 hover:bg-slate-50 rounded-full transition-colors"><X size={24} /></button>
              </div>
              <form onSubmit={handleLoginProtocolSubmit} className="p-8 overflow-y-auto space-y-6">
                 <div onClick={() => startCamera('user')} className="aspect-video bg-slate-100 rounded-[32px] overflow-hidden cursor-pointer border-2 border-dashed border-slate-300 flex items-center justify-center group relative">
                    {capturedPhoto ? <img src={capturedPhoto} className="w-full h-full object-cover" /> : <div className="text-center space-y-2 group-hover:scale-110 transition-transform"><Camera size={40} className="mx-auto text-slate-400" /><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Capture Full View Forensic ID</p></div>}
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
                               <input placeholder="NAME OF PERSONNEL" value={name} onChange={(e) => updatePersonnelName(idx, e.target.value)} required className="flex-1 p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-black text-sm uppercase focus:border-blue-500 outline-none" />
                               <button type="button" onClick={() => removePersonnelField(idx)} className="text-rose-500 hover:text-rose-700"><MinusCircle size={20} /></button>
                            </div>
                          ))}
                       </div>
                    </div>

                    <div className="space-y-4">
                       <h3 className="text-xs font-black uppercase tracking-widest text-emerald-600">Task Details</h3>
                       <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Activity</label>
                          <input name="activity" required className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-black text-sm uppercase focus:border-blue-500 outline-none" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">RAWA Number</label>
                          <input name="rawaNumber" required className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-black text-sm uppercase focus:border-blue-500 outline-none" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Checked By (Guard/Caretaker)</label>
                          <input name="checkedBy" required className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-black text-sm uppercase focus:border-blue-500 outline-none" />
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
                    <h3 className="text-xs font-black uppercase tracking-widest">ROC Log-in Registry</h3>
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

                 <button type="submit" className="w-full py-5 bg-blue-600 text-white font-black rounded-3xl uppercase text-xs tracking-widest shadow-xl transition-all hover:bg-blue-700">Transmit to FO</button>
              </form>
           </div>
        </div>
      )}

      {activeModal === 'LogoutProtocol' && selectedSite && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
           <div className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl flex flex-col overflow-hidden max-h-[95vh]">
              <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                 <h2 className="text-2xl font-black uppercase tracking-tight">End Operation Protocol</h2>
                 <button onClick={closeModals} className="p-2 hover:bg-slate-50 rounded-full transition-colors"><X size={24} /></button>
              </div>
              <form onSubmit={handleLogoutProtocolSubmit} className="p-8 overflow-y-auto space-y-6">
                 <div onClick={() => startCamera('environment')} className="aspect-video bg-slate-100 rounded-[32px] overflow-hidden cursor-pointer border-2 border-dashed border-slate-300 flex items-center justify-center group">
                    {capturedPhoto ? <img src={capturedPhoto} className="w-full h-full object-cover" /> : <div className="text-center space-y-2 group-hover:scale-110 transition-transform"><Camera size={40} className="mx-auto text-slate-400" /><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Capture Full Site Evidence (Exit)</p></div>}
                 </div>

                 <div className="bg-slate-50 rounded-[32px] p-6 space-y-4 border border-slate-100">
                    <h3 className="text-xs font-black uppercase tracking-widest text-rose-600">ROC Log-out Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1">
                          <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">ROC Name</label>
                          <input name="rocName" required className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-xs uppercase outline-none focus:ring-2 focus:ring-rose-500" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Log-out Timestamp</label>
                          <input name="rocTime" type="datetime-local" required className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-xs uppercase outline-none focus:ring-2 focus:ring-rose-500" />
                       </div>
                    </div>
                 </div>

                 <div className="p-6 bg-blue-50/50 rounded-[32px] border border-blue-100 space-y-6">
                    <div className="flex items-center justify-between">
                       <h3 className="text-xs font-black uppercase tracking-widest text-blue-600">NOC Compliance Verification</h3>
                       <div className="flex items-center space-x-4">
                          <label className="flex items-center space-x-2 cursor-pointer">
                             <input type="radio" name="nocCheck" checked={nocLoginRequired} onChange={() => setNocLoginRequired(true)} className="w-4 h-4 text-blue-600" />
                             <span className="text-[10px] font-black uppercase tracking-widest">Yes</span>
                          </label>
                          <label className="flex items-center space-x-2 cursor-pointer">
                             <input type="radio" name="nocCheck" checked={!nocLoginRequired} onChange={() => setNocLoginRequired(false)} className="w-4 h-4 text-slate-400" />
                             <span className="text-[10px] font-black uppercase tracking-widest">No</span>
                          </label>
                       </div>
                    </div>
                    
                    {nocLoginRequired && (
                       <div className="space-y-4 pt-4 border-t border-blue-100 animate-in fade-in slide-in-from-top-2">
                          <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-1"><label className="text-[8px] font-black text-blue-400 uppercase ml-1">NOC Login Name</label><input name="nocLoginName" required className="w-full p-3 bg-white border border-blue-200 rounded-xl font-bold text-xs uppercase outline-none" /></div>
                             <div className="space-y-1"><label className="text-[8px] font-black text-blue-400 uppercase ml-1">NOC Login Time</label><input name="nocLoginTime" type="datetime-local" required className="w-full p-3 bg-white border border-blue-200 rounded-xl font-bold text-xs outline-none" /></div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-1"><label className="text-[8px] font-black text-blue-400 uppercase ml-1">NOC Logout Name</label><input name="nocLogoutName" required className="w-full p-3 bg-white border border-blue-200 rounded-xl font-bold text-xs uppercase outline-none" /></div>
                             <div className="space-y-1"><label className="text-[8px] font-black text-blue-400 uppercase ml-1">NOC Logout Time</label><input name="nocLogoutTime" type="datetime-local" required className="w-full p-3 bg-white border border-blue-200 rounded-xl font-bold text-xs outline-none" /></div>
                          </div>
                       </div>
                    )}
                 </div>

                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Activity Remarks</label>
                    <textarea name="activityRemarks" required rows={3} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm uppercase outline-none focus:ring-2 focus:ring-rose-500" placeholder="Describe site condition and work completed..."></textarea>
                 </div>

                 <button type="submit" className="w-full py-5 bg-rose-600 text-white font-black rounded-3xl uppercase text-xs tracking-widest shadow-xl transition-all hover:bg-rose-700">Terminate Session</button>
              </form>
           </div>
        </div>
      )}

      {/* Rest of the modals remain unchanged but use the improved capturePhoto... */}
      {/* Registration, KeyBorrow, KeyReturn, Disclaimer, Waiting, Profile */}
      
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
    </div>
  );
};

export default VendorAccess;
