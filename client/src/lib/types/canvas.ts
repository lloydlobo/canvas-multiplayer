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
  onMouseDown: (event: MouseEvent) => void;
  onClear: () => void;
};

export type MouseTuple = [number, number];

/** Initial state. */
export type AppCanvasState = {
  isMouseDown: boolean;
  prevPoint: Point | null;
  canvasRef: HTMLCanvasElement | null;
  path: MouseTuple[] | null;
  paths: MouseTuple[][];
};

// Create a tuple with 2 members.
// const tuple = <T, U>(t: T, u: U): [T, U] => [t, u];
// // Create a tuple with 3 members.
// const tuple3 = <T, U, V>(t: T, u: U, v: V): [T, U, V] => [t, u, v];
// // Create a tuple with 4 members.
// const tuple4 = <T, U, V, W>(t: T, u: U, v: V, w: W): [T, U, V, W] => [t, u, v, w];
// // Create a tuple with 5 members.
// const tuple5 = <T, U, V, W, X>( t: T, u: U, v: V, w: W, x: X): [T, U, V, W, X] => [t, u, v, w, x];
// // Create a tuple with 6 members.
// const tuple6 = <T, U, V, W, X, Y>( t: T, u: U, v: V,

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
