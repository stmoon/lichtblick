// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Palette,
  Select,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import { makeStyles } from "tss-react/mui";

import { PanelExtensionContext } from "@lichtblick/suite";
import Stack from "@lichtblick/suite-base/components/Stack";
import ThemeProvider from "@lichtblick/suite-base/theme/ThemeProvider";

import {
  Command,
  FLIGHT_MODES,
  FlightModeId,
  ROS_TOPIC_SCHEMA,
  Route,
  mavlinkRequest,
  mavlinkService,
  needsConfirm,
  rosTopic,
  rosVehicleCommand,
  toMavCommand,
  vehicleIds,
} from "./commands";

export type Config = {
  sysid?: number;
  route: Route;
  // mavros topic prefix of the MAVLink-made topics: /vehicle<sysid>/<prefix>/...
  mavlinkPrefix: string;
  mode: FlightModeId;
};

export const defaultConfig: Config = { route: "mavlink", mavlinkPrefix: "mavros", mode: "position" };

type Status = { ok: boolean; text: string } | undefined;

const useStyles = makeStyles()({ prefix: { width: 120 } });

function label(cmd: Command): string {
  if (cmd.kind === "mode") {
    return `mode ${FLIGHT_MODES.find((m) => m.id === cmd.mode)?.label ?? cmd.mode}`;
  }
  return cmd.kind;
}

