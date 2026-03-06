/**
 * Mock Database Connection for Development
 * Use this when MongoDB is not available locally
 */

const mockDb = {
  collections: {
    users: [],
    patients: [],
    auditlogs: [],
    privacybudgets: [],
    securityevents: [],
    devicetrustscores: [],
    globalthreatscores: []
  }
};

// Mock Mongoose-like interface
const mockConnection = {
  connect: async (uri) => {
    console.log('📦 Connected to Mock Database (In-Memory)');
    console.log('⚠️  Note: Data will not persist between restarts');
    return Promise.resolve();
  },
  
  disconnect: async () => {
    console.log('📦 Disconnected from Mock Database');
    return Promise.resolve();
  },
  
  // Mock model creation
  model: (name, schema) => {
    const collectionName = name.toLowerCase() + 's';
    
    return class MockModel {
      constructor(data) {
        this.data = { 
          _id: new Date().getTime().toString(), 
          ...data,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
      
      async save() {
        mockDb.collections[collectionName].push(this.data);
        return this.data;
      }
      
      static async find(query = {}) {
        return mockDb.collections[collectionName] || [];
      }
      
      static async findById(id) {
        const items = mockDb.collections[collectionName] || [];
        return items.find(item => item._id === id);
      }
      
      static async findOne(query = {}) {
        const items = mockDb.collections[collectionName] || [];
        return items[0] || null;
      }
      
      static async create(data) {
        const item = { 
          _id: new Date().getTime().toString(), 
          ...data,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        mockDb.collections[collectionName].push(item);
        return item;
      }
      
      static async findByIdAndUpdate(id, update) {
        const items = mockDb.collections[collectionName] || [];
        const index = items.findIndex(item => item._id === id);
        if (index !== -1) {
          items[index] = { ...items[index], ...update, updatedAt: new Date() };
          return items[index];
        }
        return null;
      }
      
      static async deleteOne(query) {
        const items = mockDb.collections[collectionName] || [];
        const index = items.findIndex(item => 
          Object.keys(query).every(key => item[key] === query[key])
        );
        if (index !== -1) {
          return items.splice(index, 1)[0];
        }
        return null;
      }
    };
  }
};

module.exports = mockConnection;