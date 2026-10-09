#include <WiFi.h>
#include <HTTPClient.h>
#include "HX711.h"
#include <base64.h>

// ==========================================
// 🌐 NETWORK & ENDPOINT CONFIGURATION
// ==========================================
// Replace with your local WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";       
const char* password = "YOUR_WIFI_PASSWORD"; 
const char* serverName = "http://YOUR_SERVER_IP:5000/api/hardware/update";
String hardware_mac = "Hardware_name"; 

// ==========================================
// ⚖️ LOAD CELL (HX711) SENSOR PINOUT & CALIBRATION
// ==========================================
const int MAMA_DOUT_PIN = 32;
const int MAMA_SCK_PIN = 33;
float mama_kalibrasyon = 446.0; 
HX711 mama_scale;

const int SU_DOUT_PIN = 25;
const int SU_SCK_PIN = 26;
float su_kalibrasyon = 446.0; 
HX711 su_scale;

// Camera acquisition timer interval (120 seconds / 2 minutes)
unsigned long sonKameraZamani = 0;
const unsigned long kameraInterval = 120000; 

void setup() {
  Serial.begin(115200);
  
  // Hardware Serial2 for ESP32-CAM inter-chip communication (RX: 16, TX: 17)
  Serial2.begin(115200, SERIAL_8N1, 16, 17);

  Serial.println("\n--- Smart Shelter Embedded Telemetry Station Initializing ---");

  mama_scale.begin(MAMA_DOUT_PIN, MAMA_SCK_PIN);
  mama_scale.set_scale(mama_kalibrasyon);
  mama_scale.tare(); 

  su_scale.begin(SU_DOUT_PIN, SU_SCK_PIN);
  su_scale.set_scale(su_kalibrasyon);
  su_scale.tare(); 

  WiFi.begin(ssid, password);
  while(WiFi.status() != WL_CONNECTED) { 
    delay(500); 
    Serial.print("."); 
  }
  Serial.println("\n✅ WiFi Connected Successfully!");
}

void loop() {
  if (mama_scale.is_ready() && su_scale.is_ready() && WiFi.status() == WL_CONNECTED) {
    
    // Read calibrated scale units
    float raw_mama = mama_scale.get_units(3);
    int current_food_grams = raw_mama < 0 ? 0 : (int)raw_mama;

    float raw_su = su_scale.get_units(3);
    int current_water_ml = raw_su < 0 ? 0 : (int)raw_su;

    unsigned long suAnkiZaman = millis();
    bool sureDolduMu = false;

    // Periodical camera trigger evaluation
    if (suAnkiZaman - sonKameraZamani >= kameraInterval || sonKameraZamani == 0) {
      sureDolduMu = true;
      sonKameraZamani = suAnkiZaman;
      Serial.println("\n⏰ [TIMER] Triggering snapshot acquisition via UART...");
    }

    String base64Image = "";
    
    // Listen to UART buffer if camera interval is reached
    if (sureDolduMu) {
      unsigned long camTimeout = millis();
      while (!Serial2.available() && (millis() - camTimeout < 8000)); 

      if (Serial2.available()) {
        String header = Serial2.readStringUntil('\n');
        header.trim();
        
        if (header.startsWith("START:")) {
          Serial.println("📸 Ingesting camera stream payload...");
          long imageLen = header.substring(6).toInt();
          uint8_t *fbBuf = (uint8_t *)malloc(imageLen);
          
          if (fbBuf) {
            size_t bytesRead = 0;
            unsigned long readTimeout = millis();
            
            while (bytesRead < imageLen && (millis() - readTimeout < 4000)) {
              if (Serial2.available()) {
                fbBuf[bytesRead++] = Serial2.read();
                readTimeout = millis();
              }
            }
            
            base64Image = base64::encode(fbBuf, imageLen); 
            free(fbBuf); 
            Serial.println("✅ Frame payload encoded to Base64 successfully!");
          }
        }
      } else {
        Serial.println("❌ Camera UART Timeout: No payload received from slave module.");
      }
    }

    // Prepare JSON payload and dispatch POST request
    HTTPClient http;
    http.begin(serverName);
    http.addHeader("Content-Type", "application/json"); 

    String jsonPayload = "{";
    jsonPayload += "\"hardware_mac\":\"" + hardware_mac + "\",";
    jsonPayload += "\"current_food_grams\":" + String(current_food_grams) + ",";
    jsonPayload += "\"current_water_ml\":" + String(current_water_ml) + ",";
    jsonPayload += "\"battery_voltage\":4.2";
    
    if (base64Image != "") {
      jsonPayload += ",\"image_url\":\"data:image/jpeg;base64," + base64Image + "\"";
    }
    jsonPayload += "}";

    int httpResponseCode = http.POST(jsonPayload);
    
    Serial.print("🍖 Food: "); Serial.print(current_food_grams);
    Serial.print("g | 💧 Water: "); Serial.print(current_water_ml);
    Serial.print("ml | 🌐 HTTP Status: "); Serial.println(httpResponseCode);
    
    http.end();
  }
  delay(10000); 
}