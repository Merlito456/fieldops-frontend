
import { MOCK_MATERIALS, MOCK_TASKS, MOCK_OFFICERS, MOCK_SITES } from '../constants';
import { MaterialItem, WorkTask, FieldOfficer, WorkSite, SiteVisitor, KeyLog, VendorProfile } from '../types';

const KEYS = {
  MATERIALS: 'fo_materials_v2',
  TASKS: 'fo_tasks_v2',
  OFFICERS: 'fo_officers_v2',
  SITES: 'fo_sites_v2',
  VENDORS: 'fo_vendors_v2',
  ACTIVE_VENDOR_ID: 'fo_active_vendor_id',
  FO_NAME: 'fo_identity_name',
  FO_PASSWORD: 'fo_identity_password'
};

const DEFAULT_FO_NAME = 'Engr. John Carlo Rabanes, ECE';
const DEFAULT_FO_PASSWORD = 'admin123';

export const storageService = {
  init: () => {
    if (!localStorage.getItem(KEYS.MATERIALS)) {
      localStorage.setItem(KEYS.MATERIALS, JSON.stringify(MOCK_MATERIALS));
    }
    if (!localStorage.getItem(KEYS.TASKS)) {
      localStorage.setItem(KEYS.TASKS, JSON.stringify(MOCK_TASKS));
    }
    if (!localStorage.getItem(KEYS.OFFICERS)) {
      localStorage.setItem(KEYS.OFFICERS, JSON.stringify(MOCK_OFFICERS));
    }
    if (!localStorage.getItem(KEYS.SITES)) {
      localStorage.setItem(KEYS.SITES, JSON.stringify(MOCK_SITES));
    }
    if (!localStorage.getItem(KEYS.VENDORS)) {
      localStorage.setItem(KEYS.VENDORS, JSON.stringify([]));
    }
    if (!localStorage.getItem(KEYS.FO_NAME)) {
      localStorage.setItem(KEYS.FO_NAME, DEFAULT_FO_NAME);
    }
    if (!localStorage.getItem(KEYS.FO_PASSWORD)) {
      localStorage.setItem(KEYS.FO_PASSWORD, DEFAULT_FO_PASSWORD);
    }
  },

  // FO Identity Management
  getFOName: (): string => {
    return localStorage.getItem(KEYS.FO_NAME) || DEFAULT_FO_NAME;
  },
  saveFOName: (name: string) => {
    localStorage.setItem(KEYS.FO_NAME, name);
  },
  getFOPassword: (): string => {
    return localStorage.getItem(KEYS.FO_PASSWORD) || DEFAULT_FO_PASSWORD;
  },
  saveFOPassword: (password: string) => {
    localStorage.setItem(KEYS.FO_PASSWORD, password);
  },

  // Vendor Profile Methods
  registerVendor: (vendor: VendorProfile) => {
    const vendors = storageService.getVendors();
    const updated = [...vendors, vendor];
    localStorage.setItem(KEYS.VENDORS, JSON.stringify(updated));
    localStorage.setItem(KEYS.ACTIVE_VENDOR_ID, vendor.id);
    return vendor;
  },

  getVendors: (): VendorProfile[] => {
    const data = localStorage.getItem(KEYS.VENDORS);
    return data ? JSON.parse(data) : [];
  },

  updateVendor: (updatedVendor: VendorProfile) => {
    const vendors = storageService.getVendors();
    const updated = vendors.map(v => v.id === updatedVendor.id ? updatedVendor : v);
    localStorage.setItem(KEYS.VENDORS, JSON.stringify(updated));
    return updatedVendor;
  },

  getActiveVendor: (): VendorProfile | null => {
    const activeId = localStorage.getItem(KEYS.ACTIVE_VENDOR_ID);
    if (!activeId) return null;
    const vendors = storageService.getVendors();
    return vendors.find(v => v.id === activeId) || null;
  },

  loginVendor: (username: string, password?: string): VendorProfile | null => {
    const vendors = storageService.getVendors();
    const found = vendors.find(v => v.username === username && v.password === password);
    if (found) {
      localStorage.setItem(KEYS.ACTIVE_VENDOR_ID, found.id);
      return found;
    }
    return null;
  },

  logoutVendor: () => {
    localStorage.removeItem(KEYS.ACTIVE_VENDOR_ID);
  },

  getMaterials: (): MaterialItem[] => {
    const data = localStorage.getItem(KEYS.MATERIALS);
    return data ? JSON.parse(data) : MOCK_MATERIALS;
  },

  saveMaterials: (materials: MaterialItem[]) => {
    localStorage.setItem(KEYS.MATERIALS, JSON.stringify(materials));
  },

  getTasks: (): WorkTask[] => {
    const data = localStorage.getItem(KEYS.TASKS);
    return data ? JSON.parse(data) : MOCK_TASKS;
  },

  saveTasks: (tasks: WorkTask[]) => {
    localStorage.setItem(KEYS.TASKS, JSON.stringify(tasks));
  },

  getOfficers: (): FieldOfficer[] => {
    const data = localStorage.getItem(KEYS.OFFICERS);
    return data ? JSON.parse(data) : MOCK_OFFICERS;
  },

  getSites: (): WorkSite[] => {
    const data = localStorage.getItem(KEYS.SITES);
    return data ? JSON.parse(data) : MOCK_SITES;
  },

  saveSites: (sites: WorkSite[]) => {
    localStorage.setItem(KEYS.SITES, JSON.stringify(sites));
  },

  addSite: (site: WorkSite) => {
    const sites = storageService.getSites();
    const updated = [site, ...sites];
    storageService.saveSites(updated);
    return updated;
  },

  updateSite: (updatedSite: WorkSite) => {
    const sites = storageService.getSites();
    const updated = sites.map(s => s.id === updatedSite.id ? updatedSite : s);
    storageService.saveSites(updated);
    return updated;
  },

  deleteSite: (id: string) => {
    const sites = storageService.getSites();
    const updated = sites.filter(s => s.id !== id);
    storageService.saveSites(updated);
    return updated;
  },

  requestAccess: (siteId: string, visitorData: Omit<SiteVisitor, 'id' | 'checkInTime'>) => {
    const sites = storageService.getSites();
    const pendingVisitor: SiteVisitor = {
      ...visitorData,
      id: `REQ-${Date.now()}`,
      checkInTime: new Date().toISOString()
    };
    
    const updated = sites.map(s => {
      if (s.id === siteId) {
        return { ...s, pendingVisitor, accessAuthorized: false };
      }
      return s;
    });
    
    storageService.saveSites(updated);
    return updated;
  },

  authorizeAccess: (siteId: string) => {
    const sites = storageService.getSites();
    const updated = sites.map(s => {
      if (s.id === siteId) {
        return { ...s, accessAuthorized: true };
      }
      return s;
    });
    storageService.saveSites(updated);
    return updated;
  },

  cancelAccessRequest: (siteId: string) => {
    const sites = storageService.getSites();
    const updated = sites.map(s => {
      if (s.id === siteId) {
        return { ...s, pendingVisitor: undefined, accessAuthorized: false };
      }
      return s;
    });
    storageService.saveSites(updated);
    return updated;
  },

  checkInVendor: (siteId: string, visitorData: Omit<SiteVisitor, 'id' | 'checkInTime'>) => {
    const sites = storageService.getSites();
    const newVisitor: SiteVisitor = {
      ...visitorData,
      id: `VIS-${Date.now()}`,
      checkInTime: new Date().toISOString()
    };
    
    const updated = sites.map(s => {
      if (s.id === siteId) {
        return { ...s, currentVisitor: newVisitor, pendingVisitor: undefined, accessAuthorized: false };
      }
      return s;
    });
    
    storageService.saveSites(updated);
    return updated;
  },

  checkOutVendor: (siteId: string, exitPhoto: string, rocLogoutData?: { name: string, time: string }) => {
    const sites = storageService.getSites();
    const updated = sites.map(s => {
      if (s.id === siteId && s.currentVisitor) {
        const history = s.visitorHistory || [];
        const finishedVisitor = { 
          ...s.currentVisitor, 
          exitPhoto, 
          rocLogoutName: rocLogoutData?.name,
          rocLogoutTime: rocLogoutData?.time,
          checkOutTime: new Date().toISOString() 
        };
        return { 
          ...s, 
          currentVisitor: undefined, 
          visitorHistory: [finishedVisitor, ...history].slice(0, 10) 
        };
      }
      return s;
    });
    
    storageService.saveSites(updated);
    return updated;
  },

  requestKeyBorrow: (siteId: string, logData: Omit<KeyLog, 'id' | 'borrowTime'>) => {
    const sites = storageService.getSites();
    const newLog: KeyLog = {
      ...logData,
      id: `KEYREQ-${Date.now()}`,
      borrowTime: new Date().toISOString()
    };

    const updated = sites.map((s): WorkSite => {
      if (s.id === siteId) {
        return { ...s, pendingKeyLog: newLog, keyAccessAuthorized: false };
      }
      return s;
    });

    storageService.saveSites(updated);
    return updated;
  },

  authorizeKeyBorrow: (siteId: string) => {
    const sites = storageService.getSites();
    const updated = sites.map(s => {
      if (s.id === siteId) {
        return { ...s, keyAccessAuthorized: true };
      }
      return s;
    });
    storageService.saveSites(updated);
    return updated;
  },

  cancelKeyBorrowRequest: (siteId: string) => {
    const sites = storageService.getSites();
    const updated = sites.map(s => {
      if (s.id === siteId) {
        return { ...s, pendingKeyLog: undefined, keyAccessAuthorized: false };
      }
      return s;
    });
    storageService.saveSites(updated);
    return updated;
  },

  confirmKeyBorrow: (siteId: string) => {
    const sites = storageService.getSites();
    const updated = sites.map((s): WorkSite => {
      if (s.id === siteId && s.pendingKeyLog) {
        return { 
          ...s, 
          keyStatus: 'Borrowed' as const, 
          currentKeyLog: { ...s.pendingKeyLog, id: `KEY-${Date.now()}` },
          pendingKeyLog: undefined,
          keyAccessAuthorized: false
        };
      }
      return s;
    });

    storageService.saveSites(updated);
    return updated;
  },

  returnKey: (siteId: string, returnPhoto: string) => {
    const sites = storageService.getSites();
    const updated = sites.map((s): WorkSite => {
      if (s.id === siteId && s.currentKeyLog) {
        const history = s.keyHistory || [];
        const finishedLog = { ...s.currentKeyLog, returnTime: new Date().toISOString(), returnPhoto };
        return { 
          ...s, 
          keyStatus: 'Available' as const, 
          currentKeyLog: undefined, 
          keyHistory: [finishedLog, ...history].slice(0, 10) 
        };
      }
      return s;
    });

    storageService.saveSites(updated);
    return updated;
  }
};
