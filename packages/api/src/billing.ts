import CommaAPI from "./lib/api";
import { BILLING_URL_ROOT } from "./lib/constants";

const client = new CommaAPI(BILLING_URL_ROOT);

export async function getSubscription(dongleId: string) {
  return await client.get("v1/prime/subscription", { dongle_id: dongleId });
}

export async function getSubscribeInfo(dongleId: string) {
  return await client.get("v1/prime/subscribe_info", { dongle_id: dongleId });
}

export async function cancelPrime(dongleId: string) {
  return await client.post("v1/prime/cancel", { dongle_id: dongleId });
}

export async function getSimValid(dongleId: string, simId: string) {
  return await client.get("v1/prime/sim_valid", {
    dongle_id: dongleId,
    sim_id: simId,
  });
}

export async function getStripeCheckout(
  dongleId: string,
  simId: string,
  plan: string
) {
  return await client.post("v1/prime/stripe_checkout", {
    dongle_id: dongleId,
    sim_id: simId,
    plan: plan,
  });
}

export async function getStripePortal(dongleId: string) {
  return await client.get("v1/prime/stripe_portal", { dongle_id: dongleId });
}

export async function getStripeSession(dongleId: string, sessionId: string) {
  return await client.get("v1/prime/stripe_session", {
    dongle_id: dongleId,
    session_id: sessionId,
  });
}
