/* eslint-disable class-methods-use-this */
import { IDbc } from '../../types';
import Signal from './signal';
import Frame from './frame';
import BoardUnit from './boardunit';
import utils from './utils';
import {
  DBC_COMMENT_RE,
  DBC_COMMENT_MULTI_LINE_RE,
  MSG_RE,
  SIGNAL_RE,
  MP_SIGNAL_RE,
  VAL_RE,
  VAL_TABLE_RE,
  MSG_TRANSMITTER_RE,
  SIGNAL_COMMENT_RE,
  SIGNAL_COMMENT_MULTI_LINE_RE,
  MESSAGE_COMMENT_RE,
  MESSAGE_COMMENT_MULTI_LINE_RE,
  BOARD_UNIT_RE,
  BOARD_UNIT_COMMENT_RE,
  BOARD_UNIT_COMMENT_MULTI_LINE_RE,
  FOLLOW_UP_DBC_COMMENT,
  FOLLOW_UP_SIGNAL_COMMENT,
  FOLLOW_UP_MSG_COMMENT,
  FOLLOW_UP_BOARD_UNIT_COMMENT,
} from './regex';

function floatOrInt(numericStr: string): number {
  if (Number.isInteger(numericStr)) {
    return parseInt(numericStr, 10);
  }
  return parseFloat(numericStr);
}

export function swapOrder(arr: string[], wordSize: number, gSize: number): string {
  const swappedWords = [];

  for (let i = 0; i < arr.length; i += wordSize) {
    const word = arr.slice(i, i + wordSize);
    for (let j = wordSize - gSize; j > -gSize; j -= gSize) {
      swappedWords.push(word.slice(j, j + gSize));
    }
  }

  return swappedWords.join('');
}

export default class DBC implements IDbc {
  boardUnits: BoardUnit[];

  comments: string[];

  dbcText?: string;

  messages: Map<number, Frame>;

  valueTables: Map<string, Map<string, string>>;

  lastUpdated?: number;

  constructor(dbcString?: string) {
    this.boardUnits = [];
    this.comments = [];
    this.messages = new Map<number, Frame>();
    this.valueTables = new Map<string, Map<string, string>>();

    if (dbcString !== undefined) {
      this.dbcText = dbcString;
      this.importDbcString(dbcString);
    }
  }

  getMessageFrame(address: number) {
    return this.messages.get(address);
  }

  nextNewFrameName() {
    const messageNames = Array.from(this.messages.values()).map((msg) => msg.name);

    let msgNum = 1;
    let msgName;
    do {
      msgName = `NEW_MSG_${msgNum}`;
      msgNum += 1;
    } while (messageNames.indexOf(msgName) !== -1);

    return msgName;
  }

  updateBoardUnits() {
    const boardUnitNames = this.boardUnits.map((bu) => bu.name);
    const missingBoardUnits = Array.from(this.messages.entries())
      .map((entry) => Object.values(entry[1].signals))
      .reduce((arr, signals) => arr.concat(signals), [])
      .map((signal) => signal.receiver)
      .reduce((arr, receivers) => arr.concat(receivers), [])
      .filter((recv, idx, array) => array.indexOf(recv) === idx)
      .filter((recv) => boardUnitNames.indexOf(recv) === -1)
      .map((recv) => new BoardUnit(recv));

    this.boardUnits = this.boardUnits.concat(missingBoardUnits);
  }

