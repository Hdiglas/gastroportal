import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { chatCompletion } from "@/lib/ai/ollama";

interface BusinessData {
  restaurantName?: string;
  adresse?: string;
  plz?: string;
  ort?: string;
  inhaber?: string;
  [key: string]: unknown;
}

async function getBusinessData(): Promise<BusinessData> {
  const setting = await prisma.setting.findUnique({
    where: { key: "business_data" },
  });

  if (setting) {
    try {
      return JSON.parse(setting.value);
    } catch {
      // fall through to account lookup
    }
  }

  const account = await prisma.account.findFirst({
    where: { isActive: true },
  });

  if (account?.businessData) {
    try {
      return JSON.parse(account.businessData);
    } catch {
      return {};
    }
  }

  return {};
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { employeeId, typ } = body;

    if (!employeeId || !typ) {
      return NextResponse.json(
        { error: "employeeId and typ are required" },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    const biz = await getBusinessData();
    const today = new Date().toISOString().slice(0, 10);

    let systemPrompt: string;
    let userPrompt: string;

    if (typ === "dienstvertrag") {
      const templateData = `
ARBEITSVERTRAG ARBEITER

Arbeitgeber: ${biz.restaurantName || "N/A"}, ${biz.adresse || ""} ${biz.plz || ""} ${biz.ort || ""}
Arbeitnehmer: ${employee.vorname} ${employee.nachname}, Versnr ${employee.sozialversicherungsnr} geb.${employee.geburtsdatum || ""}, ${employee.adresse} ${employee.plz} ${employee.ort}
Beginn: ${employee.eintrittsDatum || today}, Dauer: unbefristet nach Ablauf der Probezeit
Probezeit: ${employee.probezeit} Tage, Kündigungsfrist: ${employee.kuendigungsfrist}
Arbeitsort: Wien
Verwendung: ${employee.position}
KV Hotel- und Gastgewerbe, Lohngruppe: ${employee.lohngruppe}
Entlohnung: EUR ${employee.gehaltBrutto} brutto/Monat
Arbeitszeit: ${employee.wochenstunden} Stunden/Woche
Vertragsart: ${employee.vertragsart}
`.trim();

      systemPrompt =
        "Du bist ein Experte für österreichisches Arbeitsrecht, insbesondere den Kollektivvertrag Hotel- und Gastgewerbe. Erstelle formelle Arbeitsverträge auf Deutsch. Verwende die bereitgestellten Daten und ergänze alle notwendigen rechtlichen Klauseln.";

      userPrompt = `Erstelle einen vollständigen formellen österreichischen Arbeitsvertrag (Dienstvertrag) auf Deutsch basierend auf folgenden Daten:

${templateData}

Der Vertrag soll folgende Abschnitte enthalten:
1. Arbeitgeber und Arbeitnehmer
2. Beginn und Dauer des Dienstverhältnisses
3. Arbeitsort
4. Verwendung / Tätigkeit
5. Kollektivvertrag und Einstufung (KV Hotel- und Gastgewerbe)
6. Entlohnung
7. Arbeitszeit
8. Durchrechnungszeitraum
9. Kündigungsfrist (gemäß KV)
10. Schlussbestimmungen
11. Unterschriften (Arbeitgeber und Arbeitnehmer mit Datum)

Formatiere den Vertrag professionell und vollständig.`;
    } else if (typ === "kuendigung_einvernehmlich") {
      systemPrompt =
        "Du bist ein Experte für österreichisches Arbeitsrecht. Erstelle formelle Dokumente zur einvernehmlichen Auflösung von Dienstverhältnissen auf Deutsch.";

      userPrompt = `Erstelle eine einvernehmliche Auflösungsvereinbarung für folgendes Dienstverhältnis:

Arbeitgeber: ${biz.restaurantName || "N/A"}, ${biz.adresse || ""} ${biz.plz || ""} ${biz.ort || ""}
Arbeitnehmer: ${employee.vorname} ${employee.nachname}
Position: ${employee.position}
Eintrittsdatum: ${employee.eintrittsDatum || "N/A"}
Restliche Urlaubstage: ${employee.urlaubstageRest}
Auflösungsdatum: ${today}

Die Vereinbarung soll enthalten:
1. Beide Vertragsparteien
2. Auflösungsdatum
3. Restlicher Urlaubsanspruch und Abgeltung
4. Offene Ansprüche / Entgeltfortzahlung
5. Dienstzeugnis
6. Klausel über gegenseitigen Verzicht weiterer Ansprüche
7. Unterschriften beider Parteien mit Datum`;
    } else if (typ === "kuendigung_dienstgeber") {
      systemPrompt =
        "Du bist ein Experte für österreichisches Arbeitsrecht und den KV Hotel- und Gastgewerbe. Erstelle formelle Kündigungsschreiben des Dienstgebers auf Deutsch.";

      userPrompt = `Erstelle ein Kündigungsschreiben des Dienstgebers für folgendes Dienstverhältnis:

Arbeitgeber: ${biz.restaurantName || "N/A"}, ${biz.adresse || ""} ${biz.plz || ""} ${biz.ort || ""}
Arbeitnehmer: ${employee.vorname} ${employee.nachname}
Position: ${employee.position}
Eintrittsdatum: ${employee.eintrittsDatum || "N/A"}
Kündigungsfrist: ${employee.kuendigungsfrist}
Datum der Kündigung: ${today}

Das Schreiben soll enthalten:
1. Kündigung unter Einhaltung der Kündigungsfrist gemäß KV Hotel- und Gastgewerbe
2. Letzter Arbeitstag
3. Hinweis auf Anspruch eines Dienstzeugnisses
4. Hinweis auf Restansprüche (Urlaub, Sonderzahlungen)
5. Unterschrift des Dienstgebers mit Datum
6. Bestätigung des Erhalts durch den Dienstnehmer`;
    } else {
      return NextResponse.json(
        {
          error:
            "Unsupported typ. Use: dienstvertrag, kuendigung_einvernehmlich, kuendigung_dienstgeber",
        },
        { status: 400 }
      );
    }

    const result = await chatCompletion({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      maxTokens: 4096,
      thinkingEffort: "normal",
    });

    const contract = await prisma.contract.create({
      data: {
        employeeId,
        typ,
        inhalt: result.content,
        gueltigAb: today,
      },
      include: {
        employee: {
          select: { id: true, vorname: true, nachname: true },
        },
      },
    });

    return NextResponse.json(contract, { status: 201 });
  } catch (error) {
    console.error("POST /api/intranet/contracts/generate error:", error);
    return NextResponse.json(
      { error: "Failed to generate contract" },
      { status: 500 }
    );
  }
}
