import "./style.css";
// import { setupCounter } from "./counter.ts";
import { io, Socket } from "socket.io-client";
import {
  ClientToServerEvents,
  ServerToClientEvents,
} from "./lib/types/socket.ts";
import { CanvasEventAtom, MouseView, Point } from "./lib/types/canvas.ts";

// //////////////////////////////////////////////
// REGION_START: render DOM
// //////////////////////////////////////////////

setupHomePage();

const formRef = document.getElementById("formRef");
const messagesListRef = document.getElementById("messagesListRef");
const inputRef = document.getElementById("inputRef") as HTMLInputElement;
const sendRef = document.getElementById("sendRef");
const controlsClearButton = document.getElementById("controlsClearButton");
const controlsColorPickerInput = document.getElementById(
  "controlsColorPickerInput"
);

const canvasRef = document.getElementsByTagName("canvas")[0];
if (!canvasRef) {
  throw Error("Canvas not found.");
}
const canvasRect: DOMRect = canvasRef.getBoundingClientRect();
const container = canvasRef.parentNode as NonNullable<HTMLDivElement> | null;
if (!container) {
  throw Error("Container not found.");
}
const canvasCtx = canvasRef.getContext("2d");
if (canvasCtx === null || !canvasCtx) {
  throw Error("Canvas context is null.");
}
window.addEventListener("load", () => {
  container.style.width = `${(window.outerWidth / 1.618).toString()}px`; // works
  canvasRef.width = container.clientWidth;
  canvasRef.height = container.clientHeight;
});

// container.style.width = `${(window.outerWidth / 1.618).toString()}px`; // works

// ///////////////////////////////////////////////
// REGION_END: render DOM
// ///////////////////////////////////////////////

// ///////////////////////////////////////////////
// REGION_START: canvas events
// ///////////////////////////////////////////////

// canvas coordinate system.
const handleGetPointInCanvas = (e: MouseEvent, canvas: HTMLCanvasElement) => {
  const rect: DOMRect = canvas.getBoundingClientRect();
  // const rect: DOMRect = container.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
};

const handleClearCanvas = () => {
  canvasCtx.clearRect(0, 0, canvasRef.width, canvasRef.height);
  canvasEventAtom.previousPoint = null;
  canvasEventAtom.currentPoint = { x: 0, y: 0 };
  canvasEventAtom.mouseView = MouseView.Default;
  canvasRef.style.cursor = canvasEventAtom.mouseView;
};

const canvasEventAtom: CanvasEventAtom = {
  ctx: canvasCtx,
  type: "",
  offsetX: 0,
  offsetY: 0,
  width: 0,
  height: 0,
  isMousedownToDraw: false,
  previousPoint: null,
  currentPoint: { x: 0, y: 0 },
  mouseView: MouseView.Default,
};

canvasRef?.addEventListener("mousedown", (event: MouseEvent) => {
  canvasEventAtom.type = "mousedown";
  canvasEventAtom.isMousedownToDraw = true;
  canvasEventAtom.mouseView = MouseView.Crosshair;
  canvasRef.style.cursor = canvasEventAtom.mouseView;
  canvasEventAtom.offsetX = event.offsetX;
  canvasEventAtom.offsetY = event.offsetY;
  canvasEventAtom.currentPoint = handleGetPointInCanvas(event, canvasRef);
  canvasEventAtom.previousPoint = structuredClone(canvasEventAtom.currentPoint);
});

canvasRef?.addEventListener("mouseup", (event: MouseEvent) => {
  canvasEventAtom.type = "mouseup";
  canvasEventAtom.isMousedownToDraw = false;
  canvasEventAtom.previousPoint = null;
  canvasEventAtom.mouseView = MouseView.Default;
  canvasRef.style.cursor = canvasEventAtom.mouseView;
});

