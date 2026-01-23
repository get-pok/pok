package expo.modules.widgetkit

import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

class Connection : Record {
    @Field
    var id: String? = null
    
    @Field
    var url: String? = null

    @Field
    var email: String? = null

    @Field
    var password: String? = null
}
