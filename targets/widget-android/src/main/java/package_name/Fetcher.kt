package package_name

import android.util.Log
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

@PublishedApi
internal const val TAG = "PokWidgetFetcher"

enum class HTTPMethod(val value: String) {
    GET("GET"),
    POST("POST"),
    PUT("PUT"),
    PATCH("PATCH"),
    DELETE("DELETE"),
}

data class FetchParams(
    val url: String,
    val method: HTTPMethod = HTTPMethod.GET,
    val token: String? = null,
    val body: String? = null,
)

suspend fun fetch(params: FetchParams): ByteArray =
    withContext(Dispatchers.IO) {
        val isPOSTRequest = params.body != null && (params.method == HTTPMethod.POST || params.method == HTTPMethod.PATCH)

        Log.d(TAG, "Request URL: ${params.url}")

        val url = URL(params.url)
        val connection =
            (url.openConnection() as HttpURLConnection).apply {
                requestMethod = params.method.value
                setRequestProperty("Accept", "application/json")
                setRequestProperty("Content-Type", "application/json")

                params.token?.let {
                    Log.d(TAG, "Setting Authorization header")
                    setRequestProperty("Authorization", it)
                }

                connectTimeout = 15_000
                readTimeout = 15_000
            }

        try {
            if (isPOSTRequest) {
                connection.doOutput = true
                OutputStreamWriter(connection.outputStream).use { writer ->
                    writer.write(params.body)
                    writer.flush()
                }
            }

            connection.connect()
            val responseCode = connection.responseCode
            Log.d(TAG, "HTTP status=$responseCode")

            if (responseCode !in 200..299) {
                val errorMsg =
                    connection.errorStream?.bufferedReader()?.use { it.readText() }
                        ?: "HTTP Error: $responseCode"
                Log.e(TAG, "HTTP error: $errorMsg")
                throw Exception("HTTP Error: $responseCode. $errorMsg")
            }

            connection.inputStream.use { input ->
                val buffer = ByteArrayOutputStream()
                val data = ByteArray(1024)
                var nRead: Int
                while (input.read(data, 0, data.size).also { nRead = it } != -1) {
                    buffer.write(data, 0, nRead)
                }
                buffer.toByteArray()
            }
        } finally {
            connection.disconnect()
        }
    }

suspend inline fun <reified T> httpRequest(params: FetchParams): T {
    val data = fetch(params)
    val json = String(data, Charsets.UTF_8)
    Log.d(TAG, "Raw Response from ${params.url}: $json")
    val type = object : TypeToken<T>() {}.type
    val result: T = Gson().fromJson(json, type)
    Log.d(TAG, "Parsed response type: ${T::class.java.simpleName}")
    return result
}
