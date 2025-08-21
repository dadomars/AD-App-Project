// pwa/src/lib/db.ts
import { MongoClient as MongoClientCtor } from "mongodb";

// Tipo istanza robusto anche con NodeNext
type MongoClient = InstanceType<typeof MongoClientCtor>;

let client: MongoClient | null = null;
let connecting: Promise<MongoClient> | null = null;

export async function getMongoClient(): Promise<MongoClient> {
  if (client) return client;
  if (connecting) return connecting;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI mancante");

  // Evitiamo annotazioni che triggerano l’errore
  const c = new MongoClientCtor(uri);
  connecting = c.connect().then(() => {
    client = c;
    connecting = null;
    return c;
  });

  return connecting;
}
