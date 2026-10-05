// Capability survey (mrlm-net/simconnect-commbus#3): what the simulator's JS
// can reach from a toolbar panel, tried live. Each test reports works / fails /
// not available with a sample of what came back, so the MyCrew sim bridge can
// pick what to carry over CommBus.
//
// The listener and call names below are candidates: Asobo documents few of
// them. A wrong name shows up as "fails" or "not available" with the sim's own
// error — nothing here is assumed to work. Tests that change anything run only
// on their own button (marked "changes the sim").

const SURVEY_TIMEOUT_MS = 4000;
const surveyResults = {};

// withTimeout resolves p, or rejects after ms.
function withTimeout(p, ms) {
	return new Promise((resolve, reject) => {
		const t = setTimeout(() => reject(new Error("no answer in " + ms + " ms")), ms);
		Promise.resolve(p).then(
			(v) => {
				clearTimeout(t);
				resolve(v);
			},
			(e) => {
				clearTimeout(t);
				reject(e);
			}
		);
	});
}

// sample is v as short text for the table.
function sample(v) {
	let s;
	try {
		s = typeof v === "string" ? v : JSON.stringify(v);
	} catch (e) {
		s = String(v);
	}
	if (s === undefined) s = "undefined";
	return s.length > 600 ? s.slice(0, 600) + " …(" + s.length + " chars)" : s;
}

// The view listeners tried: does registering one call back (ready)?
const LISTENERS = [
	"JS_LISTENER_FACILITY",
	"JS_LISTENER_FLIGHTPLAN",
	"JS_LISTENER_ATC",
	"JS_LISTENER_WEATHER",
	"JS_LISTENER_SIMVARS",
	"JS_LISTENER_KEYEVENT",
	"JS_LISTENER_MAPS",
	"JS_LISTENER_CAMERA",
	"JS_LISTENER_INSTRUMENTS",
	"JS_LISTENER_COMM_BUS",
];
const listeners = {};

function listenerReady(name) {
	if (listeners[name]) return listeners[name].ready;
	listeners[name] = {
		ready: new Promise((resolve) => {
			try {
				listeners[name].view = RegisterViewListener(name, () => resolve(true));
			} catch (e) {
				resolve(false);
			}
		}),
	};
	return listeners[name].ready;
}

// coherent calls method with args once listener is ready.
function coherent(listener, method, args) {
	return withTimeout(listenerReady(listener), SURVEY_TIMEOUT_MS).then(() => Coherent.call.apply(Coherent, [method].concat(args || [])));
}

// sv reads a SimVar (not "simvar": simvar.js has a global of that name).
function sv(name, unit) {
	return SimVar.GetSimVarValue(name, unit);
}

// The tests: id, group, label, run (a promise of a sample), changes (only on
// its own button).
const TESTS = [];
function test(group, id, label, run, changes) {
	TESTS.push({ group, id, label, run, changes: !!changes });
}

// Listeners
LISTENERS.forEach((n) =>
	test("View listeners", "listener:" + n, n + " registers and calls back", () =>
		withTimeout(listenerReady(n), SURVEY_TIMEOUT_MS).then(() => "ready")
	)
);

// facilityEvent calls method on the facility listener and waits for the
// first of events with the data (LOAD_* answer true at once; the facility
// comes on SendAirport / SendVor / ..., a nearest search on
// NearestSearchCompleted — as the FlyByWire A32NX's FacilityLoader does).
function facilityEvent(method, args, events) {
	return withTimeout(listenerReady("JS_LISTENER_FACILITY"), SURVEY_TIMEOUT_MS).then(() => {
		const view = listeners["JS_LISTENER_FACILITY"].view;
		return withTimeout(
			new Promise((resolve, reject) => {
				let done = false;
				events.forEach((ev) =>
					view.on(ev, (data) => {
						if (!done) {
							done = true;
							resolve({ event: ev, data: data });
						}
					})
				);
				Coherent.call.apply(Coherent, [method].concat(args)).then(
					(r) => {
						if (r === false) reject(new Error(method + " answered false"));
					},
					reject
				);
			}),
			SURVEY_TIMEOUT_MS
		);
	});
}

