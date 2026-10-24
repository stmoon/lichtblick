// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// The vehicles of a webrealgazebo WebGCS, from their topics (Vehicle Status
// and Fleet 3D panels). A vehicle is /vehicle<sysid>/...; its data comes from
// - ROS: PX4 uXRCE-DDS, /vehicle<sysid>/fmu/out/<topic>[_v<n>] (px4_msgs)
// - MAVLink: mavros, /vehicle<sysid>/<prefix>/... (any prefix)
// ROS wins: MAVLink values are taken only while the vehicle sends no ROS ones.

export type VehicleState = {
  sysid: number;
  source?: "ros" | "mavlink";
  lat?: number;
  lon?: number;
  // meters; ROS: AMSL, MAVLink: above the ellipsoid
  alt?: number;
  // heading, radians counterclockwise from east (ENU)
  yaw?: number;
  // 0..1
  battery?: number;
  armed?: boolean;
  mode?: string;
  // receive time of the last message, seconds
  lastSeen: number;
  rosSeen?: number;
};

export type Fleet = Map<number, VehicleState>;

// how long a vehicle's ROS data shadows its MAVLink data
const ROS_PRECEDENCE_S = 2;

const ROS_TOPIC =
  /^\/vehicle(\d+)\/fmu\/out\/(vehicle_global_position|vehicle_attitude|battery_status|vehicle_status)(?:_v\d+)?$/;
const MAVLINK_TOPIC =
  /^\/vehicle(\d+)\/[^/]+\/(global_position\/global|local_position\/pose|battery|state)$/;

// PX4 VehicleStatus.nav_state
const NAV_STATES: Record<number, string> = {
  0: "Manual",
  1: "Altitude",
  2: "Position",
  3: "Mission",
  4: "Hold",
  5: "Return",
  6: "Position slow",
  10: "Acro",
  12: "Descend",
  13: "Termination",
  14: "Offboard",
  15: "Stabilized",
  17: "Takeoff",
  18: "Land",
  19: "Follow target",
  20: "Precision land",
  21: "Orbit",
  22: "VTOL takeoff",
};

export function navStateName(navState: number): string {
  return NAV_STATES[navState] ?? `nav_state ${navState}`;
}

// The topics the fleet panels subscribe to.
export function fleetTopics(topicNames: readonly string[]): string[] {
  return topicNames.filter((name) => ROS_TOPIC.test(name) || MAVLINK_TOPIC.test(name)).sort();
}

type Quaternion = { w: number; x: number; y: number; z: number };

function yawOf(q: Quaternion): number {
  return Math.atan2(2 * (q.w * q.z + q.x * q.y), 1 - 2 * (q.y * q.y + q.z * q.z));
}

// Folds one message into the fleet. Returns whether it was a fleet topic.
export function applyMessage(
  fleet: Fleet,
  topic: string,
  message: unknown,
  receiveTimeS: number,
): boolean {
  const msg = message as Record<string, unknown>;
  const ros = ROS_TOPIC.exec(topic);
  const mav = ros ? undefined : MAVLINK_TOPIC.exec(topic);
  const match = ros ?? mav;
  if (!match) {
    return false;
  }
  const sysid = Number(match[1]);
  const v: VehicleState = fleet.get(sysid) ?? { sysid, lastSeen: receiveTimeS };
  fleet.set(sysid, v);
  v.lastSeen = receiveTimeS;
  if (ros) {
    v.source = "ros";
    v.rosSeen = receiveTimeS;
    switch (ros[2]) {
      case "vehicle_global_position":
        v.lat = msg.lat as number;
        v.lon = msg.lon as number;
        v.alt = msg.alt as number;
        break;
      case "vehicle_attitude": {
        // PX4: NED/FRD quaternion [w, x, y, z]; ENU yaw = pi/2 - NED yaw
        const q = msg.q as number[];
        v.yaw = Math.PI / 2 - yawOf({ w: q[0]!, x: q[1]!, y: q[2]!, z: q[3]! });
        break;
      }
      case "battery_status":
        v.battery = msg.remaining as number;
        break;
      case "vehicle_status":
        v.armed = (msg.arming_state as number) === 2;
        v.mode = navStateName(msg.nav_state as number);
        break;
    }
    return true;
  }
  if (v.rosSeen != undefined && receiveTimeS - v.rosSeen < ROS_PRECEDENCE_S) {
    return true;
  }
  v.source = "mavlink";
  switch (mav![2]) {
    case "global_position/global":
      v.lat = msg.latitude as number;
      v.lon = msg.longitude as number;
      v.alt = msg.altitude as number;
      break;
    case "local_position/pose": {
      // mavros: ENU/FLU already
      const pose = msg.pose as { orientation: Quaternion };
      v.yaw = yawOf(pose.orientation);
      break;
    }
    case "battery":
      v.battery = msg.percentage as number;
      break;
    case "state":
      v.armed = msg.armed as boolean;
      v.mode = msg.mode as string;
      break;
  }
  return true;
}

export type Reference = { lat: number; lon: number; alt: number };

const EARTH_RADIUS_M = 6378137;

// East, north, up in meters from the reference (equirectangular: fine for a
// field of a few kilometers).
export function toEnu(lat: number, lon: number, alt: number, ref: Reference): [number, number, number] {
  const rad = Math.PI / 180;
  const east = (lon - ref.lon) * rad * EARTH_RADIUS_M * Math.cos(ref.lat * rad);
  const north = (lat - ref.lat) * rad * EARTH_RADIUS_M;
  return [east, north, alt - ref.alt];
}

export function hasFix(v: VehicleState): v is VehicleState & { lat: number; lon: number; alt: number } {
  return (
    v.lat != undefined &&
    v.lon != undefined &&
    v.alt != undefined &&
    Number.isFinite(v.lat) &&
    Number.isFinite(v.lon) &&
    Number.isFinite(v.alt)
  );
}
