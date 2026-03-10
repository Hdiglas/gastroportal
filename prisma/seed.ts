import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding GastroMail test data...\n");

  // --- 1. Test Account ---
  const account = await prisma.account.upsert({
    where: { id: "test-account-1" },
    update: {},
    create: {
      id: "test-account-1",
      name: "Gasthaus Zum Goldenen Hirsch",
      email: "info@goldener-hirsch.at",
      imapHost: "",
      smtpHost: "",
      username: "info@goldener-hirsch.at",
      color: "#b45309",
      aiSystemPrompt:
        "Du bist der E-Mail-Assistent des Gasthaus Zum Goldenen Hirsch in Wien. " +
        "Antworte immer hoeflich, freundlich und professionell. " +
        "Verwende 'Sie' als Anrede. " +
        "Bei Reservierungen: Bestaetige mit Hinweis auf 15-Minuten-Regel. " +
        "Bei Veranstaltungen: Biete immer einen Besichtigungstermin an. " +
        "Bei Fundgegenstaenden: Erwaehne 2 Wochen Aufbewahrungsfrist.",
      signature:
        "Mit freundlichen Gruessen,\n\nDas Team vom Gasthaus Zum Goldenen Hirsch\n" +
        "Hauptstrasse 42, 1010 Wien\n" +
        "Tel: +43 1 234 5678\n" +
        "www.goldener-hirsch.at",
      businessData: JSON.stringify({
        grunddaten: {
          name: "Gasthaus Zum Goldenen Hirsch",
          adresse: "Hauptstrasse 42, 1010 Wien",
          telefon: "+43 1 234 5678",
          website: "www.goldener-hirsch.at",
        },
        oeffnungszeiten: {
          montag: "Ruhetag",
          dienstag: "11:00 - 23:00",
          mittwoch: "11:00 - 23:00",
          donnerstag: "11:00 - 23:00",
          freitag: "11:00 - 24:00",
          samstag: "11:00 - 24:00",
          sonntag: "11:00 - 22:00",
        },
        kueche: {
          art: "Oesterreichische Kueche, Wiener Klassiker",
          spezialitaeten: "Wiener Schnitzel, Tafelspitz, Kaiserschmarrn",
          allergene: "Allergenkarte verfuegbar, glutenfreie Optionen",
        },
        sonstiges: {
          parkplaetze: "Eigener Parkplatz mit 20 Stellplaetzen hinter dem Haus",
          anfahrt: "U1 Station Stephansplatz, 5 Minuten zu Fuss",
          besonderheiten: "Gastgarten mit Blick auf den Stephansdom, Live-Musik jeden Freitagabend",
        },
      }),
    },
  });
  console.log(`Account: ${account.name} (${account.id})`);

  // --- 2. Bereiche ---
  const areas = [
    {
      id: "area-gastraum",
      accountId: account.id,
      name: "Gastraum",
      type: "dining",
      capacity: 50,
      description: "Hauptraum im Erdgeschoss, gemutliche Atmosphaere",
      isActive: true,
      isSeasonal: false,
    },
    {
      id: "area-garten",
      accountId: account.id,
      name: "Garten",
      type: "garden",
      capacity: 30,
      description: "Ruhiger Innenhofgarten mit Sonnenschirmen",
      isActive: true,
      isSeasonal: true,
      seasonStart: "04-01",
      seasonEnd: "10-31",
    },
    {
      id: "area-gastgarten",
      accountId: account.id,
      name: "Gastgarten Event",
      type: "event_garden",
      capacity: 80,
      minPersons: 20,
      description: "Grosser Gastgarten, ideal fuer Sommerfeste und Firmenfeiern",
      isActive: true,
      isSeasonal: true,
      seasonStart: "05-01",
      seasonEnd: "09-30",
    },
    {
      id: "area-salon",
      accountId: account.id,
      name: "Veranstaltungssalon 1. OG",
      type: "event_salon",
      capacity: 100,
      minPersons: 20,
      description: "Eleganter Saal im ersten Stock mit Beamer, Buehne und eigener Bar. Bankettbestuhlung oder U-Form moeglich.",
      isActive: true,
      isSeasonal: false,
    },
  ];

  for (const area of areas) {
    await prisma.area.upsert({
      where: { id: area.id },
      update: {},
      create: area,
    });
  }
  console.log(`${areas.length} Bereiche angelegt`);

  // --- 3. Test-Emails ---
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  const emails = [
    // RESERVIERUNGEN
    {
      messageId: "test-mail-reserv-01",
      fromAddress: "max.mueller@gmail.com",
      fromName: "Max Mueller",
      toAddress: account.email,
      subject: "Tischreservierung Samstag 19 Uhr",
      textBody:
        "Sehr geehrte Damen und Herren,\n\n" +
        "wir moechten gerne am kommenden Samstag um 19:00 Uhr einen Tisch " +
        "fuer 6 Personen bei Ihnen reservieren. Wenn moeglich, haetten wir gerne " +
        "einen Tisch im Garten.\n\n" +
        "Bitte geben Sie uns Bescheid, ob das moeglich ist.\n\n" +
        "Mit freundlichen Gruessen,\nMax Mueller",
      date: new Date(today.getTime() - 2 * 60 * 60 * 1000),
      category: null,
      priority: null,
    },
    {
      messageId: "test-mail-reserv-02",
      fromAddress: "anna.schneider@web.de",
      fromName: "Anna Schneider",
      toAddress: account.email,
      subject: "Reservierung fuer Geburtstagsfeier",
      textBody:
        "Hallo!\n\n" +
        "Ich moechte meinen 30. Geburtstag bei Ihnen feiern. " +
        "Wir waeren ca. 15 Personen und wuerden gerne am 22. Maerz ab 18 Uhr kommen. " +
        "Gibt es die Moeglichkeit, einen separaten Bereich zu bekommen? " +
        "Wir wuerden auch gerne ein Menue vorbestellen.\n\n" +
        "Koennen Sie mir bitte ein Angebot schicken?\n\n" +
        "Liebe Gruesse,\nAnna Schneider\nTel: 0660 123 4567",
      date: new Date(today.getTime() - 5 * 60 * 60 * 1000),
      category: null,
      priority: null,
    },

    // VERANSTALTUNGEN
    {
      messageId: "test-mail-event-01",
      fromAddress: "petra.wagner@firma-abc.at",
      fromName: "Petra Wagner",
      toAddress: account.email,
      subject: "Anfrage Firmen-Weihnachtsfeier Dezember",
      textBody:
        "Sehr geehrte Damen und Herren,\n\n" +
        "die Firma ABC GmbH plant ihre jaehrliche Weihnachtsfeier und wir sind auf " +
        "Ihr wunderschoenes Lokal aufmerksam geworden.\n\n" +
        "Details:\n" +
        "- Datum: 13. Dezember 2026\n" +
        "- Personenanzahl: ca. 60 Mitarbeiter\n" +
        "- Zeitrahmen: 18:00 bis ca. 23:00 Uhr\n" +
        "- Gewuenscht: 4-Gaenge-Menue, Getrankepauschal, evtl. Live-Musik\n\n" +
        "Koennten Sie uns bitte ein Angebot zusenden? Wir wuerden auch gerne " +
        "vorab eine Besichtigung machen.\n\n" +
        "Mit besten Gruessen,\n" +
        "Petra Wagner\nAssistenz der Geschaeftsfuehrung\nFirma ABC GmbH\n" +
        "petra.wagner@firma-abc.at\nTel: +43 1 999 8877",
      date: yesterday,
      category: null,
      priority: null,
    },
    {
      messageId: "test-mail-event-02",
      fromAddress: "stefan.huber@gmx.at",
      fromName: "Stefan Huber",
      toAddress: account.email,
      subject: "Hochzeitsfeier Juni - Anfrage",
      textBody:
        "Liebes Team vom Goldenen Hirsch,\n\n" +
        "meine Verlobte und ich planen unsere Hochzeit am 20. Juni 2026 und " +
        "suchen eine wunderschoene Location fuer die Feier.\n\n" +
        "Wir waeren ca. 85 Gaeste und stellen uns vor:\n" +
        "- Sektempfang ab 15:00 im Gastgarten (falls Wetter passt)\n" +
        "- Abendessen im grossen Saal ab 18:00\n" +
        "- Party bis ca. 02:00\n\n" +
        "Wir haetten gerne ein 5-Gaenge-Menue. Ausserdem bringen wir eine Band mit, " +
        "gibt es eine Buehne?\n\n" +
        "Wir wuerden uns sehr ueber einen Besichtigungstermin freuen!\n\n" +
        "Herzliche Gruesse,\nStefan Huber & Maria Berger",
      date: yesterday,
      category: null,
      priority: null,
    },

    // FUNDGEGENSTAND
    {
      messageId: "test-mail-fund-01",
      fromAddress: "lisa.berger@outlook.com",
      fromName: "Lisa Berger",
      toAddress: account.email,
      subject: "Schal vergessen am Donnerstagabend",
      textBody:
        "Hallo,\n\n" +
        "ich war am Donnerstagabend (ca. 20:00-22:00) bei Ihnen essen " +
        "und habe leider meinen roten Kaschmirschal vergessen. " +
        "Wir sassen im Gastraum, Tisch beim Fenster.\n\n" +
        "Haben Sie den Schal vielleicht gefunden? Er hat grossen " +
        "sentimentalen Wert fuer mich.\n\n" +
        "Vielen Dank im Voraus!\nLisa Berger\nTel: 0699 876 5432",
      date: new Date(today.getTime() - 3 * 60 * 60 * 1000),
      category: null,
      priority: null,
    },
    {
      messageId: "test-mail-fund-02",
      fromAddress: "thomas.klein@icloud.com",
      fromName: "Thomas Klein",
      toAddress: account.email,
      subject: "Jacke liegen gelassen",
      textBody:
        "Guten Tag,\n\n" +
        "ich habe am Mittwoch meine schwarze Lederjacke bei Ihnen " +
        "im Gastgarten vergessen. Sie hing ueber dem Stuhl.\n\n" +
        "Ist die Jacke noch da? Ich koennte sie morgen abholen.\n\n" +
        "Danke,\nThomas Klein",
      date: twoDaysAgo,
      category: null,
      priority: null,
    },

    // LIEFERANT
    {
      messageId: "test-mail-liefer-01",
      fromAddress: "bestellung@weinhandel-gruner.at",
      fromName: "Weinhandel Gruener",
      toAddress: account.email,
      subject: "Rechnung Nr. 2026-0342 und neue Preisliste",
      textBody:
        "Sehr geehrter Herr Wirt,\n\n" +
        "anbei senden wir Ihnen die Rechnung Nr. 2026-0342 ueber EUR 1.847,50 " +
        "fuer die Weinlieferung vom 3. Maerz.\n\n" +
        "Zahlungsziel: 14 Tage netto.\n\n" +
        "Ausserdem moechten wir Ihnen unsere neue Fruehjahrs-Preisliste " +
        "zukommen lassen. Besonders empfehlen wir den neuen Gruenen Veltliner " +
        "vom Weingut Bauer -- hervorragendes Preis-Leistungs-Verhaeltnis.\n\n" +
        "Sollen wir naechste Woche wieder liefern?\n\n" +
        "Freundliche Gruesse,\nWeinhandel Gruener GmbH",
      date: twoDaysAgo,
      category: null,
      priority: null,
    },

    // BEWERBUNG
    {
      messageId: "test-mail-bewer-01",
      fromAddress: "sarah.novak@yahoo.com",
      fromName: "Sarah Novak",
      toAddress: account.email,
      subject: "Bewerbung als Servicekraft",
      textBody:
        "Sehr geehrte Damen und Herren,\n\n" +
        "ich bewerbe mich hiermit um eine Stelle als Servicekraft in Ihrem Gasthaus.\n\n" +
        "Ich habe 3 Jahre Erfahrung in der Gastronomie, zuletzt als Kellnerin " +
        "im Restaurant Stadtkrug. Ich bin flexibel einsetzbar, auch am Wochenende.\n\n" +
        "Meinen Lebenslauf habe ich angehaengt.\n\n" +
        "Ich wuerde mich sehr ueber ein Vorstellungsgespraech freuen.\n\n" +
        "Mit freundlichen Gruessen,\nSarah Novak",
      date: twoDaysAgo,
      category: null,
      priority: null,
    },

    // BESCHWERDE
    {
      messageId: "test-mail-beschw-01",
      fromAddress: "karl.gruber@aon.at",
      fromName: "Karl Gruber",
      toAddress: account.email,
      subject: "Enttaeuschendes Erlebnis am Samstagabend",
      textBody:
        "Sehr geehrte Geschaeftsfuehrung,\n\n" +
        "ich muss leider eine Beschwerde ueber unseren Besuch am vergangenen " +
        "Samstagabend aeussern.\n\n" +
        "Obwohl wir einen Tisch fuer 20:00 reserviert hatten, mussten wir " +
        "ueber 25 Minuten warten, bis wir einen Tisch bekamen. " +
        "Der Service war dann leider auch sehr langsam -- auf das Hauptgericht " +
        "haben wir fast eine Stunde gewartet.\n\n" +
        "Das Essen selbst war gut, aber das Gesamterlebnis war fuer ein Lokal " +
        "Ihres Niveaus enttaeuschend.\n\n" +
        "Ich hoffe auf eine Rueckmeldung.\n\n" +
        "Karl Gruber",
      date: new Date(today.getTime() - 1 * 60 * 60 * 1000),
      category: null,
      priority: null,
    },

    // PRESSE
    {
      messageId: "test-mail-presse-01",
      fromAddress: "redaktion@wiener-genuss.at",
      fromName: "Wiener Genuss Magazin",
      toAddress: account.email,
      subject: "Anfrage: Restaurant-Vorstellung in unserem Magazin",
      textBody:
        "Sehr geehrtes Team vom Goldenen Hirsch,\n\n" +
        "wir vom Wiener Genuss Magazin planen fuer unsere Sommerausgabe " +
        "einen Artikel ueber die besten traditionellen Gasthaeuser Wiens.\n\n" +
        "Wir wuerden Sie gerne in unseren Artikel aufnehmen. Dafuer wuerden wir:\n" +
        "- Ein kurzes Interview mit dem Kuechenchef fuehren\n" +
        "- Fotos vom Lokal und 2-3 Gerichten machen\n" +
        "- Eine Bewertung schreiben\n\n" +
        "Haetten Sie Interesse? Wir koennten naechste Woche vorbeikommen.\n\n" +
        "Beste Gruesse,\nDie Redaktion\nWiener Genuss Magazin",
      date: yesterday,
      category: null,
      priority: null,
    },

    // SPAM
    {
      messageId: "test-mail-spam-01",
      fromAddress: "marketing@cheap-supplies.com",
      fromName: "Best Restaurant Supplies",
      toAddress: account.email,
      subject: "SPECIAL OFFER: 50% OFF Restaurant Equipment!!!",
      textBody:
        "AMAZING DEAL! Get 50% off ALL restaurant equipment!\n\n" +
        "Click here to claim your discount: http://totally-not-spam.com\n\n" +
        "Unsubscribe: http://also-spam.com/unsub",
      date: twoDaysAgo,
      category: null,
      priority: null,
    },

    // ALLGEMEIN
    {
      messageId: "test-mail-allg-01",
      fromAddress: "josef.wimmer@gmx.at",
      fromName: "Josef Wimmer",
      toAddress: account.email,
      subject: "Frage zu Oeffnungszeiten und Speisekarte",
      textBody:
        "Hallo,\n\n" +
        "haben Sie auch am Montag geoeffnet? Und kann man die aktuelle " +
        "Speisekarte irgendwo online einsehen?\n\n" +
        "Gibt es vegetarische Optionen?\n\n" +
        "Danke,\nJosef Wimmer",
      date: new Date(today.getTime() - 4 * 60 * 60 * 1000),
      category: null,
      priority: null,
    },

    // Noch eine dringende Reservierung (fuer heute!)
    {
      messageId: "test-mail-reserv-03",
      fromAddress: "elena.popov@gmail.com",
      fromName: "Elena Popov",
      toAddress: account.email,
      subject: "DRINGEND: Tisch fuer heute Abend?",
      textBody:
        "Hallo,\n\n" +
        "ich weiss es ist kurzfristig, aber haben Sie heute Abend noch einen " +
        "freien Tisch fuer 2 Personen? Am liebsten im Garten.\n" +
        "Wir wuerden gegen 20:00 kommen.\n\n" +
        "Bitte um schnelle Rueckmeldung!\n\n" +
        "Danke,\nElena Popov",
      date: new Date(today.getTime() - 30 * 60 * 1000),
      category: null,
      priority: null,
    },
  ];

  for (const mail of emails) {
    await prisma.email.upsert({
      where: {
        accountId_messageId: {
          accountId: account.id,
          messageId: mail.messageId,
        },
      },
      update: {},
      create: {
        accountId: account.id,
        ...mail,
      },
    });
  }
  console.log(`${emails.length} Test-E-Mails angelegt`);

  // --- 4. Reservierungen fuer heute ---
  const todayStr = today.toISOString().split("T")[0];
  const reservations = [
    {
      id: "test-res-01",
      accountId: account.id,
      areaId: "area-gastraum",
      guestName: "Familie Hofer",
      guestEmail: "hofer@gmail.com",
      guestPhone: "0660 111 2222",
      date: new Date(todayStr + "T00:00:00.000Z"),
      timeFrom: "18:00",
      persons: 4,
      status: "confirmed",
      sourceType: "phone",
    },
    {
      id: "test-res-02",
      accountId: account.id,
      areaId: "area-gastraum",
      guestName: "Dr. Braun",
      guestEmail: "braun@web.de",
      date: new Date(todayStr + "T00:00:00.000Z"),
      timeFrom: "19:00",
      persons: 2,
      status: "confirmed",
      sourceType: "website",
    },
    {
      id: "test-res-03",
      accountId: account.id,
      areaId: "area-garten",
      guestName: "Gruppe Schmidt",
      guestEmail: "schmidt@outlook.com",
      guestPhone: "0676 333 4444",
      date: new Date(todayStr + "T00:00:00.000Z"),
      timeFrom: "19:30",
      persons: 8,
      status: "pending",
      sourceType: "email",
    },
    {
      id: "test-res-04",
      accountId: account.id,
      areaId: "area-salon",
      guestName: "Firma XY",
      guestEmail: "events@firma-xy.at",
      guestCompany: "Firma XY GmbH",
      date: new Date(todayStr + "T00:00:00.000Z"),
      timeFrom: "17:00",
      timeTo: "23:00",
      persons: 45,
      type: "event",
      eventType: "Firmenjubilaeum",
      status: "confirmed",
      sourceType: "email",
    },
    {
      id: "test-res-05",
      accountId: account.id,
      areaId: "area-gastraum",
      guestName: "Frau Novak",
      date: new Date(todayStr + "T00:00:00.000Z"),
      timeFrom: "20:00",
      persons: 3,
      status: "pending",
      sourceType: "website",
    },
  ];

  for (const res of reservations) {
    await prisma.reservation.upsert({
      where: { id: res.id },
      update: {},
      create: res,
    });
  }
  console.log(`${reservations.length} Test-Reservierungen angelegt`);

  // --- 5. Kontakte ---
  const contacts = [
    {
      accountId: account.id,
      email: "max.mueller@gmail.com",
      name: "Max Mueller",
      visitCount: 5,
      tags: JSON.stringify(["stammgast"]),
    },
    {
      accountId: account.id,
      email: "petra.wagner@firma-abc.at",
      name: "Petra Wagner",
      company: "Firma ABC GmbH",
      phone: "+43 1 999 8877",
      visitCount: 2,
      tags: JSON.stringify(["firmenkunde", "events"]),
    },
    {
      accountId: account.id,
      email: "karl.gruber@aon.at",
      name: "Karl Gruber",
      visitCount: 3,
      tags: JSON.stringify(["stammgast"]),
    },
  ];

  for (const contact of contacts) {
    await prisma.contact.upsert({
      where: {
        accountId_email: {
          accountId: contact.accountId,
          email: contact.email,
        },
      },
      update: {},
      create: contact,
    });
  }
  console.log(`${contacts.length} Test-Kontakte angelegt`);

  console.log("\nSeed komplett! Du kannst jetzt testen:");
  console.log("  - Posteingang: 13 E-Mails ueber alle Kategorien");
  console.log("  - Kategorisierung: Alle Mails sind unkategorisiert -> Sync klicken");
  console.log("  - Antwort-Entwurf: Waehle eine Mail -> 'Entwurf generieren'");
  console.log("  - Briefing: Dashboard -> 'KI-Briefing' Button");
  console.log("  - Reservierungen: 5 Reservierungen fuer heute");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
