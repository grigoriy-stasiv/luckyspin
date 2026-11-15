import { MongoClient } from "mongodb";

export async function connectToDatabase() {
  const connectionString = process.env.MONGODB_URI;

  if (!connectionString) {
    throw new Error("Add MONGODB_URI to backend/.env");
  }

  const client = new MongoClient(connectionString, {
    serverSelectionTimeoutMS: 5000,
  });

  await client.connect();
  return client.db(process.env.MONGODB_DB || "luckyspin");
}
