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
  Gavel,
  ShieldCheck,
  Smartphone,
  Info,
  Clock,
  RotateCcw,
  Flag,
  Loader2,
  Check,
  MapPin,
  Navigation,
  User,
  Settings,
  Shield,
  Fingerprint,
  KeyRound,
  Lock,
  Crosshair,
  Map as MapIcon,
  Navigation2,
  Briefcase,
  FileText,
  UserPlus,
  Plus,
  Trash2,
  ShieldAlert,
  Maximize2,
  Building2,
  BadgeCheck,
  PhoneCall,
  HardHat,
  ChevronRight,
  Terminal,
  RefreshCw
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
  const [activeModal, setActiveModal] = useState<'LoginProtocol' | 'LogoutProtocol' | 'LogoutDisclaimer' | 'KeyBorrow' | 'KeyReturn' | 'Disclaimer' | 'Waiting' | 'Registration' | 'Profile' | 'PersonnelLogin' | null>(null);
  const [waitingFor, setWaitingFor] = useState<'SITE' | 'KEY' | null>(null);
  
  // Geolocation States
  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [gpsVerified, setGpsVerified] = useState<boolean | null>(null);
  const [distanceToSite, setDistanceToSite] = useState<number | null>(null);

  // Form States
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [captureMode, setCaptureMode] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [loginFormValues, setLoginFormValues] = useState<any>(null);
  const [logoutFormValues, setLogoutFormValues] = useState<any>(null);
  const [keyBorrowValues, setKeyBorrowValues] = useState<any>(null);
  
  // Dynamic Personnel List
  const [additionalPersonnel, setAdditionalPersonnel] = useState<string[]>([]);
  const [newPersonName, setNewPersonName] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const { notify } = useNotify();

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const fetchedSites = await apiService.getSites();
      const vendor = apiService.getActiveVendor();
      setSites(fetchedSites);
      setActiveVendor(vendor);
    } catch (err) {
      notify('Initial sync failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // CAMERA INITIALIZATION
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (streamActive) {
      navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: facingMode, 
          width: { ideal: 1280 }, 
          height: { ideal: 720 } 
        }, 
        audio: false 
      })
        .then(s => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
        })
        .catch(err => {
          console.error("Camera Error:", err);
          notify('Camera access denied or unavailable.', 'error');
          setStreamActive(false);
        });
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [streamActive, facingMode]);

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  // MAP INITIALIZATION
  useEffect(() => {
    if (streamActive && mapContainerRef.current && location && !mapRef.current) {
      const L = (window as any).L;
      if (!L) return;

      const mapInstance = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView([location.lat, location.lng], 16);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstance);
      
      L.marker([location.lat, location.lng]).addTo(mapInstance);

      if (selectedSite?.gpsCoordinates) {
        const coords = selectedSite.gpsCoordinates.split(',').map(n => parseFloat(n.trim()));
        if (!isNaN(coords[0])) {
          const siteIcon = L.divIcon({
            className: 'site-marker',
            html: `<div style="background: #2563eb; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6]
          });
          L.marker([coords[0], coords[1]], { icon: siteIcon }).addTo(mapInstance);
        }
      }

      mapRef.current = mapInstance;
    }
    
    return () => {
      if (!streamActive && mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [streamActive, location, selectedSite]);

  // GPS Tracking Logic
  useEffect(() => {
    let watchId: number | null = null;
    if (streamActive) {
      if ("geolocation" in navigator) {
        watchId = navigator.geolocation.watchPosition(
          (pos) => {
            const { latitude, longitude, accuracy } = pos.coords;
            const newLoc = { lat: latitude, lng: longitude, accuracy };
            setLocation(newLoc);
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
    setGpsVerified(d < 500);
  };

  const capturePhoto = async () => {
    if (!location || location.lat === 0) { 
      notify("Locking GPS coordinates...", "info"); 
      return; 
    }
    
    if (videoRef.current) {
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
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
      ctx.restore();
      ctx.fillStyle = "#020617";
      ctx.fillRect(0, videoHeight, canvas.width, stampHeight);
      const ledger = [
        ["OPERATOR_ID", activeVendor?.idNumber || "UNREGISTERED"],
        ["OPERATOR_NAME", activeVendor?.fullName?.toUpperCase() || "AUDIT_USER"],
        ["SITE_NAME", selectedSite?.name?.toUpperCase() || "FIELD_ASSET"],
        ["SITE_ID", selectedSite?.id || "N/A"],
        ["GPS_FIX", `${location.lat.toFixed(8)}, ${location.lng.toFixed(8)} (±${location.accuracy.toFixed(1)}m)`],
        ["TIMESTAMP_UTC", new Date().toISOString()],
        ["VALIDATION", gpsVerified ? 'PROXIMITY_LOCK_CONFIRMED' : 'LOCATION_OUT_OF_BOUNDS'],
        ["SYSTEM_KEY", `PRO-${Math.random().toString(36).substring(7).toUpperCase()}`]
      ];
      ctx.textAlign = "left";
      ledger.forEach((row, i) => {
        ctx.font = "900 12px Inter";
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.fillText(row[0], 60, videoHeight + 50 + (i * 24));
        ctx.font = "bold 13px Inter";
        ctx.fillStyle = row[0] === "VALIDATION" && !gpsVerified ? "#fb7185" : "#ffffff";
        ctx.fillText(row[1], 200, videoHeight + 50 + (i * 24));
      });
      ctx.font = "900 11px Inter";
      ctx.fillStyle = "#3b82f6";
      ctx.textAlign = "right";
      ctx.fillText("FIELDOPS_PRO_FORENSIC_LEDGER_V2.5", canvas.width - 60, videoHeight + stampHeight - 30);
      setCapturedPhoto(canvas.toDataURL('image/jpeg', 0.95));
      stopCamera();
    }
  };

  const startCamera = (mode: string) => {
    setCaptureMode(mode);
    setFacingMode('user');
    setStreamActive(true);
  };

  const stopCamera = () => {
    setStreamActive(false);
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
  };

  const handleLoginProtocolSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!capturedPhoto) return notify('Evidence required', 'error');
    if (gpsVerified === false) return notify('Proximity Error (within 500m).', 'error');
    const f = new FormData(e.currentTarget);
    setLoginFormValues({ 
      activity: f.get('activity'),
      personnel: [activeVendor?.fullName, ...additionalPersonnel],
      rocName: f.get('rocName'),
      rocTime: f.get('rocTime')
    });
    setActiveModal('Disclaimer');
    setWaitingFor('SITE');
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
          photo: capturedPhoto || undefined, 
          rocLogged: true,
          rocName: loginFormValues.rocName as string,
          rocTime: loginFormValues.rocTime as string,
          nocLogged: false
        });
      } else if (waitingFor === 'KEY') {
        await apiService.requestKeyBorrow(selectedSite.id, {
          siteId: selectedSite.id, siteName: selectedSite.name, ...keyBorrowValues
        });
      }
      setActiveModal('Waiting');
    } catch (err) {
      notify('Database Sync Failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmAccess = async () => {
    if (!selectedSite) return;
    const site = sites.find(s => s.id === selectedSite.id);
    try {
      if (waitingFor === 'SITE' && site?.pendingVisitor) {
        await apiService.checkInVendor(site.id, site.pendingVisitor);
        notify('On-Site Access Granted.', 'success');
        closeModals();
        loadInitialData();
      } else if (waitingFor === 'KEY' && site?.pendingKeyLog) {
        await apiService.confirmKeyBorrow(site.id);
        notify('Key Borrowed.', 'success');
        closeModals();
        loadInitialData();
      }
    } catch (err) { notify('Sync error', 'error'); }
  };

  const handleLogoutSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedSite || !capturedPhoto) return notify('Exit evidence required', 'error');
    const f = new FormData(e.currentTarget);
    setLogoutFormValues({
      rocLogoutName: f.get('rocLogoutName'),
      rocLogoutTime: f.get('rocLogoutTime'),
      photo: capturedPhoto
    });
    setActiveModal('LogoutDisclaimer');
  };

  const finalizeLogout = async () => {
    if (!selectedSite || !logoutFormValues) return;
    setIsSubmitting(true);
    try {
      await apiService.checkOutVendor(selectedSite.id, logoutFormValues.photo, {
        name: logoutFormValues.rocLogoutName as string,
        time: logoutFormValues.rocLogoutTime as string
      });
      notify('Site Secured. Data Written to Hub.', 'success');
      closeModals();
      loadInitialData();
    } catch (err) {
      notify('Network Error', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegistration = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!capturedPhoto) return notify('Biometric capture required', 'error');
    setIsSubmitting(true);
    const f = new FormData(e.currentTarget);
    const p: VendorProfile = {
      id: `VEND-${Math.floor(1000 + Math.random() * 9000)}`,
      username: f.get('username') as string, 
      password: f.get('password') as string,
      fullName: f.get('fullName') as string, 
      company: f.get('company') as string,
      contactNumber: f.get('contact') as string, 
      idNumber: f.get('idNumber') as string,
      specialization: f.get('specialization') as string, 
      photo: capturedPhoto,
      verified: true, 
      createdAt: new Date().toISOString()
    };
    try {
      await apiService.registerVendor(p);
      setActiveVendor(p);
      notify('Biometric Profile Stored', 'success');
      closeModals();
    } catch (err) {
      notify('Registration failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePersonnelLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const f = new FormData(e.currentTarget);
    try {
      const p = await apiService.loginVendor(f.get('username') as string, f.get('password') as string);
      if (p) { 
        setActiveVendor(p); 
        notify(`Welcome back, ${p.fullName}`, 'success');
        setActiveModal(null); 
      }
      else {
        notify('Invalid credentials.', 'error');
      }
    } catch (err) {
      notify('Authentication node failure', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModals = () => {
    setActiveModal(null); setCapturedPhoto(null); setWaitingFor(null);
    setLoginFormValues(null); setLogoutFormValues(null); setKeyBorrowValues(null); stopCamera(); setSelectedSite(null);
    setAdditionalPersonnel([]);
  };

  const filteredSites = sites.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isSiteAuth = selectedSite ? sites.find(s => s.id === selectedSite.id)?.accessAuthorized : false;
  const isKeyAuth = selectedSite ? sites.find(s => s.id === selectedSite.id)?.keyAccessAuthorized : false;
  const isAuthorized = waitingFor === 'SITE' ? isSiteAuth : isKeyAuth;

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
        <Loader2 size={48} className="text-blue-600 animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Connecting to Hub...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* CAMERA HUD */}
      {streamActive && (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center">
          <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`} />
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8">
            <div className="flex justify-between items-start pointer-events-auto">
               <div className="w-64 h-64 bg-slate-900 rounded-[52px] border-2 border-white/15 p-2 shadow-2xl relative">
                  <div ref={mapContainerRef} className="w-full h-full rounded-[44px]"></div>
               </div>
               <button onClick={stopCamera} className="p-5 bg-black/60 text-white rounded-full hover:bg-rose-600 shadow-2xl transition-colors"><X size={24} /></button>
            </div>
            <div className="flex flex-col items-center space-y-8">
               <div className="bg-black/40 backdrop-blur-md px-6 py-2 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest border border-white/10">
                  {gpsVerified === null ? 'SYNCING_LOC_DATA...' : gpsVerified ? 'GPS_LOCK_CONFIRMED' : 'LOCATION_RESTRICTED'}
               </div>
               <div className="flex items-center space-x-6 pointer-events-auto">
                 <button onClick={toggleCamera} className="p-4 bg-white/10 backdrop-blur-md text-white rounded-full hover:bg-white/20 transition-all border border-white/10">
                   <RefreshCw size={24} />
                 </button>
                 <button onClick={capturePhoto} className="w-28 h-28 bg-white rounded-full border-[10px] border-white/20 flex items-center justify-center pointer-events-auto shadow-2xl hover:scale-105 active:scale-95 transition-all">
                    <div className="w-18 h-18 bg-blue-600 rounded-full flex items-center justify-center text-white"><Camera size={36} /></div>
                 </button>
                 <div className="w-14"></div> {/* Spacer to center the capture button */}
               </div>
            </div>
          </div>
        </div>
      )}

      {!activeVendor ? (
        <div className="max-w-xl mx-auto space-y-12 py-20 text-center">
           <div className="space-y-4">
              <div className="h-24 w-24 bg-slate-900 text-white rounded-[32px] mx-auto flex items-center justify-center shadow-2xl"><Shield size={48} /></div>
              <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter text-center">Vendor Protocol Kiosk</h1>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Secure operational node entry requires biometric verification.</p>
           </div>
           <div className="grid grid-cols-2 gap-6">
              <button onClick={() => setActiveModal('Registration')} className="group p-8 bg-white border border-slate-200 rounded-[40px] shadow-xl hover:border-blue-500 hover:-translate-y-2 transition-all flex flex-col items-center space-y-4">
                 <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors"><Fingerprint size={32} /></div>
                 <h3 className="text-xl font-black uppercase tracking-tight">Registration</h3>
              </button>
              <button onClick={() => setActiveModal('PersonnelLogin')} className="group p-8 bg-white border border-slate-200 rounded-[40px] shadow-xl hover:border-emerald-500 hover:-translate-y-2 transition-all flex flex-col items-center space-y-4">
                 <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-colors"><LogIn size={32} /></div>
                 <h3 className="text-xl font-black uppercase tracking-tight">Login</h3>
              </button>
           </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
             <div className="text-left">
               <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Site Protocol Portal</h1>
               <div className="flex items-center space-x-2 mt-1">
                 <div className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                 <p className="text-blue-600 font-black uppercase text-[10px] tracking-widest">{activeVendor.fullName} • {activeVendor.company}</p>
               </div>
             </div>
             <div className="flex items-center space-x-3">
                <button onClick={() => setActiveModal('Profile')} className="h-16 w-16 bg-white border-2 border-slate-200 rounded-2xl hover:border-blue-500 hover:bg-slate-50 transition-all shadow-sm overflow-hidden flex items-center justify-center p-0">
                   {activeVendor.photo ? (
                     <img src={activeVendor.photo} className="w-full h-full object-cover" alt="Vendor" />
                   ) : (
                     <User size={24} className="text-slate-400" />
                   )}
                </button>
                <button onClick={() => { apiService.logoutVendor(); setActiveVendor(null); notify('Kiosk session ended', 'info'); }} className="p-4 bg-slate-900 text-white rounded-2xl hover:bg-rose-600 transition-colors shadow-lg shadow-slate-200"><LogOut size={20} /></button>
             </div>
          </div>
          <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex items-center space-x-4">
            <Search className="text-slate-300" size={24} />
            <input type="text" placeholder="SEARCH OPERATIONAL SITES..." className="w-full bg-transparent font-black text-lg uppercase outline-none placeholder:text-slate-200" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredSites.map((site) => (
              <div key={site.id} className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:border-blue-500 transition-all hover:shadow-xl">
                <div className="p-8 space-y-6 flex-1">
                  <div className="flex justify-between items-start">
                    <div className="p-3 bg-slate-50 rounded-2xl"><Tower size={28} className="text-slate-900" /></div>
                    <span className="px-3 py-1 bg-slate-100 text-[10px] font-black uppercase tracking-widest rounded-lg text-slate-500">{site.id}</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900">{site.name}</h3>
                    <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-tight truncate">{site.address}</p>
                  </div>
                </div>
                <div className="p-6 bg-slate-50/50 border-t border-slate-100 grid grid-cols-2 gap-3">
                   {site.currentVisitor ? (
                     <button onClick={() => { setSelectedSite(site); setActiveModal('LogoutProtocol'); }} className="col-span-2 py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-700 shadow-lg shadow-rose-200 flex items-center justify-center space-x-2"><LogOut size={16} /><span>End Operation</span></button>
                   ) : (
                     <button onClick={() => { 
                       setSelectedSite(site); 
                       if (site.accessAuthorized) { setWaitingFor('SITE'); setActiveModal('Waiting'); } 
                       else setActiveModal('LoginProtocol'); 
                     }} className={`py-4 ${site.accessAuthorized ? 'bg-blue-600 animate-bounce shadow-blue-500/20' : 'bg-emerald-600'} text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all`}>
                       {site.accessAuthorized ? <Check size={16} /> : <LogIn size={16} className="mr-2 inline" />} Site Access
                     </button>
                   )}
                   {site.keyStatus === 'Borrowed' ? (
                     <button onClick={() => { setSelectedSite(site); setActiveModal('KeyReturn'); }} className="py-4 bg-amber-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-700 shadow-lg shadow-amber-200 flex items-center justify-center space-x-2"><RotateCcw size={16} /><span>Return Key</span></button>
                   ) : (
                     <button onClick={() => { 
                       setSelectedSite(site); 
                       if (site.keyAccessAuthorized) { setWaitingFor('KEY'); setActiveModal('Waiting'); }
                       else setActiveModal('KeyBorrow'); 
                     }} className={`py-4 ${site.keyAccessAuthorized ? 'bg-blue-600 animate-bounce shadow-blue-500/20' : 'bg-slate-900'} text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all`}>
                       <Key size={16} className="mr-2 inline" /> Borrow Key
                     </button>
                   )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* PERSONNEL LOGIN MODAL */}
      {activeModal === 'PersonnelLogin' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
           <div className="bg-white w-full max-w-md rounded-[48px] shadow-2xl p-12 space-y-10 animate-in zoom-in duration-300">
              <div className="text-center space-y-4">
                 <div className="h-20 w-20 bg-emerald-600 text-white rounded-[28px] mx-auto flex items-center justify-center shadow-2xl shadow-emerald-500/20"><LogIn size={36} /></div>
                 <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Biometric Portal Login</h2>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registered Personnel Entry</p>
              </div>
              <form onSubmit={handlePersonnelLogin} className="space-y-4">
                 <input name="username" placeholder="USERNAME" required className="w-full p-5 bg-slate-50 rounded-2xl font-black text-sm uppercase outline-none focus:ring-2 focus:ring-emerald-500" />
                 <input name="password" type="password" placeholder="PASSWORD" required className="w-full p-5 bg-slate-50 rounded-2xl font-black text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                 <button disabled={isSubmitting} type="submit" className="w-full py-5 bg-slate-900 text-white font-black rounded-[32px] uppercase text-xs tracking-widest shadow-xl hover:bg-black transition-all">
                    {isSubmitting ? <Loader2 className="animate-spin mx-auto" /> : 'Authorize Entry'}
                 </button>
                 <button type="button" onClick={closeModals} className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-rose-600">Abort Session</button>
              </form>
           </div>
        </div>
      )}

      {/* REGISTRATION MODAL */}
      {activeModal === 'Registration' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl p-10 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Personnel Registration</h2>
              <button onClick={closeModals} className="p-2 hover:bg-slate-50 rounded-full"><X size={24} /></button>
            </div>
            <form onSubmit={handleRegistration} className="space-y-6">
              <div className="aspect-video bg-slate-100 rounded-[32px] overflow-hidden border-2 border-dashed border-slate-200 flex items-center justify-center relative group">
                {!capturedPhoto ? (
                  <button type="button" onClick={() => startCamera('REG')} className="flex flex-col items-center">
                    <Camera size={48} className="text-slate-300" />
                    <span className="text-[10px] font-black uppercase mt-2 text-slate-400 tracking-widest">Biometric Profile Photo</span>
                  </button>
                ) : (
                  <div className="w-full h-full">
                    <img src={capturedPhoto} className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setCapturedPhoto(null)} className="absolute top-4 right-4 p-2 bg-rose-600 text-white rounded-full"><Trash size={16} /></button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input name="username" placeholder="Username" required className="w-full p-4 bg-slate-50 rounded-2xl font-black text-sm uppercase outline-none focus:ring-2 focus:ring-blue-500" />
                <input name="password" type="password" placeholder="Password" required className="w-full p-4 bg-slate-50 rounded-2xl font-black text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                <input name="fullName" placeholder="Full Legal Name" required className="w-full p-4 bg-slate-50 rounded-2xl font-black text-sm uppercase outline-none focus:ring-2 focus:ring-blue-500 md:col-span-2" />
                <input name="company" placeholder="Organization / Vendor Company" required className="w-full p-4 bg-slate-50 rounded-2xl font-black text-sm uppercase outline-none focus:ring-2 focus:ring-blue-500" />
                <input name="contact" placeholder="Contact Number" required className="w-full p-4 bg-slate-50 rounded-2xl font-black text-sm uppercase outline-none focus:ring-2 focus:ring-blue-500" />
                <input name="idNumber" placeholder="Personnel ID / License No." required className="w-full p-4 bg-slate-50 rounded-2xl font-black text-sm uppercase outline-none focus:ring-2 focus:ring-blue-500" />
                <input name="specialization" placeholder="Area of Specialization" required className="w-full p-4 bg-slate-50 rounded-2xl font-black text-sm uppercase outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <button disabled={isSubmitting} type="submit" className="w-full py-5 bg-slate-900 text-white font-black rounded-3xl uppercase text-xs tracking-widest shadow-xl hover:bg-black transition-all">
                {isSubmitting ? <Loader2 className="animate-spin mx-auto" /> : 'Register Biometric Profile'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* VENDOR PROFILE MODAL */}
      {activeModal === 'Profile' && activeVendor && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
           <div className="bg-white w-full max-w-xl rounded-[48px] shadow-2xl p-10 overflow-hidden animate-in zoom-in duration-300">
              <div className="flex items-center justify-between mb-10">
                 <div className="flex items-center space-x-3">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Fingerprint size={24} /></div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Personnel Profile</h2>
                 </div>
                 <button onClick={closeModals} className="p-2 hover:bg-slate-50 rounded-full"><X size={24} /></button>
              </div>

              <div className="flex flex-col items-center space-y-8">
                 <div className="h-40 w-40 rounded-[48px] overflow-hidden border-4 border-white shadow-2xl ring-4 ring-blue-50 relative">
                    {activeVendor.photo ? (
                      <img src={activeVendor.photo} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300"><User size={64} /></div>
                    )}
                    <div className="absolute bottom-2 right-2 p-1.5 bg-emerald-500 text-white rounded-xl shadow-lg border-2 border-white"><BadgeCheck size={18} /></div>
                 </div>

                 <div className="text-center space-y-2">
                    <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-tight">{activeVendor.fullName}</h3>
                    <div className="flex items-center justify-center space-x-3 text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-4 py-2 rounded-xl border border-blue-100">
                       <Building2 size={12} />
                       <span>{activeVendor.company}</span>
                    </div>
                 </div>

                 <div className="w-full grid grid-cols-2 gap-4">
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-1">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Employee ID</label>
                       <p className="text-sm font-black text-slate-900 uppercase truncate">{activeVendor.idNumber}</p>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-1">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Specialization</label>
                       <p className="text-sm font-black text-slate-900 uppercase truncate">{activeVendor.specialization}</p>
                    </div>
                    <div className="col-span-2 p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between">
                       <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Verified Contact</label>
                          <p className="text-sm font-black text-slate-900 uppercase">{activeVendor.contactNumber}</p>
                       </div>
                       <div className="p-3 bg-white text-emerald-600 rounded-2xl shadow-sm"><PhoneCall size={20} /></div>
                    </div>
                 </div>

                 <button onClick={() => { apiService.logoutVendor(); setActiveVendor(null); closeModals(); }} className="w-full py-5 bg-rose-600 text-white font-black rounded-[32px] uppercase text-xs tracking-widest shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all flex items-center justify-center space-x-3">
                    <LogOut size={18} />
                    <span>Terminate Kiosk Session</span>
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* PROTOCOL MODALS */}
      {activeModal === 'LoginProtocol' && selectedSite && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
           <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl p-10 overflow-y-auto max-h-[90vh]">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black uppercase tracking-tight">Access Protocol: {selectedSite.name}</h2>
                <button onClick={closeModals} className="p-2 hover:bg-slate-50 rounded-full"><X size={24} /></button>
              </div>
              <form onSubmit={handleLoginProtocolSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Team Leader</label>
                    <input disabled value={activeVendor?.fullName} className="w-full p-4 bg-slate-100 rounded-2xl font-black text-sm uppercase opacity-70" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Company</label>
                    <input disabled value={activeVendor?.company} className="w-full p-4 bg-slate-100 rounded-2xl font-black text-sm uppercase opacity-70" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Work Mission Objectives</label>
                  <textarea name="activity" placeholder="Detailed engineering mission objectives..." required rows={2} className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500"></textarea>
                </div>

                <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 space-y-4">
                  <div className="flex items-center space-x-2"><ShieldCheck size={18} className="text-blue-600" /><h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">ROC Coordination Details</h4></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input name="rocName" placeholder="ROC COORDINATOR NAME..." required className="w-full p-3 bg-white rounded-xl border border-slate-200 font-black text-xs uppercase" />
                    <input name="rocTime" type="datetime-local" required defaultValue={new Date().toISOString().slice(0, 16)} className="w-full p-3 bg-white rounded-xl border border-slate-200 font-black text-xs" />
                  </div>
                </div>

                <div className="aspect-video bg-slate-100 rounded-[32px] overflow-hidden border-2 border-dashed border-slate-200 flex items-center justify-center relative">
                  {!capturedPhoto ? (
                    <button type="button" onClick={() => startCamera('SITE_AUTH')} className="flex flex-col items-center">
                      <Camera size={48} className="text-slate-300" />
                      <span className="text-[10px] font-black uppercase mt-2 text-slate-400 tracking-widest">Capture Forensic Stamp Photo</span>
                    </button>
                  ) : (
                    <div className="w-full h-full">
                      <img src={capturedPhoto} className="w-full h-full object-cover" />
                      <button type="button" onClick={() => setCapturedPhoto(null)} className="absolute top-4 right-4 p-2 bg-rose-600 text-white rounded-full"><Trash size={16} /></button>
                    </div>
                  )}
                </div>

                <button type="submit" className="w-full py-5 bg-emerald-600 text-white font-black rounded-3xl uppercase text-xs tracking-widest shadow-xl hover:bg-emerald-700">Verify & Request Mission Start</button>
              </form>
           </div>
        </div>
      )}

      {/* LOGOUT PROTOCOL MODAL */}
      {activeModal === 'LogoutProtocol' && selectedSite && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
           <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl p-10 overflow-y-auto max-h-[90vh]">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black uppercase tracking-tight text-rose-600">Site Exit Protocol: {selectedSite.name}</h2>
                <button onClick={closeModals} className="p-2 hover:bg-slate-50 rounded-full"><X size={24} /></button>
              </div>
              <form onSubmit={handleLogoutSubmit} className="space-y-8">
                <div className="p-6 bg-rose-50 rounded-[32px] border border-rose-100 space-y-4">
                  <div className="flex items-center space-x-2"><ShieldCheck size={18} className="text-rose-600" /><h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">ROC Logout Confirmation</h4></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input name="rocLogoutName" placeholder="ROC COORDINATOR NAME..." required className="w-full p-3 bg-white rounded-xl border border-slate-200 font-black text-xs uppercase" />
                    <input name="rocLogoutTime" type="datetime-local" required defaultValue={new Date().toISOString().slice(0, 16)} className="w-full p-3 bg-white rounded-xl border border-slate-200 font-black text-xs" />
                  </div>
                </div>
                <div className="aspect-video bg-slate-100 rounded-[32px] overflow-hidden border-2 border-dashed border-slate-200 flex items-center justify-center relative">
                  {!capturedPhoto ? (
                    <button type="button" onClick={() => startCamera('SITE_EXIT')} className="flex flex-col items-center">
                      <Camera size={48} className="text-slate-300" />
                      <span className="text-[10px] font-black uppercase mt-2 text-slate-400 tracking-widest">Capture Exit Evidence Photo</span>
                    </button>
                  ) : (
                    <div className="w-full h-full">
                      <img src={capturedPhoto} className="w-full h-full object-cover" />
                      <button type="button" onClick={() => setCapturedPhoto(null)} className="absolute top-4 right-4 p-2 bg-rose-600 text-white rounded-full"><Trash size={16} /></button>
                    </div>
                  )}
                </div>
                <button type="submit" className="w-full py-5 bg-rose-600 text-white font-black rounded-3xl uppercase text-xs tracking-widest shadow-xl hover:bg-rose-700">Confirm Site Closure</button>
              </form>
           </div>
        </div>
      )}

      {/* LOGOUT DISCLAIMER */}
      {activeModal === 'LogoutDisclaimer' && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-xl text-center">
           <div className="bg-white w-full max-w-lg rounded-[48px] p-12 space-y-8 shadow-2xl">
              <div className="mx-auto p-4 bg-rose-50 text-rose-600 rounded-3xl w-fit"><ShieldAlert size={48} /></div>
              <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900">End Mission Warning</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                You are ending the session for {selectedSite?.name}. Ensure all equipment is secured and the site is locked. This action will be logged in the permanent operational ledger.
              </p>
              <button disabled={isSubmitting} onClick={finalizeLogout} className="w-full py-6 bg-rose-600 text-white font-black rounded-3xl uppercase text-xs tracking-widest shadow-2xl">
                {isSubmitting ? <Loader2 className="animate-spin mx-auto" /> : 'Confirm & Terminate Access'}
              </button>
           </div>
        </div>
      )}

      {/* KEY RETURN MODAL */}
      {activeModal === 'KeyReturn' && selectedSite && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
           <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl p-10 overflow-y-auto max-h-[90vh]">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black uppercase tracking-tight text-amber-600">Key Return Protocol: {selectedSite.name}</h2>
                <button onClick={closeModals} className="p-2 hover:bg-slate-50 rounded-full"><X size={24} /></button>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!capturedPhoto) return notify('Return evidence required', 'error');
                setIsSubmitting(true);
                await apiService.returnKey(selectedSite.id, capturedPhoto);
                notify('Vault Status Updated: Available', 'success');
                closeModals();
                loadInitialData();
                setIsSubmitting(false);
              }} className="space-y-8">
                <div className="aspect-video bg-slate-100 rounded-[32px] overflow-hidden border-2 border-dashed border-slate-200 flex items-center justify-center relative">
                  {!capturedPhoto ? (
                    <button type="button" onClick={() => startCamera('KEY_RETURN')} className="flex flex-col items-center">
                      <Camera size={48} className="text-slate-300" />
                      <span className="text-[10px] font-black uppercase mt-2 text-slate-400 tracking-widest">Capture Key Placement Photo</span>
                    </button>
                  ) : (
                    <div className="w-full h-full">
                      <img src={capturedPhoto} className="w-full h-full object-cover" />
                      <button type="button" onClick={() => setCapturedPhoto(null)} className="absolute top-4 right-4 p-2 bg-rose-600 text-white rounded-full"><Trash size={16} /></button>
                    </div>
                  )}
                </div>
                <button type="submit" className="w-full py-5 bg-amber-600 text-white font-black rounded-3xl uppercase text-xs tracking-widest shadow-xl">Confirm Vault Deposit</button>
              </form>
           </div>
        </div>
      )}

      {/* KEY BORROW MODAL */}
      {activeModal === 'KeyBorrow' && selectedSite && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
           <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl p-10 overflow-y-auto max-h-[90vh]">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">Key Custody Request: {selectedSite.name}</h2>
                <button onClick={closeModals} className="p-2 hover:bg-slate-50 rounded-full"><X size={24} /></button>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                if (!capturedPhoto) return notify('Custody evidence required', 'error');
                const f = new FormData(e.currentTarget);
                setKeyBorrowValues({
                  borrowerName: activeVendor?.fullName,
                  borrowerId: activeVendor?.idNumber,
                  borrowerContact: activeVendor?.contactNumber,
                  vendor: activeVendor?.company,
                  reason: f.get('reason'),
                  borrowPhoto: capturedPhoto
                });
                setActiveModal('Disclaimer');
                setWaitingFor('KEY');
              }} className="space-y-8">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Custody Reason</label>
                  <textarea name="reason" placeholder="Why is key custody required?" required rows={2} className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500"></textarea>
                </div>
                <div className="aspect-video bg-slate-100 rounded-[32px] overflow-hidden border-2 border-dashed border-slate-200 flex items-center justify-center relative">
                  {!capturedPhoto ? (
                    <button type="button" onClick={() => startCamera('KEY_AUTH')} className="flex flex-col items-center">
                      <Camera size={48} className="text-slate-300" />
                      <span className="text-[10px] font-black uppercase mt-2 text-slate-400 tracking-widest">Capture Forensic Key Possession</span>
                    </button>
                  ) : (
                    <div className="w-full h-full">
                      <img src={capturedPhoto} className="w-full h-full object-cover" />
                      <button type="button" onClick={() => setCapturedPhoto(null)} className="absolute top-4 right-4 p-2 bg-rose-600 text-white rounded-full"><Trash size={16} /></button>
                    </div>
                  )}
                </div>
                <button type="submit" className="w-full py-5 bg-slate-900 text-white font-black rounded-3xl uppercase text-xs tracking-widest shadow-xl">Verify & Request Custody</button>
              </form>
           </div>
        </div>
      )}

      {/* FINAL DISCLAIMER */}
      {activeModal === 'Disclaimer' && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-xl text-center">
           <div className="bg-white w-full max-w-lg rounded-[48px] p-12 space-y-8 shadow-2xl">
              <div className="mx-auto p-4 bg-blue-50 text-blue-600 rounded-3xl w-fit"><Shield size={48} /></div>
              <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900">Compliance Audit Warning</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                By confirming, you certify that all forensic stamps and operational telemetry are verified. False reporting results in immediate license revocation.
              </p>
              <button disabled={isSubmitting} onClick={finalizeRequest} className="w-full py-6 bg-blue-600 text-white font-black rounded-3xl uppercase text-xs tracking-widest shadow-2xl hover:bg-blue-700">
                {isSubmitting ? <Loader2 className="animate-spin mx-auto" /> : 'Confirm & Request Entry Approval'}
              </button>
           </div>
        </div>
      )}

      {/* WAITING MODAL */}
      {activeModal === 'Waiting' && selectedSite && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-xl text-center">
           <div className="bg-white w-full max-w-lg rounded-[48px] p-12 space-y-8 shadow-2xl">
              <div className={`p-8 rounded-[40px] inline-block ${isAuthorized ? 'bg-emerald-600 text-white scale-110' : 'bg-slate-100 text-slate-400'}`}>
                {isAuthorized ? <Flag size={64} className="animate-bounce" /> : <Loader2 size={64} className="animate-spin" />}
              </div>
              <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900">{isAuthorized ? 'Authorization Granted' : 'Pending FO Authentication'}</h2>
              {isAuthorized ? (
                <button onClick={confirmAccess} className="w-full py-6 bg-emerald-600 text-white font-black rounded-3xl uppercase text-xs tracking-widest shadow-2xl">Proceed to Mission</button>
              ) : (
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Awaiting remote validation from Field Ops HQ...</p>
                  <button onClick={closeModals} className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-600 transition-colors">Abort Access Request</button>
                </div>
              )}
           </div>
        </div>
      )}

      <div className="flex flex-col items-center">
         <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Digital Audit Node: ALPHA-V2 • Cloud Stamping Synchronized</p>
      </div>
    </div>
  );
};

export default VendorAccess;