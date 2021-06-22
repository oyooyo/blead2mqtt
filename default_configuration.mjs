/**
 * This module exports the default configuration.
 * 
 * DO NOT CHANGE THIS FILE!
 * Instead, to create a customized configuration, save a copy of this file
 * as "configuration.mjs" to the same directory and alter that file.
 * The actual configuration being used will be obtained by merging this file
 * with the optional file "configuration.mjs", with each parameter
 * specified in "configuration.mjs" overriding the same parameter in
 * "default_configuration.mjs". So the "configuration.mjs" file only
 * needs to specify those settings whose values differ from the default
 * value specified in "default_configuration.mjs".
 * 
 * @module ./default_configuration.mjs
 */

// The "base topic". This constant isn't necessarily, it's just defined here because it appears in two different places in the rest of configuration
const BASE_TOPIC = 'blead2mqtt';

export default {
	// BLE-related settings
	ble: {
		// How many seconds to wait for BLE to become available
		ready_timeout: 5,
	},
	// How many seconds to scan for BLE advertisements, or null to scan forever
	scan_time: 15,
	// MQTT-related settings
	mqtt: {
		// The "client ID" to use for connecting to the MQTT broker
		client_id: 'blead2mqtt',
		// How many seconds to wait for connecting to the MQTT broker before giving up
		connect_timeout: 5,
		// The default QOS level with which MQTT messages will be sent
		default_qos: 2,
		// The default value to use for the "retain" flag for sending MQTT messages, if no qos value is specified
		default_retain: false,
		// The hostname/IP address of the MQTT broker. This is the most important setting that needs to be changed
		host: '127.0.0.1',
		// The keepalive value to use for the MQTT connection, in seconds
		keepalive: 60,
		// The password to use for connecting to the MQTT broker, or null if authentication is not required
		password: null,
		// The port number of the MQTT broker
		port: 1883,
		// The payload to publish to the "status topic" when the MQTT client goes offline, or null to not send a message when that happens (the so-called last will message)
		status_offline_payload: 'offline',
		// The payload to publish to the "status topic" when the MQTT client is connected, or null to not send a message when that happens
		status_online_payload: 'online',
		// The QOS level to use for sending status messages
		status_qos: 2,
		// The value to use for the "retain" flag for sending status messages
		status_retain: true,
		// The topic to use for sending status (=online/offline) messages, or null to not send status messages
		status_topic: `${BASE_TOPIC}/status`,
		// The username to use for connecting to the MQTT broker, or null if authentication is not required
		username: null,
	},
	// Additional parameters/settings that will be passed as second argument to the "create_transform_function" function
	// What to do with these parameters/settings is completely up to the "create_transform_function"/"transform" functions
	// You can specify any paramters/settings you like, or you could just leave this empty and use hardcoded values
	transform_parameters: {
		// The "base topic", usually the root topic of all published MQTT messages
		base_topic: BASE_TOPIC,
		// The minimum interval between posting MQTT messages for a specific peripheral
		interval: 60,
	},
	// This defines what MQTT messages will be published and what structure they have
	create_transform_function: (utils, parameters) => {
		return utils.create_limited_frequency_proxy_transform(parameters.interval, (advertisement) => {
			const {address, ...other} = advertisement;
			const known_data = utils.parse_known_data(advertisement);
			const data = {
				...other,
				known_data: known_data,
			};
			return [
				{
					topic: `${parameters.base_topic}/advertisements`,
					payload: {
						address: address,
						...data,
					},
					retain: false,
				},
				...utils.create_hierarchical_messages(`${parameters.base_topic}/peripherals/${address}`, data, false),
			];
		});
	},
};
