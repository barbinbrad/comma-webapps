import { MessageEntry } from '~/types';

const entries = {
  findTimeIndex: (messageEntries: MessageEntry[], time: number) => {
    return messageEntries.findIndex((e) => e.time >= time);
  },

  findRelativeTimeIndex: (messageEntries: MessageEntry[], relTime: number) => {
    return messageEntries.findIndex((e) => e.relTime >= relTime);
  },

  findSegmentIndices: (
    messageEntries: MessageEntry[],
    [segmentTimeLow, segmentTimeHi]: number[],
    isRelative: boolean,
  ) => {
    /*
      Finds pair of indices (inclusive, exclusive) within messageEntries array
      whose timestamps match segmentTimeLow and segmentTimeHi.
      if isRelative === true, then the segment times
      are assumed to correspond to the `relTime` field of each entry.
      Returns `[segmentIdxLow, segmentIdxHigh]`
               (inclusive, exclusive)
      */
    const timeIndexFunc =
      isRelative === true ? entries.findRelativeTimeIndex : entries.findTimeIndex;

    const segmentIdxLow = Math.max(0, timeIndexFunc(messageEntries, segmentTimeLow));

    const upperSegments = messageEntries.slice(segmentIdxLow);
    const upperSegmentIdxHi = timeIndexFunc(upperSegments, segmentTimeHi);
    const segmentIdxHi =
      upperSegmentIdxHi >= 0 ? upperSegmentIdxHi + segmentIdxLow + 1 : messageEntries.length - 1;

    return [segmentIdxLow, Math.max(0, Math.min(segmentIdxHi, messageEntries.length - 1))];
  },
};

export default entries;
