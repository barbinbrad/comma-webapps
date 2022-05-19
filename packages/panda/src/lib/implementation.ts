import { PandaOptions, PandaDevice } from "./types";

export default async function PandaImplementations(
  options: Partial<PandaOptions>
): Promise<PandaDevice> {
  if ((await import("is-browser")).default) {
    if (options.wifi) {
      throw new Error("Cannot use Panda wifi in browser");
    }
    const PandaWebUSB = (await import("./impl/browser")).default;
    return new PandaWebUSB(navigator.usb);
  } if (options.wifi) {
    const PandaWifi = (await import("./impl/wifi")).default;
    return new PandaWifi();
  } if (isTestEnv()) {
    const PandaMock = (await import("./impl/mock")).default;
    return new PandaMock();
  } if ((await import("is-node")).default) {
    const PandaNodeUSB = (await import("./impl/node")).default;
    return new PandaNodeUSB(options);
  }
  console.log(process.env);
  throw new Error(
    "pandajs.PandaUSB: Unable to connect to any usb devices, unsupported environment."
  );
}

function isTestEnv() {
  if (process.env?.NODE_ENV === "test") {
    return true;
  }
  if (process.env?.npm_lifecycle_event === "test") {
    return true;
  }
  return false;
}
