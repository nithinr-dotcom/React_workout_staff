/** One row in the directory list. */
export interface Member {
  id: string;
  name: string;
  title: string;
}

/** What the profile panel shows. Fetched on demand. */
export interface MemberProfile extends Member {
  email: string;
  location: string;
}

export interface DirectoryApi {
  listMembers(): Promise<Member[]>;
  getMember(id: string): Promise<MemberProfile>;
  /** Follow-up 2 only. Persists a favourite. Rejects when the save fails. */
  setFavourite?(id: string, favourite: boolean): Promise<void>;
}

export interface TeamDirectoryProps {
  api: DirectoryApi;
}
