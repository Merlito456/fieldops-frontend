import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Calendar, 
  MapPin, 
  User,
  AlertCircle,
  Clock,
  ExternalLink,
  ChevronDown,
  X,
  ShieldAlert,
  HardHat,
  Stethoscope,
  Info,
  Loader2,
  BrainCircuit,
  Phone
} from 'lucide-react';
import { Priority, TaskStatus, WorkTask } from '../types';
import { useNotify } from '../App';
import { getSafetyInsights, SafetyInsight } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { apiService } from '../services/apiService';

const TaskManager: React.FC = () => {
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState<WorkTask | null>(null);
  const [safetyInsights, setSafetyInsights] = useState<SafetyInsight | null>(null);
  const [loadingSafety, setLoadingSafety] = useState(false);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const { notify } = useNotify();

  const [sites, setSites] = useState(storageService.getSites());
  const [officers, setOfficers] = useState(storageService.getOfficers());

  const loadData = async () => {
    try {
      const fetchedTasks = await apiService.getTasks();
      setTasks(fetchedTasks);
    } catch (err) {
      notify('Failed to load tasks from hub', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredTasks = tasks.filter(task => {
    const matchesStatus = filterStatus === 'All' || task.status === filterStatus;
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          task.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleTaskClick = async (task: WorkTask) => {
    setSelectedTask(task);
    setLoadingSafety(true);
    setSafetyInsights(null);
    const insights = await getSafetyInsights(task.description);
    setSafetyInsights(insights);
    setLoadingSafety(false);
  };

  const handleCreateTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const newTask: WorkTask = {
      id: `TSK-${Math.floor(1000 + Math.random() * 9000)}`,
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      priority: formData.get('priority') as Priority,
      assignedTo: officers.find(o => o.name === formData.get('assignee'))?.id || 'FO-001',
      siteId: sites[0].id, 
      status: 'Pending',
      type: 'Installation',
      scheduledDate: new Date().toISOString().split('T')[0],
      estimatedHours: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      materialsRequired: [],
      safetyRequirements: [],
    };

    try {
      await apiService.request('/tasks', {
        method: 'POST',
        body: JSON.stringify(newTask)
      });
      notify('Task assigned and synchronized', 'success');
      setIsNewTaskModalOpen(false);
      loadData();
    } catch (err) {
      notify('Task assigned locally only (Hub Sync Error)', 'info');
      const updatedTasks = [newTask, ...tasks];
      setTasks(updatedTasks);
      storageService.saveTasks(updatedTasks);
      setIsNewTaskModalOpen(false);
    }
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'Critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'High': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Medium': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Low': return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'Completed': return 'bg-green-50 text-green-700';
      case 'In Progress': return 'bg-blue-50 text-blue-700';
      case 'Pending': return 'bg-amber-50 text-amber-700';
      case 'Cancelled': return 'bg-red-50 text-red-700';
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4">
        <Loader2 size={48} className="text-blue-600 animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Syncing Task Matrix...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Work Assignments</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Field personnel logistics</p>
        </div>
        <button 
          onClick={() => { setIsNewTaskModalOpen(true); }}
          className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
        >
          <Plus size={16} />
          <span>New Task Assignment</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search tasks..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-transparent rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">ID & Task Title</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Site Location</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Assigned To</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredTasks.map((task) => {
                const site = sites.find(s => s.id === task.siteId);
                const officer = officers.find(o => o.id === task.assignedTo);
                
                return (
                  <tr 
                    key={task.id} 
                    className="hover:bg-slate-50 transition-colors group cursor-pointer"
                    onClick={() => handleTaskClick(task)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        {task.taskInitiationPhoto && (
                          <div className="h-10 w-10 rounded-lg overflow-hidden border border-slate-100">
                            <img src={task.taskInitiationPhoto} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div>
                          <p className="text-[10px] font-black text-blue-600 mb-1">{task.id}</p>
                          <p className="font-black text-slate-900 group-hover:text-blue-700 transition-colors uppercase tracking-tight">{task.title}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-black uppercase">{site?.name}</td>
                    <td className="px-6 py-4">
                       <span className="text-xs font-black text-slate-900 uppercase">{officer?.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 text-slate-300 hover:text-slate-900"><MoreVertical size={18} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Task Modal */}
      {isNewTaskModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in zoom-in duration-200">
          <form onSubmit={handleCreateTask} className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl p-10 space-y-8 overflow-y-auto max-h-[95vh]">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Assign Mission</h2>
              <button type="button" onClick={() => setIsNewTaskModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-full"><X size={24} /></button>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Mission Title</label>
                <input name="title" required className="w-full p-4 bg-slate-50 rounded-2xl font-black text-sm uppercase" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Personnel</label>
                  <select name="assignee" className="w-full p-4 bg-slate-50 rounded-2xl font-black text-xs uppercase appearance-none">{officers.map(o => <option key={o.id}>{o.name}</option>)}</select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact No.</label>
                  <div className="flex items-center p-4 bg-slate-50 rounded-2xl">
                    <Phone size={14} className="mr-2 text-slate-400" />
                    <span className="text-xs font-black text-slate-900">AUTO-SYNCED</span>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                <textarea name="description" required rows={3} className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm italic"></textarea>
              </div>
            </div>

            <button type="submit" className="w-full py-5 bg-blue-600 text-white font-black rounded-3xl hover:bg-blue-700 shadow-xl uppercase text-xs tracking-widest">Deploy Mission</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default TaskManager;