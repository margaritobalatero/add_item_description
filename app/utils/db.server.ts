import { MongoClient } from "mongodb";

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "remixdb";

if (!uri) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

if (process.env.NODE_ENV === "development") {
  // In development, use a global variable to preserve the client across module reloads
  if (!(global as any)._mongoClientPromise) {
    client = new MongoClient(uri);
    (global as any)._mongoClientPromise = client.connect();
  }
  clientPromise = (global as any)._mongoClientPromise;
} else {
  // In production, create a new client for each connection
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

export async function getDb() {
  const client = await clientPromise;
  return client.db(dbName);
}
