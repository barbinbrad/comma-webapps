import CommaAPI from "./lib/api";

export default function videoApi(routeSigUrl: string) {
  const storageRequest = new CommaAPI(routeSigUrl);

  return {
    getQcameraStreamIndexUrl: () => routeSigUrl + "/qcamera.m3u8",
    getQcameraStreamIndex: () => storageRequest.stream("qcamera.m3u8"),
  };
}
