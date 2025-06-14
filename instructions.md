# Instructions

This repo is designed to work across all operating systems and be accessible to non-technical users.
However, given the advanced nature of the underlying technology, setup and usage may require some effort and patience—grab a cup of coffee and settle in.

## Installation

1. Install [git](https://git-scm.com/downloads).

2. Install [VS Code](https://code.visualstudio.com/).

3. Install [Cline](https://cline.bot/):
    - Open VS Code
    - Click Extensions from the sidebar
    - Type "cline"
    - Click Install
    - Click the Cline icon that appears on the sidebar
    - Select an API provider and enter your API key

    If you are not a paid subscriber to any of these API providers:
      - Create an [OpenRouter](https://openrouter.ai/) account
      - Create an API key
      - Configure Cline to use [`deepseek/deepseek-chat-v3-0324:free`](https://openrouter.ai/deepseek/deepseek-chat-v3-0324:free)

4. Install [Docker](https://docs.docker.com/engine/install/).

5. Clone this repository and navigate into it.
One way to do this is:
    - Open VS Code
    - Click File → Close Folder (ignore this step if you cannot see Close Folder)
    - Click Source Control from the sidebar
    - Click Clone Repository
    - Copy and paste `https://github.com/hinter-net/hinter-core.git`
    - Choose a destination
    - Agree to open the cloned repository
    - Click View → Terminal
    
> [!TIP]
> All Docker commands are designed to be run inside this repository.

6. (OPTIONAL) The technically inclined may choose to build the Docker image locally.

7. Create a `.env` file that contains your [keypair](#keypair) using:
    ```sh
    docker run -it --rm -v /app/node_modules -v "$(pwd)":/app bbenligiray/hinter-core:latest npm run generate-keys
    ```

8. Start `hinter-core` using:
    ```sh
    docker run -it --rm --network host -v "$(pwd)/data/peers":/app/data/peers -v "$(pwd)/.env":/app/.env -v "$(pwd)/.storage":/app/.storage bbenligiray/hinter-core:latest
    ```

> [!TIP]
> Retry the final Docker command until you see the `hinter-core` ASCII art (related to [this issue](https://github.com/bbenligiray/hinter-core/issues/5)).

If the second Docker command prints the following, you can consider the installation complete and stop the container (for example, by closing the terminal):

```
Parsing key pair...
Parsed key pair!
Parsing peers...
Parsed 2 peers!
Preparing to connect...
Ready to connect!
alice initial incoming: {"files":0,"add":0,"remove":2,"change":0}
bob initial incoming: {"files":0,"add":0,"remove":2,"change":0}
alice initial outgoing: {"files":2,"add":2,"remove":0,"change":0}
bob initial outgoing: {"files":2,"add":2,"remove":0,"change":0}
```

### Keypair

Your keypair is composed of a `PUBLIC_KEY` and `SECRET_KEY`, and is stored in the `.env` file.
Give your `PUBLIC_KEY` to your peers so they can connect to your machine.
Do not expose your `SECRET_KEY` to anyone.

## `hinter-core` Operation

For you to be able to exchange reports with another hinter, you need to be running `hinter-core` concurrently.
This is easy to achieve if both of you are running `hinter-core` at all times, or at least while your machines are running.

Run `hinter-core` in the background in "always restart" mode using:
```sh
docker run -d --name my-hinter-core --restart=always --network host -v "$(pwd)/data/peers":/app/data/peers -v "$(pwd)/.env":/app/.env -v "$(pwd)/.storage":/app/.storage bbenligiray/hinter-core:latest
```

Note that you will not see its logs when the container is running in the background.
However, since the command above names the container `my-hinter-core`, you can print its logs at any time using:
```sh
docker logs my-hinter-core
```

In "always restart" mode, the container will start automatically when your system boots up.
Stop and remove it using:
```sh
docker stop my-hinter-core
docker rm my-hinter-core
```

## AI Assistant Operation

- Open VS Code
- Click File → Open Folder and open the cloned repository
- Click the Cline icon in the sidebar

Now ask Cline to help you get started.

There are two important concepts to be aware of while using Cline:

### Plan/Act toggle button

You can chat with the AI about the contents of your repo in Plan Mode.
For Cline to be able to make changes (for example, to execute predefined hinter workflows), you will need to switch to Act Mode.
Switching between Plan and Act Mode retains the context, so you will likely want to switch between the two during use.


> [!TIP]
> Using git for version control will enable you to track and revert changes that Cline makes in a powerful way.

### Tasks
Whenever you want Cline to start as a clean slate, start a new task (for example, by clicking the plus sign on the Cline extension).
Doing this between independent hinter workflows will cause Cline to perform in a more consistent manner.
However, you may want to continue using the same task during multiple dependent hinter workflows, such as revising the same report multiple times.

> [!TIP]
> If you have already checked out the example `data/` contents, say `start-fresh` for Cline to clean it up.
