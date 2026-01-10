import ActivityIndicator from '@/components/base/ActivityIndicator'
import HeaderItem from '@/components/base/HeaderItem'
import { HeaderTouchableOpacity } from '@/components/base/HeaderTouchableOpacity'
import buildPlaceholder from '@/components/base/Placeholder'
import RefreshControl from '@/components/base/RefreshControl'
import Text from '@/components/base/Text'
import { formatBytes } from '@/lib/format'
import { useFlashlistProps } from '@/lib/hooks'
import getClient from '@/lib/pb'
import { COLORS } from '@/theme/colors'
import Alert from '@blazejkustra/react-native-alert'
import { Ionicons } from '@expo/vector-icons'
import { FlashList } from '@shopify/flash-list'
import { useMutation, useQuery } from '@tanstack/react-query'
import { isLiquidGlassAvailable } from 'expo-glass-effect'
import { useNavigation } from 'expo-router'
import { useLayoutEffect, useMemo, useState } from 'react'
import { Linking, TouchableOpacity, View } from 'react-native'
import ContextMenu from 'react-native-context-menu-view'

const log = (...args: any[]) => {
    console.log('[BackupsScreen] ', ...args)
}

export default function BackupsScreen() {
    const navigation = useNavigation()
    const [searchString, setSearchString] = useState('')

    const backupsQuery = useQuery({
        queryKey: ['backups'],
        queryFn: async () => {
            const pb = await getClient()
            const backups = await pb.backups.getFullList()
            return backups
        },
    })

    const createBackupMutation = useMutation({
        mutationFn: async (name: string) => {
            const pb = await getClient()
            Alert.alert('Creating Backup', 'This may take a while...')
            await pb.backups.create(`${name.endsWith('.zip') ? name : `${name}.zip`}`)
        },
        onSuccess: () => {
            backupsQuery.refetch()
        },
        onError: (error) => {
            Alert.alert('Error', error.message)
        },
    })

    const restoreBackupMutation = useMutation({
        mutationFn: async (key: string) => {
            const pb = await getClient()
            Alert.alert('Restoring Backup', 'This may take a while...')
            await pb.backups.restore(key)
        },
        onError: (error) => {
            Alert.alert('Error', error.message)
        },
    })

    const deleteBackupMutation = useMutation({
        mutationFn: async (key: string) => {
            const pb = await getClient()
            await pb.backups.delete(key)
        },
        onSuccess: () => {
            backupsQuery.refetch()
        },
        onError: (error) => {
            Alert.alert('Error', error.message)
        },
    })

    const downloadBackupMutation = useMutation({
        mutationFn: async (key: string) => {
            const pb = await getClient()
            const token = await pb.files.getToken()
            const url = pb.backups.getDownloadURL(token, key)
            return url
        },
        onSuccess: (url) => {
            Linking.openURL(url)
        },
        onError: (error) => {
            Alert.alert('Error', error.message)
        },
    })

    const filteredBackups = useMemo(
        () =>
            backupsQuery.data?.filter((backup) =>
                backup.key.toLowerCase().includes(searchString.toLowerCase())
            ) || [],
        [backupsQuery.data, searchString]
    )

    const Placeholder = useMemo(() => {
        const emptyBackups = buildPlaceholder({
            isLoading: backupsQuery.isLoading,
            hasData: filteredBackups.length > 0,
            emptyLabel: 'No backups found',
            isError: backupsQuery.isError,
            errorLabel: 'Failed to fetch backups',
        })

        return emptyBackups
    }, [backupsQuery.isLoading, backupsQuery.isError, filteredBackups.length])
    const { overrideProps } = useFlashlistProps(Placeholder)

    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight:
                createBackupMutation.isPending ||
                deleteBackupMutation.isPending ||
                restoreBackupMutation.isPending
                    ? () => (
                          <HeaderItem>
                              <ActivityIndicator
                                  //   style={{ marginRight: 10 }}
                                  sm={true}
                                  monochrome={true}
                              />
                          </HeaderItem>
                      )
                    : () => (
                          <HeaderTouchableOpacity
                              onPress={() => {
                                  Alert.prompt(
                                      'Create Backup',
                                      'Enter a name for your new backup',
                                      [
                                          {
                                              text: 'Cancel',
                                              style: 'cancel',
                                          },
                                          {
                                              text: 'Create',
                                              onPress: (text?: string) => {
                                                  if (!text) return
                                                  createBackupMutation.mutate(text)
                                              },
                                          },
                                      ],
                                      'plain-text',
                                      `pok_${new Date().toISOString().split('T')[0].replace(/-/g, '')}_${Math.floor(Date.now() / 1000)}`
                                  )
                              }}
                              style={
                                  isLiquidGlassAvailable()
                                      ? undefined
                                      : {
                                            backgroundColor: COLORS.bgLevel2,
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            borderRadius: 16,
                                            height: 32,
                                            width: 32,
                                        }
                              }
                          >
                              <Ionicons
                                  name="add"
                                  size={isLiquidGlassAvailable() ? 32 : 20}
                                  color={COLORS.text}
                              />
                          </HeaderTouchableOpacity>
                      ),

            headerSearchBarOptions: {
                placeholder: 'Search',
                hideWhenScrolling: true,
                barTintColor: COLORS.bgLevel2,
                textColor: COLORS.text,
                onChangeText: (event: any) => setSearchString(event.nativeEvent.text),
                autoCapitalize: 'none',
                tintColor: COLORS.bgLevel2,
                hintTextColor: COLORS.textMuted,
                headerIconColor: COLORS.bgLevel2,
            },
        })
    }, [
        navigation,
        createBackupMutation.isPending,
        createBackupMutation.mutate,
        deleteBackupMutation.isPending,
        restoreBackupMutation.isPending,
    ])

    return (
        <FlashList
            contentInsetAdjustmentBehavior="automatic"
            refreshControl={<RefreshControl onRefresh={backupsQuery.refetch} />}
            showsVerticalScrollIndicator={false}
            data={filteredBackups}
            overrideProps={overrideProps}
            ListEmptyComponent={Placeholder}
            renderItem={({ item: backup, index: backupIndex }) => (
                <ContextMenu
                    dropdownMenuMode={true}
                    actions={[
                        {
                            title: 'Download',
                            systemIcon: 'arrow.down.to.line',
                        },
                        {
                            title: 'Restore',
                            systemIcon: 'arrow.counterclockwise',
                        },
                        {
                            title: 'Delete',
                            destructive: true,
                            systemIcon: 'trash',
                        },
                    ]}
                    onPress={(e) => {
                        if (e.nativeEvent.name === 'Download') {
                            downloadBackupMutation.mutate(backup.key)
                            return
                        }

                        if (e.nativeEvent.name === 'Restore') {
                            Alert.alert(
                                'Are you sure?',
                                'This will override your current database with the contents of the backup',
                                [
                                    { text: 'Cancel', style: 'cancel' },
                                    {
                                        text: 'Restore',
                                        style: 'destructive',
                                        onPress: () => {
                                            restoreBackupMutation.mutate(backup.key)
                                        },
                                    },
                                ]
                            )
                            return
                        }

                        if (e.nativeEvent.name === 'Delete') {
                            Alert.alert('Are you sure?', 'This action cannot be undone.', [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                    text: 'Delete',
                                    style: 'destructive',
                                    onPress: () => {
                                        Alert.alert(
                                            'Are you super duper sure?',
                                            'The backup will be deleted and cannot be recovered.',
                                            [
                                                {
                                                    text: 'Cancel',
                                                    style: 'cancel',
                                                },
                                                {
                                                    text: 'Delete backup',
                                                    style: 'destructive',
                                                    onPress: () => {
                                                        deleteBackupMutation.mutate(backup.key)
                                                    },
                                                },
                                            ]
                                        )
                                    },
                                },
                            ])
                            return
                        }
                    }}
                >
                    <TouchableOpacity
                        style={{
                            backgroundColor: backupIndex % 2 === 0 ? COLORS.bgLevel1 : undefined,
                            padding: 16,
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 20,
                        }}
                    >
                        <View style={{ flex: 1, gap: 4 }}>
                            <Text
                                style={{
                                    flex: 1,
                                    fontSize: 16,
                                    color: COLORS.text,
                                    fontWeight: 600,
                                    marginBottom: 4,
                                    textOverflow: 'ellipsis',
                                }}
                            >
                                {backup.key}
                            </Text>
                            <Text
                                style={{ fontSize: 14, color: COLORS.textMuted, marginBottom: 2 }}
                            >
                                {new Date(backup.modified).toLocaleString()}
                            </Text>
                        </View>
                        <Text style={{ fontSize: 14, color: COLORS.text, marginBottom: 2 }}>
                            {formatBytes(backup.size)}
                        </Text>
                    </TouchableOpacity>
                </ContextMenu>
            )}
        />
    )
}
