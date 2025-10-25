import * as ImagePicker from 'expo-image-picker';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { storage } from '@/firebase/firebaseApp';

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  progress: number; // 0-100
}

/**
 * Request camera permissions
 */
export async function requestCameraPermissions(): Promise<boolean> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  return status === 'granted';
}

/**
 * Request media library permissions
 */
export async function requestMediaLibraryPermissions(): Promise<boolean> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === 'granted';
}

/**
 * Launch camera to take a photo
 */
export async function takePhoto(): Promise<string | null> {
  try {
    const hasPermission = await requestCameraPermissions();
    if (!hasPermission) {
      console.warn('Camera permission denied');
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (result.canceled) {
      return null;
    }

    return result.assets[0].uri;
  } catch (error) {
    console.error('Error taking photo:', error);
    return null;
  }
}

/**
 * Pick an image from the library
 */
export async function pickImage(): Promise<string | null> {
  try {
    const hasPermission = await requestMediaLibraryPermissions();
    if (!hasPermission) {
      console.warn('Media library permission denied');
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (result.canceled) {
      return null;
    }

    return result.assets[0].uri;
  } catch (error) {
    console.error('Error picking image:', error);
    return null;
  }
}

/**
 * Upload avatar image to Firebase Storage
 */
export async function uploadAvatar(
  userId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<string> {
  try {
    // First, let user pick an image
    const imageUri = await pickImage();
    if (!imageUri) {
      throw new Error('No image selected');
    }

    // Generate unique filename for avatar
    const filename = `avatar_${Date.now()}.jpg`;
    const storagePath = `avatars/${userId}/${filename}`;

    // Create storage reference
    const storageRef = ref(storage, storagePath);

    // Fetch the image as a blob
    const response = await fetch(imageUri);
    const blob = await response.blob();

    // Upload with progress tracking
    const uploadTask = uploadBytesResumable(storageRef, blob);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        snapshot => {
          // Progress tracking
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) {
            onProgress({
              bytesTransferred: snapshot.bytesTransferred,
              totalBytes: snapshot.totalBytes,
              progress,
            });
          }
        },
        error => {
          console.error('Avatar upload error:', error);
          reject(error);
        },
        async () => {
          // Upload complete - get download URL
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    throw error;
  }
}

/**
 * Delete old avatar from Firebase Storage
 */
export async function deleteOldAvatar(photoURL: string): Promise<void> {
  try {
    if (!photoURL) return;

    // Extract the path from the URL
    const url = new URL(photoURL);
    const pathMatch = url.pathname.match(/\/o\/(.+)\?/);
    if (!pathMatch) return;

    const filePath = decodeURIComponent(pathMatch[1]);
    const storageRef = ref(storage, filePath);

    await deleteObject(storageRef);
    console.log('Old avatar deleted successfully');
  } catch (error) {
    // Don't throw error for cleanup failures
    console.warn('Failed to delete old avatar:', error);
  }
}

/**
 * Upload image to Firebase Storage
 */
export async function uploadImage(
  chatId: string,
  imageUri: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<string> {
  try {
    // Generate unique filename
    const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
    const storagePath = `chatMedia/${chatId}/${filename}`;

    // Create storage reference
    const storageRef = ref(storage, storagePath);

    // Fetch the image as a blob
    const response = await fetch(imageUri);
    const blob = await response.blob();

    // Upload with progress tracking
    const uploadTask = uploadBytesResumable(storageRef, blob);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        snapshot => {
          // Progress tracking
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) {
            onProgress({
              bytesTransferred: snapshot.bytesTransferred,
              totalBytes: snapshot.totalBytes,
              progress,
            });
          }
        },
        error => {
          console.error('Upload error:', error);
          reject(error);
        },
        async () => {
          // Upload complete - get download URL
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}

/**
 * Get image dimensions from URI
 */
export async function getImageDimensions(
  uri: string
): Promise<{ width: number; height: number } | null> {
  return new Promise(resolve => {
    if (!uri) {
      resolve(null);
      return;
    }

    // For React Native, we can use Image.getSize
    const Image = require('react-native').Image;
    Image.getSize(
      uri,
      (width: number, height: number) => {
        resolve({ width, height });
      },
      () => {
        resolve(null);
      }
    );
  });
}
