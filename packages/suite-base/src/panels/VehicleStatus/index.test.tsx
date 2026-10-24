/** @jest-environment jsdom */
// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import PanelSetup, { Fixture } from "@lichtblick/suite-base/stories/PanelSetup";

import VehicleStatus from "./index";

const STATUS = "/vehicle7/fmu/out/vehicle_status_v1";
const BATTERY = "/vehicle7/fmu/out/battery_status";
const POSITION = "/vehicle7/fmu/out/vehicle_global_position";
const MAVROS_STATE = "/vehicle9/mavros/state";

function event(topic: string, schemaName: string, message: unknown) {
  return { topic, schemaName, receiveTime: { sec: 10, nsec: 0 }, message, sizeInBytes: 0 };
}

describe("VehicleStatus panel", () => {
  it("lists every vehicle with its arming, mode and battery, from ROS and MAVLink", async () => {
    const fixture: Fixture = {
      topics: [
        { name: STATUS, schemaName: "px4_msgs/msg/VehicleStatus" },
        { name: BATTERY, schemaName: "px4_msgs/msg/BatteryStatus" },
        { name: POSITION, schemaName: "px4_msgs/msg/VehicleGlobalPosition" },
        { name: MAVROS_STATE, schemaName: "mavros_msgs/msg/State" },
      ],
      frame: {
        [STATUS]: [event(STATUS, "px4_msgs/msg/VehicleStatus", { arming_state: 2, nav_state: 14 })],
        [BATTERY]: [event(BATTERY, "px4_msgs/msg/BatteryStatus", { remaining: 0.8 })],
        [POSITION]: [
          event(POSITION, "px4_msgs/msg/VehicleGlobalPosition", { lat: 37, lon: 127, alt: 50 }),
        ],
        [MAVROS_STATE]: [
          event(MAVROS_STATE, "mavros_msgs/msg/State", { armed: false, mode: "AUTO.LOITER" }),
        ],
      },
    };
    render(
      <PanelSetup fixture={fixture}>
        <VehicleStatus />
      </PanelSetup>,
    );

    expect(await screen.findByText("/vehicle7")).toBeInTheDocument();
    expect(screen.getByText("Vehicles (2)")).toBeInTheDocument();
    expect(screen.getByText("Armed")).toBeInTheDocument();
    expect(screen.getByText("Offboard")).toBeInTheDocument();
    expect(screen.getByText("Battery 80%")).toBeInTheDocument();
    expect(screen.getByText("E 0.0 N 0.0 U 0.0 m")).toBeInTheDocument();
    expect(screen.getByText("/vehicle9")).toBeInTheDocument();
    expect(screen.getByText("AUTO.LOITER")).toBeInTheDocument();
  });
});
