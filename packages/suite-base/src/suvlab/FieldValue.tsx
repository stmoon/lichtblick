// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Typography } from "@mui/material";

import { useMessageDataItem } from "@lichtblick/suite-base/components/MessagePathSyntax/useMessageDataItem";

/** What a field holds at the playhead, beside its name in the topic list.
 *
 *  Opening a topic to see what is in it and then having to drop each field on
 *  a plot to find out its value is two steps where one will do — most of the
 *  time the question is "is this the field I want", and the number answers it.
 *
 *  Subscribing happens inside useMessageDataItem, and the list is virtualised,
 *  so only the fields actually on screen are ever subscribed to.
 */
export function FieldValue({ path }: { path: string }): React.JSX.Element | undefined {
  const matches = useMessageDataItem(path, { historySize: 1 });
  const item = matches[matches.length - 1]?.queriedData[0];
  if (item == undefined) {
    return undefined;
  }

  return (
    <Typography variant="caption" color="text.primary" noWrap style={{ fontVariantNumeric: "tabular-nums" }}>
      {format(item.value)}
    </Typography>
  );
}

/** Short enough to sit at the end of a 28px row. */
function format(value: unknown): string {
  if (value == undefined) {
    return "—";
  }
  if (typeof value === "number") {
    // Whole numbers as they are; anything else to three decimals, which is
    // where a sensor reading stops being interesting at a glance.
    return Number.isInteger(value) ? String(value) : value.toFixed(3);
  }
  if (typeof value === "boolean" || typeof value === "string") {
    return String(value);
  }
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (ArrayBuffer.isView(value)) {
    return `[${(value as unknown as ArrayLike<number>).length}]`;
  }
  if (Array.isArray(value)) {
    return `[${value.length}]`;
  }
  return "…";
}
