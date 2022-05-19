import client from "./lib/client";
import utils from "./lib/utils";

const urlStore: { [key: string]: any } = {};

export function getRouteFiles(routeName: string, nocache = false) {
  return getCached(`v1/route/${routeName}/files`, undefined, nocache);
}

export function getLogUrls(routeName: string, params?: { [key: string]: any }) {
  return getCached(`v1/route/${routeName}/log_urls`, params);
}

export function getUploadUrl(
  dongleId: string,
  path: string,
  expiry_days: number
) {
  return getCached(`v1.4/${dongleId}/upload_url/`, {
    path,
    expiry_days,
  });
}

export async function getUploadUrls(
  dongleId: string,
  paths: string[],
  expiry_days: number
) {
  return await client.post(`v1/${dongleId}/upload_urls/`, {
    paths,
    expiry_days,
  });
}

async function getCached(
  endpoint: string,
  params?: { [key: string]: any },
  nocache = false
) {
  // don't bother bouncing because the URLs themselves expire
  // our expiry time is from initial fetch time, not most recent access
  if (params !== undefined) {
    endpoint += "?" + utils.stringify(params);
  }

  if (urlStore[endpoint] && !nocache) {
    return urlStore[endpoint];
  }

  urlStore[endpoint] = await client.get(endpoint);

  setTimeout(function () {
    delete urlStore[endpoint];
  }, 1000 * 60 * 45); // expires in 1h, lets reset in 45m

  return urlStore[endpoint];
}
