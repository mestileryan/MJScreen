import FileTrack from '../models/FileTrack';
import { backendUrl } from '../models/BackendConfig';
import type { ITrackProvider } from './ITrackProvider';

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

function base64ToFile(dataUrl: string, name: string, type: string): File {
  const arr = dataUrl.split(',');
  const bstr = atob(arr[1]);
  const n = bstr.length;
  const u8arr = new Uint8Array(n);
  for (let i = 0; i < n; i++) u8arr[i] = bstr.charCodeAt(i);
  return new File([u8arr], name, { type });
}

export const ApiTrackProvider: ITrackProvider = {
  async add(track: FileTrack): Promise<number> {
    const content = await blobToBase64(track.file);
    const res = await fetch(`${backendUrl.value}/api/tracks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: track.file.name,
        initialVolume: track.initialVolume,
        iconName: track.iconName,
        iconColor: track.iconColor,
        order: track.order,
        playlistId: track.playlistId,
        loop: track.loop,
        contentType: track.file.type,
        data: content ? content.split(',')[1] : ''
      })
    });
    const data = await res.json();
    track.id = data.id;
    return data.id;
  },

  async update(track: FileTrack): Promise<void> {
    if (track.id == null) return;
    const content = await blobToBase64(track.file);
    await fetch(`${backendUrl.value}/api/tracks/${track.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: track.name,
        initialVolume: track.initialVolume,
        iconName: track.iconName,
        iconColor: track.iconColor,
        order: track.order,
        playlistId: track.playlistId,
        loop: track.loop,
        contentType: track.file.type,
        data: content.split(',')[1]
      })
    });
  },

  async remove(track: FileTrack): Promise<void> {
    if (track.id == null) return;
    await fetch(`${backendUrl.value}/api/tracks/${track.id}`, { method: 'DELETE' });
  },

  async getAll(): Promise<FileTrack[]> {
    const res = await fetch(`${backendUrl.value}/api/tracks`);
    const tracks: FileTrack[] = [];
    if (res.ok) {
      const arr = await res.json();
      for (const st of arr) {
        const dataUrl = `data:${st.contentType};base64,${st.data}`;
        const file = base64ToFile(dataUrl, st.name, st.contentType);
        const ft = new FileTrack(file, st.name);
        ft.initialVolume = st.initialVolume;
        ft.id = st.id;
        ft.iconName = st.iconName;
        ft.iconColor = st.iconColor ?? '#c084fc';
        ft.order = st.order;
        ft.playlistId = st.playlistId;
        ft.loop = st.loop ?? false;
        tracks.push(ft);
      }
    }
    return tracks;
  }
};
