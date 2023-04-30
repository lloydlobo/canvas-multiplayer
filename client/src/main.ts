import * as dotenv from "dotenv";
import { io, Socket } from "socket.io-client";
import { cleanUpProfanity } from "./helpers.ts";
import { useDrawStore } from "./hooks/use-draw-store.ts";
import {
  AppCanvasState,
  DrawLineProps,
  DrawLineSocketProps,
  MouseTuple,
  Point,
} from "./lib/types/canvas.ts";
import {
  ClientToServerEvents,
  ServerToClientEvents,
} from "./lib/types/socket.ts";
import "./style.css";
import { lerp, lerpIncrementalPath } from "./utils.ts";
import { IncomingMessage } from "http";

// //////////////////////////////////////////////
// REGION_START: render DOM
// //////////////////////////////////////////////

setupHomePage();

const formRef = document.getElementById("formRef");
const messagesListRef = document.getElementById("messagesListRef");
const inputRef = document.getElementById("inputRef") as HTMLInputElement;
const sendRef = document.getElementById("sendRef");

const controlsClearButton = document.getElementById("controlsClearButton") as HTMLButtonElement; // prettier-ignore
const controlsUndoHistoryButton = document.getElementById( "controlsUndoHistoryButton") as HTMLButtonElement; // prettier-ignore
const controlsRedoHistoryButton = document.getElementById( "controlsRedoHistoryButton") as HTMLButtonElement; // prettier-ignore
const controlsColorPickerInput = document.getElementById( "controlsColorPickerInput") as HTMLInputElement; // prettier-ignore
const controlsLineWidthPicker = document.getElementById( "controlsLineWidthPicker") as HTMLInputElement; // prettier-ignore
const controlsFullscreenCheckbox = document.getElementById( "controlsFullscreenCheckbox") as HTMLInputElement; // prettier-ignore

let colorState = controlsColorPickerInput.value;

const canvasRef = document.getElementsByTagName("canvas")[0];
if (!canvasRef) { throw Error("Canvas not found."); } // prettier-ignore

const canvasRect: DOMRect = canvasRef.getBoundingClientRect();

const container = canvasRef.parentNode as NonNullable<HTMLDivElement> | null;
if (!container) { throw Error("Container not found."); } // prettier-ignore
const canvasCtx = canvasRef.getContext("2d");
if (canvasCtx === null || !canvasCtx) { throw Error("Canvas context is null."); } // prettier-ignore

/* window.addEventListener("resize", () => { */
/*   canvasRef.width = container.clientWidth; */
/*   canvasRef.height = container.clientHeight; */
/*   container.style.width = "50vw"; */
/* }); */

// ///////////////////////////////////////////////
// REGION_END: render DOM
// ///////////////////////////////////////////////

// ///////////////////////////////////////////////
// REGION_START: canvas state
// ///////////////////////////////////////////////
// NOTE: You can move this to hooks or store.

const canvasHistory: ImageData[] = []; // persistent current backups.
const canvasHistoryBackup: ImageData[] = []; // for redo cached backups.
const HISTORY_LIMIT = 50;

// ///////////////////////////////////////////////
// REGION_END: canvas state
// ///////////////////////////////////////////////

// ///////////////////////////////////////////////
// REGION_START: hooks
// ///////////////////////////////////////////////

function undoHistory() {
  if (canvasHistory.length > 0) {
    const firstElement = canvasHistory.pop(); // Remove the last state of the canvas.
    if (firstElement) {
      canvasHistoryBackup.push(firstElement); // Save the first element for redo.
    }
    const lastCanvasState = canvasHistory[canvasHistory.length - 1]; // Get the previous state.
    canvasCtx?.putImageData(lastCanvasState, 0, 0); // Redraw the canvas with previous state.
  }
}

function redoHistory() {
  if (canvasHistoryBackup.length > 0) {
    const lastCanvasState = canvasHistoryBackup.pop(); // Get the previous state.
    if (lastCanvasState) {
      canvasCtx?.putImageData(lastCanvasState, 0, 0); // Redraw the canvas with previous state.
    }
  }
}

/**
 * Handle drawing on a canvas using linear interpolation to create a smooth line.
 * @param {Draw} param0 - An object containing the canvas context, current point, and previous point.
 */
