import { BaseSystem } from './BaseSystem';

interface GPUInfo {
  renderer: string;
  vendor: string;
}

export class QualityManager extends BaseSystem {
  protected static override instance: QualityManager;
  private quality: 'low' | 'medium' | 'high' = 'high';
  private fps: number[] = [];
  private lastCheck = Date.now();
  private checkInterval = 1000;

  private constructor() {
    super();
    this.detectInitialQuality();
  }

  public static override getInstance(): QualityManager {
    if (!QualityManager.instance) {
      QualityManager.instance = new QualityManager();
    }
    return QualityManager.instance;
  }

  private detectInitialQuality() {
    const gpu = this.getGPUTier();
    const memory = this.getAvailableMemory();
    
    if (gpu === 'low' || memory === 'low') {
      this.quality = 'low';
    } else if (gpu === 'medium' || memory === 'medium') {
      this.quality = 'medium';
    }
  }

  private getGPUTier(): 'low' | 'medium' | 'high' {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) return 'low';

      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (!debugInfo) return 'medium';

      const gpuInfo: GPUInfo = {
        renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase(),
        vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL).toLowerCase()
      };
      
      if (gpuInfo.vendor.includes('intel')) return 'low';
      if (gpuInfo.renderer.includes('nvidia') || gpuInfo.renderer.includes('amd')) return 'high';
      return 'medium';
    } catch (error) {
      console.warn('Error detecting GPU tier:', error);
      return 'medium';
    }
  }

  private getAvailableMemory(): 'low' | 'medium' | 'high' {
    try {
      // Use performance.memory if available (Chrome only)
      const memory = (performance as any).memory?.jsHeapSizeLimit;
      if (!memory) return 'medium';
      
      const memoryGB = memory / (1024 * 1024 * 1024);
      if (memoryGB < 2) return 'low';
      if (memoryGB < 4) return 'medium';
      return 'high';
    } catch (error) {
      console.warn('Error detecting memory:', error);
      return 'medium';
    }
  }

  updateFPS(fps: number) {
    this.fps.push(fps);
    
    const now = Date.now();
    if (now - this.lastCheck > this.checkInterval) {
      this.adjustQuality();
      this.fps = [];
      this.lastCheck = now;
    }
  }

  private adjustQuality() {
    const avgFPS = this.fps.reduce((a, b) => a + b, 0) / this.fps.length;
    
    if (avgFPS < 30 && this.quality !== 'low') {
      this.quality = 'low';
      this.applyQualitySettings();
    } else if (avgFPS > 55 && this.quality === 'low') {
      this.quality = 'medium';
      this.applyQualitySettings();
    } else if (avgFPS > 58 && this.quality === 'medium') {
      this.quality = 'high';
      this.applyQualitySettings();
    }
  }

  getQualitySettings() {
    switch (this.quality) {
      case 'low':
        return {
          particleCount: 4,
          trailLength: 5,
          shadowQuality: false,
          antialiasing: false,
          effectDetail: 'low' as const
        };
      case 'medium':
        return {
          particleCount: 8,
          trailLength: 10,
          shadowQuality: true,
          antialiasing: true,
          effectDetail: 'medium' as const
        };
      case 'high':
        return {
          particleCount: 12,
          trailLength: 20,
          shadowQuality: true,
          antialiasing: true,
          effectDetail: 'high' as const
        };
    }
  }

  private applyQualitySettings() {
    const settings = this.getQualitySettings();
    const event = new CustomEvent('quality-changed', { 
      detail: settings 
    });
    document.dispatchEvent(event);
  }

  protected override cleanupResources(): void {
    this.quality = 'high';
    this.fps = [];
    this.lastCheck = Date.now();
  }
} 