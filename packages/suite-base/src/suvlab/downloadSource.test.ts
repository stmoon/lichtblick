// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { downloadName, sourceUrl } from "./downloadSource";

describe("sourceUrl", () => {
  it("is the address a remote recording is read from", () => {
    expect(sourceUrl("https://suvflight.cbnu.ac.kr/files/abc.mcap")).toBe(
      "https://suvflight.cbnu.ac.kr/files/abc.mcap",
    );
  });

  it("is nothing for a log opened from disk", () => {
    expect(sourceUrl("log_6_2026-9-15.ulg")).toBeUndefined();
    expect(sourceUrl(undefined)).toBeUndefined();
  });
});

describe("downloadName", () => {
  const url = "https://suvflight.cbnu.ac.kr/files/19389feb-e5c5-4b8c-90b5-8000429cf042.mcap";

  it("names the file after the log", () => {
    expect(downloadName(url, "log_6_2026-9-15-12-07-36.ulg")).toBe("log_6_2026-9-15-12-07-36.mcap");
  });

  it("keeps a merged log's two halves in the name", () => {
    expect(downloadName(url, "log_6.ulg + 20260915_004308_0.mcap")).toBe(
      "log_6.ulg + 20260915_004308_0.mcap",
    );
  });

  it("falls back to the URL when the archive says nothing", () => {
    expect(downloadName(url, undefined)).toBe("19389feb-e5c5-4b8c-90b5-8000429cf042.mcap");
  });

  it("drops characters a file system refuses", () => {
    expect(downloadName(url, 'a/b:c*d?"e<f>g|h')).toBe("a_b_c_d_e_f_g_h.mcap");
  });
});
