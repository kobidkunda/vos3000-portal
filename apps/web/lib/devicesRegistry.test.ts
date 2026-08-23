import { test } from "node:test";
import assert from "node:assert/strict";
import { DEVICES, getDevice, filterDevices } from "./devicesRegistry";

test("registry has 12 devices with unique keys", () => {
  assert.equal(DEVICES.length, 12);
  const keys = new Set(DEVICES.map((d) => d.key));
  assert.equal(keys.size, 12);
});

test("getDevice resolves every key and rejects unknown", () => {
  for (const d of DEVICES) {
    assert.equal(getDevice(d.key)?.key, d.key);
  }
  assert.equal(getDevice("nonexistent"), undefined);
  assert.equal(getDevice(""), undefined);
});

test("filterDevices by category", () => {
  const soft = filterDevices("softphone");
  assert.ok(soft.length >= 5);
  assert.ok(soft.every((d) => d.category === "softphone"));
  const desk = filterDevices("deskphone");
  assert.ok(desk.length >= 5);
  assert.ok(desk.every((d) => d.category === "deskphone"));
});

test("filterDevices search matches label and key case-insensitively", () => {
  assert.ok(filterDevices(undefined, "yealink").some((d) => d.key === "yealink-t5x"));
  assert.ok(filterDevices(undefined, "MICROSIP").some((d) => d.key === "microsip"));
  assert.equal(filterDevices(undefined, "zzz-not-a-device").length, 0);
});

test("every device has instruction steps and troubleshooting", () => {
  for (const d of DEVICES) {
    assert.ok(d.instructionSteps.length >= 3, `${d.key} needs >=3 steps`);
    assert.ok(d.troubleshooting.length >= 2, `${d.key} needs >=2 troubleshooting entries`);
    assert.ok(typeof d.effortMinutes === "number");
  }
});
