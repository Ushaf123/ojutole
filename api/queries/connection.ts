// Database connection - replaced with JSON file store
// The json-store.ts module handles all data persistence.
// This file is kept for compatibility with any code that imports getDb.

import { reportStore, userStore } from "../json-store";

// Mock db interface that redirects to our JSON store
// This preserves compatibility with any code using getDb()
const mockDb = {
  // User operations
  query: {
    users: {
      findMany: () => userStore.getAll(),
      findFirst: ({ where }: any) => {
        if (where?.unionId?.equals) {
          return userStore.getByUnionId(where.unionId.equals) || null;
        }
        if (where?.id?.equals) {
          return userStore.getById(where.id.equals) || null;
        }
        return null;
      },
    },
  },
  // Insert operations
  insert: () => ({ values: () => ({ returning: () => [] }) }),
  // Select operations
  select: () => ({ from: () => ({ where: () => ({}) }) }),
  // Update operations
  update: () => ({ set: () => ({ where: () => ({}) }) }),
};

export function getDb(): typeof mockDb {
  return mockDb;
}
