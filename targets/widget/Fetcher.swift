import Foundation
import OSLog

struct NoBody: Encodable {}

enum HTTPMethod: String {
    case GET = "GET"
    case POST = "POST"
    case PUT = "PUT"
    case PATCH = "PATCH"
    case DELETE = "DELETE"
}

struct FetchParams<T: Encodable> {
    let method: HTTPMethod
    let url: String
    let baseUrl: String?
    let token: String?
    let body: T?
    
    init(method: HTTPMethod, url: String, baseUrl: String? = nil, token: String? = nil, body: T? = nil) {
        self.method = method
        self.url = url
        self.baseUrl = baseUrl
        self.token = token
        self.body = body
    }
    
    init(method: HTTPMethod, url: String, baseUrl: String? = nil, token: String? = nil) where T == NoBody {
        self.method = method
        self.url = url
        self.baseUrl = baseUrl
        self.token = token
        self.body = nil
    }
}

private let fetcherLogger = Logger(subsystem: "pok.widget", category: "Fetcher")

private func fetch<T: Encodable>(params: FetchParams<T>, completion: @escaping (Result<Data, Error>) -> Void) {
    let fullUrlString: String
    if params.url.starts(with: "http") {
        fullUrlString = params.url
    } else if let baseUrl = params.baseUrl {
        let cleanBase = baseUrl.hasSuffix("/") ? String(baseUrl.dropLast()) : baseUrl
        let cleanPath = params.url.hasPrefix("/") ? params.url : "/\(params.url)"
        fullUrlString = "\(cleanBase)\(cleanPath)"
    } else {
        fetcherLogger.error("InvalidUrl: No base URL and path is not absolute — provided=\(params.url)")
        return completion(.failure(NSError(domain: "InvalidUrl", code: 0, userInfo: [NSLocalizedDescriptionKey: "No base URL provided"])))
    }
    
    fetcherLogger.debug("Constructed full URL: \(fullUrlString)")
    
    guard let fullUrl = URL(string: fullUrlString) else {
        fetcherLogger.error("InvalidURL: Could not create URL from string: \(fullUrlString)")
        return completion(.failure(NSError(domain: "InvalidURL", code: 0, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"])))
    }
    
    var request = URLRequest(url: fullUrl)
    request.httpMethod = params.method.rawValue
    request.addValue("application/json", forHTTPHeaderField: "Accept")
    request.addValue("application/json", forHTTPHeaderField: "Content-Type")
    
    if let token = params.token {
        request.addValue(token, forHTTPHeaderField: "Authorization")
    }
    
    if let body = params.body {
        let jsonData = try? JSONEncoder().encode(body)
        request.httpBody = jsonData
        fetcherLogger.debug("Attached HTTP body bytes=\(jsonData?.count ?? 0)")
    }
    
    let session = URLSession(configuration: .default)
    
    let task = session.dataTask(with: request) { data, response, error in
        if let error = error {
            fetcherLogger.error("Request failed with error: \(String(describing: error))")
            completion(.failure(error))
            return
        }
        
        guard let httpResponse = response as? HTTPURLResponse else {
            fetcherLogger.error("InvalidResponse: Response was not HTTPURLResponse")
            return completion(.failure(NSError(domain: "InvalidResponse", code: 0, userInfo: [NSLocalizedDescriptionKey: "Invalid response"])))
        }
        
        fetcherLogger.debug("HTTP status=\(httpResponse.statusCode)")
        
        if !(200...299).contains(httpResponse.statusCode) {
            let error = NSError(domain: "HTTPError", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "HTTP Error: \(httpResponse.statusCode)"])
            
            if let data = data, let errorString = String(data: data, encoding: .utf8) {
                fetcherLogger.error("HTTP error body: \(errorString)")
            }
            
            fetcherLogger.error("Request failed with HTTP status \(httpResponse.statusCode)")
            return completion(.failure(error))
        }
        
        guard let data = data else {
            fetcherLogger.error("NoData: HTTP 2xx but data was nil")
            return completion(.failure(NSError(domain: "NoData", code: 0, userInfo: [NSLocalizedDescriptionKey: "No data received"])))
        }
        
        fetcherLogger.debug("Success response bytes=\(data.count)")
        completion(.success(data))
    }
    
    fetcherLogger.debug("Starting dataTask for \(fullUrlString)")
    task.resume()
}

func httpRequest<T: Decodable, K: Encodable>(params: FetchParams<K>) async throws -> T {
    try await withCheckedThrowingContinuation { continuation in
        fetch(params: params) { result in
            switch result {
            case .success(let data):
                do {
                    let decoder = JSONDecoder()
                    fetcherLogger.debug("Decoding response into \(String(describing: T.self))")
                    let decodedResult = try decoder.decode(T.self, from: data)
                    fetcherLogger.debug("Decoded successfully into \(String(describing: T.self))")
                    continuation.resume(returning: decodedResult)
                } catch {
                    let preview = String(data: data, encoding: .utf8) ?? "<non-utf8>"
                    fetcherLogger.error("Decoding failed for \(String(describing: T.self)) error=\(String(describing: error)) preview=\(preview)")
                    continuation.resume(throwing: error)
                }
            case .failure(let error):
                fetcherLogger.error("fetch failed error=\(String(describing: error))")
                continuation.resume(throwing: error)
            }
        }
    }
}
