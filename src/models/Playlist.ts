import type LibraryItem from './LibraryItem';

export default class Playlist {
  id?: number;
  name: string;
  order: number;
  /**
   * Custom width in pixels when displayed in board mode.
   * If undefined, playlist takes full available width.
   */
  width?: number;
  items: LibraryItem[];
  isEditing: boolean = false;

  constructor(name: string) {
    this.name = name;
    this.order = 0;
    this.items = [];
  }

  get tracks() {
    return this.items;
  }
}

