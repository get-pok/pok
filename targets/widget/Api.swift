import Foundation

func loginToPocketBase(connection: Connection) async throws -> String {
    let baseUrl = connection.url.hasSuffix("/") ? String(connection.url.dropLast()) : connection.url
	let loginUrl = "\(baseUrl)/api/collections/_superusers/auth-with-password"
    
    let params = FetchParams(
        method: HTTPMethod.POST,
        url: loginUrl,
        body: ["identity": connection.email, "password": connection.password]
    )
    
    let response: AuthResponse = try await httpRequest(params: params)
    return response.token
}

func fetchPocketBaseLogs(connection: Connection, includeSuperusers: Bool = true) async throws -> [PocketBaseLog] {
    let token = try await loginToPocketBase(connection: connection)
    
    let baseUrl = connection.url.hasSuffix("/") ? String(connection.url.dropLast()) : connection.url
    var logsUrl = "\(baseUrl)/api/logs?perPage=50&sort=-@rowid&skipTotal=1"
    
    if !includeSuperusers {
        logsUrl += "&filter=(data.auth!='_superusers')"
    }
    
  let params = FetchParams<NoBody>(
    method: HTTPMethod.GET,
        url: logsUrl,
        token: token
    )
    
    let response: LogsResponse = try await httpRequest(params: params)
    return response.items
}

func fetchCollections(connection: Connection, includeSystemTables: Bool = false) async throws -> [CollectionModel] {
    let token = try await loginToPocketBase(connection: connection)
    
    let baseUrl = connection.url.hasSuffix("/") ? String(connection.url.dropLast()) : connection.url
    let url = "\(baseUrl)/api/collections?perPage=500&sort=+name"
    
  let params = FetchParams<NoBody>(
    method: HTTPMethod.GET,
        url: url,
        token: "Bearer \(token)"
    )
    
    let response: CollectionsResponse = try await httpRequest(params: params)
    
    if includeSystemTables {
        return response.items
    }
    return response.items.filter { !$0.name.hasPrefix("_") }
}

func fetchCollectionCount(connection: Connection, collectionIdOrName: String) async throws -> Int {
    let token = try await loginToPocketBase(connection: connection)
    
    let baseUrl = connection.url.hasSuffix("/") ? String(connection.url.dropLast()) : connection.url
    let url = "\(baseUrl)/api/collections/\(collectionIdOrName)/records?perPage=1&skipTotal=0"
    
  let params = FetchParams<NoBody>(
    method: HTTPMethod.GET,
        url: url,
        token: "Bearer \(token)"
    )
    
    do {
        let response: RecordsCountResponse = try await httpRequest(params: params)
        return response.totalItems
    } catch {
        return 0
    }
}

func fetchCollectionsWithCounts(connection: Connection, limit: Int = 10) async throws -> [CollectionStat] {
    let allCollections = try await fetchCollections(connection: connection)
    let collections = Array(allCollections.prefix(limit))
    
    return await withTaskGroup(of: CollectionStat?.self) { group in
        for collection in collections {
            group.addTask {
                do {
                    let count = try await fetchCollectionCount(connection: connection, collectionIdOrName: collection.id)
                    return CollectionStat(id: collection.id, name: collection.name, count: count)
                } catch {
                    return CollectionStat(id: collection.id, name: collection.name, count: 0)
                }
            }
        }
        
        var results: [CollectionStat] = []
        for await stat in group {
            if let s = stat {
                results.append(s)
            }
        }
        return results.sorted { $0.name.lowercased() < $1.name.lowercased() }
    }
}
