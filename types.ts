
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

export interface ChatMessage {
  id: string;
  siteId: string;
  senderId: string;
  senderName: string;
  role: 'VENDOR' | 'FO';
  content: string;
  timestamp: string;
}

export interface SiteVisitor {
  id: string;
  vendorId?: string;
  leadName: string;
  contactNumber: string;
  personnel: string[];
  vendor: string;
  activity: string;
  rawaNumber?: string;
  checkedBy?: string;
  startTime?: string;
  expectedEndTime?: string;
  photo?: string;
  exitPhoto?: string;
  rocLogged: boolean;
  rocName?: string;
  rocTime?: string;
  rocLogoutName?: string;
  rocLogoutTime?: string;
  nocLogged: boolean;
  nocLoginName?: string;
  nocLoginTime?: string;
  nocLogoutName?: string;
  nocLogoutTime?: string;
  activityRemarks?: string;
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
  rawaNumber?: string;
  releasedBy?: string;
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
  id: string;
  name: string;
  type: SiteType;
  address: string;
  gpsCoordinates: string;
  caretaker: string;
  caretakerContact: string;
  keyStatus: 'Available' | 'Borrowed';
  currentKeyLog?: KeyLog;
  pendingKeyLog?: KeyLog;
  keyAccessAuthorized?: boolean;
  keyHistory?: KeyLog[];
  currentVisitor?: SiteVisitor;
  pendingVisitor?: SiteVisitor;
  accessAuthorized?: boolean;
  visitorHistory?: SiteVisitor[];
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
