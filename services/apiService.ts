
import { MaterialItem, WorkTask, FieldOfficer, WorkSite, SiteVisitor, KeyLog, VendorProfile } from '../types';
import { imageService } from './imageService';
import { storageService } from './storageService';

/**
 * FIELDOPS PRO: API BRIDGE
 * Points to your Render backend: https://fieldops-backend-4i46.onrender.com
 */
const RENDER_URL = 'https://fieldops-backend-4i46.onrender.com/api';
// @ts-ignore
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || RENDER_URL;

export const apiService = {
  
  // Track connection state globally for the UI badge
  isOffline: false,

  async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      this.isOffline = false;
      return await response.json();
    } catch (error: any) {
      this.isOffline = true;
      console.group(`🔴 API BRIDGE FAILURE: ${endpoint}`);
      console.error(`Reason: ${error.message}`);
      console.warn('Action: Falling back to Local Ledger (Browser Storage)');
      console.groupEnd();
      
      const method = options?.method || 'GET';
      const body = options?.body ? JSON.parse(options.body as string) : null;

      // AUTHENTICATION FALLBACK
      if (endpoint.includes('/auth/vendor')) {
        if (endpoint.includes('register')) return storageService.registerVendor(body) as any;
        if (endpoint.includes('login')) return storageService.loginVendor(body.username, body.password) as any;
      }

      // ASSET MANAGEMENT FALLBACK
      if (endpoint.startsWith('/sites')) {
        if (method === 'POST') return storageService.addSite(body) as any;
        if (method === 'PUT') return storageService.updateSite(body) as any;
        return storageService.getSites() as any;
      }

      // ACCESS LOGS FALLBACK
      if (endpoint.startsWith('/access')) {
        const parts = endpoint.split('/');
        const siteId = parts.pop();
        if (endpoint.includes('request')) return storageService.requestAccess(body.siteId, body) as any;
        if (endpoint.includes('authorize')) return storageService.authorizeAccess(siteId!) as any;
        if (endpoint.includes('cancel')) return storageService.cancelAccessRequest(siteId!) as any;
        if (endpoint.includes('checkin')) return storageService.checkInVendor(siteId!, body) as any;
        if (endpoint.includes('checkout')) return storageService.checkOutVendor(siteId!, body.exitPhoto, body) as any;
      }

      // KEY LOGS FALLBACK
      if (endpoint.startsWith('/keys')) {
        const parts = endpoint.split('/');
        const siteId = parts.pop();
        if (endpoint.includes('request')) return storageService.requestKeyBorrow(body.siteId, body) as any;
        if (endpoint.includes('authorize')) return storageService.authorizeKeyBorrow(siteId!) as any;
        if (endpoint.includes('cancel')) return storageService.cancelKeyBorrowRequest(siteId!) as any;
        if (endpoint.includes('confirm')) return storageService.confirmKeyBorrow(siteId!) as any;
        if (endpoint.includes('return')) return storageService.returnKey(siteId!, body.returnPhoto) as any;
      }

      // GENERIC GETTERS
      if (endpoint.startsWith('/tasks')) return storageService.getTasks() as any;
      if (endpoint.startsWith('/inventory')) return storageService.getMaterials() as any;
      if (endpoint.startsWith('/officers')) return storageService.getOfficers() as any;

      return [] as any;
    }
  },

  ping: async (): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE_URL}/health`);
      return res.ok;
    } catch {
      return false;
    }
  },

  getSites: async (): Promise<WorkSite[]> => apiService.request<WorkSite[]>('/sites'),

  addSite: async (site: WorkSite): Promise<WorkSite> => {
    if (site.assetPhoto && site.assetPhoto.startsWith('data:image')) {
      site.assetPhoto = await imageService.uploadEvidence(site.assetPhoto);
    }
    return await apiService.request<WorkSite>('/sites', {
      method: 'POST',
      body: JSON.stringify(site),
    });
  },

  updateSite: async (site: WorkSite): Promise<WorkSite> => {
    if (site.assetPhoto && site.assetPhoto.startsWith('data:image')) {
      site.assetPhoto = await imageService.uploadEvidence(site.assetPhoto);
    }
    return await apiService.request<WorkSite>(`/sites/${site.id}`, {
      method: 'PUT',
      body: JSON.stringify(site),
    });
  },

  requestAccess: async (siteId: string, visitorData: Omit<SiteVisitor, 'id' | 'checkInTime'>) => {
    let photoUrl = visitorData.photo;
    if (visitorData.photo && visitorData.photo.startsWith('data:image')) {
      photoUrl = await imageService.uploadEvidence(visitorData.photo);
    }
    const payload = { ...visitorData, photo: photoUrl, siteId };
    return await apiService.request('/access/request', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  authorizeAccess: async (siteId: string) => apiService.request(`/access/authorize/${siteId}`, { method: 'POST' }),

  cancelAccessRequest: async (siteId: string) => apiService.request(`/access/cancel/${siteId}`, { method: 'POST' }),

  checkInVendor: async (siteId: string, visitor: SiteVisitor) => apiService.request(`/access/checkin/${siteId}`, {
    method: 'POST',
    body: JSON.stringify(visitor),
  }),

  checkOutVendor: async (siteId: string, exitPhoto: string, rocLogoutData: { name: string, time: string }) => {
    const photoUrl = await imageService.uploadEvidence(exitPhoto);
    return await apiService.request(`/access/checkout/${siteId}`, {
      method: 'POST',
      body: JSON.stringify({ exitPhoto: photoUrl, ...rocLogoutData }),
    });
  },

  requestKeyBorrow: async (siteId: string, logData: Omit<KeyLog, 'id' | 'borrowTime'>) => {
    const photoUrl = await imageService.uploadEvidence(logData.borrowPhoto);
    const payload = { ...logData, borrowPhoto: photoUrl, siteId };
    return await apiService.request('/keys/request', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  authorizeKeyBorrow: async (siteId: string) => apiService.request(`/keys/authorize/${siteId}`, { method: 'POST' }),

  cancelKeyBorrowRequest: async (siteId: string) => apiService.request(`/keys/cancel/${siteId}`, { method: 'POST' }),

  confirmKeyBorrow: async (siteId: string) => apiService.request(`/keys/confirm/${siteId}`, { method: 'POST' }),

  returnKey: async (siteId: string, returnPhoto: string) => {
    const photoUrl = await imageService.uploadEvidence(returnPhoto);
    return await apiService.request(`/keys/return/${siteId}`, {
      method: 'POST',
      body: JSON.stringify({ returnPhoto: photoUrl }),
    });
  },

  loginVendor: async (username: string, password?: string): Promise<VendorProfile | null> => apiService.request<VendorProfile | null>('/auth/vendor/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  }),

  registerVendor: async (vendor: VendorProfile): Promise<VendorProfile> => {
    if (vendor.photo && vendor.photo.startsWith('data:image')) {
      vendor.photo = await imageService.uploadEvidence(vendor.photo);
    }
    return await apiService.request<VendorProfile>('/auth/vendor/register', {
      method: 'POST',
      body: JSON.stringify(vendor),
    });
  },

  getActiveVendor: (): VendorProfile | null => storageService.getActiveVendor(),
  logoutVendor: () => storageService.logoutVendor(),
  getTasks: async (): Promise<WorkTask[]> => apiService.request<WorkTask[]>('/tasks'),
  getMaterials: async (): Promise<MaterialItem[]> => apiService.request<MaterialItem[]>('/inventory'),
  getOfficers: async (): Promise<FieldOfficer[]> => apiService.request<FieldOfficer[]>('/officers'),
};
