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
