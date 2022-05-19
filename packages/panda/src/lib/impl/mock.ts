// a mock interface for USB communications
// this is used by the test cases
import Event from "weakmap-event";
import { partial } from "ap";
import wait from "../delay";
import { PandaCommand, PandaDevice } from "../types";

const ErrorEvent = Event();
const ConnectEvent = Event();
const DisconnectEvent = Event();

export default class MockPanda implements PandaDevice {
  onError: () => void;

  onConnect: () => void;

  onDisconnect: () => void;

  constructor() {
    this.onError = partial(ErrorEvent.listen, this);
    this.onConnect = partial(ConnectEvent.listen, this);
    this.onDisconnect = partial(DisconnectEvent.listen, this);
  }

  async vendorRequest(params: Partial<PandaCommand>, message: any) {
    switch (params.request) {
      case 0xd2:
        return {
          data: Buffer.from("0x6c2f0000b20f00000000000000"),
          status: "ok",
        };
      case 0xd0:
        return {
          data: Buffer.from(
            "0x626134333533373534333663326136646b347a6776366c527744ffff6fe25de5"
          ),
          status: "ok",
        };
      default:
        return {
          data: Buffer.from(""),
          status: "error",
        };
    }
  }

  async vendorWrite(data: Partial<PandaCommand>, message: any) {
    return false;
  }

  async connect() {
    await wait(100);
    return "123345123";
  }

  async disconnect() {
    await wait(100);
    DisconnectEvent.broadcast(this, "123345123");
    return true;
  }

  async nextMessage() {
    if (~~(Math.random() * 20) === 0) {
      await wait(10);
    }
    return Buffer.from("ab".repeat(16), "hex");
  }
}
