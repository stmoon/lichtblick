// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { Fleet, applyMessage, fleetTopics, hasFix, navStateName, toEnu } from "./px4Fleet";

describe("px4Fleet", () => {
  it("subscribes to the PX4 and mavros topics of every vehicle", () => {
    expect(
      fleetTopics([
        "/vehicle3/fmu/out/vehicle_status_v1",
        "/vehicle3/fmu/out/vehicle_global_position",
        "/vehicle3/fmu/in/vehicle_command",
        "/vehicle57/mavros/state",
        "/vehicle57/mavlink/global_position/global",
        "/clock",
      ]),
    ).toEqual([
      "/vehicle3/fmu/out/vehicle_global_position",
      "/vehicle3/fmu/out/vehicle_status_v1",
      "/vehicle57/mavlink/global_position/global",
      "/vehicle57/mavros/state",
    ]);
  });

  it("folds PX4 messages into the vehicle", () => {
    const fleet: Fleet = new Map();
    applyMessage(fleet, "/vehicle3/fmu/out/vehicle_status_v1", { arming_state: 2, nav_state: 14 }, 1);
    applyMessage(fleet, "/vehicle3/fmu/out/battery_status", { remaining: 0.8 }, 1);
    applyMessage(fleet, "/vehicle3/fmu/out/vehicle_global_position", { lat: 37, lon: 127, alt: 50 }, 1);
    // facing north in NED (yaw 0) is pi/2 in ENU
    applyMessage(fleet, "/vehicle3/fmu/out/vehicle_attitude", { q: [1, 0, 0, 0] }, 1);
    expect(fleet.get(3)).toMatchObject({
      source: "ros",
      armed: true,
      mode: "Offboard",
      battery: 0.8,
      lat: 37,
      lon: 127,
      alt: 50,
    });
    expect(fleet.get(3)!.yaw).toBeCloseTo(Math.PI / 2);
    expect(hasFix(fleet.get(3)!)).toBe(true);
  });

  it("takes mavros only while the vehicle sends no ROS", () => {
    const fleet: Fleet = new Map();
    applyMessage(fleet, "/vehicle5/mavros/state", { armed: false, mode: "AUTO.LOITER" }, 10);
    expect(fleet.get(5)).toMatchObject({ source: "mavlink", mode: "AUTO.LOITER" });
    applyMessage(fleet, "/vehicle5/fmu/out/vehicle_status", { arming_state: 1, nav_state: 2 }, 11);
    applyMessage(fleet, "/vehicle5/mavros/state", { armed: true, mode: "OFFBOARD" }, 11.5);
    expect(fleet.get(5)).toMatchObject({ source: "ros", mode: "Position", armed: false });
    applyMessage(fleet, "/vehicle5/mavros/battery", { percentage: 0.5 }, 20);
    expect(fleet.get(5)).toMatchObject({ source: "mavlink", battery: 0.5 });
  });

  it("puts every vehicle in one east-north-up frame", () => {
    const ref = { lat: 37, lon: 127, alt: 10 };
    const [e, n, u] = toEnu(37.0001, 127.0001, 15, ref);
    expect(n).toBeCloseTo(11.13, 1);
    expect(e).toBeCloseTo(8.89, 1);
    expect(u).toBe(5);
    expect(navStateName(99)).toBe("nav_state 99");
  });
});
