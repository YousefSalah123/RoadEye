import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, Alert, Modal, TextInput, TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { FolderOpen } from 'lucide-react-native';
import { Colors, Spacing, Radius, FontSize } from '../theme';
import { InfoBanner } from '../components/InfoBanner';
import { TripCard } from '../components/TripCard';
import { getSavedTrips, deleteTrip, updateTripMeta, Trip } from '../utils/fileManager';
import { uploadTrip } from '../services/api';

const HistoryScreen = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Edit modal
  const [editTrip, setEditTrip] = useState<Trip | null>(null);
  const [editStreet, setEditStreet] = useState('');
  const [editRegion, setEditRegion] = useState('');

  const loadTrips = () => {
    try {
      setTrips(getSavedTrips());
    } catch (e) {
      console.error('Failed to load trips', e);
    }
  };

  useFocusEffect(useCallback(() => { loadTrips(); }, []));

  const onRefresh = () => {
    setRefreshing(true);
    loadTrips();
    setRefreshing(false);
  };

  const handleUpload = async (trip: Trip) => {
    if (uploadingId) return;
    try {
      setUploadingId(trip.id);
      setUploadProgress(0);
      await uploadTrip(
        trip.videoUri,
        trip.gpsJsonUri,
        {
          driverName: trip.meta?.driverName || 'Unknown',
          region: trip.meta?.region || 'Unknown',
          streetName: trip.meta?.streetName || 'Unknown',
        },
        (pct) => setUploadProgress(pct)
      );
      Alert.alert('Success ✅', 'Trip uploaded to the server successfully!');
    } catch {
      Alert.alert('Upload Failed ❌', 'Could not upload. Check your connection and try again.');
    } finally {
      setUploadingId(null);
      setUploadProgress(0);
    }
  };

  const handleDelete = (trip: Trip) => {
    Alert.alert('Delete Trip', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => { deleteTrip(trip.id); loadTrips(); },
      },
    ]);
  };

  const handleEditOpen = (trip: Trip) => {
    setEditTrip(trip);
    setEditStreet(trip.meta?.streetName || '');
    setEditRegion(trip.meta?.region || '');
  };

  const handleEditSave = () => {
    if (!editTrip) return;
    updateTripMeta(editTrip.id, { streetName: editStreet, region: editRegion });
    setEditTrip(null);
    loadTrips();
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Trip History</Text>
      </View>

      <View style={styles.body}>
        <InfoBanner text="Your recorded trips appear here. Tap 'Send to System' to upload video + GPS data to the backend for AI analysis." />

        {trips.length === 0 ? (
          <View style={styles.empty}>
            <FolderOpen size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No Trips Yet</Text>
            <Text style={styles.emptySub}>Record your first trip from the Record tab.</Text>
          </View>
        ) : (
          <FlatList
            data={trips}
            keyExtractor={(t) => t.id}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.text} />}
            renderItem={({ item }) => (
              <TripCard
                trip={item}
                onUpload={handleUpload}
                onDelete={handleDelete}
                onEdit={handleEditOpen}
                isUploading={uploadingId === item.id}
                uploadProgress={uploadProgress}
              />
            )}
          />
        )}
      </View>

      {/* Edit Modal */}
      <Modal visible={!!editTrip} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Trip Info</Text>

            <Text style={styles.label}>Street Name</Text>
            <TextInput style={styles.input} value={editStreet} onChangeText={setEditStreet} placeholderTextColor={Colors.textMuted} placeholder="Street name" />

            <Text style={styles.label}>Region / City</Text>
            <TextInput style={styles.input} value={editRegion} onChangeText={setEditRegion} placeholderTextColor={Colors.textMuted} placeholder="Region" />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditTrip(null)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleEditSave}>
                <Text style={styles.saveText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingTop: 60, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg },
  title: { color: Colors.text, fontSize: FontSize.xxxl, fontWeight: '800' },
  body: { flex: 1, paddingHorizontal: Spacing.xl },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 80 },
  emptyTitle: { color: Colors.text, fontSize: FontSize.xl, fontWeight: '700', marginTop: Spacing.lg },
  emptySub: { color: Colors.textMuted, fontSize: FontSize.md, marginTop: 4 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: Colors.bgCard, borderTopLeftRadius: Radius.xxl, borderTopRightRadius: Radius.xxl,
    padding: Spacing.xxl, paddingBottom: 40,
  },
  modalTitle: { color: Colors.text, fontSize: FontSize.xl, fontWeight: '800', marginBottom: Spacing.xl },
  label: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600', marginBottom: 6, marginTop: Spacing.md },
  input: {
    backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
    color: Colors.text, fontSize: FontSize.md, paddingHorizontal: Spacing.lg, paddingVertical: 14,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xxl },
  cancelBtn: { flex: 1, padding: 14, borderRadius: Radius.md, backgroundColor: Colors.surface, marginRight: Spacing.sm, alignItems: 'center' },
  cancelText: { color: Colors.textSecondary, fontWeight: '700' },
  saveBtn: { flex: 1, padding: 14, borderRadius: Radius.md, backgroundColor: Colors.primary, marginLeft: Spacing.sm, alignItems: 'center' },
  saveText: { color: Colors.white, fontWeight: '700' },
});

export default HistoryScreen;
