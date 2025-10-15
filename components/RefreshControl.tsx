import { COLORS } from '@/theme/colors'
import * as Haptics from 'expo-haptics'
import { RefreshControl as RNRefreshControl } from 'react-native'

export default function RefreshControl({
    refreshing,
    onRefresh,
}: { refreshing: boolean; onRefresh: () => void }) {
    return (
        <RNRefreshControl
            tintColor={COLORS.info}
            refreshing={refreshing}
            onRefresh={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                onRefresh()
            }}
            // android
            progressBackgroundColor={COLORS.bgLevel1}
            colors={[COLORS.info]}
        />
    )
}
