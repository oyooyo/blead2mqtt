<a name="module_utils"></a>

## utils
The utility functions that can be used by the "transform" function.


* [utils](#module_utils)
    * [.canonicalize_bluetooth_uuid](#module_utils.canonicalize_bluetooth_uuid) ⇒ <code>string</code>
    * [.convert_octets_hex_string_to_octets_array](#module_utils.convert_octets_hex_string_to_octets_array) ⇒ <code>Array.&lt;number&gt;</code>
    * [.convert_to_formatted_octet_hex_string](#module_utils.convert_to_formatted_octet_hex_string) ⇒ <code>string</code>
    * [.create_hierarchical_messages](#module_utils.create_hierarchical_messages) ⇒ <code>Array.&lt;Object&gt;</code>
    * [.create_limited_frequency_proxy_transform](#module_utils.create_limited_frequency_proxy_transform) ⇒ <code>function</code>
    * [.parse_known_data](#module_utils.parse_known_data) ⇒ <code>Object</code> \| <code>null</code>

<a name="module_utils.canonicalize_bluetooth_uuid"></a>

### utils.canonicalize\_bluetooth\_uuid ⇒ <code>string</code>
Canonicalize a "Bluetooth UUID", by converting it to a full UUID string like "0000FE95-0000-1000-8000-00805F9B34FB"

**Kind**: static property of [<code>utils</code>](#module_utils)  
**Returns**: <code>string</code> - The associated canonical UUID string, for example "0000FE95-0000-1000-8000-00805F9B34FB"  

| Param | Type | Description |
| --- | --- | --- |
| bluetooth_uuid | <code>string</code> \| <code>number</code> | The "Bluetooth UUID" to canonicalize. This may either be: <ul>   <li>An unsigned 32 bit integer number, for example 0xFE95 or 65173</li>   <li>A string that contains 1-8 hexadecimal characters, that will be interpreted as a hexadecimal representation of an unsigned 32 bit integer number, for example "FE95"</li>   <li>A string that contains exactly 32 hexadecimal characters, that will be interpreted as a 128 bit UUID string, for example "0000FE9500001000800000805F9B34FB"</li> </ul> |

**Example**  
```js
utils.canonicalize_bluetooth_uuid(65173)
utils.canonicalize_bluetooth_uuid(0xFE95)
utils.canonicalize_bluetooth_uuid("fe95")
utils.canonicalize_bluetooth_uuid("0000FE9500001000800000805F9B34FB")
// The above examples will all return the same result:
"0000FE95-0000-1000-8000-00805F9B34FB"
```
<a name="module_utils.convert_octets_hex_string_to_octets_array"></a>

### utils.convert\_octets\_hex\_string\_to\_octets\_array ⇒ <code>Array.&lt;number&gt;</code>
Convert an "octets hex string" (a string with an even number of hexadecimal characters) to an "octets array" (an array with unsigned integer values in range 0-255)

**Kind**: static property of [<code>utils</code>](#module_utils)  
**Returns**: <code>Array.&lt;number&gt;</code> - the converted "octets array", an array with unsigned integer values in range 0-255  

| Param | Type | Description |
| --- | --- | --- |
| octets_hex_string | <code>string</code> | The "octets hex string" to convert |

**Example**  
```js
utils.convert_octets_hex_string_to_octets_array('fe9c23')
// returns
[254, 156, 35]
```
<a name="module_utils.convert_to_formatted_octet_hex_string"></a>

### utils.convert\_to\_formatted\_octet\_hex\_string ⇒ <code>string</code>
Convert to an "octets hex string" (a string with an even number of hexadecimal characters).

**Kind**: static property of [<code>utils</code>](#module_utils)  
**Returns**: <code>string</code> - the formatted hexadecimal string  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| octets | <code>string</code> \| <code>Array.&lt;number&gt;</code> |  | Either an array with unsigned integer values in range 0-255 or a hexadecimal string with an equal number of hexadecimal characters |
| [octet_separator] | <code>string</code> | <code>&quot;&#x27;&#x27;&quot;</code> | the separator string that will be between all octets of the formatted string |
| [upper_case] | <code>boolean</code> | <code>true</code> | if true, the formatted string will be all upper-case, if false, it will be all lower-case |

**Example** *(Format a MAC address, with colon between each octet, lower-case)*  
```js
utils.format_octet_hex_string('123456789abc', ':', false)
// returns
"12:34:56:78:9a:bc"
```
**Example** *(Convert a octet array to a short, upper-case hex string)*  
```js
utils.format_octet_hex_string([123, 201, 243, 17, 9])
// returns
"7BC9F31109"
```
<a name="module_utils.create_hierarchical_messages"></a>

### utils.create\_hierarchical\_messages ⇒ <code>Array.&lt;Object&gt;</code>
Converts a JSON object into a number of MQTT messages, with the hierarchical structure of the JSON object being mapped to the MQTT topic hierarchy. Useful if

**Kind**: static property of [<code>utils</code>](#module_utils)  
**Returns**: <code>Array.&lt;Object&gt;</code> - An array of MQTT messages  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| root_topic | <code>string</code> |  | The "root" MQTT topic, for example "blead2mqtt/peripheral/12:34:56:78:9A:BC" |
| value | <code>Object</code> |  | The JSON object to convert into MQTT messages |
| [leafs_only] | <code>boolean</code> | <code>true</code> | If true, only "leaf" values (=values that are not true objects) will be converted into MQTT messages |
| [retain] | <code>boolean</code> |  | If true/false, the created MQTT messages will be sent as retained/unretained messages. If not specified, this will default to the configuration value mqtt.default_retain |
| [qos] | <code>number</code> |  | The QOS level for the created MQTT messages. If not specified, this will default to the configuration value mqtt.default_qos |

**Example** *(Example with leafs_only&#x3D;true)*  
```js
utils.create_hierarchical_messages('root/topic', {a:17, b:{c:"foo", d:"bar"}}, true)
// returns
[
  {topic:'root/topic/a', payload:'17'},
  {topic:'root/topic/b/c', payload:'foo'},
  {topic:'root/topic/b/d', payload:'bar'},
]
```
**Example** *(Same example with leafs_only&#x3D;false)*  
```js
utils.create_hierarchical_messages('root/topic', {a:17, b:{c:"foo", d:"bar"}}, false)
// returns
[
  {topic:'root/topic', payload:'{"a":17,"b":{"c":"foo","d":"bar"}}'},
  {topic:'root/topic/a', payload:'17'},
  {topic:'root/topic/b', payload:'{"c":"foo","d":"bar"}'},
  {topic:'root/topic/b/c', payload:'foo'},
  {topic:'root/topic/b/d', payload:'bar'},
]
```
<a name="module_utils.create_limited_frequency_proxy_transform"></a>

### utils.create\_limited\_frequency\_proxy\_transform ⇒ <code>function</code>
Creates and returns a proxy "transform" function that limits the frequency of MQTT messages for advertisements of the same peripheral

It's usually neither required nor reasonable to post MQTT message(s) for absolutely every advertisement received from a specific peripheral, as some peripherals might send dozens of advertisement packets per second. Therefor, it usually makes sense to limit the frequency with which advertisements for each devices will be published.

**Kind**: static property of [<code>utils</code>](#module_utils)  
**Returns**: <code>function</code> - A proxy transform function that only calls transform every interval_seconds for each peripheral  

| Param | Type | Description |
| --- | --- | --- |
| interval_seconds | <code>number</code> | The minimum time between two sending MQTT messages for advertisements of the same peripheral |
| transform | <code>function</code> | The actual transform function that shall only be called every interval_seconds for each peripheral |

**Example**  
```js
utils.create_limited_frequency_proxy_transform(10, (advertisement) => ({topic:'blead2mqtt/advertisements', payload:advertisement}))
// Returns a proxy "transform" function will publish received advertisements to topic 'blead2mqtt/advertisements', but with at least 10 seconds between advertisements for the same peripheral
```
<a name="module_utils.parse_known_data"></a>

### utils.parse\_known\_data ⇒ <code>Object</code> \| <code>null</code>
Parses known additional data of an advertisement.
Right now, the Xiaomi Bluetooth Thermometer/Hydrometer MJ_HT_V1 is the only supported device.

**Kind**: static property of [<code>utils</code>](#module_utils)  
**Returns**: <code>Object</code> \| <code>null</code> - The parsed known data of the advertisement, or null if the advertisement contains no known additional data  

| Param | Type | Description |
| --- | --- | --- |
| advertisement | <code>Object</code> | The advertisement to parse the known data for |

**Example**  
```js
utils.parse_known_data({name:'MJ_HT_V1', service_data:{'0000FE95-0000-1000-8000-00805F9B34FB':[80,32,170,1,200,12,13,14,15,16,17,13,16,4,182,0,5,1]}})
// returns
{temperature:18.2, humidity:26.1}
```
