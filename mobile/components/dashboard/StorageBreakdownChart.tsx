import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';
import { formatFileSize } from '@/utils/format';
import type { StorageBreakdownSegment } from '@/utils/dashboardStorage';

type Props = {
  segments: StorageBreakdownSegment[];
  /** Total de référence pour les pourcentages (ex. espace occupé du compte) */
  totalForPercent: number;
  title?: string;
};

export function StorageBreakdownChart({ segments, totalForPercent, title }: Props) {
  const { colors } = useTheme();

  const sumSeg = useMemo(() => segments.reduce((s, x) => s + x.size, 0), [segments]);

  if (!segments.length || sumSeg <= 0) {
    return null;
  }

  const denom = totalForPercent > 0 ? totalForPercent : sumSeg;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {title ? (
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      ) : null}
      <View style={[styles.stackTrack, { backgroundColor: colors.surfaceSecondary }]}>
        {segments.map((seg) => (
          <View
            key={seg.type}
            style={{
              flex: Math.max(seg.size, 1),
              backgroundColor: seg.color,
            }}
          />
        ))}
      </View>
      <View style={styles.legend}>
        {segments.map((seg) => {
          const pct = denom > 0 ? Math.round((seg.size / denom) * 1000) / 10 : 0;
          return (
            <View key={seg.type} style={styles.legendRow}>
              <View style={[styles.dot, { backgroundColor: seg.color }]} />
              <Text style={[styles.legendName, { color: colors.text }]} numberOfLines={1}>
                {seg.type}
              </Text>
              <Text style={[styles.legendSize, { color: colors.textSecondary }]}>
                {formatFileSize(seg.size)}
              </Text>
              <Text style={[styles.legendPct, { color: colors.textSecondary }]}>{pct}%</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  stackTrack: {
    flexDirection: 'row',
    height: 14,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  legend: {
    gap: Spacing.sm,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendName: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  legendSize: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    minWidth: 72,
    textAlign: 'right',
  },
  legendPct: {
    fontSize: FontSize.sm,
    width: 48,
    textAlign: 'right',
  },
});
