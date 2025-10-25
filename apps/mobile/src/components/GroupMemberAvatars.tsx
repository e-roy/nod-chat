import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Avatar, AvatarImage, AvatarFallbackText } from '@ui/avatar';
import { Box } from '@ui/box';
import { HStack } from '@ui/hstack';
import { Text } from '@ui/text';
import { db } from '@/firebase/firebaseApp';
import { User } from '@chatapp/shared';

interface GroupMemberAvatarsProps {
  memberIds: string[];
  size?: 'sm' | 'md' | 'lg';
  maxDisplay?: number;
  overlap?: number;
}

const GroupMemberAvatars: React.FC<GroupMemberAvatarsProps> = ({
  memberIds,
  size = 'sm',
  maxDisplay = 4,
  overlap = 20,
}) => {
  const [userCache, setUserCache] = useState<Map<string, User>>(new Map());

  useEffect(() => {
    const loadUserData = async () => {
      if (memberIds.length === 0) return;

      try {
        const userIds = memberIds.filter(id => !userCache.has(id));
        if (userIds.length === 0) return;

        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('uid', 'in', userIds.slice(0, 10))); // Firestore 'in' limit
        const snapshot = await getDocs(q);

        const newUserCache = new Map(userCache);
        snapshot.forEach(doc => {
          const userData = doc.data();
          newUserCache.set(userData.uid, {
            uid: userData.uid,
            email: userData.email,
            displayName: userData.displayName,
            photoURL: userData.photoURL,
            online: userData.online || false,
            lastSeen: userData.lastSeen,
            createdAt: userData.createdAt?.toMillis?.() || Date.now(),
          });
        });

        setUserCache(newUserCache);
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    loadUserData();
  }, [memberIds]);

  const displayMembers = memberIds.slice(0, maxDisplay);
  const remainingCount = memberIds.length - maxDisplay;

  return (
    <HStack className="items-center" alignItems="center">
      {displayMembers.map((memberId, index) => {
        const member = userCache.get(memberId);
        const displayName =
          member?.displayName || member?.email?.split('@')[0] || '?';

        return (
          <Avatar
            key={memberId}
            size={size}
            style={{
              marginLeft: index > 0 ? -overlap : 0,
              zIndex: displayMembers.length - index,
              borderWidth: 2,
              borderColor: 'white',
            }}
          >
            {member?.photoURL && (
              <AvatarImage source={{ uri: member.photoURL }} />
            )}
            <AvatarFallbackText>{displayName.charAt(0)}</AvatarFallbackText>
          </Avatar>
        );
      })}
      {remainingCount > 0 && (
        <Box
          className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 items-center justify-center"
          style={{ marginLeft: -overlap + 12, zIndex: 0 }}
        >
          <Text className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            +{remainingCount}
          </Text>
        </Box>
      )}
    </HStack>
  );
};

export default GroupMemberAvatars;
