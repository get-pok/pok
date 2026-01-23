import { COLORS } from '@/theme/colors'
import { Ionicons } from '@expo/vector-icons'
import { Icon, Label, VectorIcon } from 'expo-router'
import { NativeTabs } from 'expo-router/unstable-native-tabs'

export default function TabsLayout() {
    return (
        <NativeTabs disableTransparentOnScrollEdge={true} tintColor={COLORS.infoLighter}>
            <NativeTabs.Trigger name="collections">
                <Label>Collections</Label>
                <Icon src={<VectorIcon family={Ionicons} name="folder" />} />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="logs">
                <Label>Logs</Label>
                <Icon src={<VectorIcon family={Ionicons} name="list" />} />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="backups">
                <Label>Backups</Label>
                <Icon src={<VectorIcon family={Ionicons} name="cloud-download" />} />
            </NativeTabs.Trigger>
        </NativeTabs>
    )
}
