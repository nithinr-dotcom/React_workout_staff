/*
 * BUG SQUASH: Team Directory
 *
 * This is NOT a blank starter. It is a small app a teammate shipped last sprint, and QA has
 * filed seven bug tickets against it (README.md → "Functional requirements"). Your job:
 *
 *   1. Delete the NOT_STARTED line below so the tests run. They fail against this code.
 *   2. Reproduce each ticket (tests or the Playground), find the root cause, and fix it.
 *   3. Keep the fix small. Don't rewrite the app, and keep every visible label and text the same.
 *   4. Talk through each root cause as you go, like you would with an interviewer watching.
 *
 * Everything in this file is fair game. The bugs are all in this file; types.ts and data.ts are fine.
 */
import { useEffect, useState, type FormEvent } from 'react';
import type { DirectoryApi, Member, MemberProfile, TeamDirectoryProps } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

const SEARCH_DEBOUNCE_MS = 300;

export default function TeamDirectory({ api }: TeamDirectoryProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(0);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Load the directory once.
  useEffect(() => {
    let cancelled = false;
    api.listMembers().then((data) => {
      if (cancelled) return;
      setMembers(data);
      setVisibleCount(data.length);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [api]);

  // Debounce the search box so we don't filter on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  // Global shortcut: Escape closes the profile panel.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedId(null);
    };
    window.addEventListener('keydown', onKeyDown);
  }, []);

  const needle = debouncedQuery.trim().toLowerCase();
  const visible = needle ? members.filter((m) => m.name.toLowerCase().includes(needle)) : members;

  const addGuest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const name = String(new FormData(form).get('guestName') ?? '').trim();
    if (!name) return;
    members.push({ id: `guest-${Date.now()}`, name, title: 'Guest' });
    setMembers(members);
    form.reset();
  };

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h2 className={styles.title}>Team Directory</h2>
        <OnlineTimer />
      </header>

      <div className={styles.layout}>
        <section className={styles.listColumn} aria-label="People">
          <label className={styles.field}>
            Search people
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Type a name…" />
          </label>

          <p className={styles.count}>
            Showing {visibleCount} of {members.length}
          </p>

          {loading ? (
            <p>Loading people…</p>
          ) : visible.length === 0 ? (
            <p>No people match your search.</p>
          ) : (
            <ul className={styles.list}>
              {visible.map((member, index) => (
                <MemberRow
                  key={index}
                  member={member}
                  selected={member.id === selectedId}
                  onSelect={() => setSelectedId(member.id)}
                />
              ))}
            </ul>
          )}

          <form className={styles.guestForm} onSubmit={addGuest}>
            <label className={styles.field}>
              Guest name
              <input name="guestName" autoComplete="off" />
            </label>
            <button type="submit">Add guest</button>
          </form>
        </section>

        {selectedId !== null && (
          <ProfilePanel api={api} memberId={selectedId} onClose={() => setSelectedId(null)} />
        )}
      </div>
    </div>
  );
}

function OnlineTimer() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setSeconds(seconds + 1);
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <p className={styles.timer}>Online for {seconds}s</p>;
}

interface MemberRowProps {
  member: Member;
  selected: boolean;
  onSelect: () => void;
}

function MemberRow({ member, selected, onSelect }: MemberRowProps) {
  const [favourite, setFavourite] = useState(false);

  return (
    <li className={`${styles.row} ${selected ? styles.rowSelected : ''}`}>
      <input
        type="checkbox"
        className={styles.star}
        aria-label={`Favourite ${member.name}`}
        checked={favourite}
        onChange={(e) => setFavourite(e.target.checked)}
      />
      <button type="button" className={styles.rowButton} aria-pressed={selected} onClick={onSelect}>
        {member.name}
      </button>
      <span className={styles.muted}>{member.title}</span>
    </li>
  );
}

interface ProfilePanelProps {
  api: DirectoryApi;
  memberId: string;
  onClose: () => void;
}

function ProfilePanel({ api, memberId, onClose }: ProfilePanelProps) {
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setProfile(null);
    setFailed(false);
    api
      .getMember(memberId)
      .then((data) => setProfile(data))
      .catch(() => setFailed(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  return (
    <section className={styles.panel} aria-label="Profile">
      <button type="button" className={styles.close} onClick={onClose}>
        Close profile
      </button>
      {failed ? (
        <p role="alert">Could not load profile.</p>
      ) : profile === null ? (
        <p>Loading profile…</p>
      ) : (
        <>
          <h3 className={styles.profileName}>{profile.name}</h3>
          <p className={styles.muted}>{profile.title}</p>
          <dl className={styles.facts}>
            <dt>Email</dt>
            <dd>{profile.email}</dd>
            <dt>Location</dt>
            <dd>{profile.location}</dd>
          </dl>
        </>
      )}
    </section>
  );
}
