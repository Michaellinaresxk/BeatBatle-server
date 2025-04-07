// src/config/mongodb-connection.js
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

// Connection URI from environment variable
const uri = process.env.MONGODB_URI;

class MongoDBConnection {
  constructor() {
    if (!uri) {
      throw new Error(
        'MONGODB_URI is not defined in the environment variables'
      );
    }

    this.client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });
  }

  async connect() {
    try {
      await this.client.connect();
      console.log('Successful connection to MongoDB');
      return this.client;
    } catch (error) {
      console.error('Error connecting to MongoDB:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      await this.client.close();
      console.log('Successful disconnection of MongoDB');
    } catch (error) {
      console.error('Error disconnecting from MongoDB:', error);
    }
  }

  getDatabase(dbName) {
    return this.client.db(dbName);
  }
}

module.exports = new MongoDBConnection();
