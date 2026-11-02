import { initBotId } from "botid/client/core";
initBotId({ protect: [
  { path: "/api/incorporation", method: "POST", advancedOptions: { checkLevel: "basic" } },
  { path: "/api/contact", method: "POST", advancedOptions: { checkLevel: "basic" } },
] });
