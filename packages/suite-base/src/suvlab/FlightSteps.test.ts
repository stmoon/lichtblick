// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { stepTo } from "./FlightSteps";

const HERE =
  "https://suvflight.cbnu.ac.kr/viewer/?ds=remote-file" +
  "&ds.url=https%3A%2F%2Fsuvflight.cbnu.ac.kr%2Ff%2Fone%2Faaa.mcap" +
  "&layoutUrl=https%3A%2F%2Fsuvflight.cbnu.ac.kr%2Flayouts%2Flayout-fd3d3f0a.json" +
  "&time=2026-08-13T03%3A12%3A54.007779000Z";

const NEXT = "https://suvflight.cbnu.ac.kr/f/two/bbb.mcap";

describe("stepping to the next log", () => {
  it("swaps the log", () => {
    expect(new URL(stepTo(HERE, NEXT)).searchParams.get("ds.url")).toBe(NEXT);
  });

  it("keeps the layout, which is how you are reading rather than what", () => {
    expect(new URL(stepTo(HERE, NEXT)).searchParams.get("layoutUrl")).toBe(
      "https://suvflight.cbnu.ac.kr/layouts/layout-fd3d3f0a.json",
    );
  });

  it("keeps the source type", () => {
    expect(new URL(stepTo(HERE, NEXT)).searchParams.get("ds")).toBe("remote-file");
  });

  it("drops the playhead, which named an instant inside the log being left", () => {
    expect(new URL(stepTo(HERE, NEXT)).searchParams.has("time")).toBe(false);
  });

  it("leaves an address with nothing else on it alone", () => {
    const bare = "https://suvflight.cbnu.ac.kr/viewer/?ds=remote-file&ds.url=x";
    expect(new URL(stepTo(bare, NEXT)).searchParams.get("ds.url")).toBe(NEXT);
  });
});
