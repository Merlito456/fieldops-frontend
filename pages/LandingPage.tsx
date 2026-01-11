
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, UserCog, ScanEye, Briefcase, Zap, MapPin } from 'lucide-react';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-900 overflow-hidden relative">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute top-1/2 -right-24 w-80 h-80 bg-emerald-100/50 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-indigo-100/30 rounded-full blur-3xl opacity-50"></div>
      </div>

      <div className="relative z-10 w-full max-w-4xl space-y-12 text-center">
        <div className="space-y-4">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white rounded-2xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-4 duration-1000">
            <ShieldCheck size={16} className="text-blue-600" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Secure Operations Management</span>
          </div>
          <h1 className="text-6xl md:text-7xl font-black tracking-tighter text-slate-900 uppercase">
            FieldOps <span className="text-blue-600">Pro</span>
          </h1>
          <p className="text-slate-500 font-bold uppercase text-xs tracking-[0.3em] max-w-lg mx-auto leading-relaxed">
            Critical Infrastructure Hub for Engineering Excellence and On-Site Compliance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
          {/* FO Access Card */}
          <button 
            onClick={() => navigate('/dashboard')}
            className="group relative bg-white p-10 rounded-[48px] border border-slate-200 shadow-xl hover:shadow-2xl hover:border-blue-500 hover:-translate-y-2 transition-all duration-500 text-left overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <UserCog size={120} className="text-blue-900" />
            </div>
            <div className="relative z-10 space-y-6">
              <div className="h-16 w-16 bg-blue-600 text-white rounded-[24px] flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform duration-500">
                <Briefcase size={32} />
              </div>
              <div>
                <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight">FO Access</h3>
                <p className="text-sm font-bold text-slate-400 uppercase mt-2">Field Officer Workspace</p>
              </div>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                Manage cell site assets, dispatch work assignments, track inventory, and access engineering AI intelligence.
              </p>
              <div className="flex items-center space-x-2 text-blue-600 font-black text-xs uppercase tracking-widest pt-4">
                <span>Enter Workspace</span>
                <Zap size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </button>

          {/* Vendor Access Card */}
          <button 
            onClick={() => navigate('/vendor-access')}
            className="group relative bg-white p-10 rounded-[48px] border border-slate-200 shadow-xl hover:shadow-2xl hover:border-emerald-500 hover:-translate-y-2 transition-all duration-500 text-left overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity text-emerald-900">
              <ScanEye size={120} />
            </div>
            <div className="relative z-10 space-y-6">
              <div className="h-16 w-16 bg-emerald-600 text-white rounded-[24px] flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform duration-500">
                <ScanEye size={32} />
              </div>
              <div>
                <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Vendor Portal</h3>
                <p className="text-sm font-bold text-slate-400 uppercase mt-2">Kiosk Entry System</p>
              </div>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                Log in to cell sites, borrow physical keys, and complete mandatory security protocols before operational entry.
              </p>
              <div className="flex items-center space-x-2 text-emerald-600 font-black text-xs uppercase tracking-widest pt-4">
                <span>Access Kiosk</span>
                <MapPin size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </button>
        </div>

        <div className="pt-12 text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] animate-pulse">
          Monitoring Global Infrastructure Assets
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
