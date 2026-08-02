// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useEffect } from "react";

import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@lichtblick/suite-base/components/MessagePipeline";
import { useFlightInfo } from "@lichtblick/suite-base/suvlab/flightInfo";

const APP_NAME = "SUV Lab Flight Log";

const selectPlayerName = (ctx: MessagePipelineContext) => ctx.playerState.name;

/**
 * DocumentTitleAdapter sets the document title based on the currently selected player
 */
export default function DocumentTitleAdapter(): React.JSX.Element {
  const playerName = useMessagePipeline(selectPlayerName);
  const flight = useFlightInfo();

  useEffect(() => {
    // The file name, not the blob URL: a browser tab shows the first thirty
    // characters or so, and every one of ours started with the same host.
    const name = flight?.filename ?? playerName;
    if (!name) {
      window.document.title = APP_NAME;
      return;
    }
    window.document.title = navigator.userAgent.includes("Mac")
      ? name
      : `${name} – ${APP_NAME}`;
  }, [flight, playerName]);

  return <></>;
}
