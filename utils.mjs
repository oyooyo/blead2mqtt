/**
 * The utility functions that can be used by the "transform" function.
 * @module utils
 */

// TODO
// Shorten Bluetooth UUIDs

import {
	BLUETOOTH_BASE_UUID_SUFFIX,
	canonicalize_bluetooth_uuid_default_case,
	convert_octets_hex_string_to_octets_array,
	create_timestamp,
	format_octets_hex_string,
	is_true_object,
	jsonify_value,
} from './utilities.mjs';

const add_hierarchical_messages = ((messages, root_topic, value, leafs_only=true, retain, qos) => {
	const value_is_true_object = is_true_object(value);
	if (! (value_is_true_object && leafs_only)) {
		messages.push({
			topic: root_topic,
			payload: value,
			qos: qos,
			retain: retain,
		});
	}
	if (value_is_true_object) {
		for (const [property_key, property_value] of Object.entries(value)) {
			add_hierarchical_messages(messages, `${root_topic}/${property_key}`, property_value, leafs_only, retain, qos);
		}
	}
	return messages;
});

const create_hierarchical_messages = ((root_topic, value, leafs_only, retain, qos) =>
	add_hierarchical_messages([], root_topic, value, leafs_only, retain, qos)
);

const create_limited_frequency_proxy_transform = (interval_seconds, transform) => {
	const last_timestamps = {};
	return ((advertisement) => {
		const timestamp = create_timestamp();
		const key = advertisement.address;
		if ((! last_timestamps.hasOwnProperty(key)) || (timestamp >= (last_timestamps[key] + (interval_seconds * 1000)))) {
			last_timestamps[key] = timestamp;
			return transform(advertisement);
		}
	});
}

const parse_known_data = ((advertisement) => ({
	...parse_mj_ht_v1_advertisement(advertisement),
}));

const parse_mj_ht_v1_decimal_value = ((v0, v1) =>
	((((v1 << 8) + v0) - ((v1 < 128) ? 0 : 65536))/ 10)
);

const parse_mj_ht_v1_service_fe95_data = (data) => {
	switch(data[11]) {
		case 4:
			return {
				temperature: parse_mj_ht_v1_decimal_value(data[14], data[15]),
			};
		case 6:
			return {
				humidity: parse_mj_ht_v1_decimal_value(data[14], data[15]),
			};
		case 10:
			return {
				battery: data[14],
			};
		case 13:
			return {
				temperature: parse_mj_ht_v1_decimal_value(data[14], data[15]),
				humidity: parse_mj_ht_v1_decimal_value(data[16], data[17]),
			};
		default:
			throw (new Error('Invalid type'));
	}
};

const parse_mj_ht_v1_advertisement = ((advertisement) =>
	((advertisement.name === 'MJ_HT_V1')
		? parse_mj_ht_v1_service_fe95_data(advertisement.service_data['0000FE95-0000-1000-8000-00805F9B34FB'])
		: null
	)
);

