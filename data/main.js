
var gateway = `ws://${window.location.hostname}/ws`;
var websocket;

var ListTimer;
var ConnectTimer;
var getInfoTimer;
var WiFiListJson;

window.addEventListener('load', OnLoad);

function initWebSocket() {
    console.log('Trying to open a WebSocket connection...');
    websocket = new WebSocket(gateway);
    websocket.onopen = onOpen;
    websocket.onclose = onClose;
    websocket.onmessage = onMessage;
}

function onOpen(event) {
    console.log('Connection opened');
    getInfo();
}

function onClose(event) {
    console.log('Connection closed');
    setTimeout(initWebSocket, 2000);
    clearTimeout(getInfoTimer);
}

function OnLoad(event) {
    initWebSocket();
    fncStaticIP();
}

function getInfo() {
    getInfoTimer = setTimeout(getInfo, 3000);
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() { 
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
            var jsondata = JSON.parse(xmlHttp.responseText);
            console.log(jsondata);
        
            if (jsondata["id"] == "DeviceInfo") {
                if (jsondata["ConnectStatus"] == true) {
                    document.getElementById("connetInfoTable").style.display = "block";
                    document.getElementById('connectionSSID').innerHTML = jsondata["ConnectSSID"];
                    document.getElementById('connectionIP').innerHTML = jsondata["ConnectIp"];
                    clearTimeout(ConnectTimer);
                    document.getElementById("WifiSeetingCard").style.display = "block";
                    document.getElementById("LoderCard").style.display = "none";
                }
            }
        }
    }
    xmlHttp.open("GET", "/getInfo", true); 
    xmlHttp.send(null);
}

function onMessage(event) {
    var jsondata = JSON.parse(event.data);
    console.log(jsondata);
}

function fncStaticIP() {
    if (document.getElementById("staticIPCheckBox").checked == true) {
        document.getElementById("staticIPsection").style.display = "block";
    } else {
        document.getElementById("staticIPsection").style.display = "none";
    }
}

function fncConnect() {
    ConnectTimer = setTimeout(fncConnectInfo, 40000, '{ "Number" : 0}');
    document.getElementById("WifiSeetingCard").style.display = "none";
    document.getElementById("wifiListCard").style.display = "none";
    document.getElementById("LoderCard").style.display = "block";
    document.getElementById("loadertext").innerHTML = '<h2>Bağlaniyor...</h2>';

    var data = JSON.stringify(
        {
            "SSID": document.getElementById("id_ssd_name").value,
            "PASSWORD": document.getElementById("id_Sifre").value,
            "StaticIPStatus": document.getElementById("staticIPCheckBox").checked,
            "StaticIP": [
                parseInt(document.getElementById("IdStaticIP_0").value),
                parseInt(document.getElementById("IdStaticIP_1").value),
                parseInt(document.getElementById("IdStaticIP_2").value),
                parseInt(document.getElementById("IdStaticIP_3").value)
            ],
            "GatewayIP": [
                parseInt(document.getElementById("IdGateway_0").value),
                parseInt(document.getElementById("IdGateway_1").value),
                parseInt(document.getElementById("IdGateway_2").value),
                parseInt(document.getElementById("IdGateway_3").value)
            ],
            "NetMask": [
                parseInt(document.getElementById("IdNetmask_0").value),
                parseInt(document.getElementById("IdNetmask_1").value),
                parseInt(document.getElementById("IdNetmask_2").value),
                parseInt(document.getElementById("IdNetmask_3").value)
            ]
        }
    );

    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() { 
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
            console.log(xmlHttp.responseText);
        }
    }
    xmlHttp.open("POST", "/wifiSetting", true); 
    xmlHttp.send(data);
}

function fncConnectInfo(ListJson) {
    clearTimeout(ConnectTimer);
    document.getElementById("WifiSeetingCard").style.display = "block";
    document.getElementById("LoderCard").style.display = "none";
    fncListWifi(ListJson)
}


