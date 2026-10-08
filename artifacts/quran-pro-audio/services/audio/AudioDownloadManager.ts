import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import { DEFAULT_RECITER_ID, surahAyahUrl, type Reciter, type Surah } from '@/data/quran';

export type DownloadStatus = 'queued' | 'downloading' | 'paused' | 'complete' | 'error';

export type DownloadRecord = {
  surahId: number;
  reciterId?: string;
  status: DownloadStatus;
  totalAyahs: number;
  downloadedAyahs: number;
  bytesDownloaded: number;
  localFiles: Record<number, string>;
  error?: string;
  updatedAt: number;
};

const DOWNLOADS_KEY = '@quran-pro-audio/downloads';
const AUDIO_DIRECTORY = 'quran-audio';
const WEB_AUDIO_SCHEME = 'quran-audio://';
const WEB_AUDIO_DATABASE = 'quran-pro-audio';
const WEB_AUDIO_STORE = 'audio';

let webAudioDatabase: Promise<IDBDatabase> | null = null;

const recordKey = (reciterId: string, surahId: number) => `${reciterId}:${surahId}`;

const webAudioKey = (reciterId: string, surahId: number, ayahId: number) =>
  `${reciterId}/${surahId}/${ayahId}`;

const webAudioUri = (reciterId: string, surahId: number, ayahId: number) =>
  `${WEB_AUDIO_SCHEME}${webAudioKey(reciterId, surahId, ayahId)}`;

const parseWebAudioUri = (uri: string) => {
  if (!uri.startsWith(WEB_AUDIO_SCHEME)) return null;
  return uri.slice(WEB_AUDIO_SCHEME.length);
};

function openWebAudioDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('Offline audio storage is unavailable in this browser.'));
  }
  if (!webAudioDatabase) {
    webAudioDatabase = new Promise((resolve, reject) => {
      const request = indexedDB.open(WEB_AUDIO_DATABASE, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(WEB_AUDIO_STORE)) {
          request.result.createObjectStore(WEB_AUDIO_STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Could not open offline audio storage.'));
    });
  }
  return webAudioDatabase;
}

async function readWebAudioBlob(uri: string): Promise<Blob | null> {
  const key = parseWebAudioUri(uri);
  if (!key) return null;
  const database = await openWebAudioDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction(WEB_AUDIO_STORE, 'readonly').objectStore(WEB_AUDIO_STORE).get(key);
    request.onsuccess = () => resolve(request.result instanceof Blob ? request.result : null);
    request.onerror = () => reject(request.error ?? new Error('Could not read offline audio.'));
  });
}

async function writeWebAudioBlob(uri: string, blob: Blob): Promise<void> {
  const key = parseWebAudioUri(uri);
  if (!key) throw new Error('Invalid offline audio location.');
  const database = await openWebAudioDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(WEB_AUDIO_STORE, 'readwrite');
    transaction.objectStore(WEB_AUDIO_STORE).put(blob, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not save offline audio.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Offline audio storage was interrupted.'));
  });
}

async function deleteWebAudioBlob(uri: string): Promise<void> {
  const key = parseWebAudioUri(uri);
  if (!key) return;
  const database = await openWebAudioDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(WEB_AUDIO_STORE, 'readwrite');
    transaction.objectStore(WEB_AUDIO_STORE).delete(key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not remove offline audio.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Removing offline audio was interrupted.'));
  });
}

