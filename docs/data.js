// Datalager: läser data/burs.json, som scraper/hamta.mjs uppdaterar från Svenska kyrkans publika kalender.
const GUDSTJANST = /gudstjänst|mässa|andakt|bön|otta|vesper|requiem/i;

export const isService = (e) => e.categories.includes("Gudstjänst och mässa") || GUDSTJANST.test(e.title);

// Returnerar { parish, updated, events: [{ id, title, start (ISO), place, categories, text, isService }] }
export async function getData() {
  const res = await fetch("data/burs.json", { cache: "no-cache" });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const d = await res.json();
  const now = Date.now();
  d.events = d.events
    .filter((e) => new Date(e.end || e.start).getTime() > now)
    .map((e) => ({ ...e, isService: isService(e) }));
  return d;
}
