export type Point = {
  x: number;
  y: number;
};

export type CanvasEventAtom = {
  /**
   * The type of event.
   */
  type: string;
  /**
   * The canvas context.
   */
  ctx: CanvasRenderingContext2D;
  /**
   * isMouseDown: or isDrawingState is a boolean property that indicates whether the mouse button is pressed.
   */
  isMousedownToDraw: boolean;
  /**
   * previousPoint: is a Point object that contains the previous mouse position.
   */
  previousPoint: Point | null;
  /**
   * currentPoint: is a Point object that contains the current mouse position.
   */
  currentPoint: Point;
  /**
   * The x-coordinate of the mouse pointer in pixels.
   */
  offsetX: number;
  /**
   * The y-coordinate of the mouse pointer in pixels.
   */
  offsetY: number;
  /**
   * The width of the canvas in pixels.
   */
  width: number;
  /**
   * The height of the canvas in pixels.
   */
  height: number;
  /**
   * The mouse view.
   */
  mouseView: MouseView;
};

export enum MouseView {
  Default = "default",
  Crosshair = "crosshair",
  None = "none",
  Grab = "grab",
}
