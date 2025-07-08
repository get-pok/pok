import { COLORS } from '@/theme/colors'
import { Ionicons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'
import { Platform } from 'react-native'

export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: COLORS.infoLighter,
                tabBarStyle: {
                    borderTopColor: COLORS.hr,
                    backgroundColor: COLORS.bgApp,
                    borderTopWidth: Platform.OS === 'ios' ? 1 : 0.2,
                    paddingTop: 8,
                    paddingBottom: 24,
                    height: 84,
                },
            }}
        >
            <Tabs.Screen
                name="collections"
                options={{
                    title: 'Collections',
                    tabBarIcon: ({ color, focused, size }) => (
                        <Ionicons
                            name={focused ? 'folder' : 'folder-outline'}
                            size={size}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="logs"
                options={{
                    title: 'Logs',
                    tabBarIcon: ({ color, focused, size }) => (
                        <Ionicons
                            name={focused ? 'list' : 'list-outline'}
                            size={size}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="backups"
                options={{
                    title: 'Backups',
                    tabBarIcon: ({ color, focused, size }) => (
                        <Ionicons
                            name={focused ? 'cloud-download' : 'cloud-download-outline'}
                            size={size}
                            color={color}
                        />
                    ),
                }}
            />
        </Tabs>
    )
}
