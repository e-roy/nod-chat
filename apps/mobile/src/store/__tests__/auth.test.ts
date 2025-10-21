import { renderHook, act } from '@testing-library/react-native';
import { useAuthStore } from '../auth';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// Mock Firebase functions
const mockCreateUserWithEmailAndPassword =
  createUserWithEmailAndPassword as jest.MockedFunction<
    typeof createUserWithEmailAndPassword
  >;
const mockSignInWithEmailAndPassword =
  signInWithEmailAndPassword as jest.MockedFunction<
    typeof signInWithEmailAndPassword
  >;
const mockSignOut = signOut as jest.MockedFunction<typeof signOut>;
const mockDoc = doc as jest.MockedFunction<typeof doc>;
const mockSetDoc = setDoc as jest.MockedFunction<typeof setDoc>;
const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>;

describe('useAuthStore', () => {
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
      };

      const mockUserCredential = {
        user: mockUser,
      };

      mockCreateUserWithEmailAndPassword.mockResolvedValue(
        mockUserCredential as any
      );
      mockDoc.mockReturnValue({} as any);
      mockGetDoc.mockResolvedValue({ exists: () => false } as any);
      mockSetDoc.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.signUp(
          'test@example.com',
          'password123',
          'Test User'
        );
      });

      expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'test@example.com',
        'password123'
      );
      expect(mockSetDoc).toHaveBeenCalled();
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
      mockCreateUserWithEmailAndPassword.mockRejectedValue(mockError);

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

      mockSignInWithEmailAndPassword.mockResolvedValue(
        mockUserCredential as any
      );
      mockDoc.mockReturnValue({} as any);
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockUserDoc,
      } as any);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.signIn('test@example.com', 'password123');
      });

      expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
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
      mockSignOut.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockSignOut).toHaveBeenCalled();
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