async function downloadWebAudio(
  url: string,
  uri: string,
  signal: AbortSignal,
  onProgress: (bytesWritten: number, totalBytes: number) => void,
): Promise<number> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Audio server returned HTTP ${response.status}.`);
  const totalBytes = Number(response.headers.get('content-length')) || 0;
  const contentType = response.headers.get('content-type') ?? 'audio/mpeg';
  const chunks: BlobPart[] = [];
  let bytesWritten = 0;

  if (response.body) {
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (signal.aborted) throw new DOMException('Download paused', 'AbortError');
      if (!value) continue;
      chunks.push(value);
      bytesWritten += value.byteLength;
      onProgress(bytesWritten, totalBytes);
    }
  } else {
    const buffer = await response.arrayBuffer();
    if (signal.aborted) throw new DOMException('Download paused', 'AbortError');
    chunks.push(buffer);
    bytesWritten = buffer.byteLength;
    onProgress(bytesWritten, totalBytes || bytesWritten);
  }

  const blob = new Blob(chunks, { type: contentType });
  if (!blob.size) throw new Error('The audio download was empty.');
  await writeWebAudioBlob(uri, blob);
  return blob.size;
}

export class AudioDownloadManager {
  private controllers = new Map<string, AbortController>();
  private activeTasks = new Map<string, Promise<DownloadRecord>>();
  private writeQueue: Promise<void> = Promise.resolve();
  private playbackObjectUrls = new Map<string, string>();

  async list(): Promise<DownloadRecord[]> {
    const stored = await AsyncStorage.getItem(DOWNLOADS_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as Array<Partial<DownloadRecord>>;
    // Discard the old placeholder manifest, which did not contain audio files.
    const records = parsed.filter(
      (record): record is DownloadRecord =>
        typeof record.surahId === 'number' &&
        typeof record.totalAyahs === 'number' &&
        !!record.localFiles &&
        typeof record.localFiles === 'object',
    );
    return records.map((record) => {
      const normalized = { ...record, reciterId: record.reciterId ?? DEFAULT_RECITER_ID };
      return normalized.status === 'downloading' && !this.controllers.has(recordKey(normalized.reciterId, record.surahId))
        ? { ...normalized, status: 'paused' as const }
        : normalized;
    });
  }

  async getLocalFiles(surahId: number): Promise<Record<number, string>> {
    const record = (await this.list()).find((item) => item.surahId === surahId);
    if (!record) return {};
    const localFiles: Record<number, string> = {};
    for (const [ayahId, uri] of Object.entries(record.localFiles)) {
      if (Platform.OS === 'web' && parseWebAudioUri(uri)) {
        const blob = await readWebAudioBlob(uri);
        if (blob && blob.size > 0) localFiles[Number(ayahId)] = uri;
        continue;
      }
      const file = new File(uri);
      if (file.exists && file.size > 0) localFiles[Number(ayahId)] = file.uri;
    }
    return localFiles;
  }

  async getPlaybackUri(storedUri: string): Promise<string | null> {
    if (Platform.OS === 'web' && parseWebAudioUri(storedUri)) {
      const cachedUrl = this.playbackObjectUrls.get(storedUri);
      if (cachedUrl) return cachedUrl;
      const blob = await readWebAudioBlob(storedUri);
      if (!blob || blob.size === 0) return null;
      const objectUrl = URL.createObjectURL(blob);
      this.playbackObjectUrls.set(storedUri, objectUrl);
      return objectUrl;
    }
    if (Platform.OS === 'web') return null;
    const file = new File(storedUri);
    return file.exists && file.size > 0 ? file.uri : null;
  }

  retainPlaybackUris(activeUris: Set<string>) {
    for (const [storedUri, objectUrl] of this.playbackObjectUrls) {
      if (activeUris.has(storedUri)) continue;
      URL.revokeObjectURL(objectUrl);
      this.playbackObjectUrls.delete(storedUri);
    }
  }

  async downloadSurah(surah: Surah, reciter: Reciter, onProgress?: (record: DownloadRecord) => void) {
    const key = recordKey(reciter.id, surah.id);
    const active = this.activeTasks.get(key);
    if (active) return active;

    const task = this.runDownload(surah, reciter, onProgress).finally(() => {
      this.controllers.delete(key);
      this.activeTasks.delete(key);
    });
    this.activeTasks.set(key, task);
    return task;
  }

  async pause(surahId: number, reciterId: string = DEFAULT_RECITER_ID) {
    const key = recordKey(reciterId, surahId);
    this.controllers.get(key)?.abort();
    const active = this.activeTasks.get(key);
    if (active) await active;
  }

  async remove(surahId: number, reciterId: string = DEFAULT_RECITER_ID) {
    await this.pause(surahId, reciterId);
    const records = await this.list();
    const record = records.find((item) => item.surahId === surahId && (item.reciterId ?? DEFAULT_RECITER_ID) === reciterId);
    if (Platform.OS === 'web') {
      const totalAyahs = record?.totalAyahs ?? 0;
      for (let ayahId = 1; ayahId <= totalAyahs; ayahId += 1) {
        await deleteWebAudioBlob(webAudioUri(reciterId, surahId, ayahId));
      }
      await this.saveRecords(records.filter((item) => !(item.surahId === surahId && (item.reciterId ?? DEFAULT_RECITER_ID) === reciterId)));
      return;
    }
    for (const uri of Object.values(record?.localFiles ?? {})) {
      const file = new File(uri);
      if (file.exists) file.delete();
    }
    const directory = new Directory(Paths.document, AUDIO_DIRECTORY, `surah-${reciterId}-${surahId}`);
    if (directory.exists) directory.delete();
    await this.saveRecords(records.filter((item) => !(item.surahId === surahId && (item.reciterId ?? DEFAULT_RECITER_ID) === reciterId)));
  }

  async removeAll() {
    const records = await this.list();
    for (const record of records) {
      await this.remove(record.surahId, record.reciterId ?? DEFAULT_RECITER_ID);
    }
  }

  private async runDownload(surah: Surah, reciter: Reciter, onProgress?: (record: DownloadRecord) => void) {
    const controller = new AbortController();
    this.controllers.set(recordKey(reciter.id, surah.id), controller);
    const previous = (await this.list()).find((item) => item.surahId === surah.id && (item.reciterId ?? DEFAULT_RECITER_ID) === reciter.id);
    const localFiles = { ...(previous?.localFiles ?? {}) };
    let bytesDownloaded = 0;
    const record: DownloadRecord = {
      surahId: surah.id,
      reciterId: reciter.id,
      status: 'downloading',
      totalAyahs: surah.ayahCount,
      downloadedAyahs: 0,
      bytesDownloaded: 0,
      localFiles,
      updatedAt: Date.now(),
    };

    const directory = Platform.OS === 'web'
      ? null
      : new Directory(Paths.document, AUDIO_DIRECTORY, `surah-${reciter.id}-${surah.id}`);
    try {
      directory?.create({ intermediates: true, idempotent: true });
      for (let ayahId = 1; ayahId <= surah.ayahCount; ayahId += 1) {
        if (controller.signal.aborted) throw new DOMException('Download paused', 'AbortError');
        const fileName = `${String(ayahId).padStart(3, '0')}.mp3`;
        const knownUri = localFiles[ayahId];
        if (Platform.OS === 'web') {
          const storedUri = webAudioUri(reciter.id, surah.id, ayahId);
          const cachedBlob = knownUri ? await readWebAudioBlob(knownUri) : null;
          if (cachedBlob && cachedBlob.size > 0) {
            localFiles[ayahId] = storedUri;
            bytesDownloaded += cachedBlob.size;
          } else {
            const downloadedBytes = await downloadWebAudio(
              surahAyahUrl(reciter, surah.id, ayahId),
              storedUri,
              controller.signal,
              (bytesWritten, totalBytes) => {
                onProgress?.({
                  ...record,
                  downloadedAyahs: Object.keys(localFiles).length,
                  bytesDownloaded: bytesDownloaded + bytesWritten,
                  localFiles: { ...localFiles },
                  updatedAt: Date.now(),
                });
              },
            );
            localFiles[ayahId] = storedUri;
            bytesDownloaded += downloadedBytes;
          }
        } else {
          const destination = new File(directory!, fileName);
          const knownFile = knownUri ? new File(knownUri) : null;
          if (knownFile?.exists && knownFile.size > 0) {
            localFiles[ayahId] = knownFile.uri;
            bytesDownloaded += knownFile.size;
          } else {
            if (destination.exists) destination.delete();
            await File.downloadFileAsync(surahAyahUrl(reciter, surah.id, ayahId), destination, {
            idempotent: true,
            signal: controller.signal,
            onProgress: ({ bytesWritten }) => {
              onProgress?.({
                ...record,
                downloadedAyahs: Object.keys(localFiles).length,
                bytesDownloaded: bytesDownloaded + bytesWritten,
                localFiles: { ...localFiles },
                updatedAt: Date.now(),
              });
            },
            });
            if (!destination.exists || destination.size === 0) {
              throw new Error(`The audio file for ayah ${ayahId} was not saved correctly.`);
            }
            localFiles[ayahId] = destination.uri;
            bytesDownloaded += destination.size;
          }
        }

        record.localFiles = { ...localFiles };
        record.downloadedAyahs = Object.keys(localFiles).length;
        record.bytesDownloaded = bytesDownloaded;
        record.updatedAt = Date.now();
        await this.saveRecord({ ...record });
        onProgress?.({ ...record, localFiles: { ...localFiles } });
      }

      record.status = 'complete';
      record.error = undefined;
    } catch (error) {
      const aborted = controller.signal.aborted || (error instanceof Error && error.name === 'AbortError');
      record.status = aborted ? 'paused' : 'error';
      record.error = aborted ? undefined : error instanceof Error ? error.message : 'Download failed.';
    }

    record.localFiles = { ...localFiles };
    record.downloadedAyahs = Object.keys(localFiles).length;
    record.bytesDownloaded = bytesDownloaded;
    record.updatedAt = Date.now();
    await this.saveRecord({ ...record });
    onProgress?.({ ...record, localFiles: { ...localFiles } });
    return record;
  }

  private async saveRecord(record: DownloadRecord) {
    this.writeQueue = this.writeQueue.then(async () => {
      const records = await this.list();
      const reciterId = record.reciterId ?? DEFAULT_RECITER_ID;
      const next = records.filter((item) => !(item.surahId === record.surahId && (item.reciterId ?? DEFAULT_RECITER_ID) === reciterId));
      next.push(record);
      await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(next));
    });
    await this.writeQueue;
  }

  private async saveRecords(records: DownloadRecord[]) {
    this.writeQueue = this.writeQueue.then(() =>
      AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(records)),
    );
    await this.writeQueue;
  }
}

export const audioDownloadManager = new AudioDownloadManager();
