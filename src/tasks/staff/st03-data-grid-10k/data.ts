import { FIRST_NAMES, LAST_NAMES, mulberry32, pick } from '../../../mocks/data/generate';
import type { Column, Row } from './types';

const COUNTRIES = ['India', 'United States', 'Germany', 'Brazil', 'Japan', 'Kenya', 'Australia', 'Canada', 'France', 'Mexico'];
const PLANS = ['Free', 'Starter', 'Growth', 'Enterprise'];
const STATUSES = ['active', 'trialing', 'past_due', 'churned'];
const DEPARTMENTS = ['Platform', 'Growth', 'Payments', 'Search', 'Mobile'];
const REGIONS = ['APAC', 'EMEA', 'NA', 'LATAM'];

const money = (v: string | number) => `$${Number(v).toLocaleString('en-US')}`;

export const COLUMNS: Column[] = [
  { key: 'id', title: 'ID', width: 80 },
  { key: 'name', title: 'Name', width: 180 },
  { key: 'email', title: 'Email', width: 260 },
  { key: 'company', title: 'Company', width: 160 },
  { key: 'country', title: 'Country', width: 140 },
  { key: 'region', title: 'Region', width: 100 },
  { key: 'plan', title: 'Plan', width: 110 },
  { key: 'status', title: 'Status', width: 110 },
  { key: 'mrr', title: 'MRR', width: 110, format: money },
  { key: 'seats', title: 'Seats', width: 90 },
  { key: 'signupDate', title: 'Signed up', width: 120 },
  { key: 'lastSeen', title: 'Last seen', width: 120 },
  { key: 'score', title: 'Health score', width: 120 },
  { key: 'nps', title: 'NPS', width: 80 },
  { key: 'tickets', title: 'Open tickets', width: 120 },
  { key: 'department', title: 'Owner team', width: 130 },
  { key: 'owner', title: 'Account owner', width: 170 },
  { key: 'churnRisk', title: 'Churn risk %', width: 120 },
  { key: 'arr', title: 'ARR', width: 130, format: money },
  { key: 'notes', title: 'Notes', width: 240 },
];

const isoDate = (rand: () => number, fromYear: number) =>
  new Date(fromYear + Math.floor(rand() * 5), Math.floor(rand() * 12), 1 + Math.floor(rand() * 28)).toISOString().slice(0, 10);

/** Deterministic rows (same seed → same data). 10,000 × 20 columns by default. */
export function generateRows(count = 10_000, seed = 7): Row[] {
  const rand = mulberry32(seed);
  const rows: Row[] = new Array(count);
  for (let i = 0; i < count; i++) {
    const first = pick(rand, FIRST_NAMES);
    const last = pick(rand, LAST_NAMES);
    const mrr = Math.round(rand() * 20_000);
    rows[i] = {
      id: i + 1,
      name: `${first} ${last}`,
      email: `${first}.${last}${i}@example.com`.toLowerCase(),
      company: `${pick(rand, LAST_NAMES)} ${pick(rand, ['Labs', 'Inc', 'Systems', 'Group', 'Cloud'])}`,
      country: pick(rand, COUNTRIES),
      region: pick(rand, REGIONS),
      plan: pick(rand, PLANS),
      status: pick(rand, STATUSES),
      mrr,
      seats: 1 + Math.floor(rand() * 500),
      signupDate: isoDate(rand, 2019),
      lastSeen: isoDate(rand, 2024),
      score: Math.round(rand() * 100),
      nps: Math.round(rand() * 20 - 10),
      tickets: Math.floor(rand() * 15),
      department: pick(rand, DEPARTMENTS),
      owner: `${pick(rand, FIRST_NAMES)} ${pick(rand, LAST_NAMES)}`,
      churnRisk: Math.round(rand() * 1000) / 10,
      arr: mrr * 12,
      notes: rand() > 0.7 ? 'Renewal conversation scheduled' : '',
    };
  }
  return rows;
}
