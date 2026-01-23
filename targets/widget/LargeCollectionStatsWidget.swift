import WidgetKit
import SwiftUI
import AppIntents

struct LargeCollectionStatsAppIntentConfiguration: WidgetConfigurationIntent {
    static var title: LocalizedStringResource { "Server" }
    static var description: IntentDescription { "Select your server to view collection stats." }
    
    @Parameter(title: "Server")
    var server: ConnectionListItem?
}

struct LargeCollectionStatsProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> LargeCollectionStatsEntry {
        LargeCollectionStatsEntry(date: Date(), configuration: LargeCollectionStatsAppIntentConfiguration(), isSubscribed: true, stats: [], serverName: "Server")
    }
    
    func snapshot(for configuration: LargeCollectionStatsAppIntentConfiguration, in context: Context) async -> LargeCollectionStatsEntry {
        LargeCollectionStatsEntry(date: Date(), configuration: configuration, isSubscribed: true, stats: [
            CollectionStat(id: "1", name: "users", count: 150),
            CollectionStat(id: "2", name: "posts", count: 1234),
            CollectionStat(id: "3", name: "comments", count: 5678)
        ], serverName: configuration.server?.name ?? "Server")
    }
    
    func timeline(for configuration: LargeCollectionStatsAppIntentConfiguration, in context: Context) async -> Timeline<LargeCollectionStatsEntry> {
        var isSubscribed: Bool = false
        var stats: [CollectionStat] = []
        var serverName: String = "Server"
        
        if let sharedDefaults = UserDefaults(suiteName: appGroupName) {
            isSubscribed = sharedDefaults.bool(forKey: isSubscribedKey)
        }
        
        if let server = configuration.server {
            serverName = server.name
            do {
                stats = try await fetchCollectionsWithCounts(connection: server.connection)
            } catch {
                // Keep stats empty on error
            }
        }
        
        let entry = LargeCollectionStatsEntry(date: Date(), configuration: configuration, isSubscribed: isSubscribed, stats: stats, serverName: serverName)
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        
        return Timeline(entries: [entry], policy: .after(nextUpdate))
    }
}

struct LargeCollectionStatsEntry: TimelineEntry {
    let date: Date
    let configuration: LargeCollectionStatsAppIntentConfiguration
    let isSubscribed: Bool
    let stats: [CollectionStat]
    let serverName: String
}

struct LargeCollectionStatsEntryView: View {
    var entry: LargeCollectionStatsProvider.Entry
    
    var body: some View {
        let deepLink = getAppDeepLink(connectionId: entry.configuration.server?.connection.id, path: "")
        
        if !entry.isSubscribed {
            SubscriptionRequiredView()
                .widgetURL(URL(string: deepLink))
        } else {
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 8) {
                    Image("AppIconImage")
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(width: 20.0, height: 20.0)
                        .clipShape(Circle())
                    
                    Text(entry.serverName)
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(Color("text"))
                        .lineLimit(1)
                    
                    Spacer()
                }
                
                if entry.configuration.server == nil {
                    Spacer()
                    Text("Tap to configure")
                        .font(.system(size: 14))
                        .foregroundStyle(Color("textMuted"))
                        .frame(maxWidth: .infinity, alignment: .center)
                    Spacer()
                } else if entry.stats.isEmpty {
                    Spacer()
                    Text("No collections found")
                        .font(.system(size: 14))
                        .foregroundStyle(Color("textMuted"))
                        .frame(maxWidth: .infinity, alignment: .center)
                    Spacer()
                } else {
                    HStack(alignment: .top, spacing: 4) {
                        Text("Collection")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(Color("textMuted"))
                        
                        Spacer()
                        
                        Text("Count")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(Color("textMuted"))
                    }
                    .padding(.bottom, 4)
                    
                    ForEach(Array(entry.stats.enumerated()), id: \.offset) { _, stat in
                        HStack(spacing: 4) {
                            Text(stat.name)
                                .font(.system(size: 14, weight: .regular))
                                .foregroundStyle(Color("text"))
                                .lineLimit(1)
                                .truncationMode(.tail)
                            
                            Spacer()
                            
                            Text(formatCompactCount(stat.count))
                                .font(.system(size: 14, weight: .bold))
                                .foregroundStyle(Color("success"))
                        }
                        .padding(.vertical, 3)
                    }
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .widgetURL(URL(string: deepLink))
        }
    }
}

struct LargeCollectionStatsWidget: Widget {
    let kind: String = "LargeCollectionStatsWidget"
    
    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: LargeCollectionStatsAppIntentConfiguration.self, provider: LargeCollectionStatsProvider()) { entry in
            LargeCollectionStatsEntryView(entry: entry)
                .containerBackground(for: .widget) {
                    Color("bgApp")
                }
        }
        .configurationDisplayName("Collection Stats")
        .description("View collection record counts from your PocketBase server.")
        .supportedFamilies([.systemLarge])
    }
}

#Preview(as: .systemLarge) {
    LargeCollectionStatsWidget()
} timeline: {
    LargeCollectionStatsEntry(date: .now, configuration: LargeCollectionStatsAppIntentConfiguration(), isSubscribed: true, stats: [
        CollectionStat(id: "1", name: "users", count: 150),
        CollectionStat(id: "2", name: "posts", count: 1234),
        CollectionStat(id: "3", name: "comments", count: 5678),
        CollectionStat(id: "4", name: "tags", count: 89),
        CollectionStat(id: "5", name: "categories", count: 42)
    ], serverName: "My Server")
}
