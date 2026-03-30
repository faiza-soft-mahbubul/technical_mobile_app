import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppNavigator } from "@/navigation/app-navigator";
import { AuthProvider } from "@/providers/auth-provider";
import { AppConfigProvider } from "@/providers/app-config-provider";
import { ThemeProvider, useAppTheme } from "@/theme/theme-provider";

function RootNavigation() {
  const { navigationTheme, isDark } = useAppTheme();

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <NavigationContainer theme={navigationTheme}>
        <AppConfigProvider>
          <AuthProvider>
            <AppNavigator />
          </AuthProvider>
        </AppConfigProvider>
      </NavigationContainer>
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <RootNavigation />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
