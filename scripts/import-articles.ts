import { readFile } from "fs/promises";
import { Pool } from "pg";
import iconv from "iconv-lite";

async function main() {
  const csvPath =
    process.argv[2] ||
    process.env.ARTICLES_CSV_PATH ||
    "./articles.csv";

  console.log(`Lese Artikelliste aus: ${csvPath}`);

  const rawPassword = process.env.UMSATZ_DB_PASSWORD;
  const password =
    rawPassword && rawPassword !== "undefined" && rawPassword !== "null"
      ? rawPassword
      : "sadkjsd7826387!!!@askgdlj//&%";

  console.log(
    "Verbinde zur Kassen-DB mit Benutzer",
    process.env.UMSATZ_DB_USER || "hdiglas",
    "und Passwort-Typ",
    typeof password
  );

  const pool = new Pool({
    host: process.env.UMSATZ_DB_HOST || "192.168.1.153",
    port: Number(process.env.UMSATZ_DB_PORT || 44391),
    database: process.env.UMSATZ_DB_NAME || "Master",
    user: process.env.UMSATZ_DB_USER || "hdiglas",
    password,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.articles (
        id        TEXT PRIMARY KEY,
        name      TEXT,
        category  TEXT,
        price     NUMERIC
      )
    `);

    const fileBuffer = await readFile(csvPath);
    const raw = iconv.decode(fileBuffer, "win1252");

    const lines = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      console.log("Datei ist leer, nichts zu importieren.");
      return;
    }

    // Header eines "sauberen" Exports wäre z.B.:
    //   GRUPPE;ID;Artikel;Zusatz;Allergene;Preis
    // Dein Kassen-Export "Standliste.csv" hat aber andere Spaltennamen.
    const header = lines[0]
      .split(";")
      .map((h) => h.trim().toUpperCase());

    let idxGroup = header.indexOf("GRUPPE");
    let idxId = header.indexOf("ID");
    let idxArtikel = header.indexOf("ARTIKEL");
    let idxPreis = header.indexOf("PREIS");

    // Fallback für dein konkretes Standlisten-Format:
    // ARTID;DISPLAYGRUPPE;ARTIKELGRUPPE;BEZEICHNUNG;PREIS/VK;...
    if (idxId === -1 && header.indexOf("ARTID") !== -1) {
      idxId = header.indexOf("ARTID");
    }
    if (idxArtikel === -1 && header.indexOf("BEZEICHNUNG") !== -1) {
      idxArtikel = header.indexOf("BEZEICHNUNG");
    }
    if (idxGroup === -1 && header.indexOf("ARTIKELGRUPPE") !== -1) {
      idxGroup = header.indexOf("ARTIKELGRUPPE");
    }
    if (idxPreis === -1 && header.indexOf("PREIS/VK") !== -1) {
      idxPreis = header.indexOf("PREIS/VK");
    }

    if (idxGroup === -1 || idxId === -1 || idxArtikel === -1 || idxPreis === -1) {
      console.error(
        "Header konnte nicht erkannt werden. Erwartet z.B. GRUPPE;ID;Artikel;...;Preis oder Standliste-Format."
      );
      console.error("Gefundener Header:", header);
      return;
    }

    let imported = 0;
    let skipped = 0;

    await client.query("BEGIN");

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const cols = line.split(";").map((c) => c.trim());

      const grp = cols[idxGroup];
      const id = cols[idxId];
      const name = cols[idxArtikel];
      const priceRaw = cols[idxPreis];

      if (!id || !name || !grp) {
        skipped++;
        continue;
      }

      // Zeilen wie "ALKOHOLFREI" ohne ID überspringen
      if (!/^\d+/.test(id)) {
        skipped++;
        continue;
      }

      let price: number | null = null;
      if (priceRaw) {
        const normalized = priceRaw.replace(".", "").replace(",", ".");
        const n = Number(normalized);
        if (!Number.isNaN(n)) {
          price = n;
        }
      }

      await client.query(
        `
        INSERT INTO public.articles (id, name, category, price)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE
        SET name = EXCLUDED.name,
            category = EXCLUDED.category,
            price = EXCLUDED.price
      `,
        [id, name, grp, price]
      );

      imported++;
    }

    await client.query("COMMIT");

    console.log(`Fertig. Importiert/aktualisiert: ${imported}, übersprungen: ${skipped}.`);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {
      // ignore
    });
    console.error("Fehler beim Import:", err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

