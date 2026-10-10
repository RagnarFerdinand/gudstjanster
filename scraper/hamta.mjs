// Läser Burs pastorats publika kalendersida i en riktig webbläsare (sidan ritas av JavaScript)
// och sparar kommande händelser som ../data/burs.json.
import puppeteer from "puppeteer-core";
import { writeFileSync } from "node:fs";

const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const SIDA = "https://www.svenskakyrkan.se/kalender?type=owner&id=7675,7674,13093&locationName=Burs+pastorat&webid=1347024";
const MAX_KLICK = 8; // "Visa fler händelser" – håll nere belastningen på deras server

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage();
  await page.goto(SIDA, { waitUntil: "networkidle2", timeout: 60000 });
  await page.waitForSelector("ol.events__list svk-list-item", { timeout: 30000 });

  for (let i = 0; i < MAX_KLICK; i++) {
    const klickade = await page.evaluate(() => {
      const b = [...document.querySelectorAll("button")].find((x) => /visa fler/i.test(x.textContent));
      if (!b) return false;
      b.click();
      return true;
    });
    if (!klickade) break;
    await new Promise((r) => setTimeout(r, 1500));
  }

  const events = await page.evaluate(() =>
    [...document.querySelectorAll("ol.events__list svk-list-item")].map((el) => {
      const a = el.querySelector("a.js-open-event");
      const times = el.querySelectorAll("time");
      const metas = [...el.querySelectorAll(".list-item__meta")];
      const plats = metas.find((m) => m.querySelector("svk-icon[name=location]"));
      return {
        id: a?.dataset.id,
        title: a?.textContent.trim(),
        start: times[0]?.getAttribute("datetime"),
        end: times[1]?.getAttribute("datetime") || null,
        place: plats ? plats.textContent.replace(/\s+/g, " ").trim() : "",
        categories: [...el.querySelectorAll("svk-chip")].map((c) => c.getAttribute("label")),
        text: el.querySelector(".list-item__text")?.textContent.replace(/\s+/g, " ").trim() || "",
      };
    }),
  );

  const unika = [...new Map(events.filter((e) => e.id && e.start).map((e) => [e.id + e.start, e])).values()]
    .sort((a, b) => a.start.localeCompare(b.start));
  if (!unika.length) throw new Error("Hittade inga händelser – sidans struktur kan ha ändrats");

  writeFileSync(new URL("../docs/data/burs.json", import.meta.url), JSON.stringify({
    parish: "Burs pastorat",
    updated: new Date().toISOString(),
    source: "https://www.svenskakyrkan.se/burs",
    events: unika,
  }, null, 1));
  console.log(`Sparade ${unika.length} händelser (${unika.filter((e) => e.categories.includes("Gudstjänst och mässa")).length} gudstjänster)`);
} finally {
  await browser.close();
}
