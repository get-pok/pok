import Foundation
import OSLog

private let helpersLogger = Logger(subsystem: "pok.widget", category: "Helpers")

func formatCompactCount(_ value: Int) -> String {
    let absValue = abs(value)
    let sign = value < 0 ? "-" : ""
    let formatter = NumberFormatter()
    formatter.numberStyle = .decimal
    formatter.usesGroupingSeparator = false
    formatter.minimumFractionDigits = 0
    formatter.maximumFractionDigits = 1
    
    var scaled: Double = Double(absValue)
    var suffix = ""
    if absValue >= 1_000_000_000 {
        scaled = Double(absValue) / 1_000_000_000.0
        suffix = "B"
    } else if absValue >= 1_000_000 {
        scaled = Double(absValue) / 1_000_000.0
        suffix = "M"
    } else if absValue >= 1_000 {
        scaled = Double(absValue) / 1_000.0
        suffix = "K"
    } else {
        return "\(value)"
    }
    let numberString = formatter.string(from: NSNumber(value: scaled)) ?? String(format: "%.1f", scaled)
    return "\(sign)\(numberString)\(suffix)"
}

func getAppDeepLink(connectionId: String?, path: String) -> String {
    guard let connectionId = connectionId else {
        return "pok://"
    }
    
    if let sharedDefaults = UserDefaults(suiteName: appGroupName) {
        let isSubscribed = sharedDefaults.bool(forKey: isSubscribedKey)
        
        if isSubscribed {
            let separator = path.contains("?") ? "&" : "?"
            return "pok://\(path)\(separator)_widgetConnectionId=\(connectionId)"
        }
    }
    
    return "pok://?showPaywall=1"
}

func formatDuration(_ duration: Double?) -> String? {
    guard let duration = duration else { return nil }
    
    if duration == 0 {
        return "0ms"
    } else if duration < 1.0 {
        return "\(Int(duration * 1000))ms"
    } else if duration < 1000.0 {
        return "\(Int(duration))ms"
    } else {
        return String(format: "%.2fs", duration / 1000.0)
    }
}

func formatLogTime(_ created: String?) -> String {
    guard let created = created, created.count >= 16 else { return "" }
    let start = created.index(created.startIndex, offsetBy: 11)
    let end = created.index(created.startIndex, offsetBy: 16)
    return String(created[start..<end])
}