  text() {
    this.updateBoardUnits();

    let txt = 'VERSION ""\n\n\n';
    txt += `NS_ :${this.newSymbols()}`;
    txt += '\n\nBS_:\n';

    const boardUnitsText = this.boardUnits.map((bu) => bu.text()).join(' ');
    txt += `\nBU_: ${boardUnitsText}\n\n\n`;

    const frames = Array.from(this.messages.values()).map((frame: Frame) => frame);

    txt += `${frames.map((f) => f.text()).join('\n\n')}\n\n`;

    const messageTxs = frames
      .map((f: Frame) => {
        return {
          id: f.id,
          transmitters: f.transmitters.slice(1),
        };
      })
      .filter((entry) => entry.transmitters.length > 0);

    txt += `${messageTxs
      .map((entry) => `BO_TX_BU_ ${entry.id} : ${entry.transmitters.join(',')};`)
      .join('\n')}\n\n\n`;

    txt += this.boardUnits
      .filter((bu) => bu.comment !== null)
      .map((bu) => `CM_ BU_ ${bu.name} "${bu.comment}";`)
      .join('\n');

    txt += frames
      .filter((f) => f.comment !== null)
      .map((f) => `CM_ BO_ ${f.id} "${f.comment}";`)
      .join('\n');

    const signalsByMsgId = frames
      .map((f: Frame) =>
        Object.values(f.signals).map((sig) => {
          return { id: f.id, sig };
        }),
      )
      .reduce((s1, s2) => s1.concat(s2), []);

    txt += `${signalsByMsgId
      .filter((s) => s.sig.comment !== null)
      .map((s) => `CM_ SG_ ${s.id} ${s.sig.name} "${s.sig.comment}";`)
      .join('\n')}\n`;

    txt += `${signalsByMsgId
      .filter((s) => s.sig.valueDescriptions.size > 0)
      .map((s) => s.sig.valueDescriptionText(s.id))
      .join('\n')}\n`;

    txt += this.comments.map((comment) => `CM_ "${comment}";`).join('\n');

    return `${txt.trim()}\n`;
  }

  getMessageName(msgId: number) {
    const msg = this.getMessageFrame(msgId);
    if (msg) return msg.name;
    return null;
  }

  getSignals(msgId: number) {
    const msg = this.getMessageFrame(msgId);
    if (msg) return msg.signals;
    return {};
  }

  createFrame(msgId: number, size = 64) {
    const msg = new Frame({
      name: this.nextNewFrameName(),
      id: msgId,
      size,
    });

    this.messages.set(msgId, msg);
    return msg;
  }

  setSignals(msgId: number, signals: { [key: string]: Signal }, frameSize: number) {
    const msg = this.getMessageFrame(msgId); // TODO conform frameSize
    if (msg) {
      const newMsg = Object.assign(Object.create(msg), msg);
      newMsg.signals = signals;
      this.messages.set(msgId, newMsg);
    } else {
      const newMsg = this.createFrame(msgId, frameSize);
      newMsg.signals = signals;

      this.messages.set(msgId, newMsg);
      this.updateBoardUnits();
    }
  }

  addSignal(msgId: number, signal: Signal) {
    const msg = this.getMessageFrame(msgId);

    if (msg) {
      msg.signals[signal.name] = signal;
      this.updateBoardUnits();
    }
  }

