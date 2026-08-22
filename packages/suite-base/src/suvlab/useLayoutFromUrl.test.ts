// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { sameName } from "./useLayoutFromUrl";

describe("recognising a copy of the same preset", () => {
  it("matches the name it goes by now", () => {
    expect(sameName("철도연_궤적시험", "철도연_궤적시험")).toBe(true);
  });

  it("matches across the separators a rename changes", () => {
    // 철도연_궤적시험 was made as uwb-position and renamed since; the copies
    // left behind are the ones that keep showing an edit that was undone.
    expect(sameName("철도연 궤적시험", "철도연_궤적시험")).toBe(true);
    expect(sameName("uwb position", "uwb-position")).toBe(true);
    expect(sameName("UWB-Position", "uwb-position")).toBe(true);
  });

  it("does not match a different preset", () => {
    expect(sameName("철도연_궤적시험", "철도연_진동시험")).toBe(false);
    expect(sameName("대회_분석_1", "대회_분석_2")).toBe(false);
  });
});
