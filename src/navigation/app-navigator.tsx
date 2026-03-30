import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, Text } from "react-native";
import { LoadingState } from "@/components/common/loading-state";
import { useAuth } from "@/providers/auth-provider";
import { useAppTheme } from "@/theme/theme-provider";
import { AddOrderScreen } from "@/screens/add-order-screen";
import { CompanyDetailScreen } from "@/screens/company-detail-screen";
import { CompaniesScreen } from "@/screens/companies-screen";
import { LoginScreen } from "@/screens/login-screen";
import { OverviewScreen } from "@/screens/overview-screen";
import { RecentActivityScreen } from "@/screens/recent-activity-screen";
import { SettingsScreen } from "@/screens/settings-screen";
import { StatusBoardScreen } from "@/screens/status-board-screen";
import type { MainTabParamList, RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();

function AddOrderHeaderButton({
  onPress,
}: {
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <LinearGradient
        colors={["#1ccfbe", "#16b9c4"]}
        style={{
          alignItems: "center",
          flexDirection: "row",
          gap: 6,
          paddingHorizontal: 12,
          paddingVertical: 8,
        }}
      >
        <Ionicons name="add" size={16} color="#042321" />
        <Text style={{ color: "#042321", fontSize: 13, fontWeight: "800" }}>
          Add Order
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

function MainTabsNavigator() {
  return (
    <Tabs.Navigator
      screenOptions={({ navigation, route }) => ({
        headerStyle: {
          backgroundColor: "#071427",
        },
        headerShadowVisible: false,
        headerTitleStyle: {
          color: "#f8fbff",
          fontSize: 18,
          fontWeight: "800",
        },
        headerTintColor: "#dceafc",
        tabBarActiveTintColor: "#19c4bb",
        tabBarInactiveTintColor: "rgba(220, 234, 252, 0.52)",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          marginBottom: 2,
        },
        tabBarStyle: {
          backgroundColor: "#071427",
          borderTopColor: "rgba(255, 255, 255, 0.05)",
          height: 76,
          paddingBottom: 12,
          paddingTop: 10,
        },
        headerRight:
          route.name === "Overview" ||
          route.name === "Companies"
            ? () => (
                <AddOrderHeaderButton
                  onPress={() => navigation.getParent()?.navigate("AddOrder")}
                />
              )
            : undefined,
        tabBarIcon: ({ color, size, focused }) => {
          const iconName: Record<keyof MainTabParamList, keyof typeof Ionicons.glyphMap> = {
            Overview: focused ? "grid" : "grid-outline",
            Status: focused ? "albums" : "albums-outline",
            Companies: focused ? "business" : "business-outline",
            Activity: focused ? "pulse" : "pulse-outline",
            Settings: focused ? "settings" : "settings-outline",
          };

          return <Ionicons color={color} name={iconName[route.name]} size={size} />;
        },
        sceneStyle: {
          backgroundColor: "#020817",
        },
      })}
    >
      <Tabs.Screen
        name="Overview"
        component={OverviewScreen}
        options={{ tabBarLabel: "Home" }}
      />
      <Tabs.Screen
        name="Status"
        component={StatusBoardScreen}
        options={{ title: "Status", tabBarLabel: "Status" }}
      />
      <Tabs.Screen
        name="Companies"
        component={CompaniesScreen}
        options={{ title: "All Companies", tabBarLabel: "Firms" }}
      />
      <Tabs.Screen
        name="Activity"
        component={RecentActivityScreen}
        options={{ title: "Recent Activity", tabBarLabel: "Feed" }}
      />
      <Tabs.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarLabel: "More" }}
      />
    </Tabs.Navigator>
  );
}

export function AppNavigator() {
  const { colors } = useAppTheme();
  const { isBootstrapping, isSignedIn } = useAuth();

  if (isBootstrapping) {
    return <LoadingState label="Restoring session..." />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        contentStyle: {
          backgroundColor: "#020817",
        },
        headerStyle: {
          backgroundColor: "#071427",
        },
        headerShadowVisible: false,
        headerTitleStyle: {
          color: "#f8fbff",
          fontSize: 18,
          fontWeight: "700",
        },
        headerTintColor: "#dceafc",
      }}
    >
      {!isSignedIn ? (
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{
            headerShown: false,
          }}
        />
      ) : (
        <>
          <Stack.Screen
            name="MainTabs"
            component={MainTabsNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="AddOrder"
            component={AddOrderScreen}
            options={{ title: "Add Order" }}
          />
          <Stack.Screen
            name="CompanyDetail"
            component={CompanyDetailScreen}
            options={({ route }) => ({
              title: route.params.companyName,
            })}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
