import { getDb } from "../api/queries/connection";
import { pollingUnits } from "./schema";

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

async function seed() {
  const db = getDb();
  console.log("Seeding Osun State polling units...");

  // Insert 3-5 representative units per LGA
  const allUnits: { name: string; lga: string; ward: string; latitude: string; longitude: string; registrationAreaCode: string }[] = [];

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
          latitude: (7.5 + Math.random() * 0.5).toFixed(7),
          longitude: (4.2 + Math.random() * 0.8).toFixed(7),
          registrationAreaCode: `${String(i + 1).padStart(2, "0")}-${String(w + 1).padStart(2, "0")}-${String(u + 1).padStart(3, "0")}`,
        });
      }
    }
  }

  // Insert in batches
  const batchSize = 30;
  for (let i = 0; i < allUnits.length; i += batchSize) {
    const batch = allUnits.slice(i, i + batchSize);
    await db.insert(pollingUnits).values(batch);
  }

  console.log(`Seeded ${allUnits.length} polling units across ${osunLGAs.length} LGAs!`);
}

seed().catch(console.error);
