#include <SPI.h>
#include <LoRa.h>

// -------- LoRa pins  --------

#define LORA_SCK   4
#define LORA_MISO  5
#define LORA_MOSI  6
#define LORA_SS    7
#define LORA_RST   21
#define LORA_DIO0  20

#define LORA_BAND 433E6

// -------- Node IDs --------
const uint8_t ID_CENTRAL = 1;
const uint8_t ID_SOIL    = 2;
const uint8_t ID_CLIMATE = 3;

// -------- Sensors / Actuators  --------
#define SOIL_PIN   1      // ADC pin
#define PUMP_PIN   8     // relay/MOSFET gate pin
#define FLOW_PIN   2      // flow sensor pulse pin (interrupt capable)

// -------- Flow measurement --------

const float PULSES_PER_LITER = 450.0f;
volatile uint32_t flowPulses = 0;
unsigned long lastFlowCalc = 0;
float flowLpm = 0.0f; // liters per minute

uint16_t lastSeqFrom1 = 0; // duplicate filter

bool pumpOn = false;

String makePacket(uint8_t src, uint8_t dst, uint8_t via, uint8_t ttl, uint16_t seq, const String& type, const String& payload) {
  return "S," + String(src) + "," + String(dst) + "," + String(via) + "," + String(ttl) + "," + String(seq) + "," + type + "," + payload;
}

bool parsePacket(const String& s,
                 uint8_t &src, uint8_t &dst, uint8_t &via, uint8_t &ttl, uint16_t &seq,
                 String &type, String &payload) {
  if (!s.startsWith("S,")) return false;

  int idx[8];
  int c = 0;
  idx[c++] = 0;
  for (int i = 0; i < (int)s.length() && c < 8; i++) {
    if (s[i] == ',') idx[c++] = i + 1;
  }
  if (c < 7) return false;

  auto getField = [&](int field)->String {
    int start = idx[field];
    int end = (field == 7) ? s.length() : s.indexOf(',', start);
    if (end < 0) end = s.length();
    return s.substring(start, end);
  };

  src = (uint8_t)getField(1).toInt();
  dst = (uint8_t)getField(2).toInt();
  via = (uint8_t)getField(3).toInt();
  ttl = (uint8_t)getField(4).toInt();
  seq = (uint16_t)getField(5).toInt();
  type = getField(6);
  payload = (idx[7] <= (int)s.length()) ? s.substring(idx[7]) : "";
  return true;
}

void loraSend(const String& p) {
  LoRa.beginPacket();
  LoRa.print(p);
  LoRa.endPacket();
}

void IRAM_ATTR flowISR() {
  flowPulses++;
}

void updateFlow() {
  unsigned long now = millis();
  if (now - lastFlowCalc >= 1000) {
    uint32_t p = flowPulses;
    flowPulses = 0;

    // liters per second = pulses / pulses_per_liter
    float litersPerSec = (float)p / PULSES_PER_LITER;
    flowLpm = litersPerSec * 60.0f;

    lastFlowCalc = now;
  }
}

void sendAck(uint8_t dst, uint16_t seq) {
  String pkt = makePacket(ID_SOIL, dst, 0, 3, seq, "ACK", "");
  loraSend(pkt);
}

void sendData(uint8_t dst, uint16_t seq) {
  int soil = analogRead(SOIL_PIN);
  String payload = "SOIL=" + String(soil) + ";FLOW=" + String(flowLpm, 2) + ";PUMP=" + String(pumpOn ? 1 : 0);
  String pkt = makePacket(ID_SOIL, dst, 0, 3, seq, "DATA", payload);
  loraSend(pkt);
}

void setPump(bool on) {
  pumpOn = on;
  digitalWrite(PUMP_PIN, pumpOn ? HIGH : LOW);
}

void relayForward(uint8_t src, uint8_t dst, uint8_t via, uint8_t ttl, uint16_t seq, const String& type, const String& payload) {
  if (ttl == 0) return;
  uint8_t newTtl = ttl - 1;

  String pkt = makePacket(src, dst, 0, newTtl, seq, type, payload);
  loraSend(pkt);
}

void setup() {
  Serial.begin(115200);

  pinMode(PUMP_PIN, OUTPUT);
  setPump(false);

  pinMode(FLOW_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(FLOW_PIN), flowISR, RISING);

  SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_SS);
  LoRa.setPins(LORA_SS, LORA_RST, LORA_DIO0);

  if (!LoRa.begin(LORA_BAND)) {
    Serial.println("LoRa begin failed");
    while (true) delay(1000);
  }
  LoRa.setSpreadingFactor(7);
  LoRa.setSignalBandwidth(125E3);
  LoRa.enableCrc();

  lastFlowCalc = millis();
}

void loop() {
  updateFlow();

  int packetSize = LoRa.parsePacket();
  if (!packetSize) return;

  String msg;
  while (LoRa.available()) msg += (char)LoRa.read();

  uint8_t src, dst, via, ttl;
  uint16_t seq;
  String type, payload;

  if (!parsePacket(msg, src, dst, via, ttl, seq, type, payload)) return;

  // -------- Relay behavior --------
  // If packet says "via == 2" and I'm not the final destination, forward it.
  if (via == ID_SOIL && dst != ID_SOIL) {
    relayForward(src, dst, via, ttl, seq, type, payload);
    return;
  }


  if (dst != ID_SOIL) return;

  // Duplicate filter for messages from central
  if (src == ID_CENTRAL) {
    if (seq == lastSeqFrom1) return;
    lastSeqFrom1 = seq;
  }

  if (type == "PING") {
    // If asked for data, respond with DATA and then ACK the ping
    if (payload.indexOf("REQ=DATA") >= 0) {
      sendData(src, seq);
    }
    sendAck(src, seq);
  }
  else if (type == "CMD") {
    // payload like PUMP=1 or PUMP=0
    int p = payload.indexOf("PUMP=");
    if (p >= 0) {
      int val = payload.substring(p + 5).toInt();
      setPump(val == 1);
    }
    sendAck(src, seq);
  }
}