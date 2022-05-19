import CommaAPI from "./lib/api";
import { ATHENA_URL_ROOT } from "./lib/constants";

const client = new CommaAPI(ATHENA_URL_ROOT);

export function configure(accessToken: string) {
  client.configure(accessToken);
}

export async function postJsonRpcPayload(dongleId: string, payload: any) {
  return await client.post(dongleId, payload);
}
