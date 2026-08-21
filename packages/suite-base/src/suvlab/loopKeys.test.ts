// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { marked, nextMark } from "./loopKeys";

const t = (sec: number) => ({ sec, nsec: 0 });
const BOUNDS = { start: t(0), end: t(100) };

describe("marking the loop window while watching", () => {
  it("moves the start and leaves the end", () => {
    const out = marked("start", t(30), { start: t(10), end: t(80) }, BOUNDS);
    expect(out).toEqual({ start: t(30), end: t(80) });
  });

  it("moves the end and leaves the start", () => {
    const out = marked("end", t(60), { start: t(10), end: t(80) }, BOUNDS);
    expect(out).toEqual({ start: t(10), end: t(60) });
  });

  it("opens a new window when the start lands past the end", () => {
    // Refusing the key would read as the shortcut being broken: you pressed
    // it, and nothing moved.
    const out = marked("start", t(90), { start: t(10), end: t(80) }, BOUNDS);
    expect(out).toEqual({ start: t(90), end: BOUNDS.end });
  });

  it("and the same the other way round", () => {
    const out = marked("end", t(5), { start: t(10), end: t(80) }, BOUNDS);
    expect(out).toEqual({ start: BOUNDS.start, end: t(5) });
  });

  it("marking a start exactly on the end still leaves a window", () => {
    const out = marked("start", t(80), { start: t(10), end: t(80) }, BOUNDS);
    expect(out).toEqual({ start: t(80), end: BOUNDS.end });
  });

  it("marks against the whole log when no window has been set yet", () => {
    const out = marked("start", t(40), BOUNDS, BOUNDS);
    expect(out).toEqual({ start: t(40), end: BOUNDS.end });
  });
});


describe("which end the next ctrl-click marks", () => {
  it("starts by marking the start", () => {
    expect(nextMark(undefined)).toBe("start");
  });

  it("then the end", () => {
    expect(nextMark("start")).toBe("end");
  });

  it("and the click after that begins a new window", () => {
    // Two clicks make a window; a third means you are marking another one,
    // not extending the last.
    expect(nextMark("end")).toBe("start");
  });
});
