const mongoose = require('mongoose');

// Drop legacy indexes that have been superseded by better compound indexes.
// Each entry: { collection, indexName }.
// Safe to run repeatedly — silently skips if the index doesn't exist.
const LEGACY_INDEXES = [
  { collection: 'featureflags', indexName: 'name_1' }, // replaced by {name,environment,projectId} partial unique
];

async function dropLegacyIndexes(db) {
  for (const { collection, indexName } of LEGACY_INDEXES) {
    try {
      await db.collection(collection).dropIndex(indexName);
      console.log(`[migration] Dropped legacy index "${indexName}" on ${collection}`);
    } catch (err) {
      if (err.codeName !== 'IndexNotFound') {
        console.warn(`[migration] Could not drop ${indexName}:`, err.message);
      }
    }
  }
}

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    await dropLegacyIndexes(conn.connection.db);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
