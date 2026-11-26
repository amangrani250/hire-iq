import { del, get, set } from 'idb-keyval';
import type { AttentionStats, ProctorFlag } from '../types';

export interface RecordingBundle {
  blob: Blob;
  mimeType: string;
  extension: 'mp4' | 'webm';
  durationMs: number;
  size: number;
  createdAt: number;
  sessionId: string;
  flags: ProctorFlag[];
  stats: AttentionStats;
}

const STORAGE_KEY = 'hireiq:last-interview-recording';
let memoryRecording: RecordingBundle | null = null;

export async function saveRecording(bundle: RecordingBundle): Promise<void> {
  memoryRecording = bundle;
  try {
    await set(STORAGE_KEY, bundle);
  } catch (error) {
    console.warn('Could not persist the interview recording in IndexedDB.', error);
  }
}

export function getRecordingSync(): RecordingBundle | null {
  return memoryRecording;
}

export async function getRecording(): Promise<RecordingBundle | null> {
  if (memoryRecording) return memoryRecording;
  try {
    const stored = await get<RecordingBundle>(STORAGE_KEY);
    if (stored) memoryRecording = stored;
    return stored ?? null;
  } catch {
    return null;
  }
}

export async function clearRecording(): Promise<void> {
  memoryRecording = null;
  try {
    await del(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function recordingExtension(mimeType: string): 'mp4' | 'webm' {
  return mimeType.toLowerCase().includes('mp4') ? 'mp4' : 'webm';
}
