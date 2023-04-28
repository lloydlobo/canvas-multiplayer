import { DrawLineProps, DrawLineSocketProps } from "./canvas";

interface ServerToClientEvents {
  noArg: () => void;
  basicEmit: (a: number, b: string, c: Buffer) => void;
  withAck: (d: string, callback: (e: number) => void) => void;
  message: (data: string) => void;
  chat_message: (data: string) => void;
  get_canvas_state: (data: string) => void;
  canvas_state_from_server: (state: string) => void;
  draw_line: (data: DrawLineSocketProps) => void;
  clear: () => void;
}

interface ClientToServerEvents {
  hello: () => void;
  client_ready: () => void;
  canvas_state: (data: string) => void;
  chat_message: (data: string) => void;
  draw_line: (data: DrawLineSocketProps) => void;
  clear: () => void;
}

// Maybe add chat_message here.
interface InterServerEvents {
  ping: () => void;
}

interface SocketData {
  name: string;
  age: number;
}

export type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
};
