/**
 * This module exports basic utility expressions required by other modules.
 * @module ./utilities.mjs
 */

export const assert = ((condition, error='Assertion failed') => {
	if (! condition) {
		throw ((typeof(error) === 'string')
			? (new Error(error))
			: error
		);
	}
});

export const BLUETOOTH_BASE_UUID_SUFFIX = '-0000-1000-8000-00805F9B34FB';

const canonicalize_bluetooth_uuid = ((bluetooth_uuid, upper_case) => {
	if (typeof(bluetooth_uuid) === 'number') {
		bluetooth_uuid = bluetooth_uuid.toString(16);
	}
	bluetooth_uuid = strip_hex_string(bluetooth_uuid);
	if (bluetooth_uuid.length < 8) {
		bluetooth_uuid = `0000000${bluetooth_uuid}`.slice(-8);
	}
	if (bluetooth_uuid.length === 8) {
		bluetooth_uuid += BLUETOOTH_BASE_UUID_SUFFIX;
	}
	return canonicalize_uuid_string(bluetooth_uuid, upper_case);
});

export const canonicalize_bluetooth_uuid_default_case = ((bluetooth_uuid) =>
	canonicalize_bluetooth_uuid(bluetooth_uuid)
);

const canonicalize_hex_string = ((hex_string, upper_case) =>
	set_case(strip_hex_string(hex_string), upper_case)
);

const canonicalize_uuid_string = ((uuid, upper_case) => {
	const hex = canonicalize_hex_string(uuid, upper_case);
	assert((hex.length === 32), `Invalid UUID, must be a string with exactly 32 hexadecimal characters`);
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
});

const convert_octets_array_to_octets_hex_string = ((octets_array) =>
	octets_array.map((octet) => `0${octet.toString(16)}`.slice(-2)).join('')
);

export const convert_octets_hex_string_to_octets_array = ((octets_hex_string) =>
	split_into_chunks(strip_hex_string(octets_hex_string), 2).map((octet_hex_string) => parseInt(octet_hex_string, 16))
);

const convert_to_error = ((error) =>
	((typeof(error) === 'string')
		? (new Error(error))
		: error
	)
);

export const create_timestamp = (() =>
	Date.now()
);

export const deep_merge_objects = ((...objects) => {
	const merged = {};
	for (const object of objects) {
		for (const key of Object.keys(object)) {
			merged[key] = ((is_true_object(merged[key]) && is_true_object(object[key]))
				? deep_merge_objects(merged[key], object[key])
				: object[key]
			);
		}
	}
	return merged;
});

export const format_octets_hex_string = ((octets, octet_separator='', upper_case) =>
	split_into_chunks(canonicalize_hex_string(
		((typeof(octets) === 'string')
			? octets
			: convert_octets_array_to_octets_hex_string(octets)
		),
		upper_case,
	), 2).join(octet_separator)
);

const is_absent = ((value) =>
	((value === null) || (value === undefined) || (value !== value))
);

export const is_array = ((value) =>
	Array.isArray(value)
);

export const is_not_absent = ((value) =>
	(! is_absent(value))
);

export const is_true_object = ((value) =>
  (value && (typeof(value) === 'object') && (! is_array(value)))
);

export const jsonify_value = ((value, convert_function) =>
	(is_not_absent(value)
		? (convert_function
			? convert_function(value)
			: value
		)
		: null
	)
);

const set_case = ((string, upper_case=true) =>
	string[upper_case ? 'toUpperCase' : 'toLowerCase']()
);

const split_into_chunks = ((sliceable, chunk_length) =>
	Array.from({length:Math.ceil(sliceable.length / chunk_length)}, (_, chunk_index) =>
		sliceable.slice((chunk_length * chunk_index), (chunk_length * (chunk_index + 1)))
	)
);

const strip_hex_string = ((hex_string) =>
	hex_string.replace(/[^0-9A-Fa-f]/g, '')
);

export const time_limit_promise = ((promise, timeout_seconds, error=`Promise did not resolve within ${timeout_seconds} seconds`) => {
	if (typeof(timeout_seconds) === 'number') {
		return ((timeout_seconds > 0)
			? (new Promise((resolve, reject) => {
					const timeout_id = setTimeout(() => {
						reject(convert_to_error(error));
					}, Math.ceil(timeout_seconds * 1000));
					Promise.resolve(promise)
					.then(resolve)
					.catch(reject)
					.finally(() => {
						clearTimeout(timeout_id);
					});
				}))
			: Promise.reject(convert_to_error(error))
		)
	} else if (timeout_seconds === null) {
		return promise;
	} else {
		throw (new Error('timeout_seconds must either be null or a number'));
	}
});
