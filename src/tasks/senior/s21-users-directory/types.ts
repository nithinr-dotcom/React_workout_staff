import type { RequestOptions, User } from '../../../mocks/api';

export type { User };
export type Role = User['role'];
export type Department = User['department'];

export const ROLES: Role[] = ['Engineer', 'Designer', 'Manager', 'Product', 'Support'];
export const DEPARTMENTS: Department[] = ['Platform', 'Growth', 'Payments', 'Search', 'Mobile'];

/** A user without an id is created. A user with an id is updated. */
export type UserDraft = Omit<User, 'id'> & { id?: number };

/** Matches the signatures in src/mocks/api.ts, so the real functions can be passed straight in. */
export interface UsersApi {
  getAllUsers(options?: RequestOptions): Promise<User[]>;
  saveUser(user: UserDraft, options?: RequestOptions): Promise<User>;
  deleteUser(id: number, options?: RequestOptions): Promise<{ ok: true }>;
}

export interface UsersDirectoryProps {
  api: UsersApi;
}
