const d = new Date("2026-07-30T00:00:00.000Z");
d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
console.log(d.toISOString().slice(0, 10));
