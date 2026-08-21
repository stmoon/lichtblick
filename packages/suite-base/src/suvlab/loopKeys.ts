// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Time, compare } from "@lichtblick/rostime";

/** Where the loop window ends up after marking one of its ends.
 *
 *  Marking is done while watching: you see the thing start, press one key, see
 *  it finish, press the other. So the window has to make sense after either
 *  key on its own, with the other end wherever it happens to be.
 *
 *  Marking a start that falls after the current end opens a new window from
 *  there to the end of the log, rather than refusing the key. The alternative
 *  reads as the shortcut being broken: you pressed it, and nothing moved. The
 *  same the other way round.
 */
export function marked(
  which: "start" | "end",
  at: Time,
  window: { start: Time; end: Time },
  bounds: { start: Time; end: Time },
): { start: Time; end: Time } {
  if (which === "start") {
    const end = compare(at, window.end) >= 0 ? bounds.end : window.end;
    return { start: at, end };
  }
  const start = compare(at, window.start) <= 0 ? bounds.start : window.start;
  return { start, end: at };
}
