import Foundation
import AppIntents
import OSLog

struct ConnectionListItem: AppEntity, Decodable {
    static var defaultQuery = ConnectionQuery()
    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Select Server"
    
    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(name)")
    }
    
    let id: String
    let name: String
    let connection: Connection
}

private let connectionIntentLogger = Logger(subsystem: "pok.widget", category: "ConnectionIntent")

struct ConnectionQuery: EntityQuery {
    func getSharedOptions() async throws -> [ConnectionListItem] {
        var options: [ConnectionListItem] = []
        
        connectionIntentLogger.debug("getSharedOptions invoked for ConnectionQuery")
        
        guard let sharedDefaults = UserDefaults(suiteName: appGroupName),
              let rawConnections = sharedDefaults.data(forKey: connectionsKey) else {
            connectionIntentLogger.error("Missing shared defaults or connections data appGroup=\(appGroupName) key=\(connectionsKey)")
            return options
        }
        
        let connections = (try? JSONDecoder().decode([Connection].self, from: rawConnections)) ?? []
        connectionIntentLogger.debug("Decoded connections count=\(connections.count)")
        
        for connection in connections {
            let displayName = URL(string: connection.url)?.host ?? connection.url
            options.append(
                ConnectionListItem(
                    id: connection.id,
                    name: displayName,
                    connection: connection
                )
            )
            connectionIntentLogger.debug("Appended connection option id=\(connection.id) name=\(displayName)")
        }
        
        return options
    }
    
    func entities(for identifiers: [ConnectionListItem.ID]) async throws -> [ConnectionListItem] {
        connectionIntentLogger.debug("entities(for:) called identifiers count=\(identifiers.count)")
        return try await getSharedOptions().filter { identifiers.contains($0.id) }
    }
    
    func suggestedEntities() async throws -> [ConnectionListItem] {
        connectionIntentLogger.debug("suggestedEntities requested")
        return try await getSharedOptions()
    }
    
    func defaultResult() async -> ConnectionListItem? {
        connectionIntentLogger.debug("defaultResult requested")
        return try? await suggestedEntities().first
    }
}
