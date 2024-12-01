import * as PIXI from 'pixi.js';

export class BatchRenderer {
  private geometry: PIXI.BatchGeometry;
  private shader: PIXI.Shader;
  private state: PIXI.State;
  private objects: Array<{ x: number; y: number; scale: number; alpha: number }> = [];

  constructor() {
    this.geometry = new PIXI.BatchGeometry();
    this.shader = PIXI.Shader.from(`
      precision mediump float;
      attribute vec2 aVertexPosition;
      attribute vec2 aTextureCoord;
      attribute vec4 aColor;
      attribute vec2 aTransform;
      attribute float aScale;
      
      uniform mat3 projectionMatrix;
      
      varying vec2 vTextureCoord;
      varying vec4 vColor;
      
      void main() {
        vTextureCoord = aTextureCoord;
        vColor = aColor;
        
        vec2 pos = aVertexPosition * aScale + aTransform;
        gl_Position = vec4((projectionMatrix * vec3(pos, 1.0)).xy, 0.0, 1.0);
      }`,
      
      `precision mediump float;
      varying vec2 vTextureCoord;
      varying vec4 vColor;
      
      uniform sampler2D uSampler;
      
      void main() {
        gl_FragColor = texture2D(uSampler, vTextureCoord) * vColor;
      }`
    );
    this.state = new PIXI.State();
  }

  add(x: number, y: number, scale: number = 1, alpha: number = 1) {
    this.objects.push({ x, y, scale, alpha });
  }

  render(renderer: PIXI.Renderer) {
    if (this.objects.length === 0) return;

    // Update geometry with current objects
    this.updateGeometry();

    // Render batch
    renderer.batch.setObjectRenderer(renderer.plugins.batch);
    renderer.shader.bind(this.shader);
    renderer.state.set(this.state);
    renderer.geometry.bind(this.geometry);
    renderer.geometry.draw(PIXI.DRAW_MODES.TRIANGLES, this.objects.length * 6, 0);

    // Clear objects after rendering
    this.objects = [];
  }

  private updateGeometry() {
    // Update geometry with current object positions
    // Implementation depends on specific needs
  }

  destroy() {
    this.geometry.destroy();
    this.shader.destroy();
  }
} 