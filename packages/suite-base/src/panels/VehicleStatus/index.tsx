// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// Every vehicle of the fleet (webrealgazebo WebGCS): battery, position,
// arming and flight mode. New vehicles show up as their topics appear.

import { Typography } from "@mui/material";
import { makeStyles } from "tss-react/mui";

import Panel from "@lichtblick/suite-base/components/Panel";
import PanelToolbar from "@lichtblick/suite-base/components/PanelToolbar";
import Stack from "@lichtblick/suite-base/components/Stack";
import { VehicleState, hasFix, toEnu } from "@lichtblick/suite-base/panels/shared/px4Fleet";
import { useFleet } from "@lichtblick/suite-base/panels/shared/useFleet";
import { SaveConfig } from "@lichtblick/suite-base/types/panels";

// no message for this long: the vehicle is shown as stale
const STALE_S = 3;

const useStyles = makeStyles()((theme) => ({
  card: {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(0.75, 1),
  },
  stale: { opacity: 0.5 },
  row: { display: "flex", justifyContent: "space-between", gap: theme.spacing(1) },
}));

function battery(v: VehicleState): string {
  return v.battery != undefined && v.battery >= 0 ? `${Math.round(v.battery * 100)}%` : "-";
}

type Config = Record<string, never>;
type Props = { config: Config; saveConfig: SaveConfig<Config> };

function VehicleStatusPanel(_props: Props): React.JSX.Element {
  const { classes, cx } = useStyles();
  const { fleet, ref, topicCount } = useFleet();
  const vehicles = [...fleet.values()].sort((a, b) => a.sysid - b.sysid);
  const newest = Math.max(0, ...vehicles.map((v) => v.lastSeen));

  return (
    <Stack fullHeight>
      <PanelToolbar />
      <Stack flex="auto" gap={1} padding={1} overflowY="auto">
        <Typography variant="subtitle2">Vehicles ({vehicles.length})</Typography>
        {vehicles.length === 0 && (
          <Typography variant="caption">
            {topicCount === 0
              ? "No vehicle yet: waiting for /vehicle<sysid> topics"
              : "Waiting for the vehicles' messages"}
          </Typography>
        )}
        {vehicles.map((v) => {
          const enu = hasFix(v) && ref ? toEnu(v.lat, v.lon, v.alt, ref) : undefined;
          return (
            <div
              key={v.sysid}
              className={cx(classes.card, newest - v.lastSeen > STALE_S && classes.stale)}
            >
              <div className={classes.row}>
                <Typography variant="body2" fontWeight={600}>
                  /vehicle{v.sysid}
                </Typography>
                <Typography variant="caption">{v.source === "ros" ? "ROS" : "MAVLink"}</Typography>
              </div>
              <div className={classes.row}>
                <Typography variant="caption" color={v.armed === true ? "warning.main" : undefined}>
                  {v.armed == undefined ? "-" : v.armed ? "Armed" : "Disarmed"}
                </Typography>
                <Typography variant="caption">{v.mode ?? "-"}</Typography>
                <Typography variant="caption">Battery {battery(v)}</Typography>
              </div>
              <Typography
                variant="caption"
                title={
                  hasFix(v)
                    ? `${v.lat.toFixed(7)}, ${v.lon.toFixed(7)}, ${v.alt.toFixed(1)} m`
                    : undefined
                }
              >
                {enu
                  ? `E ${enu[0].toFixed(1)} N ${enu[1].toFixed(1)} U ${enu[2].toFixed(1)} m`
                  : "no position"}
              </Typography>
            </div>
          );
        })}
      </Stack>
    </Stack>
  );
}

VehicleStatusPanel.panelType = "VehicleStatus";
VehicleStatusPanel.defaultConfig = {};

export default Panel(VehicleStatusPanel);
