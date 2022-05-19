import CommaAPI from "./lib/api";

export default function routeApi(routeSigUrl: string) {
  const client = new CommaAPI(routeSigUrl);

  return {
    getCoords: async (cache_key = 0) =>
      await client.get(`route.coords?s=${cache_key}`),
    getJpegUrl: (routeOffsetSeconds: number) =>
      routeSigUrl + "/sec/" + routeOffsetSeconds.toString() + ".jpg",
  };
}
