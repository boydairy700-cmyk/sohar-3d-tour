# -*- coding: utf-8 -*-
"""Make the online layer robust: broker rotation (HiveMQ first) + better status."""
import io

P = r"D:\SU3D\_online.js"
s = io.open(P, encoding="utf-8").read()

# 1) broker list
OLD_URL = "    url: 'wss://broker.emqx.io:8084/mqtt',"
NEW_URL = """    urls: [
      'wss://broker.hivemq.com:8884/mqtt',
      'wss://broker.emqx.io:8084/mqtt',
      'wss://test.mosquitto.org:8081/mqtt'
    ],
    url: 'wss://broker.hivemq.com:8884/mqtt',
    bi: 0,"""
assert OLD_URL in s
s = s.replace(OLD_URL, NEW_URL)

# 2) connection block with rotation
OLD_START = "    try {\n      const cl = mqtt.connect(ST.url, {"
i = s.index(OLD_START)
OLD_END = "    /* ربط الواجهة */"
j = s.index(OLD_END)

NEW_BLOCK = """    let cl = null, fails = 0, rotating = false;

    function connect() {
      if (rotating) return;
      ST.url = ST.urls[ST.bi % ST.urls.length];
      try {
        cl = mqtt.connect(ST.url, {
          clientId: 'su3d_' + ST.id + '_' + Math.floor(Math.random() * 1000),
          protocolVersion: 4, clean: true, reconnectPeriod: 5000,
          connectTimeout: 12000, keepalive: 45
        });
        ST.client = cl;
        cl.on('connect', () => {
          fails = 0; ST.ok = true; ST.status = 'on'; ST.err = '';
          cl.subscribe(ST.topic, { qos: 0 }, () => { announce(); publishState(); });
          updCount(); setStatus();
        });
        cl.on('reconnect', () => { ST.status = 'wait'; setStatus(); });
        cl.on('offline', () => { ST.ok = false; ST.status = 'off'; setStatus(); });
        cl.on('error', e => {
          ST.err = (e && e.message) ? e.message : 'خطأ اتصال';
          ST.status = 'err'; setStatus();
        });
        cl.on('close', () => {
          ST.ok = false;
          if (ST.status !== 'off') ST.status = 'wait';
          setStatus();
          if (!ST.ok && ++fails >= 2 && !rotating) {
            rotating = true;
            ST.bi++; fails = 0;
            try { if (cl) cl.end(true); } catch (_) { }
            setTimeout(() => { rotating = false; connect(); }, 2500);
          }
        });
        cl.on('message', onMsg);
      } catch (e) {
        ST.status = 'err'; ST.err = String((e && e.message) || e); setStatus();
      }
    }
    connect();

"""

s = s[:i] + NEW_BLOCK + s[j:]
io.open(P, "w", encoding="utf-8", newline="\n").write(s)
print("patched online.js")
