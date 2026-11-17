# -*- coding: utf-8 -*-
"""Rename the default peer label from 'player' to 'student'."""
import io

P = r"D:\SU3D\_online.js"
s = io.open(P, encoding="utf-8").read()

pairs = [
    ("id: id, name: name || 'لاعب', uni: uni || '', visitor: !!visitor,",
     "id: id, name: name || 'طالب', uni: uni || '', visitor: !!visitor,"),
    ("chatAdd(o.name || 'لاعب', o.m, false);",
     "chatAdd(o.name || 'طالب', o.m, false);"),
    ("const p = peer(o.id, (known && known.name) || 'لاعب', o.ch || (known && known.kind) || 'm',",
     "const p = peer(o.id, (known && known.name) || 'طالب', o.ch || (known && known.kind) || 'm',"),
    ("on: 'متصل — تظهر اللاعبون لحظياً',",
     "on: 'متصل — يظهر الطلاب لحظياً',"),
]
for a, b in pairs:
    if a not in s:
        print("MISS:", a[:60])
    s = s.replace(a, b)
io.open(P, "w", encoding="utf-8", newline="\n").write(s)
print("labels updated")
