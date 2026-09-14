import type { DirectoryApi, Member, MemberProfile } from './types';

/** Demo data and a fake API for the Playground. Tests build their own fakes. */

export const PROFILES: MemberProfile[] = [
  { id: 'm1', name: 'Ada Lovelace', title: 'Staff Engineer', email: 'ada@example.com', location: 'London' },
  { id: 'm2', name: 'Grace Hopper', title: 'Engineering Manager', email: 'grace@example.com', location: 'New York' },
  { id: 'm3', name: 'Alan Turing', title: 'Principal Engineer', email: 'alan@example.com', location: 'Manchester' },
  { id: 'm4', name: 'Katherine Johnson', title: 'Data Scientist', email: 'katherine@example.com', location: 'Hampton' },
  { id: 'm5', name: 'Margaret Hamilton', title: 'Director of Engineering', email: 'margaret@example.com', location: 'Boston' },
  { id: 'm6', name: 'Linus Torvalds', title: 'Senior Engineer', email: 'linus@example.com', location: 'Portland' },
  { id: 'm7', name: 'Radia Perlman', title: 'Network Architect', email: 'radia@example.com', location: 'Seattle' },
  { id: 'm8', name: 'Dennis Ritchie', title: 'Senior Engineer', email: 'dennis@example.com', location: 'Murray Hill' },
];

export interface FakeApiOptions {
  /** Latency for profile requests, per member id. The first member is slow so the race is easy to reproduce. */
  profileLatency?: (id: string) => number;
  /** Probability (0–1) that setFavourite rejects. */
  favouriteFailRate?: number;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function createFakeApi({
  profileLatency = (id) => (id === 'm1' ? 2000 : 300),
  favouriteFailRate = 0.3,
}: FakeApiOptions = {}): DirectoryApi {
  return {
    async listMembers(): Promise<Member[]> {
      await wait(400);
      return PROFILES.map(({ id, name, title }) => ({ id, name, title }));
    },
    async getMember(id: string): Promise<MemberProfile> {
      await wait(profileLatency(id));
      const profile = PROFILES.find((p) => p.id === id);
      if (!profile) throw new Error(`No profile for ${id}`);
      return { ...profile };
    },
    async setFavourite(): Promise<void> {
      await wait(500);
      if (Math.random() < favouriteFailRate) throw new Error('Could not save favourite');
    },
  };
}