  importDbcString(dbcString: string) {
    const warnings = [];
    const messages = new Map();
    const valueTables = new Map<string, Map<string, string>>();
    let boardUnits: BoardUnit[] = [];
    let followUp: any = null;
    let id = 0;

    const lines = dbcString.split('\n');
    for (let i = 0; i < lines.length; i += 1) {
      let line = lines[i].trim();

      if (line.length === 0) continue;

      if (followUp !== null) {
        const { type, data } = followUp;

        line = line.replace(/" *;/, '');
        let followUpLine = `\n${line.substring(0, line.length)}`;
        if (line.indexOf('"') !== -1) {
          followUp = null;
          followUpLine = followUpLine.substring(0, followUpLine.length - 1);
        }
        if (type === FOLLOW_UP_SIGNAL_COMMENT) {
          const signal = data;
          signal.comment += followUpLine;
        } else if (type === FOLLOW_UP_MSG_COMMENT) {
          const msg = data;
          msg.comment += followUpLine;
        } else if (type === FOLLOW_UP_BOARD_UNIT_COMMENT) {
          const boardUnit = data;
          boardUnit.comment += followUpLine;
        } else if (type === FOLLOW_UP_DBC_COMMENT) {
          //          const comment = data;
          const partialComment = this.comments[this.comments.length - 1];
          this.comments[this.comments.length - 1] = partialComment + followUpLine;
        }
      }

      if (line.indexOf('BO_ ') === 0) {
        const matches = line.match(MSG_RE);
        if (matches === null) {
          warnings.push(`failed to parse message definition on line ${i + 1} -- ${line}`);
          continue;
        }
        const [idString, name, sizeString, transmitter] = matches.slice(1);
        id = parseInt(idString, 10); // 0 radix parses hex or dec
        const size = parseInt(sizeString, 10);
        const frame = new Frame({
          name,
          id,
          size,
          transmitters: [transmitter],
        });
        messages.set(id, frame);
      } else if (line.indexOf('SG_') === 0) {
        let matches = line.match(SIGNAL_RE);

        if (matches === null) {
          matches = line.match(MP_SIGNAL_RE);
          if (matches === null) {
            warnings.push(`failed to parse signal definition on line ${i + 1} -- ${line}`);
            continue;
          }
          // for now, ignore multiplex which is matches[1]
          matches = [matches[1], ...matches.slice(3)];
        } else {
          matches = matches.slice(1);
        }

        const [
          name,
          startBitString,
          sizeString,
          isLittleEndianString,
          isSignedString,
          factorString,
          offsetString,
          minString,
          maxString,
          unit,
          receiverString,
        ] = matches;

        const startBit = parseInt(startBitString, 10);
        const size = parseInt(sizeString, 10);
        const isLittleEndian = parseInt(isLittleEndianString, 10) === 1;
        const isSigned = isSignedString === '-';
        const factor = floatOrInt(factorString);
        const offset = floatOrInt(offsetString);
        const min = floatOrInt(minString);
        const max = floatOrInt(maxString);
        const receiver = receiverString.split(',').map((s) => s.trim());

        const signalProperties = {
          name,
          startBit,
          size,
          isLittleEndian,
          isSigned,
          factor,
          offset,
          unit,
          min,
          max,
          receiver,
        };
        const signal = new Signal(signalProperties);

        if (messages.get(id) !== undefined) {
          messages.get(id).signals[name] = signal;
        } else {
          // eslint-disable-next-line no-console
          console.error(
            `importDbcString: could not add signal: ${name} due to missing message: ${id}`,
          );
        }
      } else if (line.indexOf('VAL_ ') === 0) {
        const matches = line.match(VAL_RE);

        if (matches !== null) {
          const [messageIdString, signalName, vals] = matches.slice(1);
          const values = vals
            .split('"')
            .map((s) => s.trim())
            .filter((s) => s.length > 0);

          const messageId = parseInt(messageIdString, 10);
          const msg = messages.get(messageId);
          const signal = msg.signals[signalName];
          if (signal === undefined) {
            warnings.push(
              `could not find signal for value description on line ${i + 1} -- ${line}`,
            );
            continue;
          }
          for (let j = 0; j < values.length; j += 2) {
            const value = values[j].trim();
            const description = values[j + 1].trim();
            signal.valueDescriptions.set(value, description);
          }
        } else {
          warnings.push(`failed to parse value description on line ${i + 1} -- ${line}`);
        }
      } else if (line.indexOf('VAL_TABLE_ ') === 0) {
        const matches = line.match(VAL_TABLE_RE);

        if (matches !== null) {
          const table = new Map();
          const [tableName, itemsString] = matches.slice(1);
          const items = itemsString
            .split('"')
            .map((s) => s.trim())
            .filter((s) => s.length > 0);

          for (let k = 0; k < items.length; k += 2) {
            const key = items[k];
            const value = items[k + 1];
            table.set(key, value);
          }
          valueTables.set(tableName, table);
        } else {
          warnings.push(`failed to parse value table on line ${i + 1} -- ${line}`);
        }
      } else if (line.indexOf('BO_TX_BU_ ') === 0) {
        const matches = line.match(MSG_TRANSMITTER_RE);

        if (matches !== null) {
          const [messageIdString, transmitter] = matches.slice(1);
          const messageId = parseInt(messageIdString, 10);

          const msg = messages.get(messageId);
          msg.transmitters.push(transmitter);
          messages.set(messageId, msg);
        } else {
          warnings.push(
            `failed to parse message transmitter definition on line ${i + 1} -- ${line}`,
          );
        }
      } else if (line.indexOf('CM_ SG_ ') === 0) {
        let matches = line.match(SIGNAL_COMMENT_RE);
        let hasFollowUp = false;
        if (matches === null) {
          matches = line.match(SIGNAL_COMMENT_MULTI_LINE_RE);
          hasFollowUp = true;
        }
        if (matches === null) {
          warnings.push(`failed to parse signal comment on line ${i + 1} -- ${line}`);
          continue;
        }

        const [messageIdString, signalName, comment] = matches.slice(1);
        const messageId = parseInt(messageIdString, 10);

        const msg = messages.get(messageId);
        if (msg === undefined) {
          warnings.push(`failed to parse signal comment on line ${i + 1} -- ${line}:
                         message id ${messageId} does not exist prior to this line`);
          continue;
        }
        const signal = msg.signals[signalName];
        if (signal === undefined) {
          warnings.push(`failed to parse signal comment on line ${i + 1} -- ${line}`);
          continue;
        } else {
          signal.comment = comment;
          messages.set(messageId, msg);
        }

        if (hasFollowUp) {
          followUp = { type: FOLLOW_UP_SIGNAL_COMMENT, data: signal };
        }
      } else if (line.indexOf('CM_ BO_ ') === 0) {
        let matches = line.match(MESSAGE_COMMENT_RE);
        let hasFollowUp = false;
        if (matches === null) {
          matches = line.match(MESSAGE_COMMENT_MULTI_LINE_RE);
          hasFollowUp = true;
          if (matches === null) {
            warnings.push(`failed to message comment on line ${i + 1} -- ${line}`);
            continue;
          }
        }

        const [messageIdString, comment] = matches.slice(1);
        const messageId = parseInt(messageIdString, 10);

        const msg = messages.get(messageId);
        if (msg === undefined) {
          warnings.push(`failed to find message to add comment to, msg id: ${messageId}`);
          continue;
        }
        msg.comment = comment;

        if (hasFollowUp) {
          followUp = { type: FOLLOW_UP_MSG_COMMENT, data: msg };
        }
      } else if (line.indexOf('BU_: ') === 0) {
        const matches = line.match(BOARD_UNIT_RE);

        if (matches !== null) {
          const [boardUnitNameStr] = matches.slice(1);
          const newBoardUnits = boardUnitNameStr
            .split(' ')
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
            .map((name) => new BoardUnit(name));

          boardUnits = boardUnits.concat(newBoardUnits);
        } else {
          warnings.push(`failed to parse board unit definition on line ${i + 1} -- ${line}`);
          continue;
        }
      } else if (line.indexOf('CM_ BU_ ') === 0) {
        let matches = line.match(BOARD_UNIT_COMMENT_RE);
        let hasFollowUp = false;
        if (matches === null) {
          matches = line.match(BOARD_UNIT_COMMENT_MULTI_LINE_RE);
          hasFollowUp = true;
          if (matches === null) {
            warnings.push(`failed to parse board unit comment on line ${i + 1} -- ${line}`);
            continue;
          }
        }

        const [boardUnitName, comment] = matches.slice(1);
        const boardUnit = boardUnits.find((bu) => bu.name === boardUnitName);
        if (boardUnit) {
          boardUnit.comment = comment;
        }

        if (hasFollowUp) {
          followUp = { type: FOLLOW_UP_BOARD_UNIT_COMMENT, data: boardUnit };
        }
      } else if (line.indexOf('CM_ ') === 0) {
        let matches = line.match(DBC_COMMENT_RE);
        let hasFollowUp = false;
        if (matches === null) {
          matches = line.match(DBC_COMMENT_MULTI_LINE_RE);
          if (matches === null) {
            warnings.push(`failed to parse dbc comment on line ${i + 1} -- ${line}`);
            continue;
          } else {
            hasFollowUp = true;
          }
        }

        const [comment] = matches.slice(1);
        this.comments.push(comment);
        if (hasFollowUp) {
          followUp = { type: FOLLOW_UP_DBC_COMMENT, data: comment };
        }
      }
    }

    this.messages = messages;
    this.boardUnits = boardUnits;
    this.valueTables = valueTables;
  }

  valueForIntSignal(signalSpec: Signal, view: DataView): bigint | number {
    let sigLsb: number;
    let sigMsb: number;

    if (signalSpec.isLittleEndian) {
      sigLsb = signalSpec.startBit;
      sigMsb = signalSpec.startBit + signalSpec.size - 1;
    } else {
      sigLsb = utils.matrixBitNumber(
        utils.bigEndianBitIndex(signalSpec.startBit) + signalSpec.size - 1,
      );
      sigMsb = signalSpec.startBit;
    }

    return signalSpec.size > 32
      ? this.valueForBigIntSignal(signalSpec, view, sigLsb, sigMsb)
      : this.valueForLittleIntSignal(signalSpec, view, sigLsb, sigMsb);
  }

  valueForLittleIntSignal(
    signalSpec: Signal,
    view: DataView,
    sigLsb: number,
    sigMsb: number,
  ): number {
    let ret = 0;
    let i = Math.floor(sigMsb / 8);
    let bits = signalSpec.size;
    while (i >= 0 && i < view.byteLength && bits > 0) {
      const lsb = Math.floor(sigLsb / 8) === i ? sigLsb : i * 8;
      const msb = Math.floor(sigMsb / 8) === i ? sigMsb : (i + 1) * 8 - 1;
      const size = msb - lsb + 1;

      const d = (view.getUint8(i) >>> (lsb - i * 8)) & ((1 << size) - 1);
      ret |= d << (bits - size);

      bits -= size;
      i = signalSpec.isLittleEndian ? i - 1 : i + 1;
    }

    if (signalSpec.isSigned) {
      ret -= (ret >> (signalSpec.size - 1)) & 1 ? 1 << signalSpec.size : 0;
    }
    return ret * signalSpec.factor + signalSpec.offset;
  }

  valueForBigIntSignal(
    signalSpec: Signal,
    view: DataView,
    sigLsb: number,
    sigMsb: number,
  ): bigint | number {
    let ret = BigInt(0);
    let i = Math.floor(sigMsb / 8);
    let bits = signalSpec.size;
    while (i >= 0 && i < view.byteLength && bits > 0) {
      const lsb = Math.floor(sigLsb / 8) === i ? sigLsb : i * 8;
      const msb = Math.floor(sigMsb / 8) === i ? sigMsb : (i + 1) * 8 - 1;
      const size = msb - lsb + 1;

      const d = (view.getUint8(i) >>> (lsb - i * 8)) & ((1 << size) - 1);
      ret |= BigInt(d) << BigInt(bits - size);

      bits -= size;
      i = signalSpec.isLittleEndian ? i - 1 : i + 1;
    }

    ret = signalSpec.isSigned ? BigInt.asIntN(64, ret) : ret;
    if (Number.isInteger(signalSpec.factor)) {
      return ret * BigInt(signalSpec.factor) + BigInt(signalSpec.offset);
    }

    return parseFloat(`${ret}`) * signalSpec.factor + signalSpec.offset;
  }

  getSignalValues(messageId: number, data: Uint8Array) {
    const signalValuesByName: { [key: string]: number | bigint } = {};
    const frame = this.getMessageFrame(messageId);
    if (frame !== undefined) {
      const view = new DataView(data.buffer);

      Object.values(frame.signals).forEach((signalSpec) => {
        if (Number.isNaN(signalSpec.startBit)) {
          return;
        }
        signalValuesByName[signalSpec.name] = this.valueForIntSignal(signalSpec, view);
      });
    }

    return signalValuesByName;
  }

  newSymbols() {
    return `
    NS_DESC_
    CM_
    BA_DEF_
    BA_
    VAL_
    CAT_DEF_
    CAT_
    FILTER
    BA_DEF_DEF_
    EV_DATA_
    ENVVAR_DATA_
    SGTYPE_
    SGTYPE_VAL_
    BA_DEF_SGTYPE_
    BA_SGTYPE_
    SIG_TYPE_REF_
    VAL_TABLE_
    SIG_GROUP_
    SIG_VALTYPE_
    SIGTYPE_VALTYPE_
    BO_TX_BU_
    BA_DEF_REL_
    BA_REL_
    BA_DEF_DEF_REL_
    BU_SG_REL_
    BU_EV_REL_
    BU_BO_REL_
    SG_MUL_VAL_`;
  }
}
