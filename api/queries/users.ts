import { userStore } from "../json-store";
import { env } from "../lib/env";

export async function findUserByUnionId(unionId: string) {
  return userStore.getByUnionId(unionId) || null;
}

export async function upsertUser(data: {
  unionId: string;
  name?: string;
  email?: string;
  avatar?: string;
  lastSignInAt?: Date;
}) {
  const role = data.unionId && data.unionId === env.ownerUnionId ? "admin" : undefined;

  return userStore.upsert({
    unionId: data.unionId,
    name: data.name,
    email: data.email,
    avatar: data.avatar,
  });
}
