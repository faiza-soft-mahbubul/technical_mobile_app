import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  AddOrder: undefined;
  CompanyDetail: {
    companyId: number;
    companyName: string;
  };
};

export type MainTabParamList = {
  Overview: undefined;
  Status: undefined;
  Companies: undefined;
  Activity: undefined;
  Settings: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type MainTabScreenProps<T extends keyof MainTabParamList> =
  BottomTabScreenProps<MainTabParamList, T>;
