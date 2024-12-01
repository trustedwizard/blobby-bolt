import { MemoryManager } from '../systems/MemoryManager';
import { ObjectPool } from './objectPool';

interface PoolMetrics {
  totalObjects: number;
  activeObjects: number;
  memoryUsage: number;
}

export class MemoryAwarePool<T> {
  private pool: ObjectPool<T>;
  private memoryManager: MemoryManager;
  private baseSize: number;
  private maxSize: number;
  private readonly MIN_SIZE: number;
  private readonly memoryThreshold = 800 * 1024 * 1024; // 800MB
  private metrics: PoolMetrics = {
    totalObjects: 0,
    activeObjects: 0,
    memoryUsage: 0
  };

  constructor(
    createFn: () => T,
    resetFn: (obj: T) => void,
    baseSize: number,
    maxSize: number,
    minSize: number
  ) {
    this.memoryManager = MemoryManager.getInstance();
    this.baseSize = baseSize;
    this.maxSize = maxSize;
    this.MIN_SIZE = minSize;

    // Initialize pool with calculated size
    const initialSize = this.calculatePoolSize();
    this.pool = new ObjectPool<T>(
      () => {
        this.metrics.totalObjects++;
        return createFn();
      },
      (obj: T) => {
        this.metrics.activeObjects--;
        resetFn(obj);
      },
      initialSize,
      this.calculateMaxPoolSize()
    );

    // Start monitoring
    this.startMemoryMonitoring();
  }

  private calculatePoolSize(): number {
    const memoryUsage = this.getMemoryUsage();
    const memoryRatio = memoryUsage / this.memoryThreshold;
    const adjustedSize = Math.floor(this.baseSize * (1 - memoryRatio));
    return Math.max(this.MIN_SIZE, adjustedSize);
  }

  private calculateMaxPoolSize(): number {
    const memoryUsage = this.getMemoryUsage();
    const memoryRatio = memoryUsage / this.memoryThreshold;
    const adjustedMax = Math.floor(this.maxSize * (1 - memoryRatio));
    return Math.max(this.MIN_SIZE * 2, adjustedMax);
  }

  private getMemoryUsage(): number {
    const memory = (performance as any).memory;
    return memory?.usedJSHeapSize || 0;
  }

  public acquire(): T {
    this.metrics.activeObjects++;
    const memoryUsage = this.getMemoryUsage();
    
    if (memoryUsage > this.memoryThreshold) {
      this.resize();
    }
    
    const obj = this.pool.acquire();
    this.updateMetrics();
    return obj;
  }

  public release(obj: T): void {
    this.pool.release(obj);
    this.updateMetrics();
  }

  private resize(): void {
    const newSize = this.calculatePoolSize();
    const newMax = this.calculateMaxPoolSize();
    
    // Create new pool with adjusted sizes
    const tempPool = new ObjectPool<T>(
      this.pool['createFn'],
      this.pool['resetFn'],
      newSize,
      newMax
    );
    
    // Replace old pool
    this.pool = tempPool;
    this.updateMetrics();
  }

  private startMemoryMonitoring(): void {
    setInterval(() => {
      this.updateMetrics();
      this.checkMemoryPressure();
    }, 5000); // Check every 5 seconds
  }

  private checkMemoryPressure(): void {
    const memoryUsage = this.getMemoryUsage();
    if (memoryUsage > this.memoryThreshold * 0.9) { // 90% of threshold
      this.handleHighMemoryPressure();
    }
  }

  private handleHighMemoryPressure(): void {
    // Aggressive cleanup
    this.resize();
    this.pool.clear();
    this.metrics.activeObjects = 0;
    this.metrics.totalObjects = 0;
  }

  private updateMetrics(): void {
    this.metrics.memoryUsage = this.getMemoryUsage();
    // Emit metrics for monitoring
    if (process.env.NODE_ENV === 'development') {
      console.debug('Memory Pool Metrics:', {
        ...this.metrics,
        memoryUsageMB: Math.round(this.metrics.memoryUsage / 1024 / 1024),
        poolSize: this.calculatePoolSize(),
        maxPoolSize: this.calculateMaxPoolSize()
      });
    }
  }

  public getMetrics(): PoolMetrics {
    return { ...this.metrics };
  }

  public clear(): void {
    this.pool.clear();
    this.metrics.activeObjects = 0;
    this.metrics.totalObjects = 0;
    this.updateMetrics();
  }
} 