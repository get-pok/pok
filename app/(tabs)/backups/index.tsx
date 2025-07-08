import EmptyListComponent from '@/components/EmptyListComponent'
import { formatBytes } from '@/lib/format'
import getClient from '@/lib/pb'
import { COLORS } from '@/theme/colors'
import { Ionicons } from '@expo/vector-icons'
import { FlashList } from '@shopify/flash-list'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigation } from 'expo-router'
import { useLayoutEffect, useMemo, useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    Linking,
    RefreshControl,
    Text,
    TouchableOpacity,
    View,
} from 'react-native'
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
            await pb.backups.create(`${name}.zip`)
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

    const emptyListComponent = useMemo(() => {
        const emptyBackups = EmptyListComponent({
            isLoading: backupsQuery.isLoading,
            hasValue: filteredBackups.length > 0,
            emptyLabel: 'No backups found',
            error: backupsQuery.error,
            errorLabel: 'Failed to fetch backups',
        })

        return emptyBackups
    }, [backupsQuery.isLoading, backupsQuery.error, filteredBackups.length])

    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: createBackupMutation.isPending
                ? () => (
                      <ActivityIndicator
                          style={{ marginRight: 10 }}
                          size="small"
                          color={COLORS.text}
                      />
                  )
                : () => (
                      <TouchableOpacity
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
                                          onPress: (text) => {
                                              if (!text) return
                                              createBackupMutation.mutate(text)
                                          },
                                      },
                                  ],
                                  'plain-text',
                                  `pok_${new Date().toISOString().split('T')[0].replace(/-/g, '')}${Math.floor(Date.now() / 1000)}`
                              )
                          }}
                          style={{
                              backgroundColor: COLORS.bgLevel2,
                              justifyContent: 'center',
                              alignItems: 'center',
                              borderRadius: 16,
                              height: 32,
                              width: 32,
                          }}
                      >
                          <Ionicons name="add" size={20} color={COLORS.text} />
                      </TouchableOpacity>
                  ),

            headerSearchBarOptions: {
                placeholder: 'Search',
                hideWhenScrolling: true,
                barTintColor: COLORS.bgLevel2,
                textColor: COLORS.text,
                placeholderTextColor: COLORS.textMuted,
                onChangeText: (event: any) => setSearchString(event.nativeEvent.text),
            },
        })
    }, [navigation, createBackupMutation.isPending, createBackupMutation.mutate])

    return (
        <FlashList
            contentInsetAdjustmentBehavior="automatic"
            refreshControl={
                <RefreshControl
                    tintColor={COLORS.info}
                    refreshing={backupsQuery.isRefetching}
                    onRefresh={backupsQuery.refetch}
                    // android
                    progressBackgroundColor={COLORS.bgLevel1}
                    colors={[COLORS.info]}
                />
            }
            showsVerticalScrollIndicator={false}
            data={filteredBackups}
            overrideProps={
                emptyListComponent && {
                    contentContainerStyle: {
                        flex: 1,
                    },
                }
            }
            ListEmptyComponent={emptyListComponent}
            renderItem={({ item: backup, index: backupIndex }) => (
                <ContextMenu
                    dropdownMenuMode={true}
                    actions={[
                        {
                            title: 'Download',
                        },
                        {
                            title: 'Restore',
                        },
                        {
                            title: 'Delete',
                            destructive: true,
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
                                                    text: 'Delete site',
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
                                numberOfLines={1}
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
