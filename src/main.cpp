#include <Arduino.h>
#include "esp_system.h"
#include "esp32-hal-log.h"
#include "WiFi.h"
#include "ESPAsyncWebServer.h"
#include "ArduinoJson.h"
#include "SPIFFS.h"
#include "main.h"

/* ESP32 Access Point (Roter) parametreleri*/
#define AP_SSDI             "ESP32"
#define AP_PASSWORD         "123456789"
#define AP_LOCAL_IP         10,0,10,1
#define AP_GATEWAY_IP       10,0,10,1
#define AP_NETWORK_MASK     255,255,255,0

/*  WEB Server */
#define WEb_SERVER_PORT   80

AsyncWebServer webServer(WEb_SERVER_PORT); /*< Web server objesi. */
AsyncWebSocket WebSocket("/ws");

WiFiSetting_t WiFiSetting;
bool ConnectionFlag = false;

/* Static Foksiyon tanımlamalari */
static void RoutingWebServer(void);
static void GetInfo(AsyncWebServerRequest* pRequest);
static void GetWifiScane(AsyncWebServerRequest* pRequest);
static void WifiConnection(AsyncWebServerRequest* request, uint8_t* data, size_t len, size_t index, size_t total);
static void WebSokectEventHandle(AsyncWebSocket* Server, AsyncWebSocketClient* Client, AwsEventType Type, void* arg, uint8_t* pData, size_t Length);

/**
 * @brief Setup fonksiyo sistemin genel ayarları yapılıyor.
 */
void setup()
{
  Serial.begin(115200);

  if (!SPIFFS.begin(true)) {
    log_e("SPIFFS Basla Hatasi....!"); /*< ERROR: SPI flash baglantisi kurulamadi hatasi. */
    ESP.restart();
  }

  IPAddress AP_StaticIP(AP_LOCAL_IP);
  IPAddress AP_Gateway(AP_GATEWAY_IP);
  IPAddress AP_NetMask(AP_NETWORK_MASK);

  WiFi.mode(WIFI_AP_STA); /*< Start acces point ve station point olarak ayari. */
  WiFi.softAPConfig(AP_StaticIP, AP_Gateway, AP_NetMask);   /*< Access point static IP ayarlari.*/
  WiFi.softAP(AP_SSDI, AP_PASSWORD);  /*< Start access piont. */

  IPAddress apIp = WiFi.softAPIP();

  log_i("AP IP address: %d . %d . %d . %d", apIp.operator[](0), apIp.operator[](1), apIp.operator[](2), apIp.operator[](3)); /*< INFO: Access point IP adres. */

  WiFi.scanNetworks(true); /*< sekron wifi aramasi yapiliyor. */
  
  WebSocket.onEvent(WebSokectEventHandle);
  webServer.addHandler(&WebSocket);
  RoutingWebServer(); /*< Roting web server. Web server için kullanılacak url ayarlari.  */
  webServer.begin();  /*< Start web server. */
}

/**
 * @brief Application loop 
 */
void loop()
{
  if (ConnectionFlag) {
    ConnectionFlag = false;

    WiFi.disconnect(); /*< WiFi bağlantısı koparılıyor. */

    if (WiFiSetting.staticIpStatus) {
      IPAddress Static_Ip(
        WiFiSetting.StaticIP[0],
        WiFiSetting.StaticIP[1],
        WiFiSetting.StaticIP[2],
        WiFiSetting.StaticIP[2]);

      IPAddress Gateway(
        WiFiSetting.GatewayIp[0],
        WiFiSetting.GatewayIp[1],
        WiFiSetting.GatewayIp[2],
        WiFiSetting.GatewayIp[3]);

      IPAddress NetMask(
        WiFiSetting.Netmask[0],
        WiFiSetting.Netmask[1],
        WiFiSetting.Netmask[2],
        WiFiSetting.Netmask[3]);

      WiFi.config(Static_Ip, Gateway, NetMask); /*< Static Ip konfigurasyonları yapılıyor. */
    }

    WiFi.begin(WiFiSetting.SSID, WiFiSetting.Password); /*< WiFi bağlantısı kuruluyor. */

    while (WiFi.status() != WL_CONNECTED) {
      static uint8_t Count;
      if(++Count > 20) { break; }
      vTaskDelay(100);
    }

  }

  vTaskDelay(10);
}

/**
 * @brief WiFi taraması yapıyor. Web server tarafından gelen istege cevab veriyor. 
 */
static void GetWifiScane(AsyncWebServerRequest* pRequest)
{
  log_i("star scane...");
  DynamicJsonDocument WiFiScanJSON(2048);
  String WiFiScanString;
  uint16_t numberOfWiFi = WiFi.scanComplete();
  if (numberOfWiFi == -2) {
    WiFi.scanNetworks(true);
  }
  else if (numberOfWiFi > 0) {
    WiFiScanJSON["Number"] = numberOfWiFi;

    for (uint8_t Index = 0; Index < numberOfWiFi; ++Index) {
      WiFiScanJSON[String(Index)]["SSID"] = WiFi.SSID(Index);
      WiFiScanJSON[String(Index)]["RSSI"] = WiFi.RSSI(Index);
      WiFiScanJSON[String(Index)]["Encryp"] = (WiFi.encryptionType(Index) == WIFI_AUTH_OPEN) ? 0 : 1;
    }

    WiFi.scanDelete();
    if (WiFi.scanComplete() == -2) {
      WiFi.scanNetworks(true);
    }
  }

  serializeJson(WiFiScanJSON, WiFiScanString);
  pRequest->send(200, "application/json", WiFiScanString);
}

