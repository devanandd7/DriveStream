import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const uri = process.env.MONGODB_URI||"mongodb+srv://devanandutkarsh7_db_user:lRrwVLsErlXoBB43@chatmemory1.nbuk2am.mongodb.net/";
const dbName = process.env.MONGODB_DB || "appdb";

if (!uri) {
  throw new Error("Missing MONGODB_URI in environment variables");
}

let client;
let clientPromise;

if (!global._mongoClientPromise) {
  client = new MongoClient(uri, {
    // pool options suitable for 1k+ users
    maxPoolSize: 20,
    minPoolSize: 0,
    serverSelectionTimeoutMS: 5000,
  });
  global._mongoClientPromise = client.connect();
}

clientPromise = global._mongoClientPromise;

export async function getDb() {
  const conn = await clientPromise;
  return conn.db(dbName);
}

export async function ensureIndexes() {
  const db = await getDb();
  const col = db.collection("user_credentials");
  await col.createIndex({ userId: 1 }, { unique: true, name: "uniq_userId" });
  await col.createIndex({ providerAccountId: 1, provider: 1 }, { unique: true, name: "uniq_provider_account" });
}
