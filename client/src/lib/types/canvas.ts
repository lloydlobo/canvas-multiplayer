export type Point = {
  /** x coordinate in canvas. */
  x: number;
  /** y coordinate in canvas. */
  y: number;
};

export type Draw = {
  ctx: CanvasRenderingContext2D;
  currentPoint: Point;
  prevPoint: Point | null;
};

export type DrawLineProps = Draw & {
  color: string;
};

export type DrawLineSocketProps = Omit<DrawLineProps, "ctx">;

export type DrawEventHandler = (draw: Draw) => void;

export type UseDrawResult = {
  setCanvasState: (canvas: HTMLCanvasElement | null) => void;
  onMouseDown: () => void;
  onClear: () => void;
};

/** Initial state. */
export type AppCanvasState = {
  isMouseDown: boolean;
  prevPoint: Point | null;
  canvasRef: HTMLCanvasElement | null;
};

export enum MouseView {
  Default = "default",
  Crosshair = "crosshair",
  None = "none",
  Grab = "grab",
}

// export type CanvasEventAtom = {
//   lineColor: any;
//   /**
//    * The type of event.
//    */
//   type: string;
//   /**
//    * The canvas context.
//    */
//   ctx: CanvasRenderingContext2D;
//   /**
//    * isMouseDown: or isDrawingState is a boolean property that indicates whether the mouse button is pressed.
//    */
//   isMousedownToDraw: boolean;
//   /**
//    * previousPoint: is a Point object that contains the previous mouse position.
//    */
//   previousPoint: Point | null;
//   /**
//    * currentPoint: is a Point object that contains the current mouse position.
//    */
//   currentPoint: Point;
//   /**
//    * The x-coordinate of the mouse pointer in pixels.
//    */
//   offsetX: number;
//   /**
//    * The y-coordinate of the mouse pointer in pixels.
//    */
//   offsetY: number;
//   /**
//    * The width of the canvas in pixels.
//    */
//   width: number;
//   /**
//    * The height of the canvas in pixels.
//    */
//   height: number;
//   /**
//    * The mouse view.
//    */
//   mouseView: MouseView;
// };
