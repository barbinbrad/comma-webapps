/* eslint-disable no-bitwise */
import { ISignal } from '~/types';
import utils from './utils';

export default class Signal implements ISignal {
  name: string;

  startBit: number;

  size: number;

  isLittleEndian: boolean;

  isSigned: boolean;

  isFloat: boolean;

  factor: number;

  offset: number;

  unit: string;

  receiver: string[];

  comment: string | null;

  multiplex: string | null;

  min: number | null;

  max: number | null;

  // colors: string[];

  uid: string | null;

  valueDescriptions: Map<string, string>;

  constructor({
    name,
    startBit = 0,
    size = 0,
    isLittleEndian = true,
    isSigned = false,
    isFloat = false,
    factor = 1,
    offset = 0,
    unit = '',
    receiver = ['XXX'],
    comment = null,
    multiplex = null,
    min = null,
    max = null,
    valueDescriptions = new Map(),
  }: SignalParameters) {
    this.name = name;
    this.startBit = startBit;
    this.size = size;
    this.isLittleEndian = isLittleEndian;
    this.isSigned = isSigned;
    this.isFloat = isFloat;
    this.factor = factor;
    this.offset = offset;
    this.unit = unit;
    this.receiver = receiver;
    this.comment = comment;
    this.multiplex = multiplex;
    this.valueDescriptions = valueDescriptions;
    this.min = min || this.calculateMin();
    this.max = max || this.calculateMax();
    // this.colors = this.generateColors();
    this.uid = Math.random().toString(36);
  }

  text() {
    const multiplex = this.multiplex ? ` ${this.multiplex}` : '';
    const byteOrder = this.isLittleEndian ? 1 : 0;
    const signedChar = this.isSigned ? '-' : '+';

    return (
      `SG_ ${this.name}${multiplex} : ` +
      `${this.startBit}|${this.size}@${byteOrder}${signedChar}` +
      ` (${this.factor},${this.offset})` +
      ` [${this.min}|${this.max}]` +
      ` "${this.unit}" ${this.receiver}`
    );
  }

  valueDescriptionText(msgId: number) {
    const entryPairs = Array.from(this.valueDescriptions.entries());
    const values = entryPairs.reduce((str, [value, desc]) => `${str + value} "${desc}" `, '');
    return `VAL_ ${msgId} ${this.name} ${values};`;
  }

  lsbBitIndex() {
    // Returns LSB bit index in matrix order (see AddSignals.js)

    if (this.isLittleEndian) {
      return this.startBit;
    }
    const lsbBitNumber = this.lsbBitNumber();

    return utils.matrixBitNumber(lsbBitNumber);
  }

  lsbBitNumber() {
    // Returns LSB bit number in big endian ordering

    return utils.bigEndianBitIndex(this.startBit) + this.size - 1;
  }

  msbBitIndex() {
    if (this.isLittleEndian) {
      return this.startBit + this.size - 1;
    }
    return this.startBit;
  }

  littleEndianBitDescription(bitIndex: number) {
    const bitRange = [this.startBit, this.startBit + this.size - 1];
    if (bitIndex < bitRange[0] || bitIndex > bitRange[1]) {
      return null;
    }
    const bitNumber = bitIndex - bitRange[0];
    const isLsb = bitIndex === bitRange[0];
    const isMsb = bitIndex === bitRange[1];
    return { bitNumber, isLsb, isMsb };
  }

  bigEndianBitDescription(bitIndex: number) {
    const start = utils.bigEndianBitIndex(this.startBit);
    const range = [start, start + this.size - 1];
    const bitNumber = utils.bigEndianBitIndex(bitIndex);

    if (bitNumber < range[0] || bitNumber > range[1]) {
      return null;
    }

    const isLsb = bitNumber === range[1];
    const isMsb = bitIndex === this.startBit;
    return {
      bitNumber,
      isLsb,
      isMsb,
      range,
    };
  }

  bitDescription(bitIndex: number) {
    if (this.isLittleEndian) {
      return this.littleEndianBitDescription(bitIndex);
    }
    return this.bigEndianBitDescription(bitIndex);
  }

  calculateRawRange() {
    let rawRange = 2 ** this.size;
    if (this.isSigned) {
      rawRange /= 2;
    }
    return [this.isSigned ? -1 * rawRange : 0, rawRange - 1];
  }

  calculateMin() {
    const rawMin = this.calculateRawRange()[0];
    return this.offset + rawMin * this.factor;
  }

  calculateMax() {
    const rawMax = this.calculateRawRange()[1];
    return this.offset + rawMax * this.factor;
  }

  // getColors(messageId: string) {
  //   let parts = messageId.split(':').map((p) => ((3 + Number.parseInt(p, 16)) * 3) % 253);
  //   const colors = this.colors || this.generateColors();

  //   let lastColor = 0;

  //   return colors.map((c) => {
  //     parts = parts.map((p) => p ^ lastColor);
  //     lastColor = parts.reduce((m, v) => m ^ v, c);
  //     return lastColor;
  //   });
  // }

  // static generateColors(): string[] {
  //   const colors = randomcolor({ format: 'rgbArray' });

  //   return colors;
  // }

  equals(otherSignal: Signal) {
    return (
      otherSignal.name === this.name &&
      otherSignal.startBit === this.startBit &&
      otherSignal.size === this.size &&
      otherSignal.isLittleEndian === this.isLittleEndian &&
      otherSignal.isSigned === this.isSigned &&
      otherSignal.isFloat === this.isFloat &&
      otherSignal.factor === this.factor &&
      otherSignal.offset === this.offset &&
      otherSignal.unit === this.unit &&
      otherSignal.receiver.length === this.receiver.length &&
      otherSignal.receiver.every((v, i) => v === this.receiver[i]) &&
      otherSignal.comment === this.comment &&
      otherSignal.multiplex === this.multiplex
    );
  }
}

export type SignalParameters = {
  name: string;
  startBit?: number;
  size?: number;
  isLittleEndian?: boolean;
  isSigned?: boolean;
  isFloat?: boolean;
  factor?: number;
  offset?: number;
  unit?: string;
  receiver?: string[];
  comment?: string | null;
  multiplex?: string | null;
  min?: number | null;
  max?: number | null;
  valueDescriptions?: Map<string, string>;
};
