import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const osunLGAs = [
  "Aiyedaade", "Aiyedire", "Atakunmosa East", "Atakunmosa West",
  "Boluwaduro", "Boripe", "Ede North", "Ede South", "Egbedore",
  "Ejigbo", "Ife Central", "Ife East", "Ife North", "Ife South",
  "Ifedayo", "Ifelodun", "Ila", "Ilesa East", "Ilesa West",
  "Irepodun", "Irewole", "Isokan", "Iwo", "Obokun",
  "Odo-Otin", "Ola-Oluwa", "Olorunda", "Oriade", "Orolu", "Osogbo",
];

const puTemplates = [
  "St. Peter's Pry Sch", "Baptist Day Sch", "Community Pry Sch",
  "Town Hall", "Market Square", "L.A. Pry Sch", "N.U.D. Pry Sch",
  "Methodist Pry Sch", "C.A.C. Pry Sch", "Health Centre",
];

export function seedDatabase(dbPath: string) {
  const client = new Database(dbPath);
  const db = drizzle(client, { schema });

  console.log("Checking if seeding is needed...");

  const count = client.prepare("SELECT COUNT(*) as count FROM polling_units").get() as { count: number } | undefined;
  if (count && count.count > 0) {
    console.log(`Database already has ${count.count} polling units, skipping seed.`);
    client.close();
    return;
  }

  console.log("Seeding Osun State polling units...");

  const allUnits: { name: string; lga: string; ward: string; latitude: number; longitude: number; registrationAreaCode: string }[] = [];

  for (let i = 0; i < osunLGAs.length; i++) {
    const lga = osunLGAs[i];
    const numWards = 8 + (i % 5);
    const numUnits = 3 + (i % 3);

    for (let w = 0; w < numWards && w < 4; w++) {
      for (let u = 0; u < numUnits; u++) {
        const template = puTemplates[(i + w + u) % puTemplates.length];
        allUnits.push({
          name: `${template}, ${lga} ${w + 1}`,
          lga,
          ward: `Ward ${w + 1}`,
          latitude: 7.5 + Math.random() * 0.5,
          longitude: 4.2 + Math.random() * 0.8,
          registrationAreaCode: `${String(i + 1).padStart(2, "0")}-${String(w + 1).padStart(2, "0")}-${String(u + 1).padStart(3, "0")}`,
        });
      }
    }
  }

  const insert = client.prepare(
    "INSERT INTO polling_units (name, lga, ward, latitude, longitude, registration_area_code) VALUES (?, ?, ?, ?, ?, ?)"
  );

  const insertMany = client.transaction((units) => {
    for (const u of units) {
      insert.run(u.name, u.lga, u.ward, u.latitude, u.longitude, u.registrationAreaCode);
    }
  });

  insertMany(allUnits);

  console.log(`Seeded ${allUnits.length} polling units across ${osunLGAs.length} LGAs!`);
  client.close();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dbPath = process.argv[2] || "./local.db";
  seedDatabase(dbPath);
}
