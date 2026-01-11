import React, { useState, useEffect } from 'react';
import { User, Shield, Save, Key, RefreshCw, Database, CheckCircle, XCircle } from 'lucide-react';
import { storageService } from '../services/storageService';
import { apiService } from '../services/apiService';
import { useNotify } from '../App';

const Settings: React.FC = () => {
  const [name, setName] = useState(storageService.getFOName());
  const [password, setPassword] = useState(storageService.getFOPassword());
  const [isSaving, setIsSaving] = useState(false);
  const [dbTestResult, setDbTestResult] = useState<'testing' | 'ok' | 'fail' | null>(null);
  const { notify } = useNotify();

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      storageService.saveFOName(name);
      storageService.saveFOPassword(password);
      setIsSaving(false);
      notify('Settings updated successfully', 'success');
    }, 800);
  };

  const testConnection = async () => {
    setDbTestResult('testing');
    const isOk = await apiService.ping();
    setDbTestResult(isOk ? 'ok' : 'fail');
    if (isOk) notify('Bridge connection verified.', 'success');
    else notify('Could not reach API server.', 'error');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">System Configuration</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Personalize FO Identity & Security</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-4">
          <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col items-center text-center">
             <div className="h-24 w-24 bg-slate-900 rounded-3xl mb-4 flex items-center justify-center overflow-hidden border-4 border-slate-50 shadow-xl">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${name}&backgroundColor=b6e3f4`} alt="FO Identity" />
             </div>
             <h3 className="font-black text-slate-900 uppercase tracking-tight">{name}</h3>
             <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">Field Officer • Sector Alpha</p>
          </div>
          
          {/* Diagnostic Card */}
          <div className="bg-slate-900 p-6 rounded-[32px] text-white shadow-xl">
             <div className="flex items-center space-x-3 mb-6">
               <Database className="text-blue-500" size={20} />
               <h4 className="font-black uppercase tracking-tight text-xs">Bridge Diagnostic</h4>
             </div>
             
             <div className="space-y-4">
                <button 
                  onClick={testConnection}
                  disabled={dbTestResult === 'testing'}
                  className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  {dbTestResult === 'testing' ? 'Pinging Node...' : 'Test MySQL Bridge'}
                </button>
                
                {dbTestResult === 'ok' && (
                  <div className="flex items-center space-x-2 text-emerald-400">
                    <CheckCircle size={14} />
                    <span className="text-[9px] font-black uppercase">Server reachable</span>
                  </div>
                )}
                {dbTestResult === 'fail' && (
                  <div className="flex items-center space-x-2 text-rose-400">
                    <XCircle size={14} />
                    <span className="text-[9px] font-black uppercase">Server unreachable</span>
                  </div>
                )}
             </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-8">
             <div className="flex items-center space-x-3 text-slate-400">
                <User size={20} />
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Identity Details</h3>
             </div>
             
             <div className="space-y-4">
               <div className="space-y-1">
                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name & Title</label>
                 <input 
                   type="text" 
                   value={name}
                   onChange={(e) => setName(e.target.value)}
                   className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-sm uppercase outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                 />
               </div>
             </div>

             <div className="h-px bg-slate-50"></div>

             <div className="flex items-center space-x-3 text-slate-400">
                <Key size={20} />
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Security Credentials</h3>
             </div>

             <div className="space-y-4">
               <div className="space-y-1">
                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">FO Access Password</label>
                 <div className="relative">
                   <input 
                     type="text" 
                     value={password}
                     onChange={(e) => setPassword(e.target.value)}
                     className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                   />
                   <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase">Vault-Secured</div>
                 </div>
               </div>
             </div>

             <div className="pt-4">
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full py-5 bg-slate-900 text-white font-black rounded-3xl uppercase text-xs tracking-widest shadow-xl hover:bg-black transition-all flex items-center justify-center space-x-2"
                >
                  {isSaving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                  <span>{isSaving ? 'Synchronizing...' : 'Save Configuration'}</span>
                </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;