import * as PIXI from 'pixi.js';
import { BaseSystem } from './BaseSystem';

interface MemoryThresholds {
  critical: number;
  high: number;
  normal: number;
}

interface MemoryStats {
  heapUsed: number;
  heapTotal: number;
  heapLimit: number;
  nonHeapUsed: number;
}

type CacheRef<T> = { deref: () => T | undefined };

// Define FinalizationRegistry type if not available in the environment
interface FinalizationRegistryType<T> {
  new(callback: (heldValue: T) => void): {
    register(target: object, heldValue: T, unregisterToken?: object): void;
    unregister(unregisterToken: object): void;
  };
}

// Create a fallback registry implementation
class FallbackRegistry<T> {
  private cleanup: (heldValue: T) => void;
  private registrations: Map<object, { value: T, token?: object }>;

  constructor(cleanup: (heldValue: T) => void) {
    this.cleanup = cleanup;
    this.registrations = new Map();
  }

  register(target: object, heldValue: T, unregisterToken?: object): void {
    // Store registration with optional token
    this.registrations.set(target, {
      value: heldValue,
      token: unregisterToken
    });
  }

  unregister(unregisterToken: object): void {
    // Find and remove registration by token
    for (const [target, registration] of this.registrations.entries()) {
      if (registration.token === unregisterToken) {
        this.cleanup(registration.value);
        this.registrations.delete(target);
        break;
      }
    }
  }

  // Add method to clean up all registrations
  clear(): void {
    for (const registration of this.registrations.values()) {
      this.cleanup(registration.value);
    }
    this.registrations.clear();
  }
}

// Use the global FinalizationRegistry if available, otherwise use our fallback
const Registry = (globalThis as any).FinalizationRegistry || FallbackRegistry;

export class MemoryManager extends BaseSystem {
  protected static override instance: MemoryManager;
  private readonly thresholds: MemoryThresholds;
  private readonly CHECK_INTERVAL = 5000;
  private disposableCache: Map<string, CacheRef<any>> = new Map();
  private textureCache: Map<string, CacheRef<PIXI.Texture>> = new Map();
  private registry: InstanceType<FinalizationRegistryType<string>>;
  private lastCleanup: number = 0;
  private cleanupInterval: number | null = null;
  private readonly MAX_TEXTURE_SIZE = 512;
  private readonly CLEANUP_INTERVAL = 30000;
  private readonly MEMORY_LIMIT = 800 * 1024 * 1024;

  private constructor() {
    super();
    this.thresholds = {
      critical: 0.9,
      high: 0.8,
      normal: 0.7
    };

    this.registry = new Registry((key: string) => {
      this.disposableCache.delete(key);
      this.textureCache.delete(key);
    });

    this.startMonitoring();
  }

  public static override getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  private startMonitoring(): void {
    // Clear any existing interval
    if (this.cleanupInterval !== null) {
      clearInterval(this.cleanupInterval);
    }

    // Start new monitoring interval
    this.cleanupInterval = window.setInterval(() => {
      const stats = this.getMemoryStats();
      const usage = stats.heapUsed / stats.heapLimit;

      if (usage > this.thresholds.critical) {
        this.handleCriticalMemory();
      } else if (usage > this.thresholds.high) {
        this.handleHighMemory();
      } else if (usage > this.thresholds.normal) {
        this.handleNormalMemory();
      }

      // Log memory usage in development
      if (process.env.NODE_ENV === 'development') {
        console.debug('Memory Usage:', {
          used: Math.round(stats.heapUsed / 1024 / 1024) + 'MB',
          total: Math.round(stats.heapTotal / 1024 / 1024) + 'MB',
          limit: Math.round(stats.heapLimit / 1024 / 1024) + 'MB',
          usage: Math.round(usage * 100) + '%'
        });
      }
    }, this.CHECK_INTERVAL);
  }

  public getMemoryStats(): MemoryStats {
    const memory = (performance as any).memory || {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: this.MEMORY_LIMIT
    };

    return {
      heapUsed: memory.usedJSHeapSize,
      heapTotal: memory.totalJSHeapSize,
      heapLimit: memory.jsHeapSizeLimit,
      nonHeapUsed: 0 // Not available in browser
    };
  }

  private handleCriticalMemory(): void {
    console.warn('Critical memory usage detected');
    this.forceClearCaches();
    this.requestGarbageCollection();
    this.disableNonEssentialFeatures();
    this.optimizeTextureMemory();
  }

