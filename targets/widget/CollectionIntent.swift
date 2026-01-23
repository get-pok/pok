import Foundation
import AppIntents
import OSLog

struct CollectionListItem: AppEntity, Decodable {
    static var defaultQuery = CollectionQuery()
    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Select Collection"
    
    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(name)")
    }
    
    let id: String
    let name: String
    let connection: Connection
}

private let collectionIntentLogger = Logger(subsystem: "pok.widget", category: "CollectionIntent")

struct CollectionQuery: EntityQuery {
    func getSharedOptions() async throws -> [CollectionListItem] {
        var options: [CollectionListItem] = []
        
        collectionIntentLogger.debug("getSharedOptions invoked for CollectionQuery")
        
        guard let sharedDefaults = UserDefaults(suiteName: appGroupName),
              let rawConnections = sharedDefaults.data(forKey: connectionsKey) else {
            collectionIntentLogger.error("Missing shared defaults or connections data appGroup=\(appGroupName) key=\(connectionsKey)")
            return options
        }
        
        let connections = (try? JSONDecoder().decode([Connection].self, from: rawConnections)) ?? []
        collectionIntentLogger.debug("Decoded connections count=\(connections.count)")
        
        for connection in connections {
            collectionIntentLogger.debug("Fetching collections for connection id=\(connection.id)")
            do {
                let collections = try await fetchCollections(connection: connection)
                collectionIntentLogger.debug("Fetched collections count=\(collections.count) for connection id=\(connection.id)")
                
                for collection in collections {
                    options.append(
                        CollectionListItem(
                            id: "\(connection.id):\(collection.id)",
                            name: collection.name,
                            connection: connection
                        )
                    )
                    collectionIntentLogger.debug("Appended collection option id=\(collection.id) name=\(collection.name)")
                }
            } catch {
                collectionIntentLogger.error("Error fetching collections for connection id=\(connection.id) error=\(String(describing: error))")
                continue
            }
        }
        
        return options
    }
    
    func entities(for identifiers: [CollectionListItem.ID]) async throws -> [CollectionListItem] {
        collectionIntentLogger.debug("entities(for:) called identifiers count=\(identifiers.count)")
        return try await getSharedOptions().filter { identifiers.contains($0.id) }
    }
    
    func suggestedEntities() async throws -> [CollectionListItem] {
        collectionIntentLogger.debug("suggestedEntities requested")
        return try await getSharedOptions()
    }
    
    func defaultResult() async -> CollectionListItem? {
        collectionIntentLogger.debug("defaultResult requested")
        return try? await suggestedEntities().first
    }
}

func parseCollectionItemId(_ compositeId: String) -> (connectionId: String, collectionId: String)? {
    let parts = compositeId.split(separator: ":", maxSplits: 1)
    guard parts.count == 2 else { return nil }
    return (String(parts[0]), String(parts[1]))
}
