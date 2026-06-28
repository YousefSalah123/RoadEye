import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Info } from 'lucide-react-native';
import { Colors, Spacing, Radius, FontSize } from '../theme';

interface InfoBannerProps {
  text: string;
}

export const InfoBanner: React.FC<InfoBannerProps> = ({ text }) => (
  <View style={styles.container}>
    <Info size={16} color={Colors.primaryLight} style={{ marginRight: Spacing.sm }} />
    <Text style={styles.text}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryGhost,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.lg,
  },
  text: {
    flex: 1,
    color: Colors.primaryLight,
    fontSize: FontSize.sm,
    lineHeight: 18,
  },
});