// Facilities (the ICAO is fixed width: type, region 2, airport 4, ident 5)
test("Facilities", "fac:metar", "GET_METAR_BY_IDENT LKPR", () => coherent("JS_LISTENER_FACILITY", "GET_METAR_BY_IDENT", ["LKPR"]));
test("Facilities", "fac:metarLatLon", "GET_METAR_BY_LATLON at the aircraft", () =>
	coherent("JS_LISTENER_FACILITY", "GET_METAR_BY_LATLON", [sv("PLANE LATITUDE", "degrees"), sv("PLANE LONGITUDE", "degrees")])
);
test("Facilities", "fac:airport", 'LOAD_AIRPORT "A      LKPR " → SendAirport (runways, frequencies, procedures)', () =>
	facilityEvent("LOAD_AIRPORT", ["A      LKPR "], ["SendAirport"])
);
test("Facilities", "fac:vor", 'LOAD_VOR "VLK    VLM  " (Vlasim) → SendVor', () => facilityEvent("LOAD_VOR", ["VLK    VLM  "], ["SendVor"]));
test("Facilities", "fac:nearest", "Nearest airports (START_NEAREST_SEARCH_SESSION, SEARCH_NEAREST 50 km)", () =>
	coherent("JS_LISTENER_FACILITY", "START_NEAREST_SEARCH_SESSION", [1]).then((session) =>
		facilityEvent("SEARCH_NEAREST", [session, sv("PLANE LATITUDE", "degrees"), sv("PLANE LONGITUDE", "degrees"), 50000, 10], ["NearestSearchCompleted"])
	)
);

// Weather
test("Weather", "wx:ambient", "Ambient weather SimVars at the aircraft", () =>
	Promise.resolve({
		windDir: sv("AMBIENT WIND DIRECTION", "degrees"),
		windKts: sv("AMBIENT WIND VELOCITY", "knots"),
		visM: sv("AMBIENT VISIBILITY", "meters"),
		qnhMb: sv("SEA LEVEL PRESSURE", "millibars"),
		tempC: sv("AMBIENT TEMPERATURE", "celsius"),
	})
);

// Flight plan and ATC
test("Flight plan / ATC", "fp:get", "GET_FLIGHTPLAN (the sim's flight plan)", () => coherent("JS_LISTENER_FLIGHTPLAN", "GET_FLIGHTPLAN", []));
test("Flight plan / ATC", "fp:atc", "LOAD_CURRENT_ATC_FLIGHTPLAN, then GET_FLIGHTPLAN (the ATC's plan)", () =>
	coherent("JS_LISTENER_FLIGHTPLAN", "LOAD_CURRENT_ATC_FLIGHTPLAN", []).then(() => coherent("JS_LISTENER_FLIGHTPLAN", "GET_FLIGHTPLAN", []))
);
test("Flight plan / ATC", "atc:simvars", "ATC SimVars (ATC ID, airline, flight number)", () =>
	Promise.resolve({
		atcId: sv("ATC ID", "string"),
		airline: sv("ATC AIRLINE", "string"),
		flight: sv("ATC FLIGHT NUMBER", "string"),
	})
);

// SimVars, L:vars, events
test("SimVars / events", "sv:get", "SimVar get (position, heading)", () =>
	Promise.resolve({
		lat: sv("PLANE LATITUDE", "degrees"),
		lon: sv("PLANE LONGITUDE", "degrees"),
		hdg: sv("PLANE HEADING DEGREES TRUE", "degrees"),
		onGround: sv("SIM ON GROUND", "bool"),
	})
);
test(
	"SimVars / events",
	"lv:setget",
	"L:var set and read back (our own L:MRLM_PROBE_TEST)",
	() => {
		const v = Math.round(Math.random() * 1000);
		return SimVar.SetSimVarValue("L:MRLM_PROBE_TEST", "number", v).then(() => ({ wrote: v, read: sv("L:MRLM_PROBE_TEST", "number") }));
	},
	true
);
test(
	"SimVars / events",
	"k:parking",
	"K: event — K:PARKING_BRAKES toggles the parking brake",
	() => SimVar.SetSimVarValue("K:PARKING_BRAKES", "number", 0).then(() => ({ brake: sv("BRAKE PARKING POSITION", "bool") })),
	true
);

