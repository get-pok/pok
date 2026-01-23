import WidgetKit
import SwiftUI
import AppIntents

struct LargeLogsAppIntentConfiguration: WidgetConfigurationIntent {
    static var title: LocalizedStringResource { "Server" }
    static var description: IntentDescription { "Select your server to view logs." }
    
    @Parameter(title: "Server")
    var server: ConnectionListItem?
}

struct LargeLogsProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> LargeLogsEntry {
        LargeLogsEntry(date: Date(), configuration: LargeLogsAppIntentConfiguration(), isSubscribed: true, logs: [], serverName: "Server")
    }
    
    func snapshot(for configuration: LargeLogsAppIntentConfiguration, in context: Context) async -> LargeLogsEntry {
        LargeLogsEntry(date: Date(), configuration: configuration, isSubscribed: true, logs: [], serverName: configuration.server?.name ?? "Server")
    }
    
    func timeline(for configuration: LargeLogsAppIntentConfiguration, in context: Context) async -> Timeline<LargeLogsEntry> {
        var isSubscribed: Bool = false
        var logs: [PocketBaseLog] = []
        var serverName: String = "Server"
        
        if let sharedDefaults = UserDefaults(suiteName: appGroupName) {
            isSubscribed = sharedDefaults.bool(forKey: isSubscribedKey)
        }
        
        if let server = configuration.server {
            serverName = server.name
            do {
                logs = try await fetchPocketBaseLogs(connection: server.connection, includeSuperusers: false)
            } catch {
                // Keep logs empty on error
            }
        }
        
        let entry = LargeLogsEntry(date: Date(), configuration: configuration, isSubscribed: isSubscribed, logs: logs, serverName: serverName)
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        
        return Timeline(entries: [entry], policy: .after(nextUpdate))
    }
}

struct LargeLogsEntry: TimelineEntry {
    let date: Date
    let configuration: LargeLogsAppIntentConfiguration
    let isSubscribed: Bool
    let logs: [PocketBaseLog]
    let serverName: String
}

struct LogItemView: View {
    var log: PocketBaseLog
    
    var body: some View {
        let statusValue = log.status ?? log.data?["status"]?.asInt()
        let durationValue = log.duration ?? log.data?["duration"]?.asDouble() ?? log.data?["execTime"]?.asDouble()
        let methodValue = log.method ?? log.data?["method"]?.asString()
        let rawUrlValue = log.url ?? log.data?["url"]?.asString()
        let urlValue = rawUrlValue?.replacingOccurrences(of: "/api/collections/", with: "/")
        let authValue = log.data?["auth"]?.asString()
        let levelValue = log.level ?? log.data?["level"]?.asInt() ?? 0
        
        let isRequest = statusValue != nil || methodValue != nil || urlValue != nil
        
        let (statusColor, labelText): (Color, String) = {
            if isRequest {
                let s = statusValue ?? 200
                if s >= 200 && s < 300 {
                    return (Color("success"), "INFO")
                } else if s >= 400 && s < 500 {
                    return (Color("warning"), "WARN")
                } else {
                    return (Color("danger"), "ERROR")
                }
            } else {
                // PocketBase log levels: 0=info, 4=warn, 8=error
                if levelValue >= 8 {
                    return (Color("danger"), "ERROR")
                } else if levelValue >= 4 {
                    return (Color("warning"), "WARN")
                } else {
                    return (Color("success"), "INFO")
                }
            }
        }()
        
        let secondaryText = isRequest ? "\(methodValue ?? "") \(urlValue ?? "")" : (log.message ?? "Log entry")
        let timeStr = formatLogTime(log.created)
        
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .center, spacing: 6) {
                Text(labelText)
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(Color.white)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(statusColor)
                    .clipShape(Capsule())
                
                Text(secondaryText)
                    .font(.system(size: 11, weight: .regular))
                    .foregroundStyle(Color("text"))
                    .lineLimit(1)
                    .truncationMode(.tail)
                
                Spacer()
                
                if !timeStr.isEmpty {
                    Text(timeStr)
                        .font(.system(size: 10, weight: .regular))
                        .foregroundStyle(Color("textMuted"))
                }
            }
            
            if statusValue != nil || (authValue != nil && !authValue!.isEmpty) || formatDuration(durationValue) != nil {
                HStack(spacing: 4) {
                    if let status = statusValue {
                        Text("\(status)")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(Color("text"))
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color("bgLevel2"))
                            .clipShape(Capsule())
                            .overlay(Capsule().stroke(Color("hr"), lineWidth: 1))
                    }
                    
                    if let auth = authValue, !auth.isEmpty {
                        Text(auth)
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(Color("text"))
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color("bgLevel2"))
                            .clipShape(Capsule())
                            .overlay(Capsule().stroke(Color("hr"), lineWidth: 1))
                    }
                    
                    if let durationStr = formatDuration(durationValue) {
                        Text(durationStr)
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(Color("text"))
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color("bgLevel2"))
                            .clipShape(Capsule())
                            .overlay(Capsule().stroke(Color("hr"), lineWidth: 1))
                    }
                    
                    Spacer()
                }
            }
        }
        .padding(.vertical, 2)
    }
}

struct LargeLogsEntryView: View {
    var entry: LargeLogsProvider.Entry
    
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
                } else if entry.logs.isEmpty {
                    Spacer()
                    Text("No logs found")
                        .font(.system(size: 14))
                        .foregroundStyle(Color("textMuted"))
                        .frame(maxWidth: .infinity, alignment: .center)
                    Spacer()
                } else {
                    ForEach(Array(entry.logs.prefix(6).enumerated()), id: \.offset) { _, log in
                        LogItemView(log: log)
                        if log.id != entry.logs.prefix(6).last?.id {
                            Divider()
                                .background(Color("hr"))
                        }
                    }
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .widgetURL(URL(string: deepLink))
        }
    }
}

struct LargeLogsWidget: Widget {
    let kind: String = "LargeLogsWidget"
    
    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: LargeLogsAppIntentConfiguration.self, provider: LargeLogsProvider()) { entry in
            LargeLogsEntryView(entry: entry)
                .containerBackground(for: .widget) {
                    Color("bgApp")
                }
        }
        .configurationDisplayName("Server Logs")
        .description("View recent logs from your PocketBase server.")
        .supportedFamilies([.systemLarge])
    }
}

#Preview(as: .systemLarge) {
    LargeLogsWidget()
} timeline: {
    LargeLogsEntry(date: .now, configuration: LargeLogsAppIntentConfiguration(), isSubscribed: true, logs: [
        PocketBaseLog(id: "1", created: "2024-01-15 10:30:45.123Z", level: 0, message: nil, url: "/api/collections/users/records", method: "GET", status: 200, remoteIp: nil, userAgent: nil, referer: nil, duration: 24.5, data: ["auth": AnyCodable("users")]),
        PocketBaseLog(id: "2", created: "2024-01-15 10:29:30.456Z", level: 4, message: nil, url: "/api/collections/posts/records", method: "POST", status: 400, remoteIp: nil, userAgent: nil, referer: nil, duration: 12.3, data: ["auth": AnyCodable("guest")]),
        PocketBaseLog(id: "3", created: "2024-01-15 10:28:15.789Z", level: 0, message: nil, url: "/api/collections/settings/records", method: "GET", status: 200, remoteIp: nil, userAgent: nil, referer: nil, duration: 8.1, data: nil)
    ], serverName: "My Server")
}
