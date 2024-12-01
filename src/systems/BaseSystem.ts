export abstract class BaseSystem {
  protected static instance: any;

  protected constructor() {}

  public dispose(): void {
    // Cleanup resources
    this.cleanupResources();
    
    // Reset instance
    const constructor = this.constructor as typeof BaseSystem;
    constructor.instance = null;
  }

  protected abstract cleanupResources(): void;
} 