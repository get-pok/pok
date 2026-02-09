package package_name

import android.content.Context
import android.util.Log
import com.google.gson.Gson
import com.google.gson.annotations.SerializedName

/**
 * PocketBase API logic for the Pok Widget.
 */

private data class AuthResponse(
    val token: String,
    val record: Map<String, Any>
)

private data class LogsResponse(
    val page: Int,
    val perPage: Int,
    val totalItems: Int,
    val totalPages: Int,
    val items: List<PocketBaseLog>
)

/**
 * Authenticates with PocketBase as a superuser.
 * Returns the JWT token.
 */
suspend fun loginToPocketBase(connection: Connection): String {
    val baseUrl = connection.url.removeSuffix("/")
    val loginUrl = "$baseUrl/api/collections/_superusers/auth-with-password"
    
    val body = mapOf(
        "identity" to connection.email,
        "password" to connection.password
    )
    
    val params = FetchParams(
        url = loginUrl,
        method = HTTPMethod.POST,
        body = Gson().toJson(body)
    )
    
    // Use strong typing for response
    val response = httpRequest<AuthResponse>(params)
    return response.token
}

/**
 * Fetches the latest logs from the PocketBase instance.
 */
suspend fun fetchPocketBaseLogs(connection: Connection, includeSuperusers: Boolean = true): List<PocketBaseLog> {
    // 1. Get a fresh token
    val token = loginToPocketBase(connection)
    
    // 2. Fetch logs (requesting the last 50 items)
    val baseUrl = connection.url.removeSuffix("/")
    var logsUrl = "$baseUrl/api/logs?perPage=50&sort=-@rowid&skipTotal=1"
    
    // Add filter if superusers should be excluded
    if (!includeSuperusers) {
        // filter out requests by superusers
        logsUrl += "&filter=(data.auth!='_superusers')"
    }

    val params = FetchParams(
        url = logsUrl,
        method = HTTPMethod.GET,
        // PocketBase requires "Bearer " prefix
        token = "Bearer $token"
    )
    
    // 3. Use strong typing for response
    val response = httpRequest<LogsResponse>(params)
    return response.items
}

/**
 * Fetches the list of all collections from PocketBase.
 */
suspend fun fetchCollections(connection: Connection): List<CollectionModel> {
    val token = loginToPocketBase(connection)
    val baseUrl = connection.url.removeSuffix("/")
    val url = "$baseUrl/api/collections?perPage=500&sort=+name"
    
    val params = FetchParams(
        url = url,
        method = HTTPMethod.GET,
        token = "Bearer $token"
    )
    
    // Response wrapper for collections list
    data class CollectionsResponse(val items: List<CollectionModel>)
    
    val response = httpRequest<CollectionsResponse>(params)
    return response.items
}

/**
 * Fetches the total item count for a specific collection.
 */
suspend fun fetchCollectionCount(connection: Connection, collectionIdOrName: String): Int {
    val token = loginToPocketBase(connection)
    val baseUrl = connection.url.removeSuffix("/")
    // We request 1 item just to get the totalItems field from pagination
    val url = "$baseUrl/api/collections/$collectionIdOrName/records?perPage=1&skipTotal=0"
    
    val params = FetchParams(
        url = url,
        method = HTTPMethod.GET,
        token = "Bearer $token"
    )
    
    data class ListResponse(val totalItems: Int)
    
    return try {
        val response = httpRequest<ListResponse>(params)
        response.totalItems
    } catch (e: Exception) {
        0 // Return 0 on failure or if collection is empty/inaccessible
    }
}
