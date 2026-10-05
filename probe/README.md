# METAR probe

A throwaway toolbar panel ([#1](https://github.com/mrlm-net/simconnect-commbus/issues/1)):
type an airport ICAO, it shows the simulator's METAR for it — the raw text and
the decoded fields — as the sim's JS facility listener gives it.

The question it answers: does that METAR follow the weather MSFS 2024 renders
(live weather, a preset, custom weather), or the real-world feed?

## Build

In MSFS 2024 with Developer Mode on, **before starting a flight**:
File › Open project… › `probe/SimConnectCommBusProbe.xml` › **Build All In Project**.
Then restart MSFS (a toolbar panel is not reloaded into a running sim).

(Or `fspackagetool.exe probe\SimConnectCommBusProbe.xml` with the sim closed.)

## Test

1. Start a flight, open the toolbar, click the METAR probe icon.
2. Type the airport you are at, **Get METAR**; compare wind, QNH, visibility and
   cloud with what the sim shows (and the aircraft's own instruments).
3. Set a custom weather preset with a distinctive wind and QNH, ask again.
4. Ask for a distant airport, too.

## What the sim's JS can reach (second tab)

The survey tab ([#2](https://github.com/mrlm-net/simconnect-commbus/issues/2)) tries,
live, what a toolbar panel's JS can reach: the view listeners, the facility loader
(METAR, airports, navaids), weather (ambient SimVars, presets), the sim's flight
plan and ATC, SimVar / L:var / K: events, the jetway, ground services, the camera
and CommBus. Each line shows **works**, **fails** or **not available**, with what
came back.

Most listener and call names are undocumented candidates. A wrong name shows up
as "fails" with the sim's error, so the results are what we learn.

1. Open the probe, tab **What the sim's JS can reach**, **Run the read-only tests**.
2. Lines marked **Try (changes the sim)** only run on their button: the L:var
   write, the parking brake, the jetway, the fuel truck. Try them at a gate.
3. **Any Coherent call**: a listener, a call name and JSON arguments, for trying
   more names.
4. Copy the **Report** box and paste it to Claude.
