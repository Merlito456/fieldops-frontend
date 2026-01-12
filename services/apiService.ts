
import { MaterialItem, WorkTask, FieldOfficer, WorkSite, SiteVisitor, KeyLog, VendorProfile, ChatMessage } from '../types';
import { imageService } from './imageService';
import { storageService } from '../services/storageService';

const REMOTE_URL = 'https://fieldops-backend-4i46.onrender.com/api';
const LOCAL_URL = 'http://localhost:10000/api';

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = isLocalhost ? LOCAL_URL : REMOTE_URL;

export const apiService = {
  isOffline: false,

  async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    try {
      const controller = new AbortController();
      // Increase timeout for Render cold-starts
      const timeoutId = setTimeout(() => controller.abort(), 30000); 
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', ...options?.headers },
      });
      clearTimeout(timeoutId);
      
      if (response.status === 401) throw new Error('AUTH_FAILED');
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.error(`API_ERROR [${endpoint}]:`, response.status, errData);
        throw new Error(`HTTP_${response.status}`);
      }
      
      this.isOffline = false;
      return await response.json();
    } catch (error: any) {
      if (error.message === 'AUTH_FAILED') throw error;
      
      this.isOffline = true;
      console.warn(`Bridge Link Failed: ${endpoint}`, error.message);
      throw new Error(error.name === 'AbortError' ? 'TIMEOUT' : 'BRIDGE_OFFLINE');
    }
  },

  getSites: async (): Promise<WorkSite[]> => {
    try {
      return await apiService.request<WorkSite[]>('/sites');
    } catch {
      return storageService.getSites();
    }
  },
  
  getTasks: async (): Promise<WorkTask[]> => {
    try {
      return await apiService.request<WorkTask[]>('/tasks');
    } catch {
      return storageService.getTasks();
    }
  },

  getVendors: async (): Promise<VendorProfile[]> => {
    try {
      return await apiService.request<VendorProfile[]>('/vendors');
    } catch {
      return storageService.getVendors();
    }
  },

  addSite: async (site: WorkSite): Promise<WorkSite> => apiService.request<WorkSite>('/sites', { method: 'POST', body: JSON.stringify(site) }),
  updateSite: async (site: WorkSite): Promise<WorkSite> => apiService.request<WorkSite>(`/sites/${site.id}`, { method: 'PUT', body: JSON.stringify(site) }),

  requestAccess: async (siteId: string, visitorData: Omit<SiteVisitor, 'id' | 'checkInTime'>) => {
    let photoUrl = visitorData.photo;
    if (visitorData.photo?.startsWith('data:image')) photoUrl = await imageService.uploadEvidence(visitorData.photo);
    return await apiService.request('/access/request', { method: 'POST', body: JSON.stringify({ ...visitorData, photo: photoUrl, siteId }) });
  },

  authorizeAccess: async (siteId: string) => apiService.request(`/access/authorize/${siteId}`, { method: 'POST' }),
  checkInVendor: async (siteId: string, visitor: SiteVisitor) => apiService.request(`/access/checkin/${siteId}`, { method: 'POST', body: JSON.stringify(visitor) }),
  checkOutVendor: async (siteId: string, exitPhoto: string, logoutDetails: Partial<SiteVisitor>) => {
    const photoUrl = await imageService.uploadEvidence(exitPhoto);
    return await apiService.request(`/access/checkout/${siteId}`, { method: 'POST', body: JSON.stringify({ exitPhoto: photoUrl, ...logoutDetails }) });
  },

  requestKeyBorrow: async (siteId: string, logData: Omit<KeyLog, 'id' | 'borrowTime'>) => {
    const photoUrl = await imageService.uploadEvidence(logData.borrowPhoto);
    return await apiService.request('/keys/request', { method: 'POST', body: JSON.stringify({ ...logData, borrowPhoto: photoUrl, siteId }) });
  },

  authorizeKeyBorrow: async (siteId: string) => apiService.request(`/keys/authorize/${siteId}`, { method: 'POST' }),
  confirmKeyBorrow: async (siteId: string) => apiService.request(`/keys/confirm/${siteId}`, { method: 'POST' }),
  returnKey: async (siteId: string, returnPhoto: string) => {
    const photoUrl = await imageService.uploadEvidence(returnPhoto);
    return await apiService.request(`/keys/return/${siteId}`, { method: 'POST', body: JSON.stringify({ returnPhoto: photoUrl }) });
  },

  getMessages: async (vendorId: string): Promise<ChatMessage[]> => apiService.request<ChatMessage[]>(`/messages/${vendorId}`),
  getAllMessages: async (): Promise<ChatMessage[]> => apiService.request<ChatMessage[]>('/messages'),
  sendMessage: async (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    // Explicitly handle vendor_id naming to prevent backend rejection
    const payload = { ...msg, vendor_id: msg.vendorId };
    return apiService.request('/messages', { method: 'POST', body: JSON.stringify(payload) });
  },
  markMessagesAsRead: async (vendorId: string) => apiService.request(`/messages/read/${vendorId}`, { method: 'PATCH' }),

  loginVendor: async (username: string, password?: string): Promise<VendorProfile | null> => apiService.request<VendorProfile | null>('/auth/vendor/login', {
    method: 'POST', body: JSON.stringify({ username, password }),
  }),
  registerVendor: async (vendor: VendorProfile): Promise<VendorProfile> => {
    if (vendor.photo?.startsWith('data:image')) vendor.photo = await imageService.uploadEvidence(vendor.photo);
    return await apiService.request<VendorProfile>('/auth/vendor/register', { method: 'POST', body: JSON.stringify(vendor) });
  },

  getActiveVendor: (): VendorProfile | null => storageService.getActiveVendor(),
  logoutVendor: () => storageService.logoutVendor(),
  ping: async () => { try { const r = await fetch(`${API_BASE_URL}/health`); return r.ok; } catch { return false; } },
  getMaterials: async (): Promise<MaterialItem[]> => apiService.request<MaterialItem[]>('/inventory'),
  getOfficers: async (): Promise<FieldOfficer[]> => apiService.request<FieldOfficer[]>('/officers'),
};
