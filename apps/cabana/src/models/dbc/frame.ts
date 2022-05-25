import Signal from './signal';
import { IFrame, ISignal } from '../../types';

export default class Frame implements IFrame {
  name: string;

  id: number;

  size: number;

  transmitters: string[];

  extended: boolean;

  comment: string | null;

  signals: { [key: string]: Signal };

  constructor({
    name,
    id = 0,
    size = 0,
    transmitters = [],
    extended = false,
    comment = null,
    signals = {},
  }: FrameParameters) {
    this.name = name;
    this.id = id;
    this.size = size;
    this.transmitters = transmitters;
    this.extended = extended;
    this.comment = comment;
    this.signals = signals;
  }

  nextNewTransmitterName() {
    let txNum = 1;
    let txName;
    do {
      txName = `NEW_TRANSMITTER_${txNum}`;
      txNum += 1;
    } while (this.transmitters.indexOf(txName) !== -1);

    return txName;
  }

  addTransmitter() {
    const txName = this.nextNewTransmitterName();
    this.transmitters.push(txName);
    return txName;
  }

  header() {
    return `BO_ ${this.id} ${this.name}: ${this.size} ${this.transmitters[0] || 'XXX'}`;
  }

  text() {
    const signals = Object.values(this.signals)
      .map((signal: ISignal) => ` ${signal.text()}`) // indent
      .join('\n');

    if (signals.length > 0) {
      return `${this.header()}\n${signals}`;
    }
    return this.header();
  }

  copy() {
    const copy = Object.assign(Object.create(this), this);

    return copy;
  }
}

export type FrameParameters = {
  name: string;
  id?: number;
  size?: number;
  transmitters?: string[];
  extended?: boolean;
  comment?: string | null;
  signals?: { [key: string]: Signal };
};
