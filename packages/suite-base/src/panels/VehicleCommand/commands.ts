// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// Vehicle commands for PX4 (webrealgazebo WebGCS). One MAVLink command
// (MAV_CMD + 7 params) goes out one of two ways:
// - MAVLink: the mavros service <ns>/<prefix>/cmd/command (CommandLong); mavros
//   sends it to the vehicle as COMMAND_LONG.
// - ROS: px4_msgs VehicleCommand on <ns>/fmu/in/vehicle_command (uXRCE-DDS).

export type Route = "mavlink" | "ros";

export const MAV_CMD = {
  NAV_LAND: 21,
  NAV_TAKEOFF: 22,
  DO_SET_MODE: 176,
  COMPONENT_ARM_DISARM: 400,
} as const;

// MAV_MODE_FLAG_CUSTOM_MODE_ENABLED: param2/param3 are PX4's main/sub mode
const CUSTOM_MODE_ENABLED = 1;

// PX4 custom modes (px4_custom_mode.h): main mode, and the sub mode of AUTO.
export const FLIGHT_MODES = [
  { id: "manual", label: "Manual", main: 1, sub: 0 },
  { id: "stabilized", label: "Stabilized", main: 7, sub: 0 },
  { id: "altitude", label: "Altitude", main: 2, sub: 0 },
  { id: "position", label: "Position", main: 3, sub: 0 },
  { id: "offboard", label: "Offboard", main: 6, sub: 0 },
  { id: "hold", label: "Hold", main: 4, sub: 3 },
  { id: "mission", label: "Mission", main: 4, sub: 4 },
  { id: "return", label: "Return", main: 4, sub: 5 },
] as const;

export type FlightModeId = (typeof FLIGHT_MODES)[number]["id"];

export type Command =
  | { kind: "arm" }
  | { kind: "disarm" }
  | { kind: "takeoff" }
  | { kind: "land" }
  | { kind: "mode"; mode: FlightModeId };

export type MavCommand = { command: number; params: number[] };

// Commands that move the vehicle off or onto the ground ask first.
export function needsConfirm(cmd: Command): boolean {
  return cmd.kind === "takeoff" || cmd.kind === "land";
}

// NaN: "use the current value" (position, altitude from MIS_TAKEOFF_ALT).
export function toMavCommand(cmd: Command): MavCommand {
  const nan = Number.NaN;
  switch (cmd.kind) {
    case "arm":
      return { command: MAV_CMD.COMPONENT_ARM_DISARM, params: [1, 0, 0, 0, 0, 0, 0] };
    case "disarm":
      return { command: MAV_CMD.COMPONENT_ARM_DISARM, params: [0, 0, 0, 0, 0, 0, 0] };
    case "takeoff":
      return { command: MAV_CMD.NAV_TAKEOFF, params: [nan, 0, 0, nan, nan, nan, nan] };
    case "land":
      return { command: MAV_CMD.NAV_LAND, params: [0, 0, 0, nan, nan, nan, nan] };
    case "mode": {
      const mode = FLIGHT_MODES.find((m) => m.id === cmd.mode);
      if (!mode) {
        throw new Error(`unknown flight mode ${cmd.mode}`);
      }
      return {
        command: MAV_CMD.DO_SET_MODE,
        params: [CUSTOM_MODE_ENABLED, mode.main, mode.sub, 0, 0, 0, 0],
      };
    }
  }
}

// sysids of the vehicles that have topics: /vehicle<sysid>/...
export function vehicleIds(topicNames: readonly string[]): number[] {
  const ids = new Set<number>();
  for (const name of topicNames) {
    const match = /^\/vehicle(\d+)\//.exec(name);
    if (match) {
      ids.add(Number(match[1]));
    }
  }
  return [...ids].sort((a, b) => a - b);
}

export function mavlinkService(sysid: number, prefix: string): string {
  return `/vehicle${sysid}/${prefix}/cmd/command`;
}

export const ROS_TOPIC_SCHEMA = "px4_msgs/msg/VehicleCommand";

export function rosTopic(sysid: number): string {
  return `/vehicle${sysid}/fmu/in/vehicle_command`;
}

// mavros_msgs/srv/CommandLong request
export function mavlinkRequest(cmd: MavCommand): Record<string, unknown> {
  const [param1, param2, param3, param4, param5, param6, param7] = cmd.params;
  return {
    broadcast: false,
    command: cmd.command,
    confirmation: 0,
    param1,
    param2,
    param3,
    param4,
    param5,
    param6,
    param7,
  };
}

// The ground station's own MAVLink ids (as the mavros of WebGCS).
const GCS_SYSTEM_ID = 255;
const GCS_COMPONENT_ID = 190;

// px4_msgs/msg/VehicleCommand. timestamp 0: PX4 does not check it.
export function rosVehicleCommand(cmd: MavCommand, sysid: number): Record<string, unknown> {
  const [param1, param2, param3, param4, param5, param6, param7] = cmd.params;
  return {
    timestamp: 0n,
    param1,
    param2,
    param3,
    param4,
    param5,
    param6,
    param7,
    command: cmd.command,
    target_system: sysid,
    target_component: 1,
    source_system: GCS_SYSTEM_ID,
    source_component: GCS_COMPONENT_ID,
    confirmation: 0,
    from_external: true,
  };
}
