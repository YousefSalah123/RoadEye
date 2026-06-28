import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CloudUpload, Trash2, MapPin, Clock, Pencil } from 'lucide-react-native';
import { Colors, Spacing, Radius, FontSize } from '../theme';
import { Trip } from '../utils/fileManager';

interface TripCardProps {
  trip: Trip;
  onUpload: (trip: Trip) => void;
  onDelete: (trip: Trip) => void;
  onEdit: (trip: Trip) => void;
  isUploading: boolean;
  uploadProgress: number;
}

export const TripCard: React.FC<TripCardProps> = ({
  trip, onUpload, onDelete, onEdit, isUploading, uploadProgress,
}) => {
  const street = trip.meta?.streetName || 'Unknown Street';
  const region = trip.meta?.region || 'Unknown Region';

  return (
    <View style={styles.card}>
      {/* Thumbnail placeholder */}
      <View style={styles.thumbRow}>
        <View style={styles.thumbnail}>
          <Text style={styles.thumbEmoji}>🎥</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.street} numberOfLines={1}>{street}</Text>
          <View style={styles.metaRow}>
            <MapPin size={12} color={Colors.textMuted} />
            <Text style={styles.metaText}>{region}</Text>
          </View>
          <View style={styles.metaRow}>
            <Clock size={12} color={Colors.textMuted} />
            <Text style={styles.metaText}>{trip.dateFormatted}</Text>
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.editBtn} onPress={() => onEdit(trip)}>
          <Pencil size={16} color={Colors.warning} />
        </TouchableOpacity>

        {isUploading ? (
          <View style={styles.uploadingRow}>
            <ActivityIndicator color={Colors.primary} size="small" />
            <Text style={styles.progressText}>{uploadProgress}%</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.uploadBtn} onPress={() => onUpload(trip)}>
            <CloudUpload size={16} color={Colors.white} />
            <Text style={styles.uploadText}>Send to System</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(trip)} disabled={isUploading}>
          <Trash2 size={16} color={Colors.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  thumbRow: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  thumbEmoji: {
    fontSize: 24,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  street: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '700',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  metaText: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    marginLeft: 4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
  },
  editBtn: {
    padding: Spacing.sm,
    backgroundColor: Colors.warningGhost,
    borderRadius: Radius.sm,
    marginRight: Spacing.sm,
  },
  uploadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.sm,
    marginRight: Spacing.sm,
  },
  uploadText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: FontSize.sm,
    marginLeft: 6,
  },
  deleteBtn: {
    padding: Spacing.sm,
    backgroundColor: Colors.dangerGhost,
    borderRadius: Radius.sm,
  },
  uploadingRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  progressText: {
    color: Colors.primary,
    fontWeight: '700',
    marginLeft: 8,
  },
});