export default {
	/**
	 * Canonicalize a "Bluetooth UUID", by converting it to a full UUID string like "0000FE95-0000-1000-8000-00805F9B34FB"
	 * @param {(string|number)} bluetooth_uuid - The "Bluetooth UUID" to canonicalize. This may either be:
	 * <ul>
	 *   <li>An unsigned 32 bit integer number, for example 0xFE95 or 65173</li>
	 *   <li>A string that contains 1-8 hexadecimal characters, that will be interpreted as a hexadecimal representation of an unsigned 32 bit integer number, for example "FE95"</li>
	 *   <li>A string that contains exactly 32 hexadecimal characters, that will be interpreted as a 128 bit UUID string, for example "0000FE9500001000800000805F9B34FB"</li>
	 * </ul>
	 * @returns {string} The associated canonical UUID string, for example "0000FE95-0000-1000-8000-00805F9B34FB"
	 * @example
	 * utils.canonicalize_bluetooth_uuid(65173)
	 * utils.canonicalize_bluetooth_uuid(0xFE95)
	 * utils.canonicalize_bluetooth_uuid("fe95")
	 * utils.canonicalize_bluetooth_uuid("0000FE9500001000800000805F9B34FB")
	 * // The above examples will all return the same result:
	 * "0000FE95-0000-1000-8000-00805F9B34FB"
	 */
	canonicalize_bluetooth_uuid: canonicalize_bluetooth_uuid_default_case,
	/**
	 * Convert an "octets hex string" (a string with an even number of hexadecimal characters) to an "octets array" (an array with unsigned integer values in range 0-255)
	 * @param {string} octets_hex_string - The "octets hex string" to convert
	 * @returns {number[]} the converted "octets array", an array with unsigned integer values in range 0-255
	 * @example
	 * utils.convert_octets_hex_string_to_octets_array('fe9c23')
	 * // returns
	 * [254, 156, 35]
	 */
	convert_octets_hex_string_to_octets_array: convert_octets_hex_string_to_octets_array,
	/**
	 * Convert to an "octets hex string" (a string with an even number of hexadecimal characters).
	 * @param {(string|number[])} octets - Either an array with unsigned integer values in range 0-255 or a hexadecimal string with an equal number of hexadecimal characters
	 * @param {string} [octet_separator=''] - the separator string that will be between all octets of the formatted string
	 * @param {boolean} [upper_case=true] - if true, the formatted string will be all upper-case, if false, it will be all lower-case
	 * @return {string} the formatted hexadecimal string
	 * @example <caption>Format a MAC address, with colon between each octet, lower-case</caption>
	 * utils.format_octet_hex_string('123456789abc', ':', false)
	 * // returns
	 * "12:34:56:78:9a:bc"
	 * @example <caption>Convert a octet array to a short, upper-case hex string</caption>
	 * utils.format_octet_hex_string([123, 201, 243, 17, 9])
	 * // returns
	 * "7BC9F31109"
	 */
	convert_to_formatted_octet_hex_string: format_octets_hex_string,
	/**
	 * Converts a JSON object into a number of MQTT messages, with the hierarchical structure of the JSON object being mapped to the MQTT topic hierarchy. Useful if 
	 * @param {string} root_topic - The "root" MQTT topic, for example "blead2mqtt/peripheral/12:34:56:78:9A:BC"
	 * @param {Object} value - The JSON object to convert into MQTT messages
	 * @param {boolean} [leafs_only=true] - If true, only "leaf" values (=values that are not true objects) will be converted into MQTT messages
	 * @param {boolean} [retain] - If true/false, the created MQTT messages will be sent as retained/unretained messages. If not specified, this will default to the configuration value mqtt.default_retain
	 * @param {number} [qos] - The QOS level for the created MQTT messages. If not specified, this will default to the configuration value mqtt.default_qos
	 * @return {Object[]} An array of MQTT messages
	 * @example <caption>Example with leafs_only=true</caption>
	 * utils.create_hierarchical_messages('root/topic', {a:17, b:{c:"foo", d:"bar"}}, true)
	 * // returns
	 * [
	 *   {topic:'root/topic/a', payload:'17'},
	 *   {topic:'root/topic/b/c', payload:'foo'},
	 *   {topic:'root/topic/b/d', payload:'bar'},
	 * ]
	 * @example <caption>Same example with leafs_only=false</caption>
	 * utils.create_hierarchical_messages('root/topic', {a:17, b:{c:"foo", d:"bar"}}, false)
	 * // returns
	 * [
	 *   {topic:'root/topic', payload:'{"a":17,"b":{"c":"foo","d":"bar"}}'},
	 *   {topic:'root/topic/a', payload:'17'},
	 *   {topic:'root/topic/b', payload:'{"c":"foo","d":"bar"}'},
	 *   {topic:'root/topic/b/c', payload:'foo'},
	 *   {topic:'root/topic/b/d', payload:'bar'},
	 * ]
	 */
	create_hierarchical_messages: create_hierarchical_messages,
	/**
	 * Creates and returns a proxy "transform" function that limits the frequency of MQTT messages for advertisements of the same peripheral
	 * 
	 * It's usually neither required nor reasonable to post MQTT message(s) for absolutely every advertisement received from a specific peripheral, as some peripherals might send dozens of advertisement packets per second. Therefor, it usually makes sense to limit the frequency with which advertisements for each devices will be published.
	 * @param {number} interval_seconds - The minimum time between two sending MQTT messages for advertisements of the same peripheral
	 * @param {function} transform - The actual transform function that shall only be called every interval_seconds for each peripheral
	 * @returns {function} A proxy transform function that only calls transform every interval_seconds for each peripheral
	 * @example
	 * utils.create_limited_frequency_proxy_transform(10, (advertisement) => ({topic:'blead2mqtt/advertisements', payload:advertisement}))
	 * // Returns a proxy "transform" function will publish received advertisements to topic 'blead2mqtt/advertisements', but with at least 10 seconds between advertisements for the same peripheral
	 */
	create_limited_frequency_proxy_transform: create_limited_frequency_proxy_transform,
	/**
	 * Parses known additional data of an advertisement.
	 * Right now, the Xiaomi Bluetooth Thermometer/Hydrometer MJ_HT_V1 is the only supported device.
	 * @param {Object} advertisement - The advertisement to parse the known data for
	 * @return {(Object|null)} The parsed known data of the advertisement, or null if the advertisement contains no known additional data
	 * @example
	 * utils.parse_known_data({name:'MJ_HT_V1', service_data:{'0000FE95-0000-1000-8000-00805F9B34FB':[80,32,170,1,200,12,13,14,15,16,17,13,16,4,182,0,5,1]}})
	 * // returns
	 * {temperature:18.2, humidity:26.1}
	 */
	parse_known_data: parse_known_data,
};
