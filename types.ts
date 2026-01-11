
export type Department = 'Network' | 'Technical' | 'Sales' | 'Service';
export type SiteType = 'Outdoor' | 'Indoor';
export type TaskStatus = 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
export type Priority = 'Critical' | 'High' | 'Medium' | 'Low';
export type TaskType = 'Maintenance' | 'Installation' | 'Repair' | 'Inspection' | 'Audit';
export type MaterialCategory = 'Hardware' | 'Cable' | 'Tool' | 'Safety' | 'Consumable';

export interface VendorProfile {
  id: string;
  username: string;
  password?: string;
  fullName: string;
  company: string;
  contactNumber: string;
  photo?: string;
  idNumber: string;
  specialization: string;
  verified: boolean;
  createdAt: string;
}

export interface SiteVisitor {
  id: string;
  vendorId?: string;
  leadName: string;
  contactNumber: string;
  personnel: string[];
  vendor: string;
  activity: string;
  photo?: string;
  exitPhoto?: string;
  rocLogged: boolean;
  rocName?: string;
  rocTime?: string;
  rocLogoutName?: string;
  rocLogoutTime?: string;
  nocLogged: boolean;
  checkInTime: string;
  checkOutTime?: string;
}

export interface KeyLog {
  id: string;
  siteId: string;
  siteName: string;
  borrowerName: string;
  borrowerId: string;
  borrowerContact: string;
  vendor: string;
  reason: string;
  borrowTime: string;
  borrowPhoto: string;
  returnTime?: string;
  returnPhoto?: string;
}

export interface FieldOfficer {
  id: string;
  name: string;
  employeeId: string;
  department: Department;
  contactNumber: string;
  email: string;
  vehicleNumber: string;
  isActive: boolean;
  skills: string[];
  activeTasks?: number;
  lastUpdate?: string;
}

export interface WorkSite {
  id: string; // Site ID
  name: string; // Sitename
  type: SiteType; // Type
  address: string; // Location
  gpsCoordinates: string; // Gps
  caretaker: string; // Caretaker
  caretakerContact: string; // Caretaker no.
  // Operational Status (Required for Dashboard logic)
  keyStatus: 'Available' | 'Borrowed';
  currentKeyLog?: KeyLog;
  pendingKeyLog?: KeyLog;
  keyAccessAuthorized?: boolean;
  keyHistory?: KeyLog[];
  currentVisitor?: SiteVisitor;
  pendingVisitor?: SiteVisitor;
  accessAuthorized?: boolean;
  visitorHistory?: SiteVisitor[];
  // Added optional property to resolve TS errors in constants.tsx and logicEngine.ts
  nextMaintenanceDate?: string;
}

export interface MaterialItem {
  id: string;
  name: string;
  code: string;
  category: MaterialCategory;
  quantity: number;
  unit: string;
  minStockLevel: number;
  currentStock: number;
  photo?: string;
}

export interface WorkTask {
  id: string;
  title: string;
  description: string;
  siteId: string;
  assignedTo: string; 
  status: TaskStatus;
  priority: Priority;
  type: TaskType;
  scheduledDate: string;
  estimatedHours: number;
  actualHours?: number;
  materialsRequired: string[]; 
  safetyRequirements: string[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  taskInitiationPhoto?: string;
}

export interface DashboardStats {
  activeTasks: number;
  pendingTasks: number;
  completedToday: number;
  criticalIssues: number;
  taskTrends: { name: string; completed: number; pending: number }[];
  activeOfficers: FieldOfficer[];
  recentTasks: WorkTask[];
}
