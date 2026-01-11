
import React from 'react';
import { 
  LayoutDashboard, 
  CheckSquare, 
  MapPin, 
  Package, 
  Settings,
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
    contactNumber: '+63-917-XXX-XXXX', 
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
    type: 'Outdoor', 
    address: 'Ayala Ave, Makati City', 
    gpsCoordinates: '14.5547, 121.0244',
    caretaker: 'Mang Juan',
    caretakerContact: '09123456789',
    keyStatus: 'Available',
    // Added mock maintenance date
    nextMaintenanceDate: '2025-04-15'
  },
  { 
    id: 'MNL-002', 
    name: 'BGC North Relay', 
    type: 'Indoor', 
    address: '32nd St, BGC, Taguig', 
    gpsCoordinates: '14.5500, 121.0500',
    caretaker: 'Alice Cruz',
    caretakerContact: '09987654321',
    keyStatus: 'Available',
    // Added mock maintenance date
    nextMaintenanceDate: '2025-04-20'
  }
];

export const MOCK_MATERIALS: MaterialItem[] = [
  { id: 'MAT-001', name: 'Cat6 Shielded Cable', code: 'STP-CAT6', category: 'Cable', quantity: 20, unit: 'Rolls', minStockLevel: 5, currentStock: 18 },
  { id: 'MAT-002', name: 'SFP+ Transceiver', code: 'SFP-10G-LR', category: 'Hardware', quantity: 12, unit: 'Units', minStockLevel: 4, currentStock: 3 },
  { id: 'MAT-003', name: 'Fiber Splice Kit', code: 'FS-KIT', category: 'Tool', quantity: 1, unit: 'Kit', minStockLevel: 1, currentStock: 1 },
];

export const MOCK_TASKS: WorkTask[] = [
  { id: 'TSK-2024', title: 'Network Rack Migration', description: 'Migrate core switch to new server rack', siteId: 'MNL-001', assignedTo: 'FO-JCR', status: 'In Progress', priority: 'High', type: 'Installation', scheduledDate: '2024-03-22', estimatedHours: 6, createdAt: '2024-03-20', updatedAt: '2024-03-21', materialsRequired: [], safetyRequirements: ['Anti-static wristband'] },
];

export const MOCK_STATS: DashboardStats = {
  activeTasks: 1,
  pendingTasks: 3,
  completedToday: 2,
  criticalIssues: 0,
  taskTrends: [
    { name: 'Mon', completed: 2, pending: 1 },
    { name: 'Tue', completed: 3, pending: 0 },
  ],
  activeOfficers: MOCK_OFFICERS,
  recentTasks: MOCK_TASKS,
};
