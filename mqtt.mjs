/**
 * This module exports MQTT-related expressions.
 * @module ./mqtt.mjs
 */

import mqtt from 'async-mqtt';

import configuration from './merged_configuration.mjs';

import {assert, time_limit_promise, is_not_absent} from './utilities.mjs';

export const create_publish_mqtt_message_function = (async ({
	client_id=configuration.mqtt.client_id,
	connect_timeout=configuration.mqtt.connect_timeout,
	default_qos=configuration.mqtt.default_qos,
	default_retain=configuration.mqtt.default_retain,
	host=configuration.mqtt.host,
	keepalive=configuration.mqtt.keepalive,
	password=configuration.mqtt.password,
	port=configuration.mqtt.port,
	status_offline_payload=configuration.mqtt.status_offline_payload,
	status_online_payload=configuration.mqtt.status_online_payload,
	status_qos=configuration.mqtt.status_qos,
	status_retain=configuration.mqtt.status_retain,
	status_topic=configuration.mqtt.status_topic,
	username=configuration.mqtt.username,
}={}) => {
	const connect_options = {
		clientId: client_id,
		keepalive: keepalive,
		password: password,
		servers: [{
			host: host,
			port: port,
		}],
		username: username,
	};
	if (is_not_absent(status_topic) && is_not_absent(status_offline_payload)) {
		connect_options.will = {
			payload: status_offline_payload,
			qos: status_qos,
			retain: status_retain,
			topic: status_topic,
		};
	}
	const mqtt_client = mqtt.connect(connect_options);
	await ensure_mqtt_client_is_connected(mqtt_client, connect_timeout);
	if (is_not_absent(status_topic) && is_not_absent(status_online_payload)) {
		await mqtt_client.publish(status_topic, status_online_payload, {
			qos: status_qos,
			retain: status_retain,
		});
	}
	return (async ({topic, payload, retain=default_retain, qos=default_qos}) => {
		assert(is_not_absent(topic), 'No topic specified');
		if (typeof(payload) !== 'string') {
			payload = JSON.stringify(payload);
		}
		await mqtt_client.publish(topic, payload, {
			qos: qos,
			retain: retain,
		});
	});
});

const ensure_mqtt_client_is_connected = ((
	mqtt_client,
	timeout=configuration.mqtt.connect_timeout,
) => 
	(mqtt_client.connected
		? Promise.resolve()
		: time_limit_promise(
			(new Promise((resolve, reject) => {
				mqtt_client.once('connect', resolve);
				mqtt_client.once('error', reject);
			})),
			timeout,
			`Unable to connect to MQTT broker within ${timeout} seconds (Wrong IP address or port number?)`,
		)
	)
);
