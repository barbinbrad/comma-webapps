import client from "./lib/client";

export function getProfile(dongle_id: string) {
  const profile = dongle_id || "me";

  return client.get("v1/" + profile + "/");
}