  private handleHighMemory(): void {
    console.warn('High memory usage detected');
    this.clearUnusedCaches();
    this.optimizeTextureMemory();
  }

  private handleNormalMemory(): void {
    this.performRoutineCleanup();
  }

  public cacheObject<T extends object>(key: string, object: T): void {
    const ref = { deref: () => object } as CacheRef<T>;
    this.disposableCache.set(key, ref);
    this.registry.register(object, key);
  }

  public getCachedObject<T>(key: string): T | undefined {
    const ref = this.disposableCache.get(key);
    return ref?.deref();
  }

  public cacheTexture(key: string, texture: PIXI.Texture): void {
    if (texture.width > this.MAX_TEXTURE_SIZE || texture.height > this.MAX_TEXTURE_SIZE) {
      texture = this.scaleDownTexture(texture);
    }
    const ref = { deref: () => texture } as CacheRef<PIXI.Texture>;
    this.textureCache.set(key, ref);
    this.registry.register(texture, key);
  }

  public getCachedTexture(key: string): PIXI.Texture | undefined {
    const ref = this.textureCache.get(key);
    return ref?.deref();
  }

  private clearUnusedCaches(): void {
    // Clear unused textures
    for (const [key, ref] of this.textureCache.entries()) {
      const texture = ref.deref();
      if (!texture || texture.destroyed) {
        this.textureCache.delete(key);
      }
    }

    // Clear unused objects
    for (const [key, ref] of this.disposableCache.entries()) {
      if (!ref.deref()) {
        this.disposableCache.delete(key);
      }
    }
  }

  public forceClearCaches(): void {
    // Clear texture cache
    for (const [, ref] of this.textureCache.entries()) {
      const texture = ref.deref();
      if (texture && !texture.destroyed) {
        texture.destroy(true);
      }
    }
    this.textureCache.clear();

    // Clear object cache
    this.disposableCache.clear();

    // Clear PIXI texture cache
    if (PIXI.utils.TextureCache) {
      Object.keys(PIXI.utils.TextureCache).forEach(key => {
        delete PIXI.utils.TextureCache[key];
      });
    }
  }

  private optimizeTextureMemory(): void {
    for (const [key, ref] of this.textureCache.entries()) {
      const texture = ref.deref();
      if (texture && !texture.destroyed) {
        if (texture.width > this.MAX_TEXTURE_SIZE || texture.height > this.MAX_TEXTURE_SIZE) {
          const scaledTexture = this.scaleDownTexture(texture);
          texture.destroy(true);
          this.cacheTexture(key, scaledTexture);
        }
      }
    }
  }

  private scaleDownTexture(texture: PIXI.Texture): PIXI.Texture {
    const ratio = Math.min(
      this.MAX_TEXTURE_SIZE / texture.width,
      this.MAX_TEXTURE_SIZE / texture.height
    );
    
    const renderer = PIXI.autoDetectRenderer();
    const renderTexture = PIXI.RenderTexture.create({
      width: texture.width * ratio,
      height: texture.height * ratio
    });
    
    const sprite = new PIXI.Sprite(texture);
    sprite.scale.set(ratio);
    
    if (renderer instanceof PIXI.Renderer) {
      renderer.render(sprite, { renderTexture });
    }
    
    sprite.destroy();
    
    return renderTexture;
  }

  private performRoutineCleanup(): void {
    const now = Date.now();
    if (now - this.lastCleanup < this.CLEANUP_INTERVAL) return;
    
    this.lastCleanup = now;
    this.clearUnusedCaches();
  }

  private requestGarbageCollection(): void {
    if (typeof window !== 'undefined' && (window as any).gc) {
      try {
        (window as any).gc();
      } catch (e) {
        console.warn('Manual GC not available');
      }
    }
  }

  private disableNonEssentialFeatures(): void {
    // Reduce texture quality
    PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
    
    // Emit event for other systems to respond
    window.dispatchEvent(new CustomEvent('memory-pressure', {
      detail: { level: 'critical' }
    }));
  }

  protected override cleanupResources(): void {
    if (this.cleanupInterval !== null) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.forceClearCaches();
    this.lastCleanup = 0;
    this.disposableCache.clear();
    this.textureCache.clear();
  }
}

export const memoryManager = MemoryManager.getInstance(); 