import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Auth: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
  Chat: {
    chatId: string;
    participantName?: string;
  };
  NewChat: undefined;
  ProfileEdit: undefined;
  GroupChat: {
    groupId: string;
  };
  GroupCreate: undefined;
};

export type MainTabParamList = {
  Chats: undefined;
  Groups: undefined;
  Priorities: undefined;
  Calendar: undefined;
  Settings: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
