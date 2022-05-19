import client from "./lib/client";

export function listDevices() {
  return client.get("v1/me/devices/");
}

export function setDeviceAlias(dongle_id: string, alias: string) {
  return client.patch("v1/devices/" + dongle_id + "/", { alias });
}

export function setDeviceVehicleId(dongle_id: string, vehicle_id: string) {
  return client.patch("v1/devices/" + dongle_id + "/", { vehicle_id });
}

export function grantDeviceReadPermission(dongle_id: string, email: string) {
  return client.post("v1/devices/" + dongle_id + "/add_user", { email });
}

export function removeDeviceReadPermission(dongle_id: string, email: string) {
  return client.post("v1/devices/" + dongle_id + "/del_user", { email });
}

export async function fetchLocation(dongleId: string) {
  const locationEndpoint = "v1/devices/" + dongleId + "/location";
  const location: any = await client.get(locationEndpoint);
  if (location !== undefined && location.error === undefined) {
    return location;
  } else {
    throw Error("Could not fetch device location: " + JSON.stringify(location));
  }
}

export function fetchVehicles(vehicleId: string) {
  const vehicleEndpoint = "v1/vehicles/" + vehicleId;
  return client.get(vehicleEndpoint);
}

export function fetchDevice(dongleId: string) {
  const deviceEndpoint = "v1.1/devices/" + dongleId + "/";
  return client.get(deviceEndpoint);
}

export function pilotPair(pair_token: string) {
  return client.postForm("v2/pilotpair/", { pair_token });
}

export function fetchDeviceStats(dongleId: string) {
  return client.get("v1.1/devices/" + dongleId + "/stats");
}

export function unpair(dongleId: string) {
  return client.post("v1/devices/" + dongleId + "/unpair");
}

export function fetchDeviceOwner(dongleId: string) {
  return client.get("v1/devices/" + dongleId + "/owner");
}

export function getAthenaQueue(dongleId: string) {
  return client.get(`v1/devices/${dongleId}/athena_offline_queue`);
}
