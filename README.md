# blead2mqtt

A command-line tool that scans for BLE (Bluetooth Low Energy) advertisements and publishes them as (fully customizable) MQTT messages.

This can for example be used for...

  - presence detection: If there's an advertising Bluetooth LE peripheral you always take with you when leaving your home (like a smartwatch or a key fob), the information if that peripheral is in range could be used by a smart home system, for example to turn the radiators off when you leave your home
  - collecting information from certain Bluetooth LE peripherals: The Xiaomi thermometer/hydrometer MJ_HT_V1 for example publishes the temperature and humidity as part of its advertising packets, so blead2mqtt can be used to collect that information from all such devices nearby and publish it to your MQTT broker

## BLE advertisements? What's that?

BLE peripherals that one can connect to periodically send small information packets (called advertisements) to inform others about their presence. BLE devices that want to connect to such BLE peripherals scan for these packets (similar to how you can scan for nearby WiFi networks).
Apart from providing the required information to connect to these BLE peripherals (their unique address etc.), their advertisement packets may also contain further information - like their name, a list of services they provide, or the current temperature/humidity in case of the Xiaomi sensor mentioned above.

## Requirements

  - Node.js (version 14 or later)
  - All [prerequisites of the noble library](https://github.com/abandonware/noble#prerequisites) (that blead2mqtt uses for BLE communication)

Furthermore, you of course need Bluetooth LE-capable hardware (like a Bluetooth 4 USB adapter or the Bluetooth hardware built into newer Raspberry Pis) and access to a MQTT broker.

## Installation

To install blead2mqtt, install the `blead2mqtt` Node.js package, for example via the `npm` package manager.
There are two ways to install it:

### Global installation

Global installation of npm packages is meant for standalone command-line tools that shall be available on the `PATH`.

```sh
npm install --global blead2mqtt
```

On Linux systems, installing the blead2mqtt packages globally usually requires root permissions as well as using the `--unsafe-perm` flag, so the install command will rather be something like this:
```sh
sudo npm install --global --unsafe-perm blead2mqtt
```

### Local installation

Local installation installes npm packages right in the current working directory. When installing locally, the `blead2mqtt` command-line tool will not instantly be available on your `PATH`.

```sh
npm install blead2mqtt
```

In case of a local installation, the above command works for Linux systems as well.

### Setting up permissions on Linux systems

On Linux systems, if you want to run `blead2mqtt` as a normal user, you need to run the following command after installing blead2mqtt:

```sh
sudo setcap cap_net_raw+eip $(eval readlink -f `which node`)
```

See [here](https://github.com/abandonware/noble#running-without-rootsudo-linux-specific). You will probably need to run this command whenever you upgrade/reinstall Node.js.

## Usage

When blead2mqtt is executed, it automatically starts scanning for BLE advertisements and publishes received advertisements to the specified MQTT broker. If your MQTT broker does not require authentication, passing the IP address of your MQTT broker to the `blead2mqtt` command is probably sufficient for a first test:
```sh
blead2mqtt --host <IP address of your MQTT broker>
```

To see the received advertisements, subscribe to MQTT topic `blead2mqtt/advertisements`, for example with the `mosquitto_sub` tool if you have that installed:
```sh
mosquitto_sub --host <IP address of your MQTT broker> --topic blead2mqtt/advertisements --verbose
```

The structure and topic of these messages is not fixed, but can be fully customized.

## Configuration

To configure/customize blead2mqtt, start by creating a copy of file `default_configuration.mjs` (in the directory where blead2mqtt was installed to) named `configuration.mjs` in the same directory. This is the configuration file you should edit - do not alter the `default_configuration.mjs` file, as changes to this file will be overwritten by program upgrades.

The actual configuration being used is obtained by merging the configurations stored in `configuration.mjs` and `default_configuration.mjs`, with settings specified in `configuration.mjs` overriding their default values in file `configuration.mjs`. So you only need to specify those settings in `configuration.mjs` where the default value is wrong, all other settings can be removed or commented out.

A simple custom `configuration.mjs` that uses all defaults except for the MQTT broker hostname might look like this:
```js
export default {
  mqtt: {
    host: '192.168.0.9',
  },
};
```

### Customizing the MQTT messages

Customizing the MQTT messages being published requires basic JavaScript programming skills, as you need to change the JavaScript code that converts a BLE advertisement into one or more MQTT messages.

Customization of the MQTT messages is done by changing the `create_transform_function` setting in the `configuration.mjs` file. The value of this setting must be a JavaScript function that...

  - is being called once at startup with (utils, configuration) arguments and
  - must return the actual `transform` function that...
    - will be called for every received BLE advertisement with (advertisement) arguments, and
    - must return zero or more MQTT messages to be published for this particular advertisement

The `advertisement` parameter that your `transform` function will be called with for every advertisement is a Javascript object similar to this:
```js
{
  "address": "12:34:56:78:9A:BC", // The peripheral's Bluetooth (MAC) address
  "address_type": "public", // The address type, either "public" or "random"
  "connectable": false, // True if the device is connectable, false otherwise
  "manufacturer_data": [234, 17, 2, 4], // An array of uint8 values, or null if no manufacturer data is present
  "name": "LYWSD03MMC", // The name of the peripheral, or null if not known
  "rssi": -74, // The RSSI / signal strength
  "service_data": { // An object with canonical service UUIDs as keys and arrays of uint8 values (=the data of that service) as values
    "0000FE95-0000-1000-8000-00805F9B34FB": [48,88,91,5,1,188,154,120,86,52,18,40,1,0]
  },
  "service_uuids": [ // An array of canonical service UUIDs that the peripheral advertises
		"0000FE95-0000-1000-8000-00805F9B34FB",
		"00001234-0000-1000-8000-00805F9B34FB",
  ],
  "solicitation_service_uuids":[ // An array of canonical solicitation service UUIDs (hardly ever used)
		"00002345-0000-1000-8000-00805F9B34FB",
		"00005678-0000-1000-8000-00805F9B34FB",
  ],
  "timestamp": 1613388810338, // Timestamp when the advertisement was received, in milliseconds since the epoch
  "tx_power_level": null, // The TX power level, as an integer, but usually this will be null
}
```

For each MQTT message that shall be published when an advertisement was received, the `transform` function must return an object with `topic` and `payload` properties (and optional `qos` and `retain` properties), for example:

```js
{topic:"blead2mqtt/scanned_peripheral_address", payload:"12:45:56:78:9A:BC"}
{topic:"blead2mqtt/last_advertisement_timestamp", payload:123456789, retain:true}
]
```

The default behaviour is defined by the `create_transform_function` setting in the `default_configuration.mjs` file, so you might want to take that function as a starting point.

#### Utility functions

The `utils` argument passed to the `create_transform_function` function provides access to a number of utility functions that can be used by your "transform" function. [See here for more information on these functions](utils.md).
