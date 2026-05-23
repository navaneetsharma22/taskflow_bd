import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/taskflow';

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log('Collections present:', collections.map(c => c.name));

    // Drop the token_1 index from usersessions
    const sessionCollection = db.collection('usersessions');
    const indexes = await sessionCollection.indexes();
    console.log('Current indexes on usersessions:', indexes.map(i => i.name));

    if (indexes.some(i => i.name === 'token_1')) {
      console.log('Dropping obsolete unique index token_1...');
      await sessionCollection.dropIndex('token_1');
      console.log('Dropped index token_1 successfully!');
    } else {
      console.log('Obsolete unique index token_1 was not found.');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

run();
