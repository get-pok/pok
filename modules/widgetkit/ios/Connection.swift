import ExpoModulesCore

struct Connection: Record, Encodable, Decodable {
    init() {}
    
    @Field
    var id: String?
    
    @Field
    var url: String?
    
    @Field
    var email: String?
    
    @Field
    var password: String?
    
    enum CodingKeys: String, CodingKey {
        case id, url, email, password
    }
    
    init(from decoder: Decoder) throws {
        let client = try decoder.container(keyedBy: CodingKeys.self)
        
        id = try client.decodeIfPresent(String.self, forKey: .id)
        url = try client.decodeIfPresent(String.self, forKey: .url)
        email = try client.decodeIfPresent(String.self, forKey: .email)
        password = try client.decodeIfPresent(String.self, forKey: .password)
    }

    func encode(to encoder: Encoder) throws {
        var client = encoder.container(keyedBy: CodingKeys.self)
        
        try client.encodeIfPresent(id, forKey: .id)
        try client.encodeIfPresent(url, forKey: .url)
        try client.encodeIfPresent(email, forKey: .email)
        try client.encodeIfPresent(password, forKey: .password)
    }
}
