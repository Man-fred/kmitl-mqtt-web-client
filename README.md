hivemq-mqtt-web-client
======================

### A websockets based MQTT Client สำหรับใช้งานบน WebBrowser.

Client นี้สามารถทำงานได้บนเว็บเบราเซอร์สมัยใหม่ที่สนับสนุน WebSockets (sorry Internet Explorer <10!).

ทดลองใช้งานได้ที่ [KMITL MQTT Dashboard](http://www.gis.it.kmitl.ac.th "KMITL MQTT Dashboard")
หรือ [Donwload](https://github.com/saranonuan/kmitl-mqtt-web-client/archive/master.zip) เพื่อใช้งานบน localhost

### MQTT Broker

Web client นี้พัฒนาเพื่อใช้งานกับ [KMITL MQTT broker](http:://gis.it.kmitl.ac.th/ "KMITL MQTT broker")
* Host: **gis.it.kmitl.ac.th**
* MQTT port: **1883**
* Websockets port: **3000**
* SOAP port: **3001**

### คำถามที่พบบ่อย / Code ตัวอย่าง
[WIKI PAGE](https://github.com/saranonuan/kmitl-mqtt-web-client/wiki)
* [ต่อ Arduino ภายในอินเตอร์เน็ตสถาบัน อย่างไร ?](https://github.com/saranonuan/kmitl-mqtt-web-client/wiki/How-to-connect-arduino-with-kmitl-network)
* [Code ตัวอย่าง การต่อ Arduino กับ MQTT Broker](https://github.com/saranonuan/kmitl-mqtt-web-client/wiki/How-to-connect-mqtt)

## Can I embedd it / ship it with my software?

We are fork from [HiveMQ Web Client](https://github.com/hivemq/hivemq-mqtt-web-client "HiveMQ Web Client")

And HiveMQ says!, "Sure! We would however be very glad if you would honor the work by linking to the original client source or mentioning that this websocket client was developed initially for HiveMQs websocket support."