/**
 * @brief Web server tarafından gelen bağlantı bilgi isteğine cevab veriyor.
 */
static void GetInfo(AsyncWebServerRequest* pRequest)
{
  DynamicJsonDocument DeviceInfoJSON(512);
  String DeviceInfoString;
  bool Connectstatus = (WiFi.status() == WL_CONNECTED) ? true : false;

  DeviceInfoJSON["id"] = "DeviceInfo";
  DeviceInfoJSON["ConnectStatus"] = Connectstatus;
  DeviceInfoJSON["ConnectIp"] = (Connectstatus) ? WiFi.localIP().toString() : "NULL";
  DeviceInfoJSON["ConnectSSID"] = (Connectstatus) ? String(WiFiSetting.SSID) : "NULL";

  serializeJson(DeviceInfoJSON, DeviceInfoString);
  pRequest->send(200, "application/json", DeviceInfoString);
}

/**
 * @brief Web server tarafından göderilen WiFi bilgilerini alıyor.
 */
static void WifiConnection(AsyncWebServerRequest* request, uint8_t* pData, size_t len, size_t index, size_t total)
{
  StaticJsonDocument<1024> SocketJSON;
  deserializeJson(SocketJSON, pData);

  SocketJSON["SSID"].as<String>().toCharArray(WiFiSetting.SSID, sizeof(WiFiSetting.SSID));
  SocketJSON["PASSWORD"].as<String>().toCharArray(WiFiSetting.Password, sizeof(WiFiSetting.Password));
  WiFiSetting.staticIpStatus = SocketJSON["StaticIPStatus"].as<bool>();

  JsonArray static_ip = SocketJSON["StaticIP"];
  WiFiSetting.StaticIP[0] = static_ip[0].as<uint8_t>();
  WiFiSetting.StaticIP[1] = static_ip[1].as<uint8_t>();
  WiFiSetting.StaticIP[2] = static_ip[2].as<uint8_t>();
  WiFiSetting.StaticIP[3] = static_ip[4].as<uint8_t>();

  JsonArray gateway_ip = SocketJSON["GatewayIP"];
  WiFiSetting.GatewayIp[0] = gateway_ip[0].as<uint8_t>();
  WiFiSetting.GatewayIp[1] = gateway_ip[1].as<uint8_t>();
  WiFiSetting.GatewayIp[2] = gateway_ip[2].as<uint8_t>();
  WiFiSetting.GatewayIp[3] = gateway_ip[3].as<uint8_t>();

  JsonArray netmask = SocketJSON["NetMask"];
  WiFiSetting.Netmask[0] = netmask[0].as<uint8_t>();
  WiFiSetting.Netmask[1] = netmask[1].as<uint8_t>();
  WiFiSetting.Netmask[2] = netmask[2].as<uint8_t>();
  WiFiSetting.Netmask[3] = netmask[3].as<uint8_t>();

  request->send(200);
  ConnectionFlag = true;
}

/**
 * @brief Web Server istekler yonlendiriliyor.
 */
static void RoutingWebServer(void)
{
  webServer.on("/", HTTP_GET, [](AsyncWebServerRequest* request)
    { request->send(SPIFFS, "/index.html", String(), false); });

  webServer.on("/style.css", HTTP_GET, [](AsyncWebServerRequest* request)
    { request->send(SPIFFS, "/style.css", "text/css"); });

  webServer.on("/main.js", HTTP_GET, [](AsyncWebServerRequest* request)
    { request->send(SPIFFS, "/main.js", "text/javascript"); });

  webServer.on("/scan", HTTP_GET, GetWifiScane);
  webServer.on("/getInfo", HTTP_GET, GetInfo);
  webServer.on("/wifiSetting", HTTP_POST, [](AsyncWebServerRequest* request) {}, NULL, WifiConnection);
}

/**
 * @brief Web sokect handle 
 */
static void WebSokectEventHandle(AsyncWebSocket* Server, AsyncWebSocketClient* Client, AwsEventType Type, void* arg, uint8_t* pData, size_t Length)
{
    switch (Type) {

    case WS_EVT_CONNECT:
    {
        log_i("WebSocket client #%u connected from %s\n", Client->id(), Client->remoteIP().toString().c_str());
    }
    break;

    case WS_EVT_DISCONNECT:
    {
        log_i("WebSocket client #%u disconnected\n", Client->id());
    }
    break;

    case WS_EVT_DATA:
    {
      AwsFrameInfo* info = (AwsFrameInfo*)arg;
      if (info->final && info->index == 0 && info->len == Length && info->opcode == WS_TEXT) {

        pData[Length] = 0;
        StaticJsonDocument<512> SocketJSON;
        deserializeJson(SocketJSON, pData);
        log_i("Socket data : %s", pData);
      }
    }
    break;

    case WS_EVT_PONG:
    {
        log_i("WS_EVT_PONG");
    }
    break;

    case WS_EVT_ERROR:
    {
        log_i("WS_EVT_ERROR");
    }
    break;

    default:
        break;
    }
}


