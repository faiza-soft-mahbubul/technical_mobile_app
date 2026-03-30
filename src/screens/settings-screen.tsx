import { StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/common/button";
import { Screen } from "@/components/common/screen";
import { SegmentedControl } from "@/components/common/segmented-control";
import { Surface } from "@/components/common/surface";
import { useAuth } from "@/providers/auth-provider";
import { useAppConfig } from "@/providers/app-config-provider";
import { useAppTheme } from "@/theme/theme-provider";

const themeOptions = [
  { label: "System", value: "system" },
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
] as const;

export function SettingsScreen() {
  const { colors, mode, setMode } = useAppTheme();
  const { user, logout } = useAuth();
  const { config } = useAppConfig();

  return (
    <Screen>
      <View style={styles.stack}>
        <Surface style={styles.card}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Profile</Text>
          <Text style={[styles.name, { color: colors.text }]}>
            {user ? `${user.firstName} ${user.lastName}` : "Technical Admin"}
          </Text>
          <Text style={[styles.copy, { color: colors.textSoft }]}>{user?.email}</Text>
          <Text style={[styles.copy, { color: colors.textSoft }]}>{user?.role}</Text>
        </Surface>

        <Surface style={styles.card}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Appearance</Text>
          <SegmentedControl options={themeOptions} value={mode} onChange={setMode} />
        </Surface>

        <Surface style={styles.card}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Environment</Text>
          <Text style={[styles.copy, { color: colors.textSoft }]}>
            This app uses the shared project environment from the main dashboard `.env.local`.
          </Text>
          <Text style={[styles.copy, { color: colors.textSoft }]}>
            GraphQL API: {config.graphqlApiUrl || "Not configured"}
          </Text>
          <Text style={[styles.copy, { color: colors.textSoft }]}>
            Web App: {config.webAppUrl || "http://localhost:3000"}
          </Text>
        </Surface>

        <Button label="Sign out" tone="danger" onPress={() => void logout()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 16,
    marginTop: 8,
  },
  card: {
    gap: 14,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  name: {
    fontSize: 22,
    fontWeight: "800",
  },
  copy: {
    fontSize: 14,
    lineHeight: 20,
  },
});