function VehicleCommandContent({
  context,
  setColorScheme,
}: {
  context: PanelExtensionContext;
  setColorScheme: (mode: Palette["mode"]) => void;
}): React.JSX.Element {
  const [renderDone, setRenderDone] = useState<() => void>(() => () => {});
  const [topics, setTopics] = useState<string[]>([]);
  const [config, setConfig] = useState<Config>(() => ({
    ...defaultConfig,
    ...(context.initialState as Partial<Config>),
  }));
  const { classes } = useStyles();
  const [status, setStatus] = useState<Status>();
  const [confirming, setConfirming] = useState<Command | undefined>();
  const advertised = useMemo(() => new Set<string>(), []);

  useEffect(() => {
    context.saveState(config);
    context.setDefaultPanelTitle(
      config.sysid != undefined ? `Vehicle ${config.sysid} commands` : "Vehicle commands",
    );
  }, [config, context]);

  useEffect(() => {
    context.watch("topics");
    context.watch("colorScheme");
    context.onRender = (renderState, done) => {
      setRenderDone(() => done);
      setColorScheme(renderState.colorScheme ?? "light");
      setTopics((renderState.topics ?? []).map((t) => t.name));
    };
    return () => {
      context.onRender = undefined;
      for (const topic of advertised) {
        context.unadvertise?.(topic);
      }
    };
  }, [context, advertised, setColorScheme]);

  useEffect(() => {
    renderDone();
  }, [renderDone]);

  const vehicles = useMemo(() => vehicleIds(topics), [topics]);
  const sysid = config.sysid ?? vehicles[0];

  const send = useCallback(
    async (cmd: Command) => {
      if (sysid == undefined) {
        return;
      }
      const mav = toMavCommand(cmd);
      try {
        if (config.route === "mavlink") {
          if (!context.callService) {
            throw new Error("this data source cannot call services");
          }
          const service = mavlinkService(sysid, config.mavlinkPrefix);
          const reply = (await context.callService(service, mavlinkRequest(mav))) as {
            success?: boolean;
            result?: number;
          };
          setStatus({
            ok: reply.success === true,
            text: `${label(cmd)} -> vehicle ${sysid} (MAVLink): ${
              reply.success === true ? "accepted" : `refused (result ${reply.result ?? "?"})`
            }`,
          });
        } else {
          if (!context.advertise || !context.publish) {
            throw new Error("this data source cannot publish");
          }
          const topic = rosTopic(sysid);
          if (!advertised.has(topic)) {
            context.advertise(topic, ROS_TOPIC_SCHEMA);
            advertised.add(topic);
          }
          context.publish(topic, rosVehicleCommand(mav, sysid));
          setStatus({ ok: true, text: `${label(cmd)} -> vehicle ${sysid} (ROS): sent` });
        }
      } catch (err: unknown) {
        setStatus({ ok: false, text: `${label(cmd)}: ${(err as Error).message}` });
      }
    },
    [advertised, config.mavlinkPrefix, config.route, context, sysid],
  );

  const press = (cmd: Command) => {
    if (needsConfirm(cmd)) {
      setConfirming(cmd);
    } else {
      void send(cmd);
    }
  };

  const disabled = sysid == undefined;
  return (
    <Stack flex="auto" gap={1} padding={1.5} fullHeight>
      <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
        <Typography variant="caption">Vehicle</Typography>
        <Select
          size="small"
          value={sysid ?? ""}
          displayEmpty
          onChange={(e) => {
            setConfig({ ...config, sysid: Number(e.target.value) });
          }}
        >
          {vehicles.length === 0 && <MenuItem value="">no vehicle</MenuItem>}
          {vehicles.map((id) => (
            <MenuItem key={id} value={id}>
              /vehicle{id}
            </MenuItem>
          ))}
        </Select>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={config.route}
          onChange={(_e, route: Route | null) => {
            if (route) {
              setConfig({ ...config, route });
            }
          }}
        >
          <ToggleButton value="mavlink">MAVLink</ToggleButton>
          <ToggleButton value="ros">ROS topic</ToggleButton>
        </ToggleButtonGroup>
        {config.route === "mavlink" && (
          <TextField
            size="small"
            label="prefix"
            value={config.mavlinkPrefix}
            onChange={(e) => {
              setConfig({ ...config, mavlinkPrefix: e.target.value.replace(/^\/+|\/+$/g, "") });
            }}
            className={classes.prefix}
          />
        )}
      </Stack>
      <Stack direction="row" gap={1} flexWrap="wrap">
        <Button variant="contained" disabled={disabled} onClick={() => { press({ kind: "arm" }); }}>
          Arm
        </Button>
        <Button variant="outlined" disabled={disabled} onClick={() => { press({ kind: "disarm" }); }}>
          Disarm
        </Button>
        <Button variant="contained" disabled={disabled} onClick={() => { press({ kind: "takeoff" }); }}>
          Takeoff
        </Button>
        <Button variant="contained" disabled={disabled} onClick={() => { press({ kind: "land" }); }}>
          Land
        </Button>
      </Stack>
      <Stack direction="row" gap={1} alignItems="center">
        <Select
          size="small"
          value={config.mode}
          onChange={(e) => {
            setConfig({ ...config, mode: e.target.value });
          }}
        >
          {FLIGHT_MODES.map((m) => (
            <MenuItem key={m.id} value={m.id}>
              {m.label}
            </MenuItem>
          ))}
        </Select>
        <Button
          variant="outlined"
          disabled={disabled}
          onClick={() => { press({ kind: "mode", mode: config.mode }); }}
        >
          Set mode
        </Button>
      </Stack>
      {status && (
        <Typography variant="caption" color={status.ok ? "success.main" : "error"}>
          {status.text}
        </Typography>
      )}
      <Dialog open={confirming != undefined} onClose={() => { setConfirming(undefined); }}>
        <DialogTitle>
          {confirming ? `${label(confirming)} vehicle ${sysid}?` : ""}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Sends {confirming ? label(confirming) : ""} to /vehicle{sysid} over{" "}
            {config.route === "mavlink" ? "MAVLink" : "ROS"}.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setConfirming(undefined); }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              const cmd = confirming;
              setConfirming(undefined);
              if (cmd) {
                void send(cmd);
              }
            }}
          >
            Send
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

// ThemeProvider around the content, following the data source's color scheme.
export function VehicleCommand({ context }: { context: PanelExtensionContext }): React.JSX.Element {
  const [colorScheme, setColorScheme] = useState<Palette["mode"]>("light");
  return (
    <ThemeProvider isDark={colorScheme === "dark"}>
      <VehicleCommandContent context={context} setColorScheme={setColorScheme} />
    </ThemeProvider>
  );
}
