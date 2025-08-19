// pwa/lib/db.ts
// Client MongoDB con import dinamico (funziona anche se l'editor segna rosso sui tipi)
const uri = process.env.MONGODB_URI as string;
if (!uri) throw new Error("Missing MONGODB_URI");

let clientPromise: Promise<any> | null = null;

export default async function getMongoClient() {
  if (!clientPromise) {
    clientPromise = (async () => {
      const { MongoClient } = await import("mongodb");
      const client = new MongoClient(uri, {});
      return client.connect();
    })();
  }
  return clientPromise; // Promise<MongoClient>
}
