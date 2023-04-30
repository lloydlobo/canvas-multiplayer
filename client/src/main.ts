import * as dotenv from "dotenv";
import { io, Socket } from "socket.io-client";
import { cleanUpProfanity } from "./helpers.ts";
import { useDrawStore } from "./hooks/use-draw-store.ts";
import {
  Draw,
  DrawLineProps,
  DrawLineSocketProps,
} from "./lib/types/canvas.ts";
import {
  ClientToServerEvents,
  ServerToClientEvents,
} from "./lib/types/socket.ts";
import "./style.css";
import { lerp } from "./utils.ts";

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

function createLine({ prevPoint, currentPoint, ctx }: Draw) {
  const imagedata = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  canvasHistory.push(imagedata); // Save the canvas state before modifying it.
  if (canvasHistory.length > HISTORY_LIMIT && canvasHistory.length > 0) {
    const firstElement = canvasHistory.shift(); // Removes the first element from an array and returns it.
    // if (firstElement) {
    //   canvasHistoryBackup.push(firstElement); // Save the first element for redo.
    // }
  }

  socket.emit("draw_line", {
    prevPoint,
    currentPoint,
    color: colorState,
  } satisfies DrawLineSocketProps);

  handleDrawLine({ ctx, currentPoint, prevPoint, color: colorState });
}

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
  // First calculate the distance between prev and curr mouse positons. Then
  // divide the distance by desire increment size to get the number of points
  // we want to interpolate between the two positions.
  const distance = Math.sqrt(
    (currentPoint.x - prevPoint.x) ** 2 + (currentPoint.y - prevPoint.y) ** 2
  );
  // PERF: use a for loop, to gather all points, and concatenate as one long line, ref radu.
  const incrementSize = 5;
  const numPoints = Math.ceil(distance / incrementSize); // Adjust the increment size here to make the line smoother or rougher.
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const x = lerp(prevPoint.x, currentPoint.x, t);
    const y = lerp(prevPoint.y, currentPoint.y, t);
    if (i === 0) {
      ctx.moveTo(x, y); // ctx.moveTo(prevPoint.x, prevPoint.y);
    } else {
      ctx.lineTo(x, y); // ctx.lineTo(currentPoint.x, currentPoint.y);
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

const { setCanvasState, onMouseDown, onClear } = useDrawStore(createLine);
setCanvasState(canvasRef);
canvasRef.addEventListener("mousedown", onMouseDown);

controlsColorPickerInput?.addEventListener("change", (event: any) => {
  colorState = event.currentTarget.value;
});
controlsClearButton?.addEventListener("click", (event) => {
  event.preventDefault();
  console.info(event.target, "Clearing canvas");
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
  event.preventDefault();
  console.info(event.target, "Undoing history");
  undoHistory(); // TODO: set disabled if canvasHistory.length === 0
});

controlsRedoHistoryButton?.addEventListener("click", (event) => {
  event.preventDefault();
  console.info(event.target, "Redoing history");
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

/* Return early if the content of the current canvas as an image isn't supported.
   This is useful if you want to save the image to disk. If you want to display
   the image on the page, you can use `<img src="data:image/png;base64,..." />`. */
socket.on("get_canvas_state", () => {
  if (!canvasRef?.toDataURL()) { return; } // prettier-ignore
  console.info("Sending canvas state to server");
  socket.emit("canvas_state", canvasRef.toDataURL());
});
socket.on("canvas_state_from_server", (state: string) => {
  console.info("Received canvas state from server");
  const img = new Image();
  img.src = state;
  // TODO: this needs useEffect for the image to load consistently.
  img.onload = () => {
    canvasCtx?.drawImage(img, 0, 0);
  };
});
socket.on(
  "draw_line",
  ({ prevPoint, currentPoint, color }: DrawLineSocketProps) => {
    if (!canvasCtx) {
      return console.error("No canvas context");
    }
    // Here color received is used in the circle: the arc in ctx small circles
    // inside lines, is used to indicate the presence of the other multiplayers.
    handleDrawLine({ ctx: canvasCtx, currentPoint, prevPoint, color });
  }
);
socket.on("clear", onClear);

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

  // Scroll form mesageListRef
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
  if (inputRef?.value) {
    const input = inputRef.value;

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
  }
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
    <h1 class="logo">
      canvas multiplayer
    </h1>
    <div class="controls">
      <button id="controlsClearButton" title="Clear">
        <svg class="svg-icon" stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round"
          stroke-linejoin="round" class="h-4 w-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          <line x1="10" y1="11" x2="10" y2="17"></line>
          <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
      </button>
      <input type="color" value="#eeeeee" name="CromePicker" title="Color picker" id="controlsColorPickerInput" />
      <input type="number" min="3" max="9" title="Line width" value="2" name="lineWidthPicker" id="controlsLineWidthPicker" />
      <input type="checkbox" name="fullscreen" id="controlsFullscreenCheckbox" />
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
