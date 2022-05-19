import client from "./lib/client";

export async function refreshAccessToken(code: string, provider: string) {
  const resp: any = await client.postForm("v2/auth/", { code, provider });

  if (resp.access_token != null) {
    client.configure(resp.access_token);
    return resp.access_token;
  } else if (resp.response !== undefined) {
    throw new Error(
      "Could not exchange oauth code for access token: response " +
        resp.response
    );
  } else if (resp.error !== undefined) {
    throw new Error(
      "Could not exchange oauth code for access token: error " + resp.error
    );
  } else {
    console.log(resp);
    throw new Error(`Could not exchange oauth code for access token`);
  }
}
