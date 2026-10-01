import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../../store/AuthContext';
import { colors, fonts } from '../../theme';

/** Admin bottom nav — mirrors admin_dashboard/screen.png: Dashboard/Staff/Clock/Leaves/Payroll */
export default function AdminLayout() {
  const { user, role, isLoading } = useAuth();
  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.navy} />
      </View>
    );
  }
  if (!user) return <Redirect href="/" />;
  if (role !== 'admin') return <Redirect href="/(employee)/home" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.navy,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: '#FFF',
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 10,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontFamily: fonts.semiBold },
      }}>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="staff"
        options={{
          title: 'Staff',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="id-card-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="clock"
        options={{
          title: 'Clock',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="leaves"
        options={{
          title: 'Leaves',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="car-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="payroll"
        options={{
          title: 'Payroll',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cash-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="staff/add" options={{ href: null, title: 'Add Staff' }} />
      <Tabs.Screen name="staff/[id]" options={{ href: null, title: 'Staff Detail' }} />
      <Tabs.Screen name="payroll/run" options={{ href: null, title: 'Run Payroll' }} />
      <Tabs.Screen name="approvals" options={{ href: null, title: 'Approvals' }} />
      <Tabs.Screen name="regs" options={{ href: null, title: 'Regularization' }} />
      <Tabs.Screen name="tickets" options={{ href: null, title: 'Tickets' }} />
      <Tabs.Screen name="exits" options={{ href: null, title: 'Exits' }} />
      <Tabs.Screen name="holidays" options={{ href: null, title: 'Holidays' }} />
      <Tabs.Screen name="announcements" options={{ href: null, title: 'Announcements' }} />
      <Tabs.Screen name="audit" options={{ href: null, title: 'Audit Log' }} />
      <Tabs.Screen name="comp" options={{ href: null, title: 'Loans & Salary' }} />
      <Tabs.Screen name="shifts" options={{ href: null, title: 'Shifts' }} />
      <Tabs.Screen name="departments" options={{ href: null, title: 'Departments' }} />
      <Tabs.Screen name="staff/edit/[id]" options={{ href: null, title: 'Edit Staff' }} />
      <Tabs.Screen name="leave-types" options={{ href: null, title: 'Leave Types' }} />
    </Tabs>
  );
}
