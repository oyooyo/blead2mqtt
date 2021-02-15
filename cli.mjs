#!/usr/bin/env node

/**
 * This module implements the command-line interface.
 * @module ./cli.mjs
 */

import {scan_for_ble_advertisements} from './ble.mjs';

import configuration from './merged_configuration.mjs';

import {create_publish_mqtt_message_function} from './mqtt.mjs';

import {is_array, is_true_object} from './utilities.mjs';

import transform_utils from './utils.mjs';

(async () => {
	try {
		const publish_mqtt_message = (await create_publish_mqtt_message_function(configuration.mqtt));
		const transform = (await configuration.create_transform_function(transform_utils, configuration.transform_parameters));
		for await (const ble_advertisement of scan_for_ble_advertisements()) {
			let mqtt_messages = transform(ble_advertisement);
			if (is_true_object(mqtt_messages)) {
				// A single MQTT message was returned - wrap it in an array
				mqtt_messages = [mqtt_messages];
			}
			if (is_array(mqtt_messages)) {
				for (const mqtt_message of mqtt_messages) {
					await publish_mqtt_message(mqtt_message);
				}
			}
		}
		process.exit(0);
	} catch(error) {
		//console.error(error);
		console.error(`Error: ${error.message}`);
		process.exit(1);
	}
})();
