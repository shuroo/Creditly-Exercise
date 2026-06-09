// db.ts
import { MongoClient } from "mongodb";

process.loadEnvFile();

const client = new MongoClient(process.env.MONGO_URI!);

export async function connectDb() {
  await client.connect();
  return client.db("mydb");
}