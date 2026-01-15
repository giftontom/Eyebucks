/**
 * Data Export Utility
 *
 * Provides functions to export/import localStorage data for:
 * - Debugging
 * - Data backup
 * - Migration to database
 */

interface ExportData {
  exportedAt: string;
  version: string;
  data: {
    enrollments: any[];
    progress: { [key: string]: any };
    sessions: any[];
  };
}

/**
 * Export all Eyebuckz localStorage data to JSON
 */
export const exportLocalStorageData = (): string => {
  const enrollments = localStorage.getItem('eyebuckz_enrollments');
  const sessions = localStorage.getItem('eyebuckz_sessions');

  // Get all progress keys
  const progressData: { [key: string]: any } = {};
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('eyebuckz_progress_')) {
      const data = localStorage.getItem(key);
      if (data) {
        progressData[key] = JSON.parse(data);
      }
    }
  });

  const exportData: ExportData = {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    data: {
      enrollments: enrollments ? JSON.parse(enrollments) : [],
      progress: progressData,
      sessions: sessions ? JSON.parse(sessions) : []
    }
  };

  return JSON.stringify(exportData, null, 2);
};

/**
 * Download localStorage data as JSON file
 */
export const downloadLocalStorageData = (): void => {
  const data = exportLocalStorageData();
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `eyebuckz-data-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  console.log('[DataExport] Downloaded localStorage data');
};

/**
 * Import localStorage data from JSON string
 */
export const importLocalStorageData = (jsonString: string): boolean => {
  try {
    const importData: ExportData = JSON.parse(jsonString);

    // Validate data structure
    if (!importData.data || !importData.version) {
      throw new Error('Invalid data format');
    }

    // Import enrollments
    if (importData.data.enrollments) {
      localStorage.setItem(
        'eyebuckz_enrollments',
        JSON.stringify(importData.data.enrollments)
      );
    }

    // Import progress
    if (importData.data.progress) {
      Object.entries(importData.data.progress).forEach(([key, value]) => {
        localStorage.setItem(key, JSON.stringify(value));
      });
    }

    // Import sessions
    if (importData.data.sessions) {
      localStorage.setItem(
        'eyebuckz_sessions',
        JSON.stringify(importData.data.sessions)
      );
    }

    console.log('[DataExport] Imported localStorage data successfully');
    return true;
  } catch (error) {
    console.error('[DataExport] Import failed:', error);
    return false;
  }
};

/**
 * Upload and import data from file
 */
export const uploadAndImportData = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        resolve(false);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        const success = importLocalStorageData(content);
        resolve(success);
      };
      reader.onerror = () => resolve(false);
      reader.readAsText(file);
    };

    input.click();
  });
};

/**
 * Clear all Eyebuckz localStorage data
 */
export const clearAllData = (): void => {
  const confirmed = window.confirm(
    'Are you sure you want to clear all data? This cannot be undone.'
  );

  if (!confirmed) return;

  // Clear enrollments
  localStorage.removeItem('eyebuckz_enrollments');

  // Clear sessions
  localStorage.removeItem('eyebuckz_sessions');

  // Clear all progress
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('eyebuckz_progress_')) {
      localStorage.removeItem(key);
    }
  });

  console.log('[DataExport] Cleared all localStorage data');
  window.location.reload();
};

/**
 * Get storage statistics
 */
export const getStorageStats = () => {
  const enrollments = localStorage.getItem('eyebuckz_enrollments');
  const sessions = localStorage.getItem('eyebuckz_sessions');

  let progressCount = 0;
  let progressSize = 0;

  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('eyebuckz_progress_')) {
      progressCount++;
      const data = localStorage.getItem(key);
      if (data) {
        progressSize += new Blob([data]).size;
      }
    }
  });

  const enrollmentsSize = enrollments ? new Blob([enrollments]).size : 0;
  const sessionsSize = sessions ? new Blob([sessions]).size : 0;
  const totalSize = enrollmentsSize + sessionsSize + progressSize;

  return {
    enrollments: {
      count: enrollments ? JSON.parse(enrollments).length : 0,
      size: enrollmentsSize
    },
    sessions: {
      count: sessions ? JSON.parse(sessions).length : 0,
      size: sessionsSize
    },
    progress: {
      count: progressCount,
      size: progressSize
    },
    total: {
      size: totalSize,
      sizeFormatted: formatBytes(totalSize)
    }
  };
};

/**
 * Format bytes to human-readable string
 */
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

// Expose functions to window for console access
if (typeof window !== 'undefined') {
  (window as any).eyebuckzDataTools = {
    export: exportLocalStorageData,
    download: downloadLocalStorageData,
    import: importLocalStorageData,
    upload: uploadAndImportData,
    clear: clearAllData,
    stats: getStorageStats
  };

  console.log(
    '%c📊 Eyebuckz Data Tools',
    'color: #ef4444; font-size: 16px; font-weight: bold;',
    '\n\nAvailable commands:',
    '\n- window.eyebuckzDataTools.export() - Export data as JSON string',
    '\n- window.eyebuckzDataTools.download() - Download data as file',
    '\n- window.eyebuckzDataTools.upload() - Upload and import data file',
    '\n- window.eyebuckzDataTools.clear() - Clear all data',
    '\n- window.eyebuckzDataTools.stats() - View storage statistics'
  );
}
