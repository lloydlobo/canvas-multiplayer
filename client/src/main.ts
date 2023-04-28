import * as dotenv from "dotenv";
import { io, Socket } from "socket.io-client";
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

// //////////////////////////////////////////////
// REGION_START: render DOM
// //////////////////////////////////////////////

setupHomePage();

const formRef = document.getElementById("formRef");
const messagesListRef = document.getElementById("messagesListRef");
const inputRef = document.getElementById("inputRef") as HTMLInputElement;
const sendRef = document.getElementById("sendRef");

const controlsClearButton = document.getElementById("controlsClearButton");
const controlsColorPickerInput = document.getElementById( "controlsColorPickerInput") as HTMLInputElement; // prettier-ignore
const controlsLineWidthPicker = document.getElementById( "controlsLineWidthPicker") as HTMLInputElement; // prettier-ignore
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
// REGION_START: hooks
// ///////////////////////////////////////////////

/**
 * An object containing the values to interpolate.
 * @property {number} a - The starting value.
 * @property {number} b - The ending value.
 * @property {number} t - The interpolation factor, usually between 0 and 1.
 */
type Lerp = {
  a: number;
  b: number;
  t: number;
};

/**
 * Linearly interpolate between two values.
 * @param {Lerp["a"]} a - The starting value.
 * @param {Lerp["b"]} b - The ending value.
 * @param {Lerp["t"]} t - The interpolation factor, usually between 0 and 1.
 * @returns {number} The interpolated value.
 *
 * Use linear interpolation (`lerp`) to create a smooth line as the mouse move
 * over the canvas. We interpolate between the previous mouse position and the
 * current mouse position.
 */
function lerp(a: Lerp["a"], b: Lerp["b"], t: Lerp["t"]) {
  if (t > 1) {
    t = 1;
  } else if (t < 0) {
    t = 0;
  }

  return a + (b - a) * t;
}

function createLine({ prevPoint, currentPoint, ctx }: Draw) {
  socket.emit("draw_line", {
    prevPoint,
    currentPoint,
    color: colorState,
  } satisfies DrawLineSocketProps);
  handleDraw({ ctx, currentPoint, prevPoint, color: colorState });
}

/**
 * Handle drawing on a canvas using linear interpolation to create a smooth line.
 * @param {Draw} param0 - An object containing the canvas context, current point, and previous point.
 */
const handleDraw = ({ ctx, currentPoint, prevPoint, color }: DrawLineProps) => {
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
  const incrementSize = 20;
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

// const { setCanvasState, onMouseDown, onClear } = useDrawStore(handleDraw);
const { setCanvasState, onMouseDown, onClear } = useDrawStore(createLine);
setCanvasState(canvasRef);

canvasRef.addEventListener("mousedown", onMouseDown);

window.addEventListener("load", () => {
  // container.style.width = `${(window.outerWidth / 1.618).toString()}px`; // works
  // canvasRef.width = container.clientWidth;
  // canvasRef.height = container.clientHeight;
  canvasRef.style.border = "1px solid #333333";
});

controlsClearButton?.addEventListener("click", (event) => {
  event.preventDefault();
  console.info(event.target, "Clearing canvas");
  socket.emit("clear");
  onClear();
});
controlsColorPickerInput?.addEventListener("change", (event: any) => {
  colorState = event.currentTarget.value;
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
    // inside lines, is used to indicate the presence of the other
    // multiplayers.
    handleDraw({ ctx: canvasCtx, currentPoint, prevPoint, color });
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
    const now = new Date();
    const timestamp = `${now.getHours().toString().padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
    const msg = `${timestamp}: ${inputRef.value}`;

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

  <main>
    <section>
      <header class="header" >
        <h1 class="logo">
          canvas multiplayer
        </h1>
        <div class="controls" >
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
        </div>
      </header>
    </section>
    <section>
      <div class="canvas-container">
        <canvas id="canvasRef" width="600" height="600">Your browser does not support canvas element.</canvas>
      </div>
      <pre id="logRef" style="border: 1px solid #ccc"></pre>
    </section>
  </main>

  <aside>
    <ul id="messagesListRef" class="messages debug!"></ul>

    <form id="formRef" action="" class="messages_form">
      <input id="inputRef" type="text"  autocomplete="off" placeholder="Send a message&#8230;" />
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
