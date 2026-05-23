import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { ChevronRight, Home } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';

interface BreadcrumbProps {
  items: { id: string | null; name: string }[];
  onNavigate: (id: string | null) => void;
}

export function Breadcrumb({ items, onNavigate }: BreadcrumbProps) {
  const { colors } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {items.map((item, index) => (
        <View key={item.id || 'root'} style={styles.itemContainer}>
          <TouchableOpacity
            style={[
              styles.item,
              index === items.length - 1 && styles.activeItem,
              { backgroundColor: index === items.length - 1 ? colors.primaryLight : 'transparent' },
            ]}
            onPress={() => onNavigate(item.id)}
            disabled={index === items.length - 1}
          >
            {index === 0 ? (
              <Home size={16} color={index === items.length - 1 ? colors.primary : colors.textSecondary} />
            ) : null}
            <Text
              style={[
                styles.text,
                {
                  color: index === items.length - 1 ? colors.primary : colors.textSecondary,
                },
                index === items.length - 1 && styles.activeText,
              ]}
            >
              {item.name}
            </Text>
          </TouchableOpacity>
          {index < items.length - 1 && (
            <ChevronRight size={16} color={colors.textTertiary} style={styles.separator} />
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  activeItem: {
    paddingHorizontal: Spacing.md,
  },
  text: {
    fontSize: FontSize.sm,
    marginLeft: Spacing.xs,
  },
  activeText: {
    fontWeight: '600',
  },
  separator: {
    marginHorizontal: Spacing.xs,
  },
});