function fncListWifi(WiFiList) {

    WiFiListJson = JSON.parse(WiFiList); 
    clearTimeout(ListTimer);
    document.getElementById("LoderCard").style.display = "none";

    var listDiv = document.getElementById('IdWiFiScaneList');
    var ul = document.createElement('ul');

    var close = '<svg width = "16" height = "16" fill = "currentColor" class = "bi bi-lock-fill" viewBox = "0 0 16 16" > <path d = "M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" / > </svg>';
    var open = '<svg  width="16" height="16" fill="currentColor" class="bi bi-unlock-fill" viewBox="0 0 16 16"><path d="M11 1a2 2 0 0 0-2 2v4a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h5V3a3 3 0 0 1 6 0v4a.5.5 0 0 1-1 0V3a2 2 0 0 0-2-2z"/></svg>'
    var lowSignal = '<svg width="20" height="20" fill="currentColor" class="bi bi-wifi-1" viewBox="0 0 16 16"><path d="M11.046 10.454c.226-.226.185-.605-.1-.75A6.473 6.473 0 0 0 8 9c-1.06 0-2.062.254-2.946.704-.285.145-.326.524-.1.75l.015.015c.16.16.407.19.611.09A5.478 5.478 0 0 1 8 10c.868 0 1.69.201 2.42.56.203.1.45.07.611-.091l.015-.015zM9.06 12.44c.196-.196.198-.52-.04-.66A1.99 1.99 0 0 0 8 11.5a1.99 1.99 0 0 0-1.02.28c-.238.14-.236.464-.04.66l.706.706a.5.5 0 0 0 .707 0l.708-.707z"/></svg>'
    var mindSignal = '<svg width="20" height="20" fill="currentColor" class="bi bi-wifi-2" viewBox="0 0 16 16"><path d="M13.229 8.271c.216-.216.194-.578-.063-.745A9.456 9.456 0 0 0 8 6c-1.905 0-3.68.56-5.166 1.526a.48.48 0 0 0-.063.745.525.525 0 0 0 .652.065A8.46 8.46 0 0 1 8 7a8.46 8.46 0 0 1 4.577 1.336c.205.132.48.108.652-.065zm-2.183 2.183c.226-.226.185-.605-.1-.75A6.473 6.473 0 0 0 8 9c-1.06 0-2.062.254-2.946.704-.285.145-.326.524-.1.75l.015.015c.16.16.408.19.611.09A5.478 5.478 0 0 1 8 10c.868 0 1.69.201 2.42.56.203.1.45.07.611-.091l.015-.015zM9.06 12.44c.196-.196.198-.52-.04-.66A1.99 1.99 0 0 0 8 11.5a1.99 1.99 0 0 0-1.02.28c-.238.14-.236.464-.04.66l.706.706a.5.5 0 0 0 .708 0l.707-.707z"/></svg>'
    var highSignal = '<svg width="20" height="20" fill="currentColor" class="bi bi-wifi" viewBox="0 0 16 16"><path d="M15.384 6.115a.485.485 0 0 0-.047-.736A12.444 12.444 0 0 0 8 3C5.259 3 2.723 3.882.663 5.379a.485.485 0 0 0-.048.736.518.518 0 0 0 .668.05A11.448 11.448 0 0 1 8 4c2.507 0 4.827.802 6.716 2.164.205.148.49.13.668-.049z"/><path d="M13.229 8.271a.482.482 0 0 0-.063-.745A9.455 9.455 0 0 0 8 6c-1.905 0-3.68.56-5.166 1.526a.48.48 0 0 0-.063.745.525.525 0 0 0 .652.065A8.46 8.46 0 0 1 8 7a8.46 8.46 0 0 1 4.576 1.336c.206.132.48.108.653-.065zm-2.183 2.183c.226-.226.185-.605-.1-.75A6.473 6.473 0 0 0 8 9c-1.06 0-2.062.254-2.946.704-.285.145-.326.524-.1.75l.015.015c.16.16.407.19.611.09A5.478 5.478 0 0 1 8 10c.868 0 1.69.201 2.42.56.203.1.45.07.61-.091l.016-.015zM9.06 12.44c.196-.196.198-.52-.04-.66A1.99 1.99 0 0 0 8 11.5a1.99 1.99 0 0 0-1.02.28c-.238.14-.236.464-.04.66l.706.706a.5.5 0 0 0 .707 0l.707-.707z"/></svg>'
    listDiv.innerHTML = '<ul>';

    for (var i = 0; i < WiFiListJson["Number"]; ++i) {
        console.info( WiFiListJson[i]["SSID"]);
        var signal;
        var x;

        if (WiFiListJson[i]["Encryp"] == 1) {
            x = close;
        } else {
            x = open;
        }
        if (70 >= (WiFiListJson[i]["RSSI"] * -1)) {
            signal = highSignal;
        } else if (70 < (WiFiListJson[i]["RSSI"] * -1) && (WiFiListJson[i]["RSSI"] * -1) < 80) {
            signal = mindSignal;
        } else {
            signal = lowSignal;
        }

        listDiv.innerHTML += '<div role="group"><li class="card listwifi button"  onclick="fncWifiListItem(' + i + ')"   ><span class="wifiName">' +
            WiFiListJson[i]["SSID"] + '</span> <span class="RSSI">' +
            signal + '</span> <span class="encryption">' + x + '</span></li></div>';
    }

    listDiv.innerHTML += '</ul>';

    document.getElementById("wifiListCard").style.display = "block";
}



function  fncWifiListItem(i) {
    document.getElementById("id_ssd_name").value = WiFiListJson[i]["SSID"];
}

function fncwifiScane() {
    document.getElementById("LoderCard").style.display = "block";
    document.getElementById("wifiListCard").style.display = "none";
    document.getElementById("loadertext").innerHTML = '<h2>WiFi araniyor...</h2>';
    
    ListTimer = setTimeout(fncListWifi, 10000, '{ "Number" : 0}');

    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() { 
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
            fncListWifi(xmlHttp.responseText);
        }
    }
    xmlHttp.open("GET", "/scan", true); 
    xmlHttp.send(null);
}




