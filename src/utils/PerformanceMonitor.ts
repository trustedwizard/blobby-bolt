interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

interface ExtendedPerformance extends Performance {
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private lastTime: number = 0;
  private frames: number = 0;
  private totalTime: number = 0;
  private currentMetrics: PerformanceMetrics = {
    fps: 0,
    frameTime: 0
  };

  private constructor() {
    this.start();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private start(): void {
    this.lastTime = performance.now();
    this.update();
  }

  private update = (): void => {
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    this.frames++;
    this.totalTime += deltaTime;

    if (this.totalTime >= 1000) {
      this.currentMetrics.fps = Math.round((this.frames * 1000) / this.totalTime);
      this.currentMetrics.frameTime = this.totalTime / this.frames;

      // Get memory info if available
      const extendedPerf = performance as ExtendedPerformance;
      if (extendedPerf.memory) {
        this.currentMetrics.memory = {
          usedJSHeapSize: extendedPerf.memory.usedJSHeapSize,
          totalJSHeapSize: extendedPerf.memory.totalJSHeapSize,
          jsHeapSizeLimit: extendedPerf.memory.jsHeapSizeLimit
        };
      }

      this.frames = 0;
      this.totalTime = 0;
    }

    this.lastTime = currentTime;
    requestAnimationFrame(this.update);
  };

  get metrics(): PerformanceMetrics {
    return { ...this.currentMetrics };
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance(); 