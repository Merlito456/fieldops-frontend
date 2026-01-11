
import { WorkTask, WorkSite } from '../types';

export interface OperationalInsight {
  type: 'RISK' | 'LOGISTICS' | 'EFFICIENCY' | 'SAFETY';
  message: string;
  severity: 'low' | 'medium' | 'high';
}

/**
 * EXPERT SYSTEM LOGIC ENGINE
 * Provides "Free AI" intelligence locally by analyzing data patterns
 * without requiring cloud API credits.
 */
export const logicEngine = {
  analyzeOperations: (tasks: WorkTask[], sites: WorkSite[]): OperationalInsight[] => {
    const insights: OperationalInsight[] = [];

    // 1. Logistics Analysis: Site Concentration
    const siteTaskCounts = tasks.reduce((acc, task) => {
      acc[task.siteId] = (acc[task.siteId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(siteTaskCounts).forEach(([siteId, count]) => {
      if (count > 2) {
        const siteName = sites.find(s => s.id === siteId)?.name || siteId;
        insights.push({
          type: 'LOGISTICS',
          message: `Heavy activity at ${siteName} (${count} tasks). Suggest consolidating toolkits for one-trip resolution.`,
          severity: 'medium'
        });
      }
    });

    // 2. Risk Analysis: Priority Alignment
    const criticalTasks = tasks.filter(t => t.priority === 'Critical' && t.status !== 'Completed');
    if (criticalTasks.length > 1) {
      insights.push({
        type: 'RISK',
        message: `${criticalTasks.length} Critical missions are currently active. Risk of resource fragmentation detected.`,
        severity: 'high'
      });
    }

    // 3. Safety Analysis: Keyword Scanning
    tasks.forEach(task => {
      const desc = task.description.toLowerCase();
      if (desc.includes('climbing') || desc.includes('tower') || desc.includes('height')) {
        insights.push({
          type: 'SAFETY',
          message: `Height work detected in "${task.title}". Mandatory 2-man rule and harness check suggested.`,
          severity: 'high'
        });
      }
      if (desc.includes('fiber') || desc.includes('splice') || desc.includes('optical')) {
        insights.push({
          type: 'EFFICIENCY',
          message: `Optical work mission: Ensure OTDR and fusion splicer calibration is verified before deployment.`,
          severity: 'low'
        });
      }
    });

    // 4. Maintenance Forecasting
    sites.forEach(site => {
      // Fix: Added check to ensure nextMaintenanceDate exists before parsing
      if (site.nextMaintenanceDate) {
        const nextDate = new Date(site.nextMaintenanceDate);
        const today = new Date();
        const diffDays = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays < 7 && diffDays > 0) {
          insights.push({
            type: 'EFFICIENCY',
            message: `Maintenance window for ${site.name} opens in ${diffDays} days. Pre-allocate materials now.`,
            severity: 'medium'
          });
        }
      }
    });

    return insights.length > 0 ? insights : [{
      type: 'EFFICIENCY',
      message: 'Operational flow is optimal. No immediate bottlenecks detected by local logic.',
      severity: 'low'
    }];
  }
};
