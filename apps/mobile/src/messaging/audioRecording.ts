import { Audio } from 'expo-av';

export interface RecordingState {
  isRecording: boolean;
  duration: number;
}

let recording: Audio.Recording | null = null;
let recordingStatusInterval: NodeJS.Timeout | null = null;

/**
 * Request microphone permissions
 */
export async function requestMicrophonePermissions(): Promise<boolean> {
  try {
    const { status } = await Audio.requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting microphone permissions:', error);
    return false;
  }
}

/**
 * Start audio recording
 */
export async function startRecording(): Promise<void> {
  try {
    // Cleanup any existing recording first
    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
      } catch (e) {
        // Ignore errors from cleanup
      }
      recording = null;
    }

    const hasPermission = await requestMicrophonePermissions();
    if (!hasPermission) {
      throw new Error('Microphone permission denied');
    }

    // Configure audio mode
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    // Create and prepare recording
    const { recording: newRecording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );

    recording = newRecording;
  } catch (error) {
    console.error('Error starting recording:', error);
    recording = null;
    throw error;
  }
}

/**
 * Stop audio recording and get the URI
 */
export async function stopRecording(): Promise<string | null> {
  try {
    if (!recording) {
      return null;
    }

    await recording.stopAndUnloadAsync();

    const uri = recording.getURI();
    recording = null;

    // Reset audio mode
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: false,
    });

    return uri;
  } catch (error) {
    console.error('Error stopping recording:', error);
    if (recording) {
      await recording.stopAndUnloadAsync();
      recording = null;
    }
    throw error;
  }
}

/**
 * Get audio blob from URI for upload
 */
export async function getAudioBlob(audioUri: string): Promise<Blob> {
  try {
    const response = await fetch(audioUri);
    const blob = await response.blob();
    return blob;
  } catch (error) {
    console.error('Error converting audio to blob:', error);
    throw error;
  }
}

/**
 * Get recording duration
 */
export async function getRecordingDuration(): Promise<number> {
  if (!recording) {
    return 0;
  }
  try {
    const status = await recording.getStatusAsync();
    return status.durationMillis ? status.durationMillis / 1000 : 0;
  } catch (error) {
    console.error('Error getting recording duration:', error);
    return 0;
  }
}

/**
 * Cleanup recording if component unmounts
 */
export function cleanupRecording(): void {
  if (recording) {
    recording.stopAndUnloadAsync().catch(console.error);
    recording = null;
  }
  if (recordingStatusInterval) {
    clearInterval(recordingStatusInterval);
    recordingStatusInterval = null;
  }
}
