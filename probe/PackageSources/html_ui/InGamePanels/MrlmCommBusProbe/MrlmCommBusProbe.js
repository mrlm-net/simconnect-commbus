// METAR probe (mrlm-net/simconnect-commbus#1): type an ICAO, get the simulator's
// METAR for it, as its JS facility listener gives it, raw and decoded — to check
// it against the weather the simulator renders before building the CommBus bridge.
//
// The lookup: RegisterViewListener("JS_LISTENER_FACILITY") first, then
// Coherent.call("GET_METAR_BY_IDENT", icao), which resolves to an object, not a
// string: the raw text in metarString, decoded fields beside it (devsupport
// t/17552; the fields as the avionics framework's Metar, FacilityWeather.ts).
// Absent values: negative wind, gust and pressure, null visibility, and
// -2147483648 for temperature and dewpoint (FacilityLoader.ts cleanMetar).

let facilityListener = null;
let ready = false;

function setStatus(text) {
	const el = document.getElementById("probe-status");
	if (el) el.textContent = text;
}

function show(id, text) {
	const el = document.getElementById(id);
	if (el) el.textContent = text;
}

const ABSENT_TEMP = -2147483648;

// decoded is the METAR's decoded fields with the absent ones left out.
function decoded(m) {
	const out = {};
	const keep = (k, v) => {
		if (v !== undefined && v !== null) out[k] = v;
	};
	keep("icao", m.icao);
	keep("time", m.day !== undefined ? `${m.day} ${m.hour}:${String(m.min).padStart(2, "0")}Z` : undefined);
	keep("windDir", m.windDir >= 0 ? m.windDir : undefined);
	keep("windSpeed", m.windSpeed >= 0 ? m.windSpeed : undefined);
	keep("windUnits", ["kt", "m/s", "km/h"][m.windSpeedUnits]);
	keep("vrb", m.vrb || undefined);
	keep("gust", m.gust >= 0 ? m.gust : undefined);
	keep("cavok", m.cavok || undefined);
	keep("vis", m.vis);
	keep("visUnits", ["m", "SM"][m.visUnits]);
	keep("layers", m.layers && m.layers.length ? m.layers.map((l) => ({ alt: l.alt * 100, cover: l.cover, type: l.type })) : undefined);
	keep("vertVis", m.vertVis);
	keep("temp", m.temp !== ABSENT_TEMP ? m.temp : undefined);
	keep("dew", m.dew !== ABSENT_TEMP ? m.dew : undefined);
	keep("qnhHpa", m.altimeterQ >= 0 ? m.altimeterQ : undefined);
	keep("altimeterInHg", m.altimeterA >= 0 ? m.altimeterA : undefined);
	keep("phenomena", m.phenomena && m.phenomena.length ? m.phenomena : undefined);
	keep("flightCategory", m.flightCategory);
	return out;
}

function onGetMetar() {
	if (!ready) {
		setStatus("The facility listener is not ready yet: try again in a moment.");
		return;
	}
	const icao = (document.getElementById("probe-icao").value || "").trim().toUpperCase();
	if (icao.length < 3) {
		setStatus("Type an airport ICAO, e.g. LKPD.");
		return;
	}
	setStatus(`Asking for ${icao}...`);
	const asked = Date.now();
	Coherent.call("GET_METAR_BY_IDENT", icao)
		.then((m) => {
			if (!m || m.icao === "") {
				setStatus(`No METAR for ${icao}.`);
				show("probe-raw", "");
				show("probe-decoded", "");
				return;
			}
			setStatus(`${icao}: answered in ${Date.now() - asked} ms.`);
			show("probe-raw", m.metarString || "(no metarString)");
			show("probe-decoded", JSON.stringify(decoded(m), null, 1));
		})
		.catch((e) => setStatus(`Error: ${e}`));
}

class IngamePanelMrlmCommBusProbe extends TemplateElement {
	constructor() {
		super(...arguments);
	}

	connectedCallback() {
		super.connectedCallback();
		// The facility calls answer only once the facility listener is registered.
		facilityListener = RegisterViewListener("JS_LISTENER_FACILITY", () => {
			ready = true;
			setStatus("Ready: type an ICAO and Get METAR.");
		});
	}
}

window.customElements.define("ingamepanel-mrlm-commbus-probe", IngamePanelMrlmCommBusProbe);
