# Open Door
Open the door of the Commons Hub Brussels via a discord bot.

Join the #door channel on discord.commonshub.brussels to open the door (you have to be a member).
You can use the `/open` command or just say "open" in that channel.

## How does it work?
The ESP32 is directly connected to the parlophone. It checks every 3s an API endpoint that returns 200 status code when the door should open.

## Installation

### Set up the ESP32

Rename `credentials.example.py` to `credentials.py` and change the wifi settings (SSID and password).

Install dependencies:

```
pip install esptool==4.8.1
pip install adafruit-ampy
```

Flash the ESP32:

```
python3 esp32/flash.py /dev/tty.usbmodem101
```

Replace `/dev/tty.usdmodem101` by the right port for your machine (`ls /dev/tty.*`).

Then upload the scripts:

```bash
$> python esp32/install.py /dev/tty.usbmodem101
```

and start the ESP32:

```bash
$> ampy run main.py --port /dev/tty.usbmodem101
```

### Run the server and discord bot

Rename `.env.example` to `.env` and change the environment variables `DISCORD_BOT_TOKEN` (you can get one in the developer portal of discord), `DISCORD_CHANNEL_ID` and `SECRET`.

Make sure you have `applications.commands` and `bot` in scopes and `Manage messages` and `Send messages` in permissions.

Then run

```bash
$> npm install
$> npm start
```

To open the door:

```bash
$> curl http://localhost:3000/open?secret=YOURSECRET
```

Or from the discord channel (make sure the bot has been installed and its role has been added to the permission of the channel), type `open` or use the `/open` command.

To check the log of openings:

```
http://localhost:3000/log
```

You can also check the status of each device connected to the server via `/status`

```
http://localhost:3000/status
```

## TODO

- [ ] Read the history of the discord channel as the server may sometime restart (e.g. on Vercel) to repopulate the log of the day
- [ ] Create a Citizen Wallet plugin to allow people with a certain balance of Commons Hub Tokens to open the door.

## Contributors

- Nicolas ([@nicolasdb](https://github.com/nicolasdb))
- Xavier ([@xdamman](https://github.com/xdamman))
- Kevin ([@kevtechi](https://github.com/kevtechi))
