// screens/TaskManagerScreen.js

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { C } from '../utils/theme';

const ACTION_CARDS = [
  {
    id: 'job_cards',
    icon: '🗃️',
    title: 'Job Cards',
    subtitle: 'View & create job cards',
    color: C.accent,
    screen: 'JobCards',
    permission: 'view_job_cards',
  },
  {
    id: 'my_tasks',
    icon: '✅',
    title: 'My Tasks',
    subtitle: 'Tasks assigned to you',
    color: C.success,
    screen: 'MyTasks',
    permission: 'view_my_tasks',
  },
  {
    id: 'task_types',
    icon: '🏷️',
    title: 'Task Types',
    subtitle: 'Add & edit task types',
    color: C.warning,
    screen: 'TaskTypes',
    permission: 'view_task_types',
  },
];

const TaskManagerScreen = ({ navigation }) => {
  const { hasPermission } = useAuth();

  const visibleCards = ACTION_CARDS.filter(card => hasPermission(card.permission));

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
      <Text style={styles.intro}>Job cards, task assignments & task types</Text>

      <View style={styles.actionsContainer}>
        {visibleCards.length > 0 ? (
          <View style={styles.actionCardsGrid}>
            {visibleCards.map(card => (
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
              You don't have permission to access Task Manager.{'\n'}Please
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
  container: { flex: 1, backgroundColor: C.bg },
  intro: {
    fontSize: 13,
    color: C.textSecondary,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  actionsContainer: { padding: 16 },
  actionCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    backgroundColor: C.surface,
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
  actionIcon: { fontSize: 26, marginRight: 10 },
  actionContent: { flex: 1 },
  actionTitle: { fontSize: 13, fontWeight: '600', color: C.textPrimary },
  actionSubtitle: { fontSize: 11, color: C.textSecondary, marginTop: 2 },
  noPermissionsContainer: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noPermissionsIcon: { fontSize: 48, marginBottom: 16 },
  noPermissionsText: {
    fontSize: 14,
    color: C.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  bottomSpacing: { height: 30 },
});

export default TaskManagerScreen;
