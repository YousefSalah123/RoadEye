import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Eye, Video, Clock, BookOpen, AlertTriangle } from 'lucide-react-native';
import { Colors, Spacing, Radius, FontSize } from '../theme';
import { InfoBanner } from '../components/InfoBanner';
import { ActionCard } from '../components/ActionCard';
import { getSavedTrips } from '../utils/fileManager';

interface HomeScreenProps {
  navigation: any;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [tripCount, setTripCount] = useState(0);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      try {
        const trips = getSavedTrips();
        setTripCount(trips.length);
      } catch {}
    });
    return unsubscribe;
  }, [navigation]);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <View style={styles.logoBadge}>
              <Eye size={22} color={Colors.white} />
            </View>
            <View>
              <Text style={styles.brand}>RoadEye <Text style={styles.brandAccent}>Pro</Text></Text>
              <Text style={styles.tagline}>AI Road Damage Detection</Text>
            </View>
          </View>
        </View>

        <InfoBanner text="Welcome! Use this app as a dashcam to record trips. Your video and GPS data will be synced and uploaded for AI analysis." />

        {/* Stats Banner */}
        <View style={styles.statsBanner}>
          <View style={styles.statBox}>
            <AlertTriangle size={20} color={Colors.warning} />
            <Text style={styles.statValue}>{tripCount}</Text>
            <Text style={styles.statLabel}>Trips Saved</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Video size={20} color={Colors.success} />
            <Text style={styles.statValue}>1 Hz</Text>
            <Text style={styles.statLabel}>GPS Sync Rate</Text>
          </View>
        </View>

        {/* Action Cards */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.grid}>
          <ActionCard
            icon={<Video size={22} color={Colors.success} />}
            title="Start Scanning"
            subtitle="Begin a new trip"
            color={Colors.success}
            onPress={() => navigation.navigate('Record')}
          />
          <ActionCard
            icon={<Clock size={22} color={Colors.primary} />}
            title="View History"
            subtitle="Manage saved trips"
            color={Colors.primary}
            onPress={() => navigation.navigate('History')}
          />
          <ActionCard
            icon={<Eye size={22} color={Colors.warning} />}
            title="My Profile"
            subtitle="Driver settings"
            color={Colors.warning}
            onPress={() => navigation.navigate('Profile')}
          />
          <ActionCard
            icon={<BookOpen size={22} color={Colors.textMuted} />}
            title="Instructions"
            subtitle="How to use the app"
            color={Colors.textMuted}
            onPress={() => {}}
          />
        </View>

        {/* Instructions Card */}
        <View style={styles.instructionCard}>
          <Text style={styles.instructionTitle}>📋 How It Works</Text>
          <Text style={styles.instructionStep}>1. Go to <Text style={styles.bold}>Profile</Text> and set your driver name & region.</Text>
          <Text style={styles.instructionStep}>2. Tap <Text style={styles.bold}>Start Scanning</Text> and fill in the street info.</Text>
          <Text style={styles.instructionStep}>3. Press the red <Text style={styles.bold}>Record</Text> button to start capturing.</Text>
          <Text style={styles.instructionStep}>4. Stop recording when done. GPS + video are saved automatically.</Text>
          <Text style={styles.instructionStep}>5. Go to <Text style={styles.bold}>History</Text> and upload your trip to the server.</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: Spacing.xl, paddingTop: 60 },
  header: { marginBottom: Spacing.xl },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  logoBadge: {
    width: 48, height: 48, borderRadius: Radius.md,
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
    marginRight: Spacing.md,
  },
  brand: { color: Colors.text, fontSize: FontSize.xxl, fontWeight: '800' },
  brandAccent: { color: Colors.primary },
  tagline: { color: Colors.textMuted, fontSize: FontSize.sm },
  statsBanner: {
    flexDirection: 'row', backgroundColor: Colors.bgCard, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.xl, marginBottom: Spacing.xl,
    alignItems: 'center',
  },
  statBox: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 40, backgroundColor: Colors.border },
  statValue: { color: Colors.text, fontSize: FontSize.xxl, fontWeight: '800', marginTop: 6 },
  statLabel: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  sectionTitle: {
    color: Colors.text, fontSize: FontSize.lg, fontWeight: '700', marginBottom: Spacing.md,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  instructionCard: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.xl, borderWidth: 1,
    borderColor: Colors.border, padding: Spacing.xl, marginTop: Spacing.sm,
  },
  instructionTitle: {
    color: Colors.text, fontSize: FontSize.lg, fontWeight: '700', marginBottom: Spacing.md,
  },
  instructionStep: {
    color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 22, marginBottom: 6,
  },
  bold: { fontWeight: '700', color: Colors.primaryLight },
});

export default HomeScreen;
