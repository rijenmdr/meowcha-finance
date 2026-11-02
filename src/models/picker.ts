// One page of a picker's server-side search.
export interface PickerPage<T> {
  rows: T[];
  hasMore: boolean;
}

// A record picked by id, with the name to show without fetching it.
export interface NamedRef {
  id: string;
  name: string;
}
