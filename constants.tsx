
import React from 'react';
import { 
  LayoutDashboard, 
  CheckSquare, 
  MapPin, 
  Package, 
  FileText, 
  Settings,
  Activity,
  Clock,
  CheckCircle,
  AlertTriangle,
  ScanEye,
  History
} from 'lucide-react';
import { FieldOfficer, WorkSite, MaterialItem, WorkTask, DashboardStats } from './types';

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'My Dashboard', icon: <LayoutDashboard size={20} />, path: '/dashboard' },
  { id: 'tasks', label: 'My Tasks', icon: <CheckSquare size={20} />, path: '/tasks' },
  { id: 'sites', label: 'Cell Sites', icon: <MapPin size={20} />, path: '/sites' },
  { id: 'inventory', label: 'My Kit', icon: <Package size={20} />, path: '/inventory' },
  { id: 'reports', label: 'Operational Ledger', icon: <History size={20} />, path: '/reports' },
  { id: 'settings', label: 'Settings', icon: <Settings size={20} />, path: '/settings' },
];

export const MOCK_OFFICERS: FieldOfficer[] = [
  { 
    id: 'FO-JCR', 
    name: 'Engr. John Carlo Rabanes, ECE', 
    employeeId: 'ECE-2024', 
    department: 'Technical', 
    contactNumber: '+63-XXX-XXXX', 
    email: 'jcr.rabanes@engr.com', 
    vehicleNumber: 'ENG-001', 
    isActive: true, 
    skills: ['Network Design', 'RF Engineering', 'Site Maintenance'], 
    activeTasks: 4, 
    lastUpdate: 'Just now' 
  }
];

export const MOCK_SITES: WorkSite[] = [
  { 
    id: 'MNL-001', 
    name: 'Makati Central Macro', 
    type: 'Macro Cell', 
    address: 'Ayala Ave, Makati City', 
    priority: 'Critical', 
    lastMaintenanceDate: '2024-02-15', 
    nextMaintenanceDate: '2024-05-15',
    towerHeight: 45,
    towerType: 'Monopole',
    equipmentBrand: 'Ericsson',
    signalIntegrity: 98,
    sectors: 3,
    keyStatus: 'Available'
  },
  { 
    id: 'MNL-002', 
    name: 'BGC North Relay', 
    type: 'Micro Cell', 
    address: '32nd St, BGC, Taguig', 
    priority: 'High', 
    lastMaintenanceDate: '2024-03-01', 
    nextMaintenanceDate: '2024-06-01',
    towerHeight: 15,
    towerType: 'Rooftop',
    equipmentBrand: 'Huawei',
    signalIntegrity: 92,
    sectors: 2,
    keyStatus: 'Available'
  },
  { 
    id: 'QC-042', 
    name: 'Commonwealth Lattice Node', 
    type: 'Macro Cell', 
    address: 'Commonwealth Ave, Quezon City', 
    priority: 'Medium', 
    lastMaintenanceDate: '2024-01-20', 
    nextMaintenanceDate: '2024-04-20',
    towerHeight: 60,
    towerType: 'Lattice',
    equipmentBrand: 'Nokia',
    signalIntegrity: 88,
    sectors: 4,
    keyStatus: 'Available'
  },
];

export const MOCK_MATERIALS: MaterialItem[] = [
  { id: 'MAT-001', name: 'Cat6 Shielded Cable', code: 'STP-CAT6', category: 'Cable', quantity: 20, unit: 'Rolls', minStockLevel: 5, currentStock: 18 },
  { id: 'MAT-002', name: 'SFP+ Transceiver', code: 'SFP-10G-LR', category: 'Hardware', quantity: 12, unit: 'Units', minStockLevel: 4, currentStock: 3 },
  { id: 'MAT-003', name: 'Fiber Splice Kit', code: 'FS-KIT', category: 'Tool', quantity: 1, unit: 'Kit', minStockLevel: 1, currentStock: 1 },
];

export const MOCK_TASKS: WorkTask[] = [
  { id: 'TSK-2024', title: 'Network Rack Migration', description: 'Migrate core switch to new server rack at Metro Data Center', siteId: 'MNL-001', assignedTo: 'FO-JCR', status: 'In Progress', priority: 'High', type: 'Installation', scheduledDate: '2024-03-22', estimatedHours: 6, createdAt: '2024-03-20', updatedAt: '2024-03-21', materialsRequired: [], safetyRequirements: ['Anti-static wristband'] },
  { id: 'TSK-2025', title: 'RF Signal Optimization', description: 'Adjust antenna tilt to improve coverage in Sector B', siteId: 'MNL-002', assignedTo: 'FO-JCR', status: 'Pending', priority: 'Medium', type: 'Maintenance', scheduledDate: '2024-03-23', estimatedHours: 3, createdAt: '2024-03-21', updatedAt: '2024-03-21', materialsRequired: [], safetyRequirements: ['Climbing Harness'] },
];

export const MOCK_STATS: DashboardStats = {
  activeTasks: 1,
  pendingTasks: 3,
  completedToday: 2,
  criticalIssues: 0,
  taskTrends: [
    { name: 'Mon', completed: 2, pending: 1 },
    { name: 'Tue', completed: 3, pending: 0 },
    { name: 'Wed', completed: 1, pending: 2 },
    { name: 'Thu', completed: 4, pending: 1 },
    { name: 'Fri', completed: 2, pending: 0 },
  ],
  activeOfficers: MOCK_OFFICERS,
  recentTasks: MOCK_TASKS,
};
