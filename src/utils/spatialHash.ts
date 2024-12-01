export class SpatialHash {
  private cells: Map<string, Set<string>>;
  private cellSize: number;
  private positions: Map<string, { x: number, y: number }>;

  constructor(cellSize: number) {
    this.cells = new Map();
    this.positions = new Map();
    this.cellSize = cellSize;
  }

  public insert(id: string, x: number, y: number): void {
    const cellKey = this.getCellKey(x, y);
    if (!this.cells.has(cellKey)) {
      this.cells.set(cellKey, new Set());
    }
    this.cells.get(cellKey)?.add(id);
    this.positions.set(id, { x, y });
  }

  public get(id: string): { x: number, y: number } | undefined {
    return this.positions.get(id);
  }

  public update(id: string, x: number, y: number): void {
    const oldPos = this.positions.get(id);
    if (oldPos) {
      const oldCellKey = this.getCellKey(oldPos.x, oldPos.y);
      this.cells.get(oldCellKey)?.delete(id);
    }
    this.insert(id, x, y);
  }

  private getCellKey(x: number, y: number): string {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    return `${cellX},${cellY}`;
  }

  public clear(): void {
    this.cells.clear();
    this.positions.clear();
  }
} 