export function createPortfolioDust(canvas: HTMLCanvasElement, seedValue: number): {
  resize(): void;
  draw(time: number, ambient?: boolean, still?: boolean): void;
};
