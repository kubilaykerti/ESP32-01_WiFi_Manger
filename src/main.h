#ifndef _MAIN_H_ 
#define _MAIN_H_
#include <Arduino.h>


typedef struct _WiFiSetting {
    char SSID[40];
    char Password[40];
    bool staticIpStatus;
    uint8_t StaticIP[4];
    uint8_t GatewayIp[4];
    uint8_t Netmask[4];
} WiFiSetting_t;



#endif  /*  _MAIN_H_   */