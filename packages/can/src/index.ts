const CAN_TRANSMIT = 1;
const CAN_EXTENDED = 4;
const CAN_MSG_LENGTH = 16;

export type CanMessage = {
  address: number;
  busTime: number;
  data: Buffer;
  bus: number;
};

export function unpackCAN(data?: Buffer): CanMessage[] {
  if (data === undefined) return [];
  if (data.byteLength % CAN_MSG_LENGTH !== 0) {
    let err = new Error(
      "can-message.unpackCAN: byteLength must be a multiple of " +
        CAN_MSG_LENGTH
    );
    throw err;
  }

  const msgs = [];

  for (let i = 0; i < data.byteLength; i += CAN_MSG_LENGTH) {
    let dat = data.slice(i, i + CAN_MSG_LENGTH);

    let datView = Buffer.from(dat);

    let f1 = datView.readInt32LE(0),
      f2 = datView.readInt32LE(4);
    let address;
    if ((f1 & CAN_EXTENDED) >>> 0) {
      address = f1 >>> 3;
    } else {
      address = f1 >>> 21;
    }

    let busTime = f2 >>> 16;
    let canMsgData = Buffer.from(dat.slice(8, 8 + (f2 & 0xf)));
    let bus = (f2 >> 4) & 0xf & 0xff;

    let msg: CanMessage = { address, busTime, data: canMsgData, bus };
    msgs.push(msg);
  }

  return msgs;
}

export function packCAN(canMessage: CanMessage): Buffer {
  var { address, data, bus } = canMessage;

  if (data.byteLength > 8) {
    let err = new Error(
      "can-message.packCAN: byteLength cannot be greater than 8"
    );
    throw err;
  }

  if (address >= 0x800) {
    address = ((address << 3) | CAN_TRANSMIT | CAN_EXTENDED) >>> 0;
  } else {
    address = ((address << 21) | CAN_TRANSMIT) >>> 0;
  }

  let buf = Buffer.alloc(0x10);

  buf.writeUInt32LE(address);
  buf.writeUInt32LE((data.byteLength | (bus << 4)) >>> 0, 4);
  data.copy(buf, 8);

  return buf;
}
