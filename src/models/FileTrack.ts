import LibraryItem from './LibraryItem';

export default class FileTrack extends LibraryItem {
  readonly kind = 'audio' as const;
  initialVolume: number;
  iconName?: string;
  /** Couleur personnalisée de l'icône */
  iconColor?: string;
  /** Etat boucle par defaut lors de la lecture */
  loop: boolean;

  constructor(file: File, name: string) {
    super(file, name);
    this.initialVolume = 0.8;
    this.iconName = '';
    this.iconColor = '#c084fc';
    this.loop = false;
  }
}
