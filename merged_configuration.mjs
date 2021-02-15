/**
 * This module exports the merged configuration.
 * @module ./merged_configuration.mjs
 */

import {deep_merge_objects} from './utilities.mjs';

const import_configuration_from_module = (async (configuration_module_name, return_empty_if_not_found=false) => {
	try {
		return ((await import(configuration_module_name)).default);
	} catch(error) {
		if ((error.code === 'ERR_MODULE_NOT_FOUND') && return_empty_if_not_found) {
			return {};
		}
		throw (new Error(`Error importing configuration module "${configuration_module_name}": ${error.message}`));
	}
});

export default deep_merge_objects(
	(await import_configuration_from_module('./default_configuration.mjs')),
	(await import_configuration_from_module('./configuration.mjs', true)),
);
