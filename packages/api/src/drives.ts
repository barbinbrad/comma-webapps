import client from "./lib/client";
const SEGMENT_LENGTH = 1000 * 60;

export type Event = any;

export type ListRoutesParams = {
  limit: number;
  createdAfter?: number;
};

export type SegmentMetaData = {
  dongle_id: string;
  canonical_name: string;
  canonical_route_name: string;
  route: string;
  url: string;
  devicetype: number;
  hpgps: boolean;
  start_time_utc_millis: number;
  end_time_utc_millis: number;
  proc_camera: number;
  proc_dcamera: number;
  proc_log: number;
  proc_qlog: number;
  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;
  length: number;
  events: Event[];
  offset?: number;
  segment?: number;
  duration?: number;
  routeOffset?: number;
};

export type Segment = {
  dongleId: string;
  offset: number;
  route: string;
  startTime: number;
  startCoord: number[];
  endCoord: number[];
  duration: number;
  segments: number;
  url: string;
  events: any[];
  videoAvailableBetweenOffsets: number[][];
  hasVideo: boolean;
  deviceType: number;
  hpgps: boolean;
  hasDriverCamera: boolean;
  hasDriverCameraStream: boolean;
  locStart: string;
  locEnd: string;
  distanceMiles: number;
  cameraStreamSegCount: number;
  driverCameraStreamSegCount: number;
};

export async function fetchRoutes(
  dongleId: string,
  start: number,
  end: number
) {
  let segments = (await getSegmentMetadata(
    start,
    end,
    dongleId
  )) as SegmentMetaData[];
  segments = parseSegmentMetadata(start, end, segments);
  return segmentsFromMetadata(segments).reverse();
}

export function getSegmentMetadata(
  start: number,
  end: number,
  dongleId: string
) {
  return client.get("v1/devices/" + dongleId + "/segments", {
    from: start,
    to: end,
  });
}

export function getRouteInfo(routeName: string) {
  return client.get("v1/route/" + routeName + "/");
}

export function setRouteRating(routeName: string, rating: number) {
  return client.patch("v1/route/" + routeName + "/", { rating });
}

export function getShareSignature(routeName: string) {
  return client.get("v1/route/" + routeName + "/share_signature");
}

export function getRouteSegments(routeName: string) {
  return client.get("v1/route/" + routeName + "/segments");
}

export function listRoutes(
  dongleId: string,
  limit: number,
  createdAfter: number
) {
  let params: ListRoutesParams = { limit };
  if (typeof createdAfter !== "undefined") {
    params.createdAfter = createdAfter;
  }
  return client.get("v1/devices/" + dongleId + "/routes", params);
}

