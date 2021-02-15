/**
 * This module exports BLE-related expressions.
 * @module ./ble.mjs
 */

import noble from '@abandonware/noble';

import configuration from './merged_configuration.mjs';

import {canonicalize_bluetooth_uuid_default_case, create_timestamp, format_octets_hex_string, is_not_absent, jsonify_value, time_limit_promise} from './utilities.mjs';

const convert_noble_peripheral_to_advertisement = ((noble_peripheral) =>
	({
		address: format_octets_hex_string(noble_peripheral.address, ':'),
		address_type: noble_peripheral.addressType,
		connectable: jsonify_value(noble_peripheral.connectable),
		manufacturer_data: jsonify_value(noble_peripheral.advertisement.manufacturerData, ((buffer) => [...buffer])),
		name: jsonify_value(noble_peripheral.advertisement.localName),
		rssi: jsonify_value(noble_peripheral.rssi),
		service_data: Object.fromEntries(noble_peripheral.advertisement.serviceData.map(({uuid, data}) =>
			[canonicalize_bluetooth_uuid_default_case(uuid), [...data]]
		)),
		service_uuids: noble_peripheral.advertisement.serviceUuids.map(canonicalize_bluetooth_uuid_default_case),
		solicitation_service_uuids: noble_peripheral.advertisement.solicitationServiceUuids.map(canonicalize_bluetooth_uuid_default_case),
		timestamp: create_timestamp(),
		tx_power_level: jsonify_value(noble_peripheral.advertisement.txPowerLevel),
	})
);

const ensure_noble_is_ready = ((
	timeout=configuration.ble.ready_timeout,
) => 
	(is_noble_ready()
		? Promise.resolve()
		: time_limit_promise(
			(new Promise((resolve, reject) => {
				const resolve_if_noble_is_ready = (() => {
					try {
						if (is_noble_ready()) {
							noble.off('stateChange', resolve_if_noble_is_ready);
							resolve();
						}
					} catch(error) {
						reject(error);
					}
				});
				noble.on('stateChange', resolve_if_noble_is_ready);
			})),
			timeout,
			`BLE not ready within ${timeout} seconds`,
		)
	)
);

const is_noble_ready = (() => {
	try {
		switch(noble.state) {
			case 'poweredOn':
				return true;
			case 'unknown':
				return false;
			case 'unauthorized':
				throw (new Error('Insufficient permissions (See https://github.com/abandonware/noble#running-without-rootsudo-linux-specific)'));
			case 'poweredOff':
			case 'resetting':
			case 'unsupported':
			default:
				throw (new Error(`Unexpected noble state "${noble.state}"`));
		}
	} catch(error) {
		if (error.code === 'ENODEV') {
			throw (new Error('No suitable Bluetooth adapter found'));
		}
		throw error;
	}
});

export const scan_for_ble_advertisements = (async function*() {
	for await (const noble_peripheral of scan_for_noble_peripherals()) {
		yield convert_noble_peripheral_to_advertisement(noble_peripheral);
	}
});

// TODO this function is dirty and possibly buggy right now
const scan_for_noble_peripherals = (async function*(
	scan_time=configuration.scan_time,
) {
	let noble_peripheral_callback = null;
	const get_next_noble_peripheral = (() =>
		(new Promise((resolve, reject) => {
			noble_peripheral_callback = ((noble_peripheral) => {
				noble_peripheral_callback = null;
				resolve(noble_peripheral);
			});
		}))
	);
	const on_noble_peripheral_discovered = (async (noble_peripheral) => {
		if (noble_peripheral_callback) {
			noble_peripheral_callback(noble_peripheral);
		}
	});
	await ensure_noble_is_ready();
	await noble.startScanningAsync([], true);
	const timeout_symbol = Symbol('timeout');
	try {
		noble.on('discover', on_noble_peripheral_discovered);
		const scan_start_timestamp = create_timestamp();
		while(true) {
			yield (await time_limit_promise(
				get_next_noble_peripheral(),
				((scan_time === null)
					? null
					: (((scan_start_timestamp - create_timestamp()) / 1000) + scan_time)
				),
				timeout_symbol,
			));
		}
	} catch(error) {
		if (error !== timeout_symbol) {
			throw(error);
		}
	} finally {
		noble.off('discover', on_noble_peripheral_discovered);
		await noble.stopScanningAsync();
	}
});
