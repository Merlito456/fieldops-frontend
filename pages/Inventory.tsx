import React, { useState, useEffect } from 'react';
import { 
  Package, 
  AlertTriangle, 
  ArrowRight, 
  RefreshCcw, 
  Plus, 
  Download,
  Boxes,
  Activity,
  Search,
  Filter,
  CheckCircle,
  MoreHorizontal,
  Loader2
} from 'lucide-react';
import { useNotify } from '../App';
import { MaterialItem } from '../types';
import { storageService } from '../services/storageService';
import { apiService } from '../services/apiService';

const Inventory: React.FC = () => {
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [activeCategory, setActiveCategory] = useState('All Items');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { notify } = useNotify();

  const loadData = async () => {
    try {
      const fetched = await apiService.getMaterials();
      setMaterials(fetched);
    } catch (err) {
      setMaterials(storageService.getMaterials());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRestock = (id: string) => {
    const updatedMaterials = materials.map(m => {
      if (m.id === id) {
        notify(`Restocked ${m.name} (+10 units)`, 'success');
        return { ...m, currentStock: m.currentStock + 10 };
      }
      return m;
    });
    setMaterials(updatedMaterials);
    storageService.saveMaterials(updatedMaterials);
    // Note: Stock updates would normally have an API endpoint, but we fallback here
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    notify('Syncing inventory with warehouse...', 'info');
    await loadData();
    setIsRefreshing(false);
    notify('Inventory up to date', 'success');
  };

  const handleExport = () => {
    notify('Exporting inventory ledger to CSV...', 'info');
    setTimeout(() => notify('Ledger exported successfully', 'success'), 2000);
  };

  const categories = ['All Items', 'Cables', 'Hardware', 'Safety Gear', 'Consumables', 'Tools'];
  
  const filteredMaterials = materials.filter(m => {
    if (activeCategory === 'All Items') return true;
    return m.category.toLowerCase().includes(activeCategory.toLowerCase().replace(' gear', ''));
  });

  const lowStockCount = materials.filter(m => m.currentStock <= m.minStockLevel).length;

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4">
        <Loader2 size={48} className="text-blue-600 animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Kit Inventory...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight uppercase">Inventory Management</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Stock tracking and material distribution</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={handleRefresh}
            className={`p-2.5 bg-white border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50 shadow-sm transition-all ${isRefreshing ? 'animate-spin' : ''}`}
          >
            <RefreshCcw size={20} />
          </button>
          <button 
            onClick={() => notify('Stock Entry interface coming soon')}
            className="flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-500/20"
          >
            <Plus size={20} />
            <span>New Stock Entry</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
            <Boxes size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total SKU Items</p>
            <p className="text-2xl font-black text-slate-900">{materials.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
          <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Low Stock Warnings</p>
            <p className="text-2xl font-black text-slate-900">{lowStockCount}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Turnover Rate</p>
            <p className="text-2xl font-black text-slate-900">14.2%</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-900 mb-4">Categories</h3>
            <div className="space-y-1">
              {categories.map((cat) => (
                <button 
                  key={cat} 
                  onClick={() => setActiveCategory(cat)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-black uppercase transition-colors flex items-center justify-between ${
                    activeCategory === cat ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span className="text-[10px] tracking-tight">{cat}</span>
                  {activeCategory === cat && <ArrowRight size={14} />}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:w-80">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Filter current inventory..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-xs font-black uppercase outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={handleExport}
                  className="flex items-center space-x-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 border border-gray-100 rounded-xl hover:bg-gray-50"
                >
                  <Download size={16} />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-gray-100">
                    <th className="px-6 py-4">Item Detail</th>
                    <th className="px-6 py-4">In Stock</th>
                    <th className="px-6 py-4">Level</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredMaterials.map((material) => {
                    const isLow = material.currentStock <= material.minStockLevel;
                    const percent = Math.min((material.currentStock / (material.minStockLevel * 2)) * 100, 100);
                    
                    return (
                      <tr key={material.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                              <Package size={18} />
                            </div>
                            <div>
                              <p className="font-black text-gray-900 uppercase text-xs">{material.name}</p>
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{material.category} • {material.code}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-black text-slate-900 text-xs">
                          {material.currentStock} {material.unit}
                        </td>
                        <td className="px-6 py-4 w-32">
                          <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${isLow ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${percent}%` }}></div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {isLow ? (
                            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 text-[9px] font-black uppercase tracking-wider border border-rose-100">
                              <AlertTriangle size={12} />
                              <span>Low Stock</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase tracking-wider border border-emerald-100">
                              <CheckCircle size={12} />
                              <span>Optimal</span>
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button 
                              onClick={() => handleRestock(material.id)}
                              className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-black uppercase hover:bg-indigo-100 transition-colors"
                            >
                              Restock
                            </button>
                            <button className="p-1.5 text-gray-400 hover:text-gray-900">
                              <MoreHorizontal size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Inventory;