const handleDrawLine = ({
  ctx,
  currentPoint,
  prevPoint,
  color,
}: DrawLineProps) => {
  if (!prevPoint) { return; } // prettier-ignore
  const lineColor = color || colorState || controlsColorPickerInput.value;
  ctx.beginPath();
  ctx.strokeStyle = lineColor; // event.hex.
  ctx.lineWidth = controlsLineWidthPicker.valueAsNumber;

  const { numPoints, distance } = lerpIncrementalPath({
    currentPoint,
    prevPoint,
  });

  // moveToLineToCtxLines({ ctx, prevPoint, currentPoint, numPoints });
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const x = lerp(prevPoint.x, currentPoint.x, t);
    const y = lerp(prevPoint.y, currentPoint.y, t);

    if (i === 0) {
      ctx.moveTo(x, y); // ctx.moveTo(prevPoint.x, prevPoint.y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();

  ctx.fillStyle = controlsColorPickerInput.value;
  ctx.beginPath();
  ctx.arc(prevPoint.x, prevPoint.y, 1, 0, 2 * Math.PI);
  ctx.fill();
};

/**
 * To vary t based on the position i of the mousemove event, we can use a
 * mathematical formula that maps the values of i to t in a non-linear way.
 * One such formula could be: t = (1 - cos(pi * i / midpoint)) / 2 where
 * midpoint is the point where the value of t is maximum. This formula maps the
 * values of i such that when i is near 0, t is less, when i is at midpoint, t
 * is max, and when i is max, t is less. The formula uses cosine to produce a
 * non-linear mapping between i and t. The pi/2 term in the formula ensures
 * that the maximum value of t is 1. The (1 - ...) term is used to invert the
 * function, so that t is less at the beginning and end of the range, and
 * maximum at the midpoint.
 *
 * For example, if the range of i is from 0 to 100 and the midpoint is 50, then
 * the value of t for i = 0 is 0, for i = 50 is 1, and for i = 100 is 0.
 *
 * @usage const t = mapT(i, numPoints, midpoint);
 */
const mapT = (i: number, numPoints: number, midpoint: number) => {
  const angle = (Math.PI * i) / midpoint;
  return (1 - Math.cos(angle)) / 2;
};

// NOTE: We stroke a single line after the points are connected.
const handleDraw = {
  path: (
    ctx: CanvasRenderingContext2D,
    path: NonNullable<AppCanvasState["path"]>,
    color = "yellow"
  ) => {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = color;
    ctx.lineWidth = controlsLineWidthPicker.valueAsNumber || 2;

    ctx.beginPath();
    ctx.moveTo(...path[0]);
    const hasSmoothCurves = true; // NOTE: Toggle it. This is a temporary solution.
    if (hasSmoothCurves) {
      for (let i = 2; i < path.length; i++) {
        const prevPoint: Point = { x: path[i - 1][0], y: path[i - 1][1] };
        const currentPoint: Point = { x: path[i][0], y: path[i][1] };
        const { numPoints,distance } = lerpIncrementalPath({ currentPoint, prevPoint, incrementSize: 5, }); //prettier-ignore

        const t = i / numPoints;
        const x = lerp(prevPoint.x, currentPoint.x, t);
        const y = lerp(prevPoint.y, currentPoint.y, t);

        const hasPseudoDelay = true; // NOTE: Toggle it. This is a temporary solution.
        if (hasPseudoDelay) {
          const friction = 0.8;
          const tEaseInOut = mapT(i, numPoints, path.length / 2); // 0.0 -> 1.0 -> 0.0 -> 1.0 -> 0.0 and so on..
          const acceleration = lerp(0.5, 0.5 * 1.618 * friction, tEaseInOut); // lerp(0.5, 0.647, t);// In this code, midpoint is calculated as half the value of numPoints, which represents the total number of points between two points on the canvas. The value of t is then calculated using mapT, and lerp is called with the calculated value of t to interpolate between two values of acceleration.
          const velocity = friction * acceleration * distance;
          const deltaX = velocity * Math.cos(t);
          const deltaY = velocity * Math.sin(t);
          const deltaTransposition = Math.sqrt(deltaX) * Math.sqrt(deltaY);
          const pseudoDistance = (Math.sqrt(path.length ** 2 + (numPoints * distance) ** 2) / velocity) * deltaTransposition; // prettier-ignore
          for (let i = 0; i < pseudoDistance * t; i++) {} // Expensive operation to simulate delay...
        }
        ctx.lineTo(x, y);
      }
    } else {
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(...path[i]);
      }
    }
    ctx.stroke();

    /* Draw a dot at starting point of each path. */

    ctx.fillStyle = controlsColorPickerInput.value || colorState || color;
    ctx.beginPath(); // ctx.arc(prevPoint.x, prevPoint.y, 1, 0, 2 * Math.PI);
    ctx.arc(path[0][0], path[0][1], 1, 0, 2 * Math.PI);

    ctx.fill();
  },
};

