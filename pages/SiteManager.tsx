import React, { useState, useEffect, useRef } from 'react';
import { 
  TowerControl as Tower, 
  MapPin, 
  Activity, 
  ShieldAlert, 
  Zap, 
  Search,
  BrainCircuit,
  Loader2,
  X,
  Plus,
  Edit,
  Trash2,
  User,
  Phone,
  Globe,
  Save,
  AlertTriangle,
  UserCheck,
  Clock,
  Key,
  Camera,
  Trash,
  RefreshCw
} from 'lucide-react';
import { apiService } from '../services/apiService';
import { WorkSite, SiteType, Priority } from '../types';
import { getSiteBriefing, SiteBriefing } from '../services/geminiService';
import { useNotify } from '../App';

const SiteManager: React.FC = () => {
  const [sites, setSites] = useState<WorkSite[]>([]);
  const [selectedSite, setSelectedSite] = useState<WorkSite | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [briefing, setBriefing] = useState<SiteBriefing | null>(null);
  const [loadingBriefing, setLoadingBriefing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<WorkSite | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const videoRef = useRef<HTMLVideoElement>(null);
  const { notify } = useNotify();

  const loadSites = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getSites();
      setSites(data);
    } catch (err) {
      notify('Failed to load infrastructure nodes', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSites();
  }, []);

  useEffect(() => {
    let stream: MediaStream | null = null;
    if (cameraActive) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: facingMode } })
        .then(s => {
          stream = s;
          if (videoRef.current) videoRef.current.srcObject = s;
        })
        .catch(() => notify('Camera access denied', 'error'));
    }
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [cameraActive, facingMode]);

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (facingMode === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(videoRef.current, 0, 0);
      }
      setCapturedPhoto(canvas.toDataURL('image/jpeg', 0.8));
      setCameraActive(false);
    }
  };

  const handleOpenForm = (site?: WorkSite) => {
    setEditingSite(site || null);
    setCapturedPhoto(site?.assetPhoto || null);
    setIsFormOpen(true);
    setFacingMode('user');
  };

  const filteredSites = sites.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4">
        <Loader2 size={48} className="text-blue-600 animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Syncing Asset Registry...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Infrastructure Nodes</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Field Engineering Hub</p>
        </div>
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search assets..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button 
            onClick={() => handleOpenForm()}
            className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-500/20 whitespace-nowrap"
          >
            <Plus size={16} />
            <span>New Asset</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSites.map((site) => (
          <div 
            key={site.id} 
            className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden"
          >
            {site.assetPhoto && (
              <div className="h-40 w-full overflow-hidden">
                <img src={site.assetPhoto} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              </div>
            )}
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Tower size={24} />
                </div>
                <div className="flex flex-col items-end space-y-2">
                   <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded border ${site.keyStatus === 'Available' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                     Key: {site.keyStatus}
                   </span>
                   <button onClick={(e) => { e.stopPropagation(); handleOpenForm(site); }} className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-blue-100 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"><Edit size={16} /></button>
                </div>
              </div>
              
              <div className="mb-6">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-widest rounded">{site.id}</span>
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter">{site.type}</span>
                </div>
                <h3 className="text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{site.name}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase flex items-center mt-1">
                  <MapPin size={12} className="mr-1 text-slate-300" /> {site.address}
                </p>
              </div>

              <div className="pt-4 border-t border-gray-50 flex items-center justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
                 <div className="flex items-center"><User size={12} className="mr-1 text-slate-300" /><span>{site.caretaker || 'None'}</span></div>
                 <div className="flex items-center"><Globe size={12} className="mr-1 text-slate-300" /><span className="font-mono">{site.gpsCoordinates || 'N/A'}</span></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ASSET FORM */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in zoom-in duration-200">
           <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
                    {editingSite ? <Edit size={24} /> : <Plus size={24} />}
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{editingSite ? 'Modify Asset' : 'New Node Registration'}</h2>
                </div>
                <button onClick={() => { setIsFormOpen(false); setCameraActive(false); }} className="p-2 hover:bg-slate-100 rounded-full"><X size={24} /></button>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const siteData: WorkSite = {
                  id: editingSite?.id || `SID-${Math.floor(1000 + Math.random() * 9000)}`,
                  name: formData.get('name') as string,
                  type: formData.get('type') as any,
                  address: formData.get('address') as string,
                  gpsCoordinates: formData.get('gps') as string,
                  priority: formData.get('priority') as any,
                  caretaker: formData.get('caretaker') as string,
                  caretakerContact: formData.get('caretakerContact') as string,
                  equipmentBrand: formData.get('brand') as any,
                  towerHeight: Number(formData.get('height')),
                  towerType: formData.get('towerType') as any,
                  sectors: Number(formData.get('sectors')),
                  signalIntegrity: editingSite?.signalIntegrity || 100,
                  keyStatus: editingSite?.keyStatus || 'Available',
                  assetPhoto: capturedPhoto || undefined,
                  lastMaintenanceDate: editingSite?.lastMaintenanceDate || new Date().toISOString().split('T')[0],
                  nextMaintenanceDate: editingSite?.nextMaintenanceDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                };
                
                if (editingSite) await apiService.updateSite(siteData);
                else await apiService.addSite(siteData);
                
                loadSites();
                setIsFormOpen(false);
                notify(editingSite ? 'Asset updated' : 'Asset deployed', 'success');
              }} className="p-10 overflow-y-auto space-y-10">
                
                <div className="space-y-4">
                  <div className="aspect-video bg-slate-100 rounded-[32px] overflow-hidden border-2 border-dashed border-slate-200 flex items-center justify-center relative">
                    {cameraActive ? (
                      <div className="w-full h-full relative">
                        <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`} />
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center space-x-4">
                          <button type="button" onClick={toggleCamera} className="p-3 bg-white/20 backdrop-blur-md text-white rounded-full hover:bg-white/40 transition-all border border-white/20">
                            <RefreshCw size={20} />
                          </button>
                          <button type="button" onClick={capturePhoto} className="p-4 bg-blue-600 text-white rounded-full shadow-xl"><Camera size={24} /></button>
                        </div>
                      </div>
                    ) : capturedPhoto ? (
                      <div className="w-full h-full relative">
                        <img src={capturedPhoto} className="w-full h-full object-cover" />
                        <button type="button" onClick={() => setCapturedPhoto(null)} className="absolute top-4 right-4 p-2 bg-rose-600 text-white rounded-full"><Trash size={16} /></button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setCameraActive(true)} className="flex flex-col items-center">
                        <Camera size={48} className="text-slate-300" />
                        <span className="text-[10px] font-black uppercase mt-2 text-slate-400 tracking-widest">Capture Node Asset Photo</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Asset Name</label>
                    <input name="name" required defaultValue={editingSite?.name} className="w-full p-4 bg-slate-50 border border-transparent rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-black text-sm uppercase" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                    <select name="type" defaultValue={editingSite?.type || 'Macro Cell'} className="w-full p-4 bg-slate-50 border border-transparent rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-black text-xs uppercase appearance-none"><option value="Macro Cell">Macro Cell</option><option value="Small Cell">Small Cell</option><option value="Micro Cell">Micro Cell</option><option value="Repeater">Repeater</option><option value="Data Center">Data Center</option></select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Caretaker Name</label>
                    <input name="caretaker" required defaultValue={editingSite?.caretaker} className="w-full p-4 bg-slate-50 rounded-2xl font-black text-sm uppercase" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Caretaker Contact</label>
                    <input name="caretakerContact" required type="tel" defaultValue={editingSite?.caretakerContact} className="w-full p-4 bg-slate-50 rounded-2xl font-black text-sm uppercase" />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Location Address</label>
                    <input name="address" required defaultValue={editingSite?.address} className="w-full p-4 bg-slate-50 border border-transparent rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-black text-sm uppercase" />
                  </div>
                </div>
                <div className="flex items-center space-x-4 pt-6">
                  <button type="button" onClick={() => setIsFormOpen(false)} className="flex-1 py-4 text-slate-400 font-black uppercase text-[10px]">Cancel</button>
                  <button type="submit" className="flex-[2] py-5 bg-blue-600 text-white font-black rounded-3xl hover:bg-blue-700 shadow-xl uppercase text-xs tracking-widest">Deploy Asset</button>
                </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default SiteManager;