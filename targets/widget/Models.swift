import Foundation

let appGroupName: String = "group.com.pok.mobile"
let connectionsKey: String = "connections"
let isSubscribedKey: String = "isSubscribed"

struct Connection: Decodable, Encodable {
    let id: String
    let url: String
    let email: String
    let password: String
}

enum WidgetIntentState: Int {
    case loading = 0
    case apiFailed = 1
    case hasData = 2
    case noData = 3
    case unauthorized = 4
}

struct PocketBaseLog: Decodable {
    let id: String?
    let created: String?
    let level: Int?
    let message: String?
    let url: String?
    let method: String?
    let status: Int?
    let remoteIp: String?
    let userAgent: String?
    let referer: String?
    let duration: Double?
    let data: [String: AnyCodable]?
    
    init(id: String? = nil, created: String? = nil, level: Int? = nil, message: String? = nil, url: String? = nil, method: String? = nil, status: Int? = nil, remoteIp: String? = nil, userAgent: String? = nil, referer: String? = nil, duration: Double? = nil, data: [String: AnyCodable]? = nil) {
        self.id = id
        self.created = created
        self.level = level
        self.message = message
        self.url = url
        self.method = method
        self.status = status
        self.remoteIp = remoteIp
        self.userAgent = userAgent
        self.referer = referer
        self.duration = duration
        self.data = data
    }
    
    private enum CodingKeys: String, CodingKey {
        case id, created, level, message, url, method, status
        case remoteIp, userAgent, referer, duration, data
    }
}

struct AnyCodable: Decodable {
    let value: Any
    
    init(_ value: Any) {
        self.value = value
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let intVal = try? container.decode(Int.self) {
            value = intVal
        } else if let doubleVal = try? container.decode(Double.self) {
            value = doubleVal
        } else if let stringVal = try? container.decode(String.self) {
            value = stringVal
        } else if let boolVal = try? container.decode(Bool.self) {
            value = boolVal
        } else {
            value = ""
        }
    }
    
    func asInt() -> Int? {
        if let i = value as? Int { return i }
        if let d = value as? Double { return Int(d) }
        if let s = value as? String { return Int(s) }
        return nil
    }
    
    func asDouble() -> Double? {
        if let d = value as? Double { return d }
        if let i = value as? Int { return Double(i) }
        if let s = value as? String { return Double(s) }
        return nil
    }
    
    func asString() -> String? {
        if let s = value as? String { return s }
        if let i = value as? Int { return String(i) }
        if let d = value as? Double { return String(d) }
        return nil
    }
}

struct LogsResponse: Decodable {
    let items: [PocketBaseLog]
}

struct AuthResponse: Decodable {
    let token: String
}

struct CollectionModel: Decodable {
    let id: String
    let name: String
    let type: String
}

struct CollectionsResponse: Decodable {
    let items: [CollectionModel]
}

struct RecordsCountResponse: Decodable {
    let totalItems: Int
}

struct CollectionStat {
    let id: String
    let name: String
    let count: Int
}
