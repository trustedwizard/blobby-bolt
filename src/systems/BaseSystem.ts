export abstract class BaseSystem {
  protected static instance: any;

  protected constructor() {}

  public static getInstance(...args: any[]): BaseSystem {
    throw new Error('getInstance must be implemented by derived class');
  }

  public dispose(): void {
    this.cleanupResources();
    const constructor = this.constructor as typeof BaseSystem;
    constructor.instance = null;
  }

  protected abstract cleanupResources(): void;
} 