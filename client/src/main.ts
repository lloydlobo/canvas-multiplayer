import "./style.css";
// import { setupCounter } from "./counter.ts";
import { io, Socket } from "socket.io-client";
import {
  ClientToServerEvents,
  ServerToClientEvents,
} from "./lib/types/socket.ts";

// ////////////////////////////////////////////////////////////////////////////
// REGION_START: render DOM
// ////////////////////////////////////////////////////////////////////////////

setupHomePage();
// setupCounter(document.querySelector<HTMLButtonElement>("#counter")!);

// ////////////////////////////////////////////////////////////////////////////
// REGION_END: render DOM
// ////////////////////////////////////////////////////////////////////////////

// ////////////////////////////////////////////////////////////////////////////
// REGION_START: Websockets
// ////////////////////////////////////////////////////////////////////////////

/**
 * @see https://socket.io/docs/v4/typescript/
 * please note that the types are reversed
 */
const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
  "http://localhost:8080"
);
console.log(socket);

// ////////////////////////////////////////////////////////////////////////////
// REGION_END: Websockets
// ////////////////////////////////////////////////////////////////////////////

// ////////////////////////////////////////////////////////////////////////////
// REGION_START: event handlers
// ////////////////////////////////////////////////////////////////////////////

const canvas = document.getElementsByTagName("canvas")[0];
const container = canvas.parentNode as HTMLDivElement;
function resizeCanvas() {
  canvas.width = container?.clientWidth;
  canvas.height = container?.clientHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

canvas.width = 500;
const ctx = canvas.getContext("2d");
if (ctx === null) {
  throw Error("Canvas context is null.");
}

const formRef = document.getElementById("formRef");
const messagesListRef = document.getElementById("messagesListRef");
const inputRef = document.getElementById("inputRef") as HTMLInputElement;
const sendRef = document.getElementById("sendRef");

const controlsClearButton = document.getElementById("controlsClearButton");
const controlsColorPickerInput = document.getElementById(
  "controlsColorPickerInput"
);

controlsClearButton?.addEventListener("click", (event) => {
  event.preventDefault();
  console.info(event.target, "Clearing canvas");
});
controlsColorPickerInput?.addEventListener("click", (event) => {
  console.info(event.target, "Picking color");
});

// Client side code.
// var socket = io("http://localhost:8080");

// socket.emit("client-ready");
// console.log(socket);
//
socket.on("message", (message) => {
  const welcomeMessage = document.createElement("li");
  welcomeMessage.textContent = message;
  welcomeMessage.style.opacity = "0.6";
  welcomeMessage.style.fontSize = "90.0%";
  welcomeMessage.style.textAlign = "center";

  messagesListRef?.appendChild(welcomeMessage);
});

// formRef?.addEventListener("submit", (e: Event) => {
//   e.preventDefault();
// });
// sendRef?.addEventListener("click", (e: MouseEvent) => {
//   e.preventDefault();
//   console.info(`**sendRef**`);
// });
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

socket.on("chat_message", (msg) => {
  const item = document.createElement("li");
  item.textContent = msg;
  messagesListRef?.appendChild(item);
  // Scroll form mesageListRef
  messagesListRef?.scrollTo(0, document.body.scrollHeight); // FIXME: Currently wrapper is of fixed width,height. add verticla block y axis scrolling.
  window.scrollTo(0, document.body.scrollHeight); // FIXME: Currently wrapper is of fixed width,height. add verticla block y axis scrolling.
});
// form.addEventListener("submit", (event) => {
//   event.preventDefault();
//   if (input.value) {
//     const now = new Date();
//     const timestamp = `${now.getHours().toString().padStart(2, "0")}:${now
//       .getMinutes()
//       .toString()
//       .padStart(2, "0")}`;

//     const msg = `${timestamp}: ${input.value}`;

//     socket.emit("chat message", msg);
//     input.value = ""; // Clear user input.
//   }
// });

// socket.on("chat message", (msg) => {
//   const item = document.createElement("li");
//   item.textContent = msg;
//   messages.appendChild(item);
//   window.scrollTo(0, document.body.scrollHeight);
// });
console.log(formRef, messagesListRef, inputRef, sendRef);

// ////////////////////////////////////////////////////////////////////////////
// REGION_END: event handlers
// ////////////////////////////////////////////////////////////////////////////

// ////////////////////////////////////////////////////////////////////////////
// REGION_START: setupHomePage
// ////////////////////////////////////////////////////////////////////////////

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

// ////////////////////////////////////////////////////////////////////////////
// REGION_END: setupHomePage
// ////////////////////////////////////////////////////////////////////////////
