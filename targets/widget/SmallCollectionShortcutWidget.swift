import WidgetKit
import SwiftUI
import AppIntents

struct SmallCollectionShortcutAppIntentConfiguration: WidgetConfigurationIntent {
    static var title: LocalizedStringResource { "Collection" }
    static var description: IntentDescription { "Select your collection." }
    
    @Parameter(title: "Collection")
    var collection: CollectionListItem?
}

struct SmallCollectionShortcutProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> SmallCollectionShortcutEntry {
        SmallCollectionShortcutEntry(date: Date(), configuration: SmallCollectionShortcutAppIntentConfiguration(), isSubscribed: true)
    }
    
    func snapshot(for configuration: SmallCollectionShortcutAppIntentConfiguration, in context: Context) async -> SmallCollectionShortcutEntry {
        SmallCollectionShortcutEntry(date: Date(), configuration: configuration, isSubscribed: true)
    }
    
    func timeline(for configuration: SmallCollectionShortcutAppIntentConfiguration, in context: Context) async -> Timeline<SmallCollectionShortcutEntry> {
        var isSubscribed: Bool = false
        
        if let sharedDefaults = UserDefaults(suiteName: appGroupName) {
            isSubscribed = sharedDefaults.bool(forKey: isSubscribedKey)
        }
        
        let entry = SmallCollectionShortcutEntry(date: Date(), configuration: configuration, isSubscribed: isSubscribed)
        
        return Timeline(entries: [entry], policy: .never)
    }
}

struct SmallCollectionShortcutEntry: TimelineEntry {
    let date: Date
    let configuration: SmallCollectionShortcutAppIntentConfiguration
    let isSubscribed: Bool
}

struct SmallCollectionShortcutEntryView: View {
    var entry: SmallCollectionShortcutProvider.Entry
    
    var body: some View {
        let deepLink: String = {
            guard let collection = entry.configuration.collection,
                  let parsed = parseCollectionItemId(collection.id) else {
                return "pok://"
            }
            return getAppDeepLink(connectionId: parsed.connectionId, path: "collection/\(parsed.collectionId)")
        }()
        
        if !entry.isSubscribed {
            SubscriptionRequiredView()
                .widgetURL(URL(string: deepLink))
        } else {
            VStack(alignment: .center, spacing: 10.0) {
                Image("AppIconImage")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 75.0, height: 75.0)
                    .clipShape(Circle())
                
                if let collection = entry.configuration.collection {
                    Text("\(collection.name)")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(Color("text"))
                        .multilineTextAlignment(.center)
                        .lineLimit(2)
                        .truncationMode(.tail)
                } else {
                    VStack {
                        RoundedRectangle(cornerRadius: 8.0)
                            .fill(Color("bgLevel2"))
                            .frame(height: 10.0)
                        RoundedRectangle(cornerRadius: 8.0)
                            .fill(Color("bgLevel2"))
                            .frame(width: 50.0, height: 10.0)
                    }
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .widgetURL(URL(string: deepLink))
        }
    }
}

struct SmallCollectionShortcutWidget: Widget {
    let kind: String = "SmallCollectionShortcutWidget"
    
    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: SmallCollectionShortcutAppIntentConfiguration.self, provider: SmallCollectionShortcutProvider()) { entry in
            SmallCollectionShortcutEntryView(entry: entry)
                .containerBackground(for: .widget) {
                    Color("bgApp")
                }
        }
        .configurationDisplayName("Collection Shortcut")
        .description("Quickly open a collection.")
        .supportedFamilies([.systemSmall])
    }
}

extension SmallCollectionShortcutAppIntentConfiguration {
    fileprivate static var preview: SmallCollectionShortcutAppIntentConfiguration {
        let intent = SmallCollectionShortcutAppIntentConfiguration()
        intent.collection = .init(id: "1:users", name: "users", connection: .init(id: "1", url: "https://example.com", email: "test@test.com", password: "test"))
        return intent
    }
}

#Preview(as: .systemSmall) {
    SmallCollectionShortcutWidget()
} timeline: {
    SmallCollectionShortcutEntry(date: .now, configuration: .preview, isSubscribed: true)
}
