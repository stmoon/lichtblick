// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import {
  MAV_CMD,
  mavlinkRequest,
  mavlinkService,
  needsConfirm,
  rosTopic,
  rosVehicleCommand,
  toMavCommand,
  vehicleIds,
} from "./commands";

describe("vehicle commands", () => {
  it("finds the vehicles from their topic namespaces", () => {
    expect(
      vehicleIds([
        "/vehicle57/fmu/out/vehicle_status",
        "/vehicle3/mavros/state",
        "/vehicle57/mavros/battery",
        "/clock",
        "/vehicles/list",
      ]),
    ).toEqual([3, 57]);
  });

  it("arms, disarms, and asks before takeoff and landing", () => {
    expect(toMavCommand({ kind: "arm" })).toEqual({
      command: MAV_CMD.COMPONENT_ARM_DISARM,
      params: [1, 0, 0, 0, 0, 0, 0],
    });
    expect(toMavCommand({ kind: "disarm" }).params[0]).toBe(0);
    expect(needsConfirm({ kind: "takeoff" })).toBe(true);
    expect(needsConfirm({ kind: "land" })).toBe(true);
    expect(needsConfirm({ kind: "arm" })).toBe(false);
  });

  it("sets PX4 modes as custom main and sub modes", () => {
    expect(toMavCommand({ kind: "mode", mode: "offboard" })).toEqual({
      command: MAV_CMD.DO_SET_MODE,
      params: [1, 6, 0, 0, 0, 0, 0],
    });
    expect(toMavCommand({ kind: "mode", mode: "return" }).params.slice(1, 3)).toEqual([4, 5]);
  });

  it("goes to mavros over MAVLink or to PX4 over ROS", () => {
    const cmd = toMavCommand({ kind: "arm" });
    expect(mavlinkService(57, "mavros")).toBe("/vehicle57/mavros/cmd/command");
    expect(mavlinkRequest(cmd)).toMatchObject({ command: 400, param1: 1, broadcast: false });
    expect(rosTopic(57)).toBe("/vehicle57/fmu/in/vehicle_command");
    expect(rosVehicleCommand(cmd, 57)).toMatchObject({
      command: 400,
      param1: 1,
      target_system: 57,
      target_component: 1,
      from_external: true,
    });
  });
});
