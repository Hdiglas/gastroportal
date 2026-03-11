import { NextResponse } from "next/server";
import { umsatzPool } from "@/lib/db/umsatz-db";
import iconv from "iconv-lite";

function parseCsv(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { header: [] as string[], rows: [] as string[][] };
  }

  const header = lines[0]
    .split(";")
    .map((h) => h.trim().toUpperCase());

  const rows = lines.slice(1).map((line) =>
    line
      .split(";")
      .map((c) => c.trim())
  );

  return { header, rows };
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Keine Datei hochgeladen." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const text = iconv.decode(buffer, "win1252");
    const { header, rows } = parseCsv(text);

    if (header.length === 0) {
      return NextResponse.json(
        { error: "Datei ist leer." },
        { status: 400 }
      );
    }

    let idxGroup = header.indexOf("GRUPPE");
    let idxId = header.indexOf("ID");
    let idxArtikel = header.indexOf("ARTIKEL");
    let idxPreis = header.indexOf("PREIS");

    // Fallback: Standliste-Format
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
      return NextResponse.json(
        {
          error:
            "Header konnte nicht erkannt werden. Erwartet z.B. GRUPPE;ID;Artikel;...;Preis oder Standliste-Format.",
          header,
        },
        { status: 400 }
      );
    }

    const client = await umsatzPool.connect();
    let imported = 0;
    let skipped = 0;

    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS public.articles (
          id        TEXT PRIMARY KEY,
          name      TEXT,
          category  TEXT,
          price     NUMERIC
        )
      `);

      await client.query("BEGIN");

      for (const cols of rows) {
        const grp = cols[idxGroup] ?? "";
        const id = cols[idxId] ?? "";
        const name = cols[idxArtikel] ?? "";
        const priceRaw = cols[idxPreis] ?? "";

        if (!id || !name || !grp) {
          skipped++;
          continue;
        }

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

      return NextResponse.json({ imported, skipped });
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {
        // ignore
      });
      console.error("Fehler beim Artikel-Import:", error);
      return NextResponse.json(
        { error: "Fehler beim Import der Artikeldaten." },
        { status: 500 }
      );
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Artikel-Upload error:", error);
    return NextResponse.json(
      { error: "Fehler beim Verarbeiten der Datei." },
      { status: 500 }
    );
  }
}

