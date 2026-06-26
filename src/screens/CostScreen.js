

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

const COST_PERMISSION = 'view_vendor';

const ACTION_CARDS = [
  {
    id: 'expenses',
    icon: '🧾',
    title: 'Expenses',
    subtitle: 'View & add expenses',
    color: '#27b02e',
    screen: 'Expenses',
  },
  {
    id: 'budgets',
    icon: '📅',
    title: 'Budgets',
    subtitle: 'View & set budgets',
    color: '#9C27B0',
    screen: 'Budget',
  },
  {
    id: 'cost_types',
    icon: '🏷️',
    title: 'Cost Types',
    subtitle: 'Add & edit cost types',
    color: '#007AFF',
    screen: 'CostTypes',
  },
  {
    id: 'cost_groups',
    icon: '📂',
    title: 'Cost Groups',
    subtitle: 'Add & edit cost groups',
    color: '#FF9800',
    screen: 'CostGroups',
  },
  {
    id: 'cost_descriptions',
    icon: '📝',
    title: 'Descriptions',
    subtitle: 'Add & edit descriptions',
    color: '#00BCD4',
    screen: 'CostDescriptions',
  },
];

const CostScreen = ({ navigation }) => {
  const { hasPermission } = useAuth();
  const canAccess = hasPermission(COST_PERMISSION);

  const ActionCard = ({ icon, title, subtitle, color, onPress }) => (
    <TouchableOpacity
      style={[styles.actionCard, { borderLeftColor: color }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.actionIcon}>{icon}</Text>
      <View style={styles.actionContent}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.intro}>Manage expenses and budgets</Text>

      <View style={styles.actionsContainer}>
        {canAccess ? (
          <View style={styles.actionCardsGrid}>
            {ACTION_CARDS.map(card => (
              <ActionCard
                key={card.id}
                icon={card.icon}
                title={card.title}
                subtitle={card.subtitle}
                color={card.color}
                onPress={() => navigation.navigate(card.screen)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.noPermissionsContainer}>
            <Text style={styles.noPermissionsIcon}>🔒</Text>
            <Text style={styles.noPermissionsText}>
              You don't have permission to access the Cost module.{'\n'}Please
              contact your administrator.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  intro: {
    fontSize: 13,
    color: '#777',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  statsContainer: {
    padding: 16,
    marginTop: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  statTitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  actionsContainer: {
    padding: 16,
  },
  actionCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    marginBottom: 14,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 26,
    marginRight: 10,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  actionSubtitle: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  noPermissionsContainer: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noPermissionsIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  noPermissionsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  bottomSpacing: {
    height: 30,
  },
});

export default CostScreen;