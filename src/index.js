import fs from 'bare-fs';
import path from 'bare-path';
import process from 'bare-process';
import Hyperswarm from 'hyperswarm';
import Hyperdrive from 'hyperdrive';
import Localdrive from 'localdrive';
import Corestore from 'corestore';
import crypto from 'hypercore-crypto';
import b4a from 'b4a';
import { printAsciiArt, parseEnvFile } from './utils';
import { parsePeers } from './peer.js';

printAsciiArt();

async function main() {
    const { keyPair, peerSizeLimitMB: envFilePeerSizeLimitMB } = await parseEnvFile();
    const peersDirectoryPath = path.join('hinter-core-data', 'peers');
    console.log('Parsing peers...');
    const peerSizeLimitMB = envFilePeerSizeLimitMB ?? 1024;
    const peers = await parsePeers(peersDirectoryPath, peerSizeLimitMB);
    console.log(`Parsed ${peers.length} peers!`);
    setInterval(async () => {
        const currentPeers = await parsePeers(peersDirectoryPath, peerSizeLimitMB);
        if (peers.map(peer => `${peer.alias}-${peer.publicKey}`).sort().toString() !== currentPeers.map(peer => `${peer.alias}-${peer.publicKey}`).sort().toString()) {
            console.log('Peers have changed. Exiting to allow restart.');
            process.exit(0);
        }
    }, 60000);

    console.log('Preparing to connect...');
    // Create 2 Corestore instances per peer in a local directory
    await Promise.all(peers.map(async (peer) => {
        const incomingCorestore = new Corestore(path.join('hinter-core-data', '.storage', peer.publicKey, 'incoming'));
        await incomingCorestore.ready();
        peer.incomingCorestore = incomingCorestore;

        const outgoingCorestore = new Corestore(path.join('hinter-core-data', '.storage', peer.publicKey, 'outgoing'));
        await outgoingCorestore.ready();
        peer.outgoingCorestore = outgoingCorestore;
    }));

    // Create a Hyperswarm instance with key pair
    const swarm = new Hyperswarm({ keyPair });
    Pear.teardown(() => swarm.destroy());

    // On connection with a peer, replicate the respective Corestore instances
    swarm.on('connection', (conn, peerInfo) => {
        const peer = peers.find(peer => peer.publicKey === Buffer.from(peerInfo.publicKey).toString('hex'));
        if (peer) {
            const incomingStream = peer.incomingCorestore.replicate(conn);
            incomingStream.on('error', (err) => {
                if (err.message.includes('conflict detected')) {
                    console.log(`Conflict detected with ${peer.alias}. Deleting incoming storage and exiting to allow restart.`);
                    fs.rmSync(path.join('hinter-core-data', '.storage', peer.publicKey, 'incoming'), { recursive: true, force: true });
                    process.exit(0);
                }
            });
            peer.outgoingCorestore.replicate(conn);
            peer.connection = conn;
            console.log(`Connected to ${peer.alias}!`);
        } else {
            conn.end();
        }
    });

    await Promise.all(peers.map(async (peer) => {
        peer.incomingLocaldrive = new Localdrive(path.join(peersDirectoryPath, `${peer.alias}-${peer.publicKey}`, 'incoming'));

        const incomingHyperdriveKeyPair = crypto.keyPair(crypto.data(b4a.concat([b4a.from(peer.publicKey, 'hex'), keyPair.publicKey])));
        peer.incomingHyperdrive = new Hyperdrive(peer.incomingCorestore, incomingHyperdriveKeyPair.publicKey);
        await peer.incomingHyperdrive.ready();

        peer.incomingDiscovery = swarm.join(peer.incomingHyperdrive.discoveryKey, { client: true, server: false });
        await peer.incomingDiscovery.flushed();

        peer.outgoingLocaldrive = new Localdrive(path.join(peersDirectoryPath, `${peer.alias}-${peer.publicKey}`, 'outgoing'));

        const outgoingHyperdriveKeyPair = crypto.keyPair(crypto.data(b4a.concat([keyPair.publicKey, b4a.from(peer.publicKey, 'hex')])));
        const outgoingCorestoreMainHypercore = peer.outgoingCorestore.get({ key: outgoingHyperdriveKeyPair.publicKey, keyPair: outgoingHyperdriveKeyPair })
        await outgoingCorestoreMainHypercore.ready()
        peer.outgoingHyperdrive = new Hyperdrive(peer.outgoingCorestore, outgoingHyperdriveKeyPair.publicKey);
        await peer.outgoingHyperdrive.ready();

        peer.outgoingDiscovery = swarm.join(peer.outgoingHyperdrive.discoveryKey, { client: false, server: true });
        await peer.outgoingDiscovery.flushed();
    }));
    console.log('Ready to connect!');

    await Promise.all(peers.map(async (peer) => {
        // Do the initial mirror
        const initialIncomingMirror = peer.incomingHyperdrive.mirror(peer.incomingLocaldrive);
        await initialIncomingMirror.done();
        console.log(`${peer.alias} initial incoming: ${JSON.stringify(initialIncomingMirror.count)}`);

        const initialOutgoingMirror = peer.outgoingLocaldrive.mirror(peer.outgoingHyperdrive);
        await initialOutgoingMirror.done();
        console.log(`${peer.alias} initial outgoing: ${JSON.stringify(initialOutgoingMirror.count)}`);

        // Mirror detected incoming changes in hyperdrive
        (async () => {
            for await (const { } of peer.incomingHyperdrive.watch()) {
                const incomingMirror = peer.incomingHyperdrive.mirror(peer.incomingLocaldrive);
                await incomingMirror.done();
                console.log(`${peer.alias} detected incoming: ${JSON.stringify(incomingMirror.count)}`);
            }
        })();

        // Mirror detected outgoing changes in localdrive
        fs.watch(path.join(peersDirectoryPath, `${peer.alias}-${peer.publicKey}`, 'outgoing'), { recursive: true }, async () => {
            const outgoingMirror = peer.outgoingLocaldrive.mirror(peer.outgoingHyperdrive);
            await outgoingMirror.done();
            console.log(`${peer.alias} detected outgoing: ${JSON.stringify(outgoingMirror.count)}`);
        });
    }));
}

main();
