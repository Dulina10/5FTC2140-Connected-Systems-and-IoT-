const firebaseConfig = {
  apiKey: "AI###################################",
  authDomain: "lora-c5c5b.firebaseapp.com",
  databaseURL: "https://lora-c5c5b-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "lora-c5c5b",
  storageBucket: "lora-c5c5b.firebasestorage.app",
  messagingSenderId: "742543536364",
  appId: "1:742543536364:web:1429021e608405a98b75c9",
  measurementId: "G-T0E04C10LM"
};
   firebase.initializeApp(firebaseConfig);
   const database = firebase.database();


  const tempValueSpan = document.getElementById('tempValue');
  const humidityValueSpan = document.getElementById('humidityValue');
  const soilMoistureValueSpan = document.getElementById('soilMoistureValue');
  const lightIntensityValueSpan = document.getElementById('lightIntensityValue');
  const waterLevelValueSpan = document.getElementById('waterLevelValue');

  const tempFill = document.getElementById('tempFill');
  const humFill = document.getElementById('humFill');
  const soilFill = document.getElementById('soilFill');
  const lightFill = document.getElementById('lightFill');
  const waterFill = document.getElementById('waterFill');

  const pumpButton = document.getElementById('pumpButton');
  const pumpToggle = document.getElementById('pumpToggle');
  const pumpStateEl = document.getElementById('pumpState');
  const lastActionEl = document.getElementById('lastAction');

  const clockEl = document.getElementById('clock');
  const connDot = document.getElementById('connDot');
  const connText = document.getElementById('connText');

 
  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function setMeter(el, pct) {
    if (!el) return;
    el.style.width = clamp(pct, 0, 100) + "%";
  }

  function nowStamp() {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  function setConnection(isOnline) {
    if (!connDot || !connText) return;

    connDot.style.background = isOnline ? "rgba(0,255,200,.85)" : "rgba(255,120,120,.85)";
    connDot.style.boxShadow = isOnline
      ? "0 0 0 3px rgba(0,255,200,.16)"
      : "0 0 0 3px rgba(255,120,120,.18)";

    connText.textContent = isOnline ? "Online" : "Offline";
  }


  if (clockEl) {
    setInterval(() => {
      clockEl.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }, 300);
  }

  
  const tempRef = database.ref('sensors/temperature');
  const humidityRef = database.ref('sensors/humidity');
  const soilRef = database.ref('sensors/soilMoisture');
  const lightRef = database.ref('sensors/light');
  const waterRef = database.ref('sensors/waterLevel');

  // Pump
  const pumpRef = database.ref('pump/state'); // true/false OR "ON"/"OFF"

  // Firebase connection
  const connectedRef = database.ref('.info/connected');

 
  connectedRef.on('value', (snap) => {
    setConnection(!!snap.val());
  });


  // Temperature
  tempRef.on('value', (snapshot) => {
    const t = snapshot.val();
    tempValueSpan.textContent = (t !== null && t !== undefined) ? t : '--';

    // Meter mapping: 20°C -> 0%, 40°C -> 100%
    const tNum = Number(t);
    if (!isNaN(tNum)) setMeter(tempFill, (tNum - 20) * 5);

    console.log("Temperature updated:", t);
  });

  // Humidity
  humidityRef.on('value', (snapshot) => {
    const h = snapshot.val();
    humidityValueSpan.textContent = (h !== null && h !== undefined) ? h : '--';

    const hNum = Number(h);
    if (!isNaN(hNum)) setMeter(humFill, hNum);

    console.log("Humidity updated:", h);
  });

  // Soil Moisture
  soilRef.on('value', (snapshot) => {
    const s = snapshot.val();
    if (soilMoistureValueSpan) soilMoistureValueSpan.textContent = (s !== null && s !== undefined) ? s : '--';

    const sNum = Number(s);
    if (!isNaN(sNum)) setMeter(soilFill, sNum);

    console.log("Soil updated:", s);
  });

  // Light
  lightRef.on('value', (snapshot) => {
    const l = snapshot.val();
    if (lightIntensityValueSpan) lightIntensityValueSpan.textContent = (l !== null && l !== undefined) ? l : '--';

    const lNum = Number(l);
    if (!isNaN(lNum)) setMeter(lightFill, lNum);

    console.log("Light updated:", l);
  });

  // Water Level
  waterRef.on('value', (snapshot) => {
    const w = snapshot.val();
    if (waterLevelValueSpan) waterLevelValueSpan.textContent = (w !== null && w !== undefined) ? w : '--';

    const wNum = Number(w);
    if (!isNaN(wNum)) setMeter(waterFill, wNum);

    console.log("Water updated:", w);
  });


  let currentPumpState = false;

  function normalizeState(v) {
    if (v === true || v === false) return v;
    if (typeof v === "string") return v.toUpperCase() === "ON";
    return false;
  }

  function writeState(b) {
    // return pumpRef.set(b ? "ON" : "OFF");
    return pumpRef.set(!!b);
  }

  function renderPumpUI(isOn) {
    currentPumpState = isOn;

    if (pumpStateEl) pumpStateEl.textContent = isOn ? "ON" : "OFF";
    if (pumpToggle) pumpToggle.checked = isOn;
    if (pumpButton) pumpButton.setAttribute("aria-pressed", String(isOn));
    if (lastActionEl) lastActionEl.textContent = `${isOn ? "Pump ON" : "Pump OFF"} • ${nowStamp()}`;
  }

  // Listen pump state
  pumpRef.on('value', (snapshot) => {
    const v = snapshot.val();
    const isOn = normalizeState(v);
    renderPumpUI(isOn);
    console.log("Pump updated:", v);
  });

  // Button toggles
  if (pumpButton) {
    pumpButton.addEventListener('click', () => {
      const newState = !currentPumpState;
      writeState(newState)
        .then(() => console.log("Pump set to:", newState))
        .catch((err) => console.error("Pump error:", err));
    });
  }

  // Switch toggles
  if (pumpToggle) {
    pumpToggle.addEventListener('change', () => {
      const newState = pumpToggle.checked;
      writeState(newState)
        .then(() => console.log("Pump set to:", newState))
        .catch((err) => console.error("Pump error:", err));
    });
  }





// Rolling live buffer (fallback)
const LIVE_MAX_POINTS = 120; // ~ last 120 updates
const liveSeries = {
  temperature: [], humidity: [], soilMoisture: [], light: [], waterLevel: []
};

function pushLive(key, value){
  const v = Number(value);
  if (isNaN(v)) return;
  const t = Date.now();
  const arr = liveSeries[key];
  arr.push({t, v});
  if (arr.length > LIVE_MAX_POINTS) arr.splice(0, arr.length - LIVE_MAX_POINTS);
}

function fmtLabel(ms){
  const d = new Date(Number(ms));
  return d.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
}

function stats(points){
  if (!points || points.length === 0) return null;
  let min = points[0].v, max = points[0].v, sum = 0;
  for (const p of points){
    min = Math.min(min, p.v);
    max = Math.max(max, p.v);
    sum += p.v;
  }
  return { min, max, avg: sum / points.length };
}

function setText(id, val, digits=1){
  const el = document.getElementById(id);
  if (!el) return;
  if (val === null || val === undefined || Number.isNaN(val)) { el.textContent = "--"; return; }
  el.textContent = Number(val).toFixed(digits);
}

function makeChart(canvasId, label){
  const el = document.getElementById(canvasId);
  if (!el || typeof Chart === "undefined") return null;

  return new Chart(el, {
    type: "line",
    data: {
      labels: [],
      datasets: [{
        label,
        data: [],
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.25
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { maxTicksLimit: 6 } },
        y: { beginAtZero: false }
      }
    }
  });
}

const charts = {
  temperature: makeChart("chartTemp", "Temperature"),
  humidity: makeChart("chartHum", "Humidity"),
  soilMoisture: makeChart("chartSoil", "Soil Moisture"),
  light: makeChart("chartLight", "Light"),
  waterLevel: makeChart("chartWater", "Water Level"),
};

// Map stats chip ids
const statIds = {
  temperature: ["tempMin","tempAvg","tempMax"],
  humidity: ["humMin","humAvg","humMax"],
  soilMoisture: ["soilMin","soilAvg","soilMax"],
  light: ["lightMin","lightAvg","lightMax"],
  waterLevel: ["waterMin","waterAvg","waterMax"]
};

function renderSeries(key, points){
  const ch = charts[key];
  if (!ch) return;

  ch.data.labels = points.map(p => fmtLabel(p.t));
  ch.data.datasets[0].data = points.map(p => p.v);
  ch.update();

  const st = stats(points);
  const ids = statIds[key];
  if (!ids) return;

  if (!st){
    setText(ids[0], null); setText(ids[1], null); setText(ids[2], null);
  }else{
    setText(ids[0], st.min);
    setText(ids[1], st.avg);
    setText(ids[2], st.max);
  }
}

// Try load history (timestamps as keys)
async function loadHistory(key, minutes){
  const now = Date.now();
  const start = now - minutes * 60 * 1000;

  try{
    const ref = database.ref(`history/${key}`)
      .orderByKey()
      .startAt(String(start))
      .endAt(String(now))
      .limitToLast(800);

    const snap = await ref.get();
    const obj = snap.val();
    if (!obj) return null;

    const points = Object.keys(obj).sort().map(ts => ({
      t: Number(ts),
      v: Number(obj[ts])
    })).filter(p => !isNaN(p.t) && !isNaN(p.v));

    return points.length ? points : null;
  }catch(e){
    console.warn("History load failed for", key, e);
    return null;
  }
}

function getMinutesRange(){
  const sel = document.getElementById("rangeSelect");
  const m = sel ? Number(sel.value) : 1440;
  return isNaN(m) ? 1440 : m;
}

async function refreshCharts(){
  const minutes = getMinutesRange();

  for (const key of Object.keys(charts)){
    // Prefer history, else fallback to live rolling buffer
    const hist = await loadHistory(key, minutes);
    const points = hist || liveSeries[key] || [];
    renderSeries(key, points);
  }
}

// CSV export (history if possible, else live buffer)
function toCSV(rows){ return rows.map(r => r.map(x => String(x).replaceAll(",", " ")).join(",")).join("\n"); }

async function exportCSV(){
  const minutes = getMinutesRange();
  const keys = ["temperature","humidity","soilMoisture","light","waterLevel"];
  const now = Date.now();
  const start = now - minutes*60*1000;

  // Try history for each key
  const histData = {};
  let anyHistory = false;

  for (const k of keys){
    const pts = await loadHistory(k, minutes);
    if (pts && pts.length){
      anyHistory = true;
      histData[k] = pts;
    }
  }

  // Merge timestamps
  let tsSet = new Set();
  if (anyHistory){
    for (const k of keys) (histData[k]||[]).forEach(p => tsSet.add(p.t));
  }else{
    for (const k of keys) (liveSeries[k]||[]).forEach(p => tsSet.add(p.t));
  }

  const tsSorted = Array.from(tsSet).sort((a,b)=>a-b).filter(t => t>=start && t<=now);

  const rows = [["timestamp_ms","time","temperature","humidity","soilMoisture","light","waterLevel"]];

  for (const t of tsSorted){
    function valAt(k){
      const arr = anyHistory ? (histData[k]||[]) : (liveSeries[k]||[]);
      // find nearest exact timestamp (history keys are exact; live also exact)
      const found = arr.find(p => p.t === t);
      return found ? found.v : "";
    }
    rows.push([
      t,
      new Date(Number(t)).toLocaleString(),
      valAt("temperature"),
      valAt("humidity"),
      valAt("soilMoisture"),
      valAt("light"),
      valAt("waterLevel"),
    ]);
  }

  const blob = new Blob([toCSV(rows)], {type:"text/csv"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `smart-agri-${minutes}min.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Hook export + refresh range
const exportBtn = document.getElementById("exportBtn");
if (exportBtn) exportBtn.addEventListener("click", exportCSV);

const rangeSelect = document.getElementById("rangeSelect");
if (rangeSelect) rangeSelect.addEventListener("change", refreshCharts);

// Keep charts updated every 20s
setInterval(refreshCharts, 20000);

// Also push live points whenever the realtime sensors update (fallback trend)
try{
  tempRef.on('value', (snapshot) => { const t = snapshot.val(); pushLive("temperature", t); });
  humidityRef.on('value', (snapshot) => { const h = snapshot.val(); pushLive("humidity", h); });
  soilRef.on('value', (snapshot) => { const s = snapshot.val(); pushLive("soilMoisture", s); });
  lightRef.on('value', (snapshot) => { const l = snapshot.val(); pushLive("light", l); });
  waterRef.on('value', (snapshot) => { const w = snapshot.val(); pushLive("waterLevel", w); });
}catch(e){
  console.warn("Live series hook failed:", e);
}

// Initial load
setTimeout(refreshCharts, 1200);




// --- Node status (reliability evidence) ---
function fmtSince(ms){
  if (!ms) return "--";
  const age = Date.now() - Number(ms);
  if (isNaN(age)) return "--";
  const s = Math.floor(age/1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s/60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m/60)}h ago`;
}

function statusFromAge(ageMs){
  if (ageMs <= 15000) return ["ok","ONLINE"];
  if (ageMs <= 60000) return ["warn","DELAY"];
  return ["bad","OFFLINE"];
}

function setBadge(id, state, text){
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove("ok","warn","bad");
  el.classList.add(state);
  el.textContent = text;
}

function hookSeen(path, badgeId, seenId){
  database.ref(path).on("value", (snap)=>{
    const ms = Number(snap.val());
    const seenEl = document.getElementById(seenId);
    if (seenEl) seenEl.textContent = ms ? fmtSince(ms) : "--";
    const age = ms ? Date.now() - ms : 999999999;
    const [st, txt] = statusFromAge(age);
    setBadge(badgeId, st, txt);
  });
}

hookSeen("meta/node1/lastSeenMs", "node1Badge", "node1Seen");
hookSeen("meta/node2/lastSeenMs", "node2Badge", "node2Seen");
hookSeen("meta/gateway/lastSeenMs", "gwBadge", "gwSeen");

database.ref("meta/gateway/rssi").on("value", (snap)=>{
  const el = document.getElementById("gwRssi");
  if (el) el.textContent = (snap.val() !== null && snap.val() !== undefined) ? `${snap.val()} dBm` : "--";
});

// --- Alerts & Recommendations (rule-based) ---
const alertListEl = document.getElementById("alertList");
const TH = { soilDry: 30, waterLow: 20, tempHigh: 35 };

function addAlert(level, title, text){
  if (!alertListEl) return;
  const div = document.createElement("div");
  div.className = `alert ${level}`;
  div.innerHTML = `<div><div class="alertTitle">${title}</div><div class="alertText">${text}</div></div>`;
  alertListEl.appendChild(div);
}

function getNum(id){
  const el = document.getElementById(id);
  if (!el) return NaN;
  const v = Number(String(el.textContent).replace(/[^\d.-]/g,""));
  return v;
}

function refreshAlerts(){
  if (!alertListEl) return;
  alertListEl.innerHTML = "";

  const soil = getNum("soilMoistureValue");
  const water = getNum("waterLevelValue");
  const temp = getNum("tempValue");

  if (!isNaN(soil)){
    if (soil < TH.soilDry) addAlert("warn", "Soil is dry", `Soil moisture is ${soil}%. Irrigation recommended.`);
    else addAlert("ok", "Soil moisture OK", `Soil moisture is ${soil}%.`);
  } else {
    addAlert("warn", "Soil sensor", "No soil moisture data received yet.");
  }

  if (!isNaN(water)){
    if (water < TH.waterLow) addAlert("bad", "Tank low", `Water level is ${water}%. Refill tank to protect the pump.`);
    else addAlert("ok", "Tank level OK", `Water level is ${water}%.`);
  }

  if (!isNaN(temp)){
    if (temp >= TH.tempHigh) addAlert("warn", "High temperature", `Temperature is ${temp}°C. Monitor heat stress and evaporation.`);
    else addAlert("ok", "Temperature normal", `Temperature is ${temp}°C.`);
  }
}

setInterval(refreshAlerts, 2000);
setTimeout(refreshAlerts, 1200);
