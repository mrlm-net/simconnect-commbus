# simconnect-commbus

An add-on for Microsoft Flight Simulator 2024 that answers SimConnect programs
with what only the simulator's own JavaScript can reach.

A program outside the simulator talks to it over SimConnect's CommBus (JSON
messages between a SimConnect client and the simulator's gauges): it asks, the
add-on looks it up inside the simulator, and answers.

First: the METAR of any airport (the simulator's `getMetar`), which external
SimConnect cannot give in MSFS 2024 — its weather-at-a-station calls are
deprecated and the ambient SimVars only ever report the weather at the user's
aircraft.

Status: early. The first step is a probe that shows what `getMetar` returns
in the simulator, to check it against the weather the simulator renders.

The SimConnect side of CommBus is in [mrlm-net/simconnect](https://github.com/mrlm-net/simconnect).

## License

[Business Source License 1.1](LICENSE): non-commercial use (personal, hobby,
flight-simulation community, education, research, non-profit). Commercial use
needs a separate licence.
