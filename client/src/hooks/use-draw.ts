type Point = {
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

export type DrawEventHandler = (draw: Draw) => void;

export type UseDrawResult = {
  // canvasRef: HTMLCanvasElement | null;
  setCanvasState: (canvas: HTMLCanvasElement | null) => void;
  onMouseDown: () => void;
  onClear: () => void;
};

/** Initial state. */
export type CanvasState = {
  isMouseDown: boolean;
  prevPoint: Point | null;
  canvasRef: HTMLCanvasElement | null;
};

function handleOnClear(canvasDrawState: CanvasState) {
  return () => {
    if (!canvasDrawState.canvasRef) {
      return;
    }
    const ctx = canvasDrawState.canvasRef.getContext("2d");
    if (!ctx) {
      return;
    }
    ctx.clearRect(
      0,
      0,
      canvasDrawState.canvasRef.width,
      canvasDrawState.canvasRef.height
    );
  };
}

function handleComputePointInCanvas(canvasState: CanvasState) {
  return (e: MouseEvent): Point | undefined => {
    if (!canvasState.canvasRef) {
      return;
    }

    const rect: DOMRect = canvasState.canvasRef.getBoundingClientRect();
    const currPoint: Point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    return currPoint;
  };
}

export const useDrawStore = (
  onDrawTrigger: DrawEventHandler
): UseDrawResult => {
  const canvasState: CanvasState = {
    isMouseDown: false,
    prevPoint: null,
    canvasRef: null,
  };

  const computePointInCanvas = handleComputePointInCanvas(canvasState);

  /* Drawing logic. */

  const mouseMoveHandler = (e: MouseEvent) => {
    if (!canvasState.isMouseDown) {
      return;
    }
    const currentPoint = computePointInCanvas(e);

    const ctx = canvasState.canvasRef?.getContext("2d");
    if (!ctx || !currentPoint) {
      return;
    }

    onDrawTrigger({ ctx, currentPoint, prevPoint: canvasState.prevPoint });
    canvasState.prevPoint = currentPoint;
  };

  const mouseUpHandler = (_e: MouseEvent) => {
    canvasState.isMouseDown = false;
    canvasState.prevPoint = null;
  };

  /* Add event listeners. */

  const addEventListeners = (canvas: HTMLCanvasElement) => {
    canvas.addEventListener("mousemove", mouseMoveHandler);
    window.addEventListener("mouseup", mouseUpHandler);
  };

  const removeEventListeners = (canvas: HTMLCanvasElement) => {
    canvas.removeEventListener("mousemove", mouseMoveHandler);
    window.removeEventListener("mouseup", mouseUpHandler);
  };

  /* Return functional state setters and callback triggers. */

  const setCanvasState = (element: CanvasState["canvasRef"]) => {
    if (canvasState.canvasRef) {
      removeEventListeners(canvasState.canvasRef);
    }
    canvasState.canvasRef = element;
    if (canvasState.canvasRef) {
      addEventListeners(canvasState.canvasRef);
    }
  };

  const onMouseDown = () => {
    canvasState.isMouseDown = true;
  };

  const onClear = handleOnClear(canvasState);

  return {
    setCanvasState,
    onMouseDown,
    onClear,
  };
};

export const useDraw = (onDraw: DrawEventHandler): UseDrawResult => {
  let mouseDown = false;
  let prevPoint: Point | null = null;
  let canvasRef: HTMLCanvasElement | null = null;

  const onMouseDown = () => {
    mouseDown = true;
  };

  const clear = () => {
    if (!canvasRef) return;

    const ctx = canvasRef.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
  };

  const handler = (e: MouseEvent) => {
    if (!mouseDown) return;
    const currentPoint = computePointInCanvas(e);

    const ctx = canvasRef?.getContext("2d");
    if (!ctx || !currentPoint) return;

    onDraw({ ctx, currentPoint, prevPoint });
    prevPoint = currentPoint;
  };

  const computePointInCanvas = (e: MouseEvent) => {
    if (!canvasRef) return;

    const rect = canvasRef.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    return { x, y };
  };

  const mouseUpHandler = () => {
    mouseDown = false;
    prevPoint = null;
  };

  const addEventListeners = (canvas: HTMLCanvasElement) => {
    canvas.addEventListener("mousemove", handler);
    window.addEventListener("mouseup", mouseUpHandler);
  };

  const removeEventListeners = (canvas: HTMLCanvasElement) => {
    canvas.removeEventListener("mousemove", handler);
    window.removeEventListener("mouseup", mouseUpHandler);
  };

  const canvasRefSetter = (element: HTMLCanvasElement | null) => {
    if (canvasRef) {
      removeEventListeners(canvasRef);
    }

    canvasRef = element;

    if (canvasRef) {
      addEventListeners(canvasRef);
    }
  };

  return { setCanvasState: canvasRefSetter, onMouseDown, onClear: clear };
};

// ARCHIVE

// ///////////////////////////////////////////////
// REGION_START: canvas events
// ///////////////////////////////////////////////

// canvas coordinate system.
// const handleGetPointInCanvas = (e: MouseEvent, canvas: HTMLCanvasElement) => {
//   const rect: DOMRect = canvas.getBoundingClientRect();
//   // const rect: DOMRect = container.getBoundingClientRect();
//   return { x: e.clientX - rect.left, y: e.clientY - rect.top };
// };

// function handleSetLineColor(event: any) {
//   const color = event?.target?.value;
//   canvasEventAtom.lineColor = color;
// }

// const handleClearCanvas = () => {
//   canvasCtx.clearRect(0, 0, canvasRef.width, canvasRef.height);
//   canvasEventAtom.previousPoint = null;
//   canvasEventAtom.currentPoint = { x: 0, y: 0 };
//   canvasEventAtom.mouseView = MouseView.Default;
//   canvasRef.style.cursor = canvasEventAtom.mouseView;
// };

// const canvasEventAtom: CanvasEventAtom = {
//   ctx: canvasCtx,
//   type: "",
//   offsetX: 0,
//   offsetY: 0,
//   width: 0,
//   height: 0,
//   isMousedownToDraw: false,
//   previousPoint: null,
//   currentPoint: { x: 0, y: 0 },
//   mouseView: MouseView.Default,
//   lineColor: "#bada56",
// };

// canvasRef?.addEventListener("mousedown", (event: MouseEvent) => {
//   canvasEventAtom.type = "mousedown";
//   canvasEventAtom.isMousedownToDraw = true;
//   canvasEventAtom.mouseView = MouseView.Crosshair;
//   canvasRef.style.cursor = canvasEventAtom.mouseView;
//   canvasEventAtom.offsetX = event.offsetX;
//   canvasEventAtom.offsetY = event.offsetY;
//   canvasEventAtom.currentPoint = handleGetPointInCanvas(event, canvasRef);
//   canvasEventAtom.previousPoint = structuredClone(canvasEventAtom.currentPoint);
// });

// canvasRef?.addEventListener("mouseup", (event: MouseEvent) => {
//   canvasEventAtom.type = "mouseup";
//   canvasEventAtom.isMousedownToDraw = false;
//   canvasEventAtom.previousPoint = null;
//   canvasEventAtom.mouseView = MouseView.Default;
//   canvasRef.style.cursor = canvasEventAtom.mouseView;
// });

// canvasRef?.addEventListener("mousemove", (event: MouseEvent) => {
//   canvasEventAtom.currentPoint = handleGetPointInCanvas(event, canvasRef);
//   const lineWidth = 4;
//   const lineColor = canvasEventAtom.lineColor;

//   // If it is an arc or circle or intersecting.
//   const startPoint =
//     canvasEventAtom.previousPoint ?? canvasEventAtom.currentPoint;

//   if (!canvasEventAtom.isMousedownToDraw) {
//     return;
//   }
//   canvasCtx.beginPath();
//   canvasCtx.lineWidth = lineWidth;
//   canvasCtx.strokeStyle = lineColor;
//   if (!canvasEventAtom.previousPoint) {
//     return;
//   }
//   canvasCtx.moveTo(
//     startPoint.x, // canvasEventAtom.previousPoint.x,
//     startPoint.y // canvasEventAtom.previousPoint.y
//   );
//   // canvasEventAtom.currentPoint = getPointInCanvas(event, canvasRef);
//   canvasCtx.lineTo(
//     canvasEventAtom.currentPoint.x,
//     canvasEventAtom.currentPoint.y
//   );
//   canvasCtx.stroke();
//   canvasCtx.fillStyle = lineColor;

//   canvasCtx.beginPath();
//   canvasCtx.arc(startPoint.x, startPoint.y, 2, 0, 2 * Math.PI);
//   canvasCtx.fill();
//   canvasEventAtom.previousPoint = structuredClone(canvasEventAtom.currentPoint);
// });

// function resizeCanvas() {
//   if (!canvasRef || !canvasCtx || !container || !canvasRect) {
//     return;
//   }
//   const imagedata = canvasCtx.getImageData(
//     0,
//     0,
//     canvasRef.width,
//     canvasRef.height
//   );
//   // container.style.width = `${(window.outerWidth / 1.618).toString()}px`; // works

//   // Resize the canvas.

//   // container.style.width = `${(window.outerWidth / 1.618).toString()}px`; // works
//   canvasRef.width = container.clientWidth;
//   canvasRef.height = container.clientHeight;
//   canvasRef.getContext("2d")?.putImageData(imagedata, 0, 0);
// }
// //
// window.addEventListener("resize", (event: UIEvent) => {
//   // container.style.width = `${(window.outerWidth / 1.618).toString()}px`; // works
//   resizeCanvas();
// });

// resizeCanvas();

// ///////////////////////////////////////////////
// REGION_END: canvas events
// ///////////////////////////////////////////////
