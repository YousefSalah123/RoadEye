import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Eye, User, MapPin, Navigation, Save, CheckCircle } from 'lucide-react-native';
import { Colors, Spacing, Radius, FontSize } from '../theme';
import { InfoBanner } from '../components/InfoBanner';
import { getProfile, saveProfile, UserProfile } from '../services/profile';

const ProfileScreen = () => {
  const [profile, setProfile] = useState<UserProfile>({ driverName: '', region: '', defaultStreet: '' });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const p = await getProfile();
      setProfile(p);
    })();
  }, []);

  const handleSave = async () => {
    await saveProfile(profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.avatarBox}>
              <User size={32} color={Colors.primary} />
            </View>
            <Text style={styles.title}>My Profile</Text>
            <Text style={styles.subtitle}>Your driver details are used in every trip CSV and upload.</Text>
          </View>

          <InfoBanner text="Set your info here once. It will be automatically filled in for every new trip." />

          {/* Form */}
          <Text style={styles.label}>Driver Name</Text>
          <View style={styles.inputRow}>
            <User size={18} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={profile.driverName}
              onChangeText={(v) => setProfile({ ...profile, driverName: v })}
              placeholder="Your full name"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          <Text style={styles.label}>Default Region / City</Text>
          <View style={styles.inputRow}>
            <MapPin size={18} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={profile.region}
              onChangeText={(v) => setProfile({ ...profile, region: v })}
              placeholder="e.g. Cairo"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          <Text style={styles.label}>Default Street Name</Text>
          <View style={styles.inputRow}>
            <Navigation size={18} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={profile.defaultStreet}
              onChangeText={(v) => setProfile({ ...profile, defaultStreet: v })}
              placeholder="e.g. Ring Road"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
            {saved ? (
              <>
                <CheckCircle size={20} color={Colors.white} />
                <Text style={styles.saveBtnText}>Saved!</Text>
              </>
            ) : (
              <>
                <Save size={20} color={Colors.white} />
                <Text style={styles.saveBtnText}>Save Profile</Text>
              </>
            )}
          </TouchableOpacity>

          {/* App Info */}
          <View style={styles.appInfoCard}>
            <View style={styles.appInfoRow}>
              <Eye size={18} color={Colors.primary} />
              <Text style={styles.appInfoTitle}>RoadEye Mobile Pro</Text>
            </View>
            <Text style={styles.appInfoText}>Version 1.0.0</Text>
            <Text style={styles.appInfoText}>AI Road Damage Detection Platform</Text>
            <Text style={styles.appInfoText}>Built with Expo SDK 52 + React Native</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: Spacing.xl, paddingTop: 60, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: Spacing.xxl },
  avatarBox: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.primaryGhost,
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md,
    borderWidth: 2, borderColor: Colors.primary + '40',
  },
  title: { color: Colors.text, fontSize: FontSize.xxl, fontWeight: '800' },
  subtitle: { color: Colors.textMuted, fontSize: FontSize.sm, textAlign: 'center', marginTop: 4, maxWidth: 280 },
  label: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600', marginBottom: 6, marginTop: Spacing.lg },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.bgCard, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  inputIcon: { marginLeft: Spacing.lg },
  input: {
    flex: 1, color: Colors.text, fontSize: FontSize.md,
    paddingHorizontal: Spacing.md, paddingVertical: 14,
  },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: Radius.lg,
    paddingVertical: 16, marginTop: Spacing.xxxl,
  },
  saveBtnText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: '800', marginLeft: Spacing.sm },
  appInfoCard: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.xl, borderWidth: 1,
    borderColor: Colors.border, padding: Spacing.xl, marginTop: Spacing.xxxl, alignItems: 'center',
  },
  appInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  appInfoTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700', marginLeft: 6 },
  appInfoText: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
});

export default ProfileScreen;