canvasRef?.addEventListener("mousemove", (event: MouseEvent) => {
  canvasEventAtom.currentPoint = handleGetPointInCanvas(event, canvasRef);
  const lineWidth = 4;
  const lineColor = "yellow";

  // If it is an arc or circle or intersecting.
  let startPoint =
    canvasEventAtom.previousPoint ?? canvasEventAtom.currentPoint;

  if (!canvasEventAtom.isMousedownToDraw) {
    return;
  }
  canvasCtx.beginPath();
  canvasCtx.lineWidth = lineWidth;
  canvasCtx.strokeStyle = lineColor;
  if (!canvasEventAtom.previousPoint) {
    return;
  }
  canvasCtx.moveTo(
    startPoint.x, // canvasEventAtom.previousPoint.x,
    startPoint.y // canvasEventAtom.previousPoint.y
  );
  // canvasEventAtom.currentPoint = getPointInCanvas(event, canvasRef);
  canvasCtx.lineTo(
    canvasEventAtom.currentPoint.x,
    canvasEventAtom.currentPoint.y
  );
  canvasCtx.stroke();
  canvasCtx.fillStyle = lineColor;
  canvasCtx.beginPath();
  canvasCtx.arc(startPoint.x, startPoint.y, 2, 0, 2 * Math.PI);
  canvasCtx.fill();
  canvasEventAtom.previousPoint = structuredClone(canvasEventAtom.currentPoint);
});

function resizeCanvas() {
  if (!canvasRef || !canvasCtx || !container || !canvasRect) {
    return;
  }
  const imagedata = canvasCtx.getImageData(
    0,
    0,
    canvasRef.width,
    canvasRef.height
  );
  // container.style.width = `${(window.outerWidth / 1.618).toString()}px`; // works

  // Resize the canvas.

  // container.style.width = `${(window.outerWidth / 1.618).toString()}px`; // works
  canvasRef.width = container.clientWidth;
  canvasRef.height = container.clientHeight;
  canvasRef.getContext("2d")?.putImageData(imagedata, 0, 0);
}
//
window.addEventListener("resize", (event: UIEvent) => {
  // container.style.width = `${(window.outerWidth / 1.618).toString()}px`; // works
  resizeCanvas();
});

resizeCanvas();

// ///////////////////////////////////////////////
// REGION_END: canvas events
// ///////////////////////////////////////////////

// ///////////////////////////////////////////////
// REGION_START: Websockets
// ///////////////////////////////////////////////

/**
 * @see https://socket.io/docs/v4/typescript/
 * please note that the types are reversed
 */
const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
  "http://localhost:8080"
);
console.log("client_ready", socket);
socket.emit("client_ready");

socket.on("get_canvas_state", () => {
  console.log("entering get_canvas_state");
  // Return early if the content of the current canvas as an image isn't supported.
  if (!canvasRef?.toDataURL()) {
    return; // This is useful if you want to save the image to disk. If you want to display the image on the page, you can use `<img src="data:image/png;base64,..." />`.
  }
  console.log("get_canvas_state: sending canvas_state");
  socket.emit("canvas_state", canvasRef.toDataURL());
});

socket.on("canvas_state_from_server", (state: string) => {
  console.log("canvas_state_from_server: received the state", state.length);
  const img = new Image();
  img.src = state;
  img.onload = () => {
    canvasCtx?.drawImage(img, 0, 0);
  };
});

socket.on("message", (message) => {
  const welcomeMessage = document.createElement("li");
  welcomeMessage.textContent = message;
  welcomeMessage.style.opacity = "0.6";
  welcomeMessage.style.fontSize = "90.0%";
  welcomeMessage.style.textAlign = "center";

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
// REGION_START: event handlers
// ///////////////////////////////////////////////

controlsClearButton?.addEventListener("click", (event) => {
  event.preventDefault();
  console.info(event.target, "Clearing canvas");
  handleClearCanvas();
});
controlsColorPickerInput?.addEventListener("click", (event) => {
  console.info(event.target, "Picking color");
});

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

console.log(formRef, messagesListRef, inputRef, sendRef);

// ///////////////////////////////////////////////
// REGION_END: event handlers
// ///////////////////////////////////////////////

// ///////////////////////////////////////////////
// REGION_START: setupHomePage
// ///////////////////////////////////////////////

function setupHomePage(): void {
  document.querySelector<HTMLDivElement>(`#app`)!.innerHTML = /*html*/ `
<div class="wrapper">
  <aside>
    <h1 class="logo">
      canvas multiplayer
    </h1>
    <div class="controls" style="display: flex; align-items: center; justify-content: space-between;">
      <input type="color" name="CromePicker" id="controlsColorPickerInput" />
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
  </aside>

  <main>
    <section>
      <div class="canvas-container">
        <canvas id="canvasRef"></canvas>
      </div>
    </section>
  </main>

  <aside>
    <ul id="messagesListRef" class="messages debug!"></ul>

    <form id="formRef" action="" class="messages_form">
      <input id="inputRef" type="text" autofocus autocomplete="off" placeholder="Send a message&#8230;" />
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