// function createLine({ prevPoint, currentPoint, ctx }: Draw) {
function createLine({
  prevPoint,
  currentPoint,
  ctx,
  path,
}: Partial<AppCanvasState>) {
  if (!ctx) {
    return;
  }
  handleDraw.path(ctx, path ?? [], colorState);

  const imagedata = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  canvasHistory.push(imagedata); // Save the canvas state before modifying it.

  if (canvasHistory.length > HISTORY_LIMIT && canvasHistory.length > 0) {
    const _firstElement = canvasHistory.shift(); // Removes the first element from an array and returns it. if (firstElement) { canvasHistoryBackup.push(firstElement); // Save the first element for redo. }
  }

  if (!ctx || !currentPoint || !prevPoint) {
    return;
  }
  const data: DrawLineSocketProps = { prevPoint, currentPoint, color: colorState, }; // prettier-ignore
  socket.emit("draw_line", data);
  // NOTE: Shouldn't handleDrawLine be called before `socket.emit`.
  // handleDrawLine({ ctx, currentPoint, prevPoint, color: colorState });
}

const { setCanvasState, onMouseDown, onClear } = useDrawStore(createLine);
setCanvasState(canvasRef);

canvasRef.addEventListener("mousedown", onMouseDown);

controlsColorPickerInput?.addEventListener("change", (event: any) => {
  colorState = event.currentTarget.value;
});

controlsClearButton?.addEventListener("click", (event) => {
  event.preventDefault(); // console.info(event.target, "Clearing canvas");
  socket.emit("clear");
  onClear();
});

controlsFullscreenCheckbox?.addEventListener("change", (event: any) => {
  const isFullscreen = event.currentTarget.checked;

  if (isFullscreen) {
    canvasRef.width = window.innerWidth;
    canvasRef.height = window.innerHeight;
  } else {
    canvasRef.width = container.clientWidth;
    canvasRef.height = container.clientHeight;
  }
});

controlsUndoHistoryButton?.addEventListener("click", (event) => {
  event.preventDefault(); // console.info(event.target, "Undoing history");
  undoHistory(); // TODO: set disabled if canvasHistory.length === 0
});

controlsRedoHistoryButton?.addEventListener("click", (event) => {
  event.preventDefault(); // console.info(event.target, "Redoing history");
  redoHistory(); // TODO: set disabled if canvasHistoryBackup.length === 0
});

window.addEventListener("load", () => {
  if (controlsFullscreenCheckbox.checked) {
    canvasRef.width = window.innerWidth;
    canvasRef.height = window.innerHeight;
  }
  canvasRef.style.border = "1px solid #333333";
});

// ///////////////////////////////////////////////
// REGION_END: hooks
// ///////////////////////////////////////////////

// ///////////////////////////////////////////////
// REGION_START: Websockets
// ///////////////////////////////////////////////

const isSSR = typeof window === "undefined";
console.info("isSSR:", isSSR, "NODE_ENV:", process.env.NODE_ENV);

const local_uri: URL["href"] = "http://localhost:8080";
let server_uri: URL["href"] = "";

try {
  if (isSSR === true) {
    dotenv.config();
    if (process.env.SERVER_URI !== undefined)
      server_uri = process.env.SERVER_URI || local_uri;
  } else {
    server_uri = local_uri;
  }
} catch (err) {
  console.error(err);
}

/**
 * @see https://socket.io/docs/v4/typescript/
 * please note that the types are reversed
 */
const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(server_uri); // prettier-ignore

socket.emit("client_ready");

/* Websockets for canvas */

/* Return early if the content of the current canvas as an image isn't supported.
   This is useful if you want to save the image to disk. If you want to display
   the image on the page, you can use `<img src="data:image/png;base64,..." />`. */
socket.on("get_canvas_state", () => {
  if (!canvasRef?.toDataURL()) {
    return;
  }
  console.info("Sending canvas state to server");
  socket.emit("canvas_state", canvasRef.toDataURL());
});

socket.on("canvas_state_from_server", (state: string) => {
  console.info("Received canvas state from server");
  const img = new Image();
  img.src = state;
  img.onload = () => {
    canvasCtx?.drawImage(img, 0, 0);
  }; // TODO: this may need useEffect for the image to load consistently.
});

socket.on(
  "draw_line",
  ({ prevPoint, currentPoint, color }: DrawLineSocketProps) => {
    if (!canvasCtx) {
      return console.error("No canvas context");
    } // Here color received is used in the circle: the arc in ctx small circles
    // inside lines, is used to indicate the presence of the other multiplayers.
    handleDrawLine({ ctx: canvasCtx, currentPoint, prevPoint, color });
  }
);

