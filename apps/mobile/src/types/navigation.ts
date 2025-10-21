import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Auth: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
  Chat: {
    chatId: string;
    participantName?: string;
  };
  NewChat: undefined;
  ProfileSetup: undefined;
};

export type MainTabParamList = {
  Chats: undefined;
  Settings: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
