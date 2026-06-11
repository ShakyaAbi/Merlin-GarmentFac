import assert from "node:assert/strict";
import { resolvePrivateRouteState } from "../utils/privateRoute";

assert.equal(resolvePrivateRouteState(null, null), "denied");
assert.equal(resolvePrivateRouteState("token", null), "checking");
assert.equal(resolvePrivateRouteState("token", true), "allowed");
assert.equal(resolvePrivateRouteState("token", false), "denied");

console.log("privateRoute.test.ts passed");
