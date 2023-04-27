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
const inputRef = document.getElementById("inputRef");
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
// socket.on("message", (message) => {
//   const welcomeMessage = document.createElement("li");
//   welcomeMessage.textContent = message;
//   welcomeMessage.style.opacity = "0.6";
//   welcomeMessage.style.fontSize = "90.0%";
//   welcomeMessage.style.textAlign = "center";

//   messages.appendChild(welcomeMessage);
// });

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

formRef?.addEventListener("submit", (e: Event) => {
  e.preventDefault();
});
sendRef?.addEventListener("click", (e: MouseEvent) => {
  e.preventDefault();
  console.info(`**sendRef**`);
});

// ////////////////////////////////////////////////////////////////////////////
// REGION_END: event handlers
// ////////////////////////////////////////////////////////////////////////////

// ////////////////////////////////////////////////////////////////////////////
// REGION_START: setupHomePage
// ////////////////////////////////////////////////////////////////////////////

function setupHomePage(): void {
  document.querySelector<HTMLDivElement>(`#app`)!.innerHTML = /*html*/ `
<div style="display: flex; gap: 1rem;">
  <aside>
    <div class="controls" style="display: flex; align-items: center; justify-content: space-between;">
      <input type="color" name="CromePicker" id="controlsColorPickerInput" />
      <button id="controlsClearButton">Clear</button>
    </div>
  </aside>
  <main>
    <section>
      <h1 style="text-align: center; font-family: monospace; font-size: 1.25rem;">
        canvas multiplayer
      </h1>
    </section>


    <section>

      <div class="canvas-container">
        <canvas></canvas>
      </div>
      <!-- <canvas width="750" height="750" style="border: black; background: whitesmoke; border-radius: 1rem" class="border border-black rounded-md" /> -->
    </section>
  </main>

  <aside>
    <ul id="messagesListRef" class="messages debug!">
      <li>hi</li>
      <li>hi</li>
      <li></li>
      <li></li>
      <li></li>
      <li></li>
      <li></li>
      <li></li>
      <li></li>
    </ul>
    <form id="formRef" action="" class="messages_form">
      <input id="inputRef" type="text" autofocus autocomplete="off" placeholder="Send a message&#8230;" />
      <!-- <label for="sendRef">Send</label> -->
      <button id="sendRef" type="submit" class="messages_send">
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
