
import React, { useState, useEffect } from 'react';
import { 
  TowerControl as Tower, 
  MapPin, 
  Search,
  Loader2,
  X,
  Plus,
  Edit,
  User,
  Phone,
  Navigation,
  Globe,
  Trash2
} from 'lucide-react';
import { apiService } from '../services/apiService';
import { WorkSite, SiteType } from '../types';
import { useNotify } from '../App';

const SiteManager: React.FC = () => {
  const [sites, setSites] = useState<WorkSite[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<WorkSite | null>(null);

  const { notify } = useNotify();

  const loadSites = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getSites();
      setSites(data);
    } catch (err) {
      notify('Database Bridge Error', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSites();
  }, []);

  const handleOpenForm = (site?: WorkSite) => {
    setEditingSite(site || null);
    setIsFormOpen(true);
  };

  const handleDeleteSite = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this site from the global registry?')) return;
    try {
      await apiService.request(`/sites/${id}`, { method: 'DELETE' });
      notify('Site removed from registry', 'success');
      loadSites();
    } catch (err) {
      notify('Failed to delete site', 'error');
    }
  };

  const filteredSites = sites.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4">
        <Loader2 size={48} className="text-blue-600 animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Synchronizing Asset Hub...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Infrastructure Registry</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Operational Cellsite Inventory</p>
        </div>
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Filter by ID or Name..."
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
            <span>Register New Site</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSites.map((site) => (
          <div 
            key={site.id} 
            className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all cursor-pointer group relative overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Tower size={24} />
                </div>
                <div className="flex flex-col items-end space-y-2">
                   <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded border ${site.type === 'Outdoor' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                     {site.type}
                   </span>
                   <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); handleOpenForm(site); }} className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-blue-100 hover:text-blue-600"><Edit size={14} /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteSite(site.id); }} className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-rose-100 hover:text-rose-600"><Trash2 size={14} /></button>
                   </div>
                </div>
              </div>
              
              <div className="mb-6">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-widest rounded">{site.id}</span>
                </div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight truncate">{site.name}</h3>
                <div className="space-y-2 mt-3">
                  <p className="text-[10px] text-slate-500 font-bold uppercase flex items-center">
                    <MapPin size={12} className="mr-2 text-slate-300" /> {site.address}
                  </p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase flex items-center">
                    <Globe size={12} className="mr-2 text-slate-300" /> {site.gpsCoordinates || 'Coordinates Not Set'}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-50 grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Caretaker</p>
                    <div className="flex items-center text-[10px] font-black text-slate-700 uppercase">
                      <User size={10} className="mr-1 text-blue-500" />
                      <span className="truncate">{site.caretaker || 'None'}</span>
                    </div>
                 </div>
                 <div className="space-y-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Phone</p>
                    <div className="flex items-center text-[10px] font-black text-slate-700 uppercase">
                      <Phone size={10} className="mr-1 text-emerald-500" />
                      <span>{site.caretakerContact || 'N/A'}</span>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Simplified Asset Form */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in zoom-in duration-200">
           <div className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
                    {editingSite ? <Edit size={24} /> : <Plus size={24} />}
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{editingSite ? 'Edit Asset' : 'Register Asset'}</h2>
                </div>
                <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24} /></button>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const siteData: Partial<WorkSite> = {
                  id: editingSite?.id || (formData.get('id') as string),
                  name: formData.get('name') as string,
                  type: formData.get('type') as SiteType,
                  address: formData.get('address') as string,
                  gpsCoordinates: formData.get('gps') as string,
                  caretaker: formData.get('caretaker') as string,
                  caretakerContact: formData.get('caretakerContact') as string,
                };
                
                try {
                  if (editingSite) {
                    await apiService.updateSite({ ...editingSite, ...siteData } as WorkSite);
                    notify('Site updated', 'success');
                  } else {
                    await apiService.addSite({ 
                      ...siteData, 
                      keyStatus: 'Available',
                      visitorHistory: [],
                      keyHistory: []
                    } as WorkSite);
                    notify('Site registered', 'success');
                  }
                  
                  loadSites();
                  setIsFormOpen(false);
                } catch (err) {
                  notify('Failed to connect to database', 'error');
                }
              }} className="p-10 overflow-y-auto space-y-8">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Sitename</label>
                    <input name="name" required defaultValue={editingSite?.name} className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none font-black text-sm uppercase transition-all" placeholder="e.g. Makati North Macro" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Site ID</label>
                    <input name="id" required defaultValue={editingSite?.id} disabled={!!editingSite} className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none font-black text-sm uppercase transition-all disabled:opacity-50" placeholder="e.g. MNL-001" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Type</label>
                    <select name="type" defaultValue={editingSite?.type || 'Outdoor'} className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none font-black text-xs uppercase appearance-none transition-all">
                      <option value="Outdoor">Outdoor</option>
                      <option value="Indoor">Indoor</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">GPS Coordinates</label>
                    <input name="gps" placeholder="14.55, 121.02" defaultValue={editingSite?.gpsCoordinates} className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none font-black text-sm uppercase transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Caretaker Name</label>
                    <input name="caretaker" required defaultValue={editingSite?.caretaker} className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none font-black text-sm uppercase transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Caretaker No.</label>
                    <input name="caretakerContact" required type="tel" defaultValue={editingSite?.caretakerContact} className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none font-black text-sm uppercase transition-all" />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Location Address</label>
                    <input name="address" required defaultValue={editingSite?.address} className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none font-black text-sm uppercase transition-all" />
                  </div>
                </div>

                <div className="flex items-center space-x-4 pt-6">
                  <button type="button" onClick={() => setIsFormOpen(false)} className="flex-1 py-4 text-slate-400 font-black uppercase text-[10px] hover:text-slate-900 transition-colors">Cancel</button>
                  <button type="submit" className="flex-[2] py-5 bg-blue-600 text-white font-black rounded-3xl hover:bg-blue-700 shadow-xl shadow-blue-500/20 uppercase text-xs tracking-widest transition-all">Write to Registry</button>
                </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default SiteManager;
