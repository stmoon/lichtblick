// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { useCallback, useMemo } from "react";

import { useDataSourceInfo, useMessageReducer } from "@lichtblick/suite-base/PanelAPI";
import { MessageEvent } from "@lichtblick/suite-base/players/types";

import { Fleet, Reference, applyMessage, fleetTopics, hasFix } from "./px4Fleet";

type FleetState = { fleet: Fleet; version: number; ref?: Reference };

// Every vehicle's topics (new vehicles too, as their topics appear), folded
// into one fleet. version changes when the fleet does. ref: the first
// position seen, the origin of the panels' common ENU frame.
export function useFleet(): FleetState & { topicCount: number } {
  const { topics } = useDataSourceInfo();
  // joined, so the subscription changes only when the set of topics does
  const key = useMemo(() => fleetTopics(topics.map((t) => t.name)).join(","), [topics]);
  const wanted = useMemo(() => (key ? key.split(",") : []), [key]);

  const restore = useCallback(
    (prev?: FleetState): FleetState => prev ?? { fleet: new Map(), version: 0 },
    [],
  );
  const addMessages = useCallback(
    (prev: FleetState, events: readonly MessageEvent[]): FleetState => {
      for (const e of events) {
        applyMessage(prev.fleet, e.topic, e.message, e.receiveTime.sec + e.receiveTime.nsec / 1e9);
      }
      let ref = prev.ref;
      if (!ref) {
        const first = [...prev.fleet.values()].find(hasFix);
        if (first && hasFix(first)) {
          ref = { lat: first.lat, lon: first.lon, alt: first.alt };
        }
      }
      return { fleet: prev.fleet, version: prev.version + 1, ref };
    },
    [],
  );

  const state = useMessageReducer<FleetState>({ topics: wanted, restore, addMessages });
  return { ...state, topicCount: wanted.length };
}
