import client from "./lib/client";

export type SaveType = "favorite" | "recent";

export function setDestination(
  dongle_id: string,
  latitude: number,
  longitude: number,
  place_name: string,
  place_details: string
) {
  return client.post("v1/navigation/" + dongle_id + "/set_destination", {
    latitude,
    longitude,
    place_name,
    place_details,
  });
}

export function getLocationsData(dongle_id: string) {
  return client.get("v1/navigation/" + dongle_id + "/locations");
}

export function putLocationSave(
  dongle_id: string,
  latitude: number,
  longitude: number,
  place_name: string,
  place_details: string,
  save_type: SaveType,
  label?: string
) {
  return client.put("v1/navigation/" + dongle_id + "/locations", {
    latitude,
    longitude,
    place_name,
    place_details,
    save_type,
    label,
  });
}

export function patchLocationSave(
  dongle_id: string,
  nav_location_id: string,
  save_type: SaveType,
  label?: string
) {
  return client.patch("v1/navigation/" + dongle_id + "/locations", {
    id: nav_location_id,
    save_type,
    label,
  });
}

export function deleteLocationSave(dongle_id: string, nav_location_id: string) {
  return client.del("v1/navigation/" + dongle_id + "/locations", {
    id: nav_location_id,
  });
}

export function getLocationsNext(dongle_id: string) {
  return client.get("v1/navigation/" + dongle_id + "/next");
}
