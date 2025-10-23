import { renderHook, act } from '@testing-library/react-native';
import { useAuthStore } from '../auth';

// Mock react-native-firebase modules
jest.mock('@react-native-firebase/auth', () => ({
  __esModule: true,
  default: () => ({
    createUserWithEmailAndPassword: jest.fn(),
    signInWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChanged: jest.fn(),
    currentUser: {
      updateProfile: jest.fn(),
    },
  }),
}));

jest.mock('@react-native-firebase/firestore', () => ({
  __esModule: true,
  default: () => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
        set: jest.fn(),
      })),
    })),
    FieldValue: {
      serverTimestamp: jest.fn(),
    },
  }),
}));

describe('useAuthStore', () => {
  const mockAuth = require('@react-native-firebase/auth').default();
  const mockFirestore = require('@react-native-firebase/firestore').default();

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state
    useAuthStore.setState({ user: null, loading: false, error: null });
  });

  describe('signUp', () => {
    it('should successfully sign up a new user', async () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: null,
        updateProfile: jest.fn(),
      };

      const mockUserCredential = {
        user: mockUser,
      };

      mockAuth.createUserWithEmailAndPassword.mockResolvedValue(
        mockUserCredential
      );

      const mockDocRef = {
        get: jest.fn().mockResolvedValue({ exists: false }),
        set: jest.fn().mockResolvedValue(undefined),
      };

      mockFirestore.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue(mockDocRef),
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.signUp(
          'test@example.com',
          'password123',
          'Test User'
        );
      });

      expect(mockAuth.createUserWithEmailAndPassword).toHaveBeenCalledWith(
        'test@example.com',
        'password123'
      );
      expect(mockDocRef.set).toHaveBeenCalled();
      expect(result.current.user).toEqual(
        expect.objectContaining({
          uid: 'test-uid',
          email: 'test@example.com',
          displayName: 'Test User',
        })
      );
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle sign up errors', async () => {
      const mockError = new Error('Email already in use');
      mockAuth.createUserWithEmailAndPassword.mockRejectedValue(mockError);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        try {
          await result.current.signUp(
            'test@example.com',
            'password123',
            'Test User'
          );
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe('Email already in use');
      expect(result.current.loading).toBe(false);
      expect(result.current.user).toBeNull();
    });
  });

  describe('signIn', () => {
    it('should successfully sign in an existing user', async () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: null,
      };

      const mockUserCredential = {
        user: mockUser,
      };

      const mockUserDoc = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: undefined,
        online: false,
        lastSeen: undefined,
        createdAt: expect.any(Number),
      };

      mockAuth.signInWithEmailAndPassword.mockResolvedValue(mockUserCredential);

      const mockDocRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => mockUserDoc,
        }),
      };

      mockFirestore.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue(mockDocRef),
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.signIn('test@example.com', 'password123');
      });

      expect(mockAuth.signInWithEmailAndPassword).toHaveBeenCalledWith(
        'test@example.com',
        'password123'
      );
      expect(result.current.user).toEqual(mockUserDoc);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('signOut', () => {
    it('should successfully sign out', async () => {
      mockAuth.signOut.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockAuth.signOut).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('clearError', () => {
    it('should clear the error state', () => {
      const { result } = renderHook(() => useAuthStore());

      // Set an error first
      act(() => {
        useAuthStore.setState({ error: 'Some error' });
      });

      expect(result.current.error).toBe('Some error');

      // Clear the error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });
});
