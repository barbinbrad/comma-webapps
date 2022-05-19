import client from "./lib/client";

export function getLeaderboard() {
  return client.get("v2/leaderboard/");
}
