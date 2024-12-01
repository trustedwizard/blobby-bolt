interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  particleCount: number;
  stateUpdates: number;
  renderTime: number;
  objectsRendered: number;
  memoryUsage: number;
  renderStart?: number;
}

export const PerformanceMonitor = {
  metrics: {
    fps: 0,
    frameTime: 0,
    particleCount: 0,
    stateUpdates: 0,
    renderTime: 0,
    objectsRendered: 0,
    memoryUsage: 0,
    renderStart: 0
  } as PerformanceMetrics,

  frameStart: 0,
  frameCount: 0,
  lastFPSUpdate: 0,
  FPS_UPDATE_INTERVAL: 1000,

  startFrame() {
    this.frameStart = performance.now();
    this.frameCount++;

    // Only try to access memory if it's available (Chrome only)
    const memory = (performance as any).memory;
    if (memory) {
      this.metrics.memoryUsage = memory.usedJSHeapSize / 1048576; // MB
    }
  },

  endFrame() {
    const frameTime = performance.now() - this.frameStart;
    this.metrics.frameTime = frameTime;

    // Update FPS every second
    if (performance.now() - this.lastFPSUpdate > this.FPS_UPDATE_INTERVAL) {
      this.metrics.fps = (this.frameCount * 1000) / (performance.now() - this.lastFPSUpdate);
      this.frameCount = 0;
      this.lastFPSUpdate = performance.now();
    }
  },

  startRender() {
    this.metrics.renderStart = performance.now();
  },

  endRender() {
    if (this.metrics.renderStart) {
      this.metrics.renderTime = performance.now() - this.metrics.renderStart;
    }
  },

  updateObjectCount(count: number) {
    this.metrics.objectsRendered = count;
  },

  logMetrics() {
    if (process.env.NODE_ENV === 'development') {
      console.log('Performance Metrics:', {
        ...this.metrics,
        averageFrameTime: this.metrics.frameTime.toFixed(2) + 'ms',
        fps: this.metrics.fps.toFixed(1),
        memory: this.metrics.memoryUsage.toFixed(1) + 'MB'
      });
    }
  }
}; 