function parseSegmentMetadata(
  start: number,
  end: number,
  segments: SegmentMetaData[]
): SegmentMetaData[] {
  var lastSegmentTime = 0;
  var routeStartTimes: { [key: string]: number } = {};
  return segments.map(function (segment) {
    segment.offset = Math.round(segment.start_time_utc_millis) - start;
    if (!routeStartTimes[segment.canonical_route_name]) {
      let segmentNum = Number(segment.canonical_name.split("--")[2]);
      segment.segment = segmentNum;
      if (segmentNum > 0) {
        routeStartTimes[segment.canonical_route_name] =
          segment.offset - SEGMENT_LENGTH * segmentNum;
      } else {
        routeStartTimes[segment.canonical_route_name] = segment.offset;
      }
      segment.routeOffset = routeStartTimes[segment.canonical_route_name];
    } else {
      segment.routeOffset = routeStartTimes[segment.canonical_route_name];
    }

    lastSegmentTime = segment.offset;
    segment.duration = Math.round(
      segment.end_time_utc_millis - segment.start_time_utc_millis
    );

    return segment;
  });
}
function segmentsFromMetadata(segmentsData: SegmentMetaData[]): Segment[] {
  let curSegment: Segment | null = null;
  let curStopTime: number | null = null;
  let curVideoStartOffset: number | null = null;
  const segments: Segment[] = [];
  segmentsData.forEach(function (segment) {
    if (!segment.url) {
      return;
    }
    if (!(segment.proc_log === 40 || segment.proc_qlog === 40)) {
      return;
    }
    var segmentHasDriverCamera = segment.proc_dcamera >= 0;
    var segmentHasDriverCameraStream = segment.proc_dcamera === 40;
    var segmentHasVideo = segment.proc_camera === 40;

    if (segmentHasVideo && curVideoStartOffset === null) {
      curVideoStartOffset = segment.offset || null;
    }

    curStopTime = segment.start_time_utc_millis;
    if (!curSegment || curSegment.route !== segment.canonical_route_name) {
      if (curSegment) {
        finishSegment(curSegment);
      }
      let url = segment.url;
      let parts = url.split("/");

      if (Number.isFinite(Number(parts.pop()))) {
        // url has a number at the end
        url = parts.join("/");
      }
      curSegment = {
        dongleId: segment.dongle_id,
        offset: (segment.offset || 0) - (segment.segment || 0) * SEGMENT_LENGTH,
        route: segment.canonical_route_name,
        startTime: segment.start_time_utc_millis,
        startCoord: [segment.start_lng, segment.start_lat],
        endCoord: [segment.end_lng, segment.end_lat],
        duration: 0,
        segments: 0,
        url: url.replace(
          "chffrprivate.blob.core.windows.net",
          "chffrprivate.azureedge.net"
        ),
        events: [],
        videoAvailableBetweenOffsets: [],
        hasVideo: segmentHasVideo,
        deviceType: segment.devicetype,
        hpgps: segment.hpgps,
        hasDriverCamera: segmentHasDriverCamera,
        hasDriverCameraStream: segmentHasDriverCameraStream,
        locStart: "",
        locEnd: "",
        distanceMiles: 0.0,
        cameraStreamSegCount: 0,
        driverCameraStreamSegCount: 0,
      };
      segments.push(curSegment);
    }
    if (!segmentHasVideo && curVideoStartOffset !== null) {
      curSegment.videoAvailableBetweenOffsets.push([
        curVideoStartOffset,
        segment.offset || 0,
      ]);
      curVideoStartOffset = null;
    }
    curSegment.hasVideo = curSegment.hasVideo || segmentHasVideo;
    curSegment.hasDriverCamera =
      curSegment.hasDriverCamera || segmentHasDriverCamera;
    curSegment.hasDriverCameraStream =
      curSegment.hasDriverCameraStream || segmentHasDriverCameraStream;
    curSegment.hpgps = curSegment.hpgps || segment.hpgps;
    curSegment.duration =
      (segment.offset || 0) - curSegment.offset + (segment.duration || 0);
    curSegment.segments = Math.max(
      curSegment.segments,
      Number(segment.canonical_name.split("--").pop()) + 1
    );
    curSegment.events = curSegment.events.concat(segment.events);

    curSegment.distanceMiles += segment.length;
    curSegment.cameraStreamSegCount += Math.floor(Number(segmentHasVideo));
    curSegment.driverCameraStreamSegCount += Math.floor(
      Number(segmentHasDriverCameraStream)
    );
  });

  if (curSegment !== null) {
    finishSegment(curSegment);
  }

  return segments;

  function finishSegment(segment: Segment) {
    if (segment.hasVideo) {
      let lastVideoRange = segment.videoAvailableBetweenOffsets[
        segment.videoAvailableBetweenOffsets.length - 1
      ] || [segment.offset, segment.offset + segment.duration];
      segment.videoAvailableBetweenOffsets = [
        ...segment.videoAvailableBetweenOffsets.slice(
          0,
          segment.videoAvailableBetweenOffsets.length - 1
        ),
        [lastVideoRange[0], segment.offset + segment.duration],
      ];
    }
  }
}

function hasSegmentMetadata(state: any) {
  if (!state.segmentData) {
    console.log("No segment data at all");
    return false;
  }
  if (!state.segmentData.segments) {
    console.log("Still loading...");
    return false;
  }
  if (state.dongleId !== state.segmentData.dongleId) {
    console.log("Bad dongle id");
    return false;
  }
  if (state.start < state.segmentData.start) {
    console.log("Bad start offset");
    return false;
  }
  if (state.end > state.segmentData.end) {
    console.log("Bad end offset");
    return false;
  }
  if (state.end > state.segmentData.end) {
    console.log("Bad end offset");
    return false;
  }

  return (
    state.start >= state.segmentData.start && state.end <= state.segmentData.end
  );
}