// Things external SimConnect cannot do in 2024 (memory: jetways ruled out)
test(
	"Not via SimConnect",
	"k:jetway",
	"K:TOGGLE_JETWAY (the jetway at your gate)",
	() => SimVar.SetSimVarValue("K:TOGGLE_JETWAY", "number", 0).then(() => "sent; look at the jetway"),
	true
);
test(
	"Not via SimConnect",
	"k:ramp",
	"K:REQUEST_FUEL_KEY (ground services: fuel truck)",
	() => SimVar.SetSimVarValue("K:REQUEST_FUEL_KEY", "number", 0).then(() => "sent; look for a fuel truck"),
	true
);
test("Not via SimConnect", "cam:state", "Camera SimVars (CAMERA STATE, view)", () =>
	Promise.resolve({ state: sv("CAMERA STATE", "number"), view: sv("CAMERA VIEW TYPE AND INDEX:0", "number") })
);
test("Not via SimConnect", "commbus", "CommBus listener (RegisterCommBusListener)", () =>
	withTimeout(
		new Promise((resolve, reject) => {
			try {
				const bus = RegisterCommBusListener(() => resolve("registered; on/callWasm: " + typeof bus.on + "/" + typeof bus.callWasm));
			} catch (e) {
				reject(e);
			}
		}),
		SURVEY_TIMEOUT_MS
	)
);

// ── Running and showing ────────────────────────────────────────────────────

function runTest(t) {
	const row = document.getElementById("t-" + t.id);
	const status = row.querySelector(".t-status");
	const out = row.querySelector(".t-out");
	status.textContent = "…";
	status.className = "t-status";
	let p;
	try {
		p = withTimeout(t.run(), SURVEY_TIMEOUT_MS);
	} catch (e) {
		p = Promise.reject(e);
	}
	return p.then(
		(v) => {
			const empty = v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
			const verdict = empty ? "not available" : "works";
			status.textContent = verdict;
			status.className = "t-status " + (empty ? "t-na" : "t-ok");
			out.textContent = sample(v);
			surveyResults[t.id] = { label: t.label, result: verdict, sample: sample(v) };
		},
		(e) => {
			status.textContent = "fails";
			status.className = "t-status t-fail";
			out.textContent = String((e && e.message) || e);
			surveyResults[t.id] = { label: t.label, result: "fails", error: String((e && e.message) || e) };
		}
	);
}

// runReadOnly runs every test that changes nothing, one after another.
function runReadOnly() {
	let chain = Promise.resolve();
	TESTS.filter((t) => !t.changes).forEach((t) => {
		chain = chain.then(() => runTest(t));
	});
	chain.then(showReport);
}

function showReport() {
	const el = document.getElementById("survey-report");
	if (el) el.value = JSON.stringify(surveyResults, null, 1);
}

function runCustom() {
	const listener = document.getElementById("custom-listener").value.trim();
	const method = document.getElementById("custom-method").value.trim();
	const argsText = document.getElementById("custom-args").value.trim();
	const out = document.getElementById("custom-out");
	let args = [];
	try {
		args = argsText ? JSON.parse(argsText) : [];
		if (!Array.isArray(args)) args = [args];
	} catch (e) {
		out.textContent = "args: not JSON (" + e + ")";
		return;
	}
	out.textContent = "…";
	withTimeout(coherent(listener, method, args), SURVEY_TIMEOUT_MS).then(
		(v) => {
			out.textContent = "works: " + sample(v);
			surveyResults["custom:" + listener + ":" + method] = { result: "works", sample: sample(v) };
			showReport();
		},
		(e) => {
			out.textContent = "fails: " + ((e && e.message) || e);
			surveyResults["custom:" + listener + ":" + method] = { result: "fails", error: String((e && e.message) || e) };
			showReport();
		}
	);
}

// buildSurvey fills the survey tab's table.
function buildSurvey() {
	const table = document.getElementById("survey-table");
	if (!table || table.childElementCount) return;
	let group = "";
	TESTS.forEach((t) => {
		if (t.group !== group) {
			group = t.group;
			const h = document.createElement("div");
			h.className = "t-group";
			h.textContent = group;
			table.appendChild(h);
		}
		const row = document.createElement("div");
		row.className = "t-row";
		row.id = "t-" + t.id;
		row.innerHTML =
			'<div class="t-head"><span class="t-label"></span><span class="t-status">untested</span><button class="t-try">' +
			(t.changes ? "Try (changes the sim)" : "Try") +
			'</button></div><pre class="t-out"></pre>';
		row.querySelector(".t-label").textContent = t.label;
		row.querySelector(".t-try").addEventListener("click", () => runTest(t).then(showReport));
		table.appendChild(row);
	});
}

function showTab(name) {
	document.getElementById("tab-metar").style.display = name === "metar" ? "" : "none";
	document.getElementById("tab-survey").style.display = name === "survey" ? "" : "none";
	if (name === "survey") buildSurvey();
}