socket.on("clear", onClear);

/* Websockets for chat */

socket.on("message", (message) => {
  const welcomeMessage = document.createElement("li");
  welcomeMessage.textContent = message;
  welcomeMessage.classList.add("socket-message-welcome");
  messagesListRef?.appendChild(welcomeMessage);
});

socket.on("chat_message", (msg) => {
  const item = document.createElement("li");
  item.textContent = msg;
  messagesListRef?.appendChild(item);
  // Scroll form #mesageListRef.
  messagesListRef?.scrollTo(0, document.body.scrollHeight); // FIXME: Currently wrapper is of fixed width,height. add verticla block y axis scrolling.
  window.scrollTo(0, document.body.scrollHeight); // FIXME: Currently wrapper is of fixed width,height. add verticla block y axis scrolling.
});

// ///////////////////////////////////////////////
// REGION_END: Websockets
// ///////////////////////////////////////////////

// ///////////////////////////////////////////////
// REGION_START: chat event handlers
// ///////////////////////////////////////////////

formRef?.addEventListener("submit", (event) => {
  event.preventDefault();

  const input = inputRef.value;
  if (!input) {
    return;
  }

  let filteredInput = "";
  input.split(" ").forEach((word) => {
    filteredInput += cleanUpProfanity(word, "*", 2);
    filteredInput += " "; // Add space between words.
  });

  const now = new Date();
  const timestamp = `${now.getHours().toString().padStart(2, "0")}:${now
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;

  const msg = `${timestamp}: ${filteredInput}`;
  socket.emit("chat_message", msg);

  inputRef.value = ""; // Clear user input.
});

// ///////////////////////////////////////////////
// REGION_END: chat event handlers
// ///////////////////////////////////////////////

// ///////////////////////////////////////////////
// REGION_START: setupHomePage
// ///////////////////////////////////////////////

function setupHomePage(): void {
  document.querySelector<HTMLDivElement>(`#app`)!.innerHTML = /*html*/ `
<div class="wrapper">

  <header class="header">
    <div class="logo-wrapper" style="display: grid; justify-content: space-between; align-items: center;">
      <h1 class="logo" style="display: flex; justify-content: center; align-items: center;">
        <a href="/" style="" title="Go Home">
          canvas multiplayer
        </a>
      </h1>
      <a href="/" style="" target="_blank" title="Open in new tab" rel="noopener noreferrer">
        <span style="font-size: 60%">Open another client</span>
        <svg width="12" height="12" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
          stroke="currentColor" class="w-6 h-6">
          <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
        </svg>
      </a>
    </div>
    <div class="controls">
      <input type="color" value="#eeeeee" name="CromePicker" title="Color picker" id="controlsColorPickerInput" />
      <input type="number" min="2" max="9" title="Line width" value="4" name="lineWidthPicker" id="controlsLineWidthPicker" />
      <!-- <input type="text" inputmode="numeric" pattern="[0-9]*" min="3" max="9" title="Line width" value="2" name="lineWidthPicker" id="controlsLineWidthPicker" /> -->
      <input style="display: none" type="checkbox" name="fullscreen" id="controlsFullscreenCheckbox" />
      <button name="undoHistory" id="controlsUndoHistoryButton" title="Undo History">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
          class="w-6 h-6">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
        </svg>
      </button>
      <button name="redoHistory" id="controlsRedoHistoryButton" title="Redo History">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
          class="w-6 h-6">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
        </svg>
      </button>
      <button id="controlsClearButton" title="Clear">
        <svg class="svg-icon" stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round"
          stroke-linejoin="round" class="h-4 w-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          <line x1="10" y1="11" x2="10" y2="17"></line>
          <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
      </button>
    </div>
  </header>

  <main>
    <section>
      <div class="canvas-container">
        <canvas id="canvasRef" width="600" height="600">Your browser does not support canvas element.</canvas>
      </div>
      <pre id="logRef" style="border: 1px solid #ccc"></pre>
    </section>
  </main>

  <aside id="messageAsideRef">
    <ul id="messagesListRef" class="messages debug!"></ul>
    <form id="formRef" action="" class="messages_form">
      <input id="inputRef" type="text" autocomplete="off" placeholder="Send a message&#8230;" />
      <!-- <label for="sendRef">Send</label> -->
      <button id="sendRef" type="submit" title="Send" class="messages_send">
        <svg class="svg-icon h-4 w-4 mr-1" viewBox="0 0 24 24">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      </button>
    </form>
  </aside>
 </div>
`;
}

// ///////////////////////////////////////////////
// REGION_END: setupHomePage
// ///////////////////////////////////////////////
