import React, { useEffect, useRef, useState } from 'react';
import * as Phaser from 'phaser';
import {Socket} from 'socket.io-client';
import Peer from 'peerjs';


interface PhaserGameProps {
    socketIo: any;
    clientId: string;
    roomId: string;
    isTagger: boolean;
    order: number;
    playerRoles?: { [id: string]: { tagger: boolean, order: number } } | null;
    navigate: (view: string) => void;
}


class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        const tilesetURL = '/assets/tilesets/tileset.png';
        this.load.spritesheet('tileset_custom', tilesetURL, {
            frameWidth: 32,
            frameHeight: 32
        });
        // Preload all possible tagger/runner sprites for up to 2 taggers and 4 runners
        for (let i = 1; i <= 2; i++) {
            this.load.spritesheet(`Tagger${i}`, `/assets/sprites/Tagger${i}.png`, {
                frameWidth: 32,
                frameHeight: 32
            });
        }
        for (let i = 1; i <= 4; i++) {
            this.load.spritesheet(`Runner${i}`, `/assets/sprites/Runner${i}.png`, {
                frameWidth: 32,
                frameHeight: 32
            });
        }
    }

    create() {
        console.log('BootScene create, starting MainScene');
        this.scene.start('MainScene');
    }
}


const OBSTACLE_MATRIX: number[][] = [
[304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304],
[304,-1,-1,-1,67,-1,-1,-1,-1,-1,-1,67,-1,-1,-1,67,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,67,304],
[304,67,-1,67,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,67,67,-1,-1,-1,-1,-1,-1,67,-1,-1,-1,-1,-1,-1,304],
[304,-1,-1,-1,-1,-1,67,-1,-1,-1,-1,-1,67,-1,-1,-1,-1,-1,-1,67,-1,67,-1,-1,67,-1,67,-1,-1,304],
[304,-1,-1,-1,-1,-1,-1,67,-1,67,67,-1,-1,-1,-1,-1,-1,-1,67,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,304],
[304,-1,-1,67,-1,-1,-1,-1,-1,-1,-1,67,-1,67,-1,-1,-1,67,-1,-1,-1,67,-1,-1,-1,-1,-1,-1,-1,304],
[304,-1,-1,67,-1,-1,-1,67,-1,-1,67,-1,-1,-1,-1,-1,67,-1,67,-1,-1,-1,67,-1,-1,-1,-1,-1,-1,304],
[304,-1,67,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,67,-1,-1,-1,-1,67,-1,-1,-1,67,-1,-1,-1,-1,-1,-1,304],
[304,-1,-1,-1,67,-1,67,-1,-1,-1,67,-1,-1,-1,-1,-1,-1,-1,-1,-1,67,-1,-1,-1,-1,-1,-1,-1,-1,304],
[304,-1,-1,-1,67,-1,-1,67,-1,-1,-1,-1,-1,-1,67,67,-1,-1,-1,-1,-1,-1,-1,67,-1,-1,-1,-1,-1,304],
[304,-1,-1,67,-1,-1,-1,-1,-1,-1,-1,67,67,-1,-1,-1,-1,-1,67,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,304],
[304,67,-1,67,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,67,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,67,304],
[304,-1,67,-1,-1,67,-1,-1,67,-1,-1,-1,-1,67,-1,-1,-1,-1,-1,67,-1,-1,-1,-1,-1,-1,67,-1,-1,304],
[304,-1,-1,67,-1,67,67,-1,-1,-1,67,-1,-1,-1,67,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,67,-1,-1,67,304],
[304,-1,-1,-1,-1,-1,67,-1,-1,67,-1,-1,67,-1,-1,67,-1,67,-1,-1,-1,-1,-1,-1,-1,-1,67,-1,-1,304],
[304,-1,67,-1,-1,67,-1,-1,67,-1,-1,-1,-1,-1,-1,67,-1,-1,-1,67,-1,67,-1,67,-1,-1,-1,-1,-1,304],
[304,-1,67,-1,-1,-1,-1,-1,-1,67,-1,-1,-1,-1,-1,67,-1,-1,-1,-1,-1,-1,-1,-1,-1,67,-1,-1,-1,304],
[304,-1,-1,67,-1,-1,-1,67,-1,67,-1,67,-1,-1,-1,-1,67,-1,67,-1,-1,-1,67,-1,-1,-1,-1,-1,-1,304],
[304,-1,-1,-1,67,-1,-1,67,-1,-1,-1,-1,-1,-1,67,-1,-1,67,-1,-1,-1,-1,-1,67,-1,-1,-1,-1,-1,304],
[304,-1,-1,-1,-1,-1,-1,-1,-1,67,-1,-1,67,-1,-1,-1,67,-1,-1,-1,67,67,-1,-1,-1,-1,67,-1,-1,304],
[304,-1,67,-1,67,-1,-1,-1,67,-1,-1,-1,67,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,67,-1,-1,-1,304],
[304,-1,-1,-1,-1,-1,-1,67,-1,-1,-1,-1,-1,-1,67,-1,-1,67,-1,67,-1,-1,-1,-1,-1,-1,67,-1,67,304],
[304,-1,-1,-1,-1,-1,67,-1,-1,67,67,-1,-1,-1,67,-1,67,-1,-1,-1,67,-1,-1,-1,-1,67,-1,-1,-1,304],
[304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304]
];

class MainScene extends Phaser.Scene {
    private player?: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody; // Local player sprite
    private otherPlayers: Map<string, Phaser.Types.Physics.Arcade.SpriteWithDynamicBody>; // Sprites for other players
    private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
    private mapMatrix?: number[][];
    private socket?: any;
    private pressedKeys: Set<string>;
    private localClientId?: string;
    private lastServerUpdate: any = null;

    constructor() {
        super('MainScene');
        this.pressedKeys = new Set();
        this.otherPlayers = new Map();
    }

    init() {
        this.socket = this.game.registry.get('socket');
        this.localClientId = this.game.registry.get('clientId');
        this.game.registry.events.on('changedata-socket', (_parent: any, value: any) => {
            this.socket = value;
        });
        this.game.registry.events.on('changedata-clientId', (_parent: any, value: string) => {
            this.localClientId = value;
        });
        this.game.registry.events.on('changedata-serverGameState', (_parent: any, value: any) => {
            this.lastServerUpdate = value;
        });
    }

    preload() {
    }

    create() {

        const mapWidth = 30;
        const mapHeight = 30;
        const tilePixelWidth = 32; 
        const tilePixelHeight = 32;

        const targetTileIndex = 325;
        const borderTileIndex = 304;
        const obstacleTileIndex = 41;

        // Generate base layer (ground)
        const groundData: number[][] = [];
        for (let y = 0; y < mapHeight; y++) {
            const row: number[] = [];
            for (let x = 0; x < mapWidth; x++) {
                row.push(targetTileIndex);
            }
            groundData.push(row);
        }

        const obstacleData: number[][] = OBSTACLE_MATRIX.map(row => [...row]);

        // Create the orthogonal tilemap
        const map = this.make.tilemap({
            tileWidth: tilePixelWidth,
            tileHeight: tilePixelHeight,
            width: mapWidth,
            height: mapHeight
        });

        // Add your tileset image to the map
        const tileset = map.addTilesetImage('my_custom_tiles', 'tileset_custom', tilePixelWidth, tilePixelHeight, 0, 0);
        if (!tileset) {
            throw new Error('Tileset failed to load.');
        }

        // Enable pixel rounding to avoid subpixel rendering seams
        this.cameras.main.roundPixels = true;

        const groundLayer = map.createBlankLayer('ground', tileset, 0, 0);
        groundLayer?.putTilesAt(groundData, 0, 0);
        groundLayer?.setDepth(0);


        const obstacleLayer = map.createBlankLayer('obstacles', tileset, 0, 0);
        obstacleLayer?.putTilesAt(obstacleData, 0, 0);
        obstacleLayer?.setCollision([borderTileIndex, obstacleTileIndex], true, true);
        obstacleLayer?.setDepth(1);
        obstacleLayer?.setAlpha(1);

        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.cameras.main.setZoom(1.6);

        if (!obstacleLayer) {
            throw new Error('Tileset failed to load.');
        }



        // Use correct sprite for local player
        const isTagger = this.game.registry.get('isTagger');
        const order = this.game.registry.get('order');
        const localSpriteKey = isTagger ? `Tagger${order}` : `Runner${order}`;
        const player = this.physics.add.sprite(96, 128, localSpriteKey);
        player.setOrigin(0, 0);
        player.setDisplaySize(32, 32);
        player.body.setSize(32, 32);
        player.body.setOffset(8, 8);
        this.cameras.main.startFollow(player);
        this.player = player;

        // Define animations for all possible tagger and runner sprite sheets
        const allSpriteKeys = ['Tagger1', 'Tagger2', 'Runner1', 'Runner2', 'Runner3', 'Runner4'];
        for (const key of allSpriteKeys) {
            this.anims.create({
                key: `down_${key}`,
                frames: [
                    { key, frame: 0 },
                    { key, frame: 1 },
                    { key, frame: 2 }
                ],
                frameRate: 8,
                repeat: -1
            });
            this.anims.create({
                key: `left_${key}`,
                frames: [
                    { key, frame: 3 },
                    { key, frame: 4 },
                    { key, frame: 5 }
                ],
                frameRate: 8,
                repeat: -1
            });
            this.anims.create({
                key: `right_${key}`,
                frames: [
                    { key, frame: 6 },
                    { key, frame: 7 },
                    { key, frame: 8 }
                ],
                frameRate: 8,
                repeat: -1
            });
            this.anims.create({
                key: `up_${key}`,
                frames: [
                    { key, frame: 9 },
                    { key, frame: 10 },
                    { key, frame: 11 }
                ],
                frameRate: 8,
                repeat: -1
            });
        }


        this.cursors = this.input.keyboard?.createCursorKeys();



        this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
            this.handleKeyEvent(event.key, 'keyPress');
        });

        this.input.keyboard?.on('keyup', (event: KeyboardEvent) => {
            this.handleKeyEvent(event.key, 'keyRelease');
        });
    }

    private sendKeySocketMessage(key: string, type: 'keyPress' | 'keyRelease') {

        const socket = this.game.registry.get('socket');

        if (socket && socket.connected) {
            socket.emit(type, { key, timestamp: Date.now() });
        } else {
            console.warn(`[MainScene] Socket not connected or not in registry. Cannot send key event.`);
        }
    }

    private handleKeyEvent(key: string, eventType: 'keyPress' | 'keyRelease') {
        let gameKey: string | null = null;
        switch (key) {
            case 'ArrowUp': gameKey = 'Up'; break;
            case 'ArrowDown': gameKey = 'Down'; break;
            case 'ArrowLeft': gameKey = 'Left'; break;
            case 'ArrowRight': gameKey = 'Right'; break;
        }

        if (gameKey) {
            if (eventType === 'keyPress' && !this.pressedKeys.has(gameKey)) {
                this.pressedKeys.add(gameKey);
                this.sendKeySocketMessage(gameKey, 'keyPress');
                if (this.player) {
                    if (gameKey === 'Left') this.player.anims.play('left', true);
                    else if (gameKey === 'Right') this.player.anims.play('right', true);
                    else if (gameKey === 'Up') this.player.anims.play('up', true);
                    else if (gameKey === 'Down') this.player.anims.play('down', true);
                }
            } else if (eventType === 'keyRelease' && this.pressedKeys.has(gameKey)) {
                this.pressedKeys.delete(gameKey);
                this.sendKeySocketMessage(gameKey, 'keyRelease');
                if (this.player && this.pressedKeys.size === 0) {
                    this.player.anims.stop();
                } else if (this.player) {
                    if (this.pressedKeys.has('Left')) this.player.anims.play('left', true);
                    else if (this.pressedKeys.has('Right')) this.player.anims.play('right', true);
                    else if (this.pressedKeys.has('Up')) this.player.anims.play('up', true);
                    else if (this.pressedKeys.has('Down')) this.player.anims.play('down', true);
                }
            }
        }
    }


    update(time: number, delta: number) {
        const currentServerUpdate = this.lastServerUpdate;
        if (currentServerUpdate) {
            this.handleGameStateUpdate(currentServerUpdate);
            this.lastServerUpdate = null;
        }
    }

    private handleGameStateUpdate(gameState: any) {
        if (!gameState || !gameState.players) {
            return;
        }

        if (!this.localClientId) {
            return;
        }

        const serverPlayers = gameState.players;
        const allServerPlayerIds = Object.keys(serverPlayers);

        if (this.player && serverPlayers[this.localClientId]) {
            const playerData = serverPlayers[this.localClientId];

            const positionChanged = Math.abs(this.player.x - playerData.x) > 0.1 || Math.abs(this.player.y - playerData.y) > 0.1; // Lowered threshold for logging

            if (positionChanged) {
                this.tweens.add({
                    targets: this.player,
                    x: playerData.x,
                    y: playerData.y,
                    duration: 100,
                    ease: 'Linear'
                });
            } else {
                // Snap to position if difference is small, or if not tweening
                this.player.x = playerData.x;
                this.player.y = playerData.y;
            }

            // Update animation based on server velocity for local player
            const localAnimKey = this.player.texture.key;
            if (playerData.vx < 0) this.player.anims.play(`left_${localAnimKey}`, true);
            else if (playerData.vx > 0) this.player.anims.play(`right_${localAnimKey}`, true);
            else if (playerData.vy < 0) this.player.anims.play(`up_${localAnimKey}`, true);
            else if (playerData.vy > 0) this.player.anims.play(`down_${localAnimKey}`, true);
            else this.player.anims.stop(); // Idle if no velocity
        }

        // Update or create other players
        const playerRoles = this.game.registry.get('playerRoles') || {};
        allServerPlayerIds.forEach(clientId => {
            if (clientId === this.localClientId) return; // Already handled

            const playerData = serverPlayers[clientId];
            let otherPlayerSprite = this.otherPlayers.get(clientId);
            const meta = playerRoles[clientId];
            // if (!meta) {
            //     console.warn(`[PhaserGame] playerRoles missing for clientId: ${clientId}. playerRoles:`, playerRoles);
            // }
            const safeMeta = meta || { tagger: false, order: 1 };
            const spriteKey = safeMeta.tagger ? `Tagger${safeMeta.order}` : `Runner${safeMeta.order}`;

            if (!otherPlayerSprite) { // Create new sprite for new player
                otherPlayerSprite = this.physics.add.sprite(playerData.x, playerData.y, spriteKey);
                otherPlayerSprite.setOrigin(0, 0);
                otherPlayerSprite.setDisplaySize(32, 32);
                otherPlayerSprite.body.setSize(32, 32);
                otherPlayerSprite.body.setOffset(8, 8);
                this.otherPlayers.set(clientId, otherPlayerSprite);
            } else if (otherPlayerSprite.texture.key !== spriteKey) {
                otherPlayerSprite.setTexture(spriteKey);
            }

            // Tween existing other player sprite
            this.tweens.add({
                targets: otherPlayerSprite,
                x: playerData.x,
                y: playerData.y,
                duration: 100, // Adjust for smoothness
                ease: 'Linear'
            });

            // Update animation for other players based on server velocity
            const otherAnimKey = otherPlayerSprite.texture.key;
            if (playerData.vx < 0) otherPlayerSprite.anims.play(`left_${otherAnimKey}`, true);
            else if (playerData.vx > 0) otherPlayerSprite.anims.play(`right_${otherAnimKey}`, true);
            else if (playerData.vy < 0) otherPlayerSprite.anims.play(`up_${otherAnimKey}`, true);
            else if (playerData.vy > 0) otherPlayerSprite.anims.play(`down_${otherAnimKey}`, true);
            else otherPlayerSprite.anims.stop();
        });

        // Remove sprites for players who disconnected
        this.otherPlayers.forEach((sprite, clientId) => {
            if (!allServerPlayerIds.includes(clientId)) {
                console.log(`Removing sprite for disconnected player ${clientId}`);
                sprite.destroy();
                this.otherPlayers.delete(clientId);
            }
        });
    }
}

const PhaserGame: React.FC<PhaserGameProps> = ({ socketIo, clientId, roomId, isTagger, order, playerRoles, navigate }) => {
    const gameContainerRef = useRef<HTMLDivElement>(null);
    const gameInstanceRef = useRef<Phaser.Game | null>(null);
    const [gameOver, setGameOver] = useState(false);
    const [gameOverMessage, setGameOverMessage] = useState('');
    const [isWinner, setIsWinner] = useState(false);
    const [roleMessage, setRoleMessage] = useState<string>("");
    const initialRoleShown = useRef(false);

    useEffect(() => {
        if (isTagger !== undefined && !initialRoleShown.current) {
            setRoleMessage("You are a " + (isTagger ? "TAGGER" : "RUNNER"));
            initialRoleShown.current = true;
            setTimeout(() => setRoleMessage(''), 2000);
        }
    }, [isTagger]);

    useEffect(() => {
        if (gameInstanceRef.current) {
            gameInstanceRef.current.registry.set('isTagger', isTagger);
            gameInstanceRef.current.registry.set('order', order);
            if (playerRoles) {
                gameInstanceRef.current.registry.set('playerRoles', playerRoles);
            }
        }
    }, [isTagger, order, playerRoles]);

    // PeerJS voice chat refs
    const peerRef = useRef<Peer | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const activeCallsRef = useRef<{ [peerId: string]: any }>({});

    useEffect(() => {
        if (gameContainerRef.current && !gameInstanceRef.current) {
            const mapTilesWide = 40;
            const mapTilesHigh = 40;
            const tilePixelWidth = 32;
            const tilePixelHeight = 32;
            const gameWorldWidth = mapTilesWide * tilePixelWidth;
            const gameWorldHeight = mapTilesHigh * tilePixelHeight;
            const viewportWidth = Math.min(gameWorldWidth, 720);
            const viewportHeight = Math.min(gameWorldHeight, 600);

            const config: Phaser.Types.Core.GameConfig = {
                type: Phaser.AUTO,
                width: viewportWidth,
                height: viewportHeight,
                parent: gameContainerRef.current,
                scene: [BootScene, MainScene],
                physics: {
                    default: 'arcade',
                },
                pixelArt: true,
                render: {
                    antialias: false,
                    pixelArt: true,
                }
            };

            gameInstanceRef.current = new Phaser.Game(config);
            gameInstanceRef.current.registry.set('clientId', clientId);
            gameInstanceRef.current.registry.set('roomId', roomId);
            gameInstanceRef.current.registry.set('isTagger', isTagger);
            gameInstanceRef.current.registry.set('order', order);
            gameInstanceRef.current.registry.set('playerRoles', playerRoles);
            console.log('[PhaserGame] Game instance created.');
        }

        return () => {
            if (gameInstanceRef.current) {
                console.log('[PhaserGame] Destroying game instance.');
                gameInstanceRef.current.destroy(true);
                gameInstanceRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (!socketIo) {
            console.log('[PhaserGame] Socket not available yet.');
            return;
        }

        let pollId: number | null = null;

        const tryInjectSocket = () => {
            if (gameInstanceRef.current && socketIo.connected) {
                gameInstanceRef.current.registry.set('socket', socketIo);
                return true;
            }
            return false;
        };

        const pollForInjection = () => {
            if (!tryInjectSocket()) {
                pollId = requestAnimationFrame(pollForInjection);
            }
        };

        pollForInjection();

        const onConnect = () => {
            console.log('[PhaserGame] Socket connected.');
            tryInjectSocket(); // Attempt injection on connect
        };

        const onDisconnect = (reason: string) => {
            console.log('[PhaserGame] Socket disconnected:', reason);
        };

        const onGameStateUpdate = (gameState: any) => {
            if (gameInstanceRef.current) {
                gameInstanceRef.current.registry.set('serverGameState', gameState);
            }
        };

        const onGameOver = (data: any) => {
            console.log('[PhaserGame] Game over received:', data);
            setGameOver(true);
            setGameOverMessage(data.message || 'You were tagged! Game over.');
            setIsWinner(false);
            // Don't disconnect immediately, let the player see the game over screen
        };

        const onWinGame = (data: any) => {
            console.log('[PhaserGame] Win game received:', data);
            setGameOver(true);
            setGameOverMessage(data.message || 'You win! All others have been tagged.');
            setIsWinner(true);
        };

        // Show tagger/runner message on gameStarted
        const onGameStarted = (data: any) => {
            if (data && data.tagger !== undefined) {
                if (data.tagger) {
                    setRoleMessage('You are the TAGGER!');
                } else {
                    setRoleMessage('You are a RUNNER!');
                }
                setTimeout(() => setRoleMessage(''), 2000);
            }
        };

        // Register listeners
        socketIo.on('connect', onConnect);
        socketIo.on('disconnect', onDisconnect);
        socketIo.on('gameStateUpdate', onGameStateUpdate);
        socketIo.on('gameOver', onGameOver);
        socketIo.on('winGame', onWinGame);
        socketIo.on('gameStarted', onGameStarted);

        // Cleanup function
        return () => {
            console.log('[PhaserGame] Cleaning up socket listeners.');
            if (pollId) {
                cancelAnimationFrame(pollId);
            }
            socketIo.off('connect', onConnect);
            socketIo.off('disconnect', onDisconnect);
            socketIo.off('gameStateUpdate', onGameStateUpdate);
            socketIo.off('gameOver', onGameOver);
            socketIo.off('winGame', onWinGame);
            socketIo.off('gameStarted', onGameStarted);
        };

    }, [socketIo]);

    useEffect(() => {
        // Initialize PeerJS and get microphone
        const peerHost = process.env.NEXT_PUBLIC_PEERHOST || 'localhost';
        console.log('[PhaserGame] Initializing PeerJS with:', { host: peerHost, port: 9000, path: '/', secure: false });
        const peer = new Peer({ host: peerHost, port: 443, path: '/', secure: process.env.NEXT_PUBLIC_PEERSECURE == 'true' });
        peerRef.current = peer;

        // Add PeerJS connection event logging
        peer.on('error', (err) => {
            console.error('[PhaserGame] PeerJS error:', err);
        });
        peer.on('disconnected', () => {
            console.warn('[PhaserGame] PeerJS disconnected');
        });
        peer.on('close', () => {
            console.warn('[PhaserGame] PeerJS connection closed');
        });
        peer.on('open', (id) => {
                console.log('[PhaserGame] PeerJS open event, id:', id);
                // Notify server of our PeerJS ID
                socketIo.emit('playerPeerReady', { clientId: clientId, peerId: id, roomId: roomId });
        });

        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
            localStreamRef.current = stream;

            // Handle incoming calls
            peer.on('call', (call) => {
                call.answer(stream);
                call.on('stream', remoteStream => {
                    // Play remote audio
                    const audio = document.createElement('audio');
                    audio.srcObject = remoteStream;
                    audio.autoplay = true;
                    audio.play();
                    activeCallsRef.current[call.peer] = call;
                });
                call.on('close', () => {
                    delete activeCallsRef.current[call.peer];
                });
            });
        });

        return () => {
            // Cleanup PeerJS and audio
            Object.values(activeCallsRef.current).forEach(call => call.close());
            peer.destroy();
            localStreamRef.current?.getTracks().forEach(track => track.stop());
        };
    }, [socketIo, clientId]);

    useEffect(() => {
        // Listen for proximity events from server
        const connectHandler = ({ peerId }: { peerId: string }) => {
            if (peerRef.current && localStreamRef.current && !activeCallsRef.current[peerId]) {
                const call = peerRef.current.call(peerId, localStreamRef.current);
                call.on('stream', remoteStream => {
                    const audio = document.createElement('audio');
                    audio.srcObject = remoteStream;
                    audio.autoplay = true;
                    audio.play();
                    activeCallsRef.current[peerId] = call;
                });
                call.on('close', () => {
                    delete activeCallsRef.current[peerId];
                });
            }
        };

        const disconnectHandler = ({ peerId }: { peerId: string }) => {
            if (activeCallsRef.current[peerId]) {
                activeCallsRef.current[peerId].close();
                delete activeCallsRef.current[peerId];
            }
        };
        
        // Handler to disconnect all PeerJS calls and destroy PeerJS instance on socket disconnect
        const fullDisconnectHandler = () => {
            Object.values(activeCallsRef.current).forEach(call => call.close());
            activeCallsRef.current = {};
            if (peerRef.current) {
                peerRef.current.destroy();
            }
        };

        socketIo.on('connectVoice', connectHandler);
        socketIo.on('disconnectVoice', disconnectHandler);
        socketIo.on('disconnect', fullDisconnectHandler);
        socketIo.on('gameOver', fullDisconnectHandler);
        socketIo.on('winGame', fullDisconnectHandler);

        return () => {
            socketIo.off('connectVoice', connectHandler);
            socketIo.off('disconnectVoice', disconnectHandler);
            socketIo.off('disconnect', fullDisconnectHandler);
        };
    }, [socketIo]);


    // Adjust div style to match viewport
    const mapTilesWide = 30;
    const mapTilesHigh = 30;
    const tilePixelWidth = 32;
    const tilePixelHeight = 32;
    const gameWorldWidth = mapTilesWide * tilePixelWidth;
    const gameWorldHeight = mapTilesHigh * tilePixelHeight;
    const viewportWidth = Math.min(gameWorldWidth, 720);
    const viewportHeight = Math.min(gameWorldHeight, 600);

    const handlePlayAgain = () => {
        setGameOver(false);
        setGameOverMessage('');
        setIsWinner(false);
        // Reconnect to a new game or return to waiting room
        navigate('play');
    };

    const handleReturnToHome = () => {
        socketIo.disconnect();
        navigate('home');
    };


    return (
        <div 
            className="relative overflow-hidden"
            style={{ width: `${viewportWidth}px`, height: `${viewportHeight}px` }}
        >
            {/* Vignette overlay for dark edges and overall darkness */}
            <div
                className="pointer-events-none absolute inset-0 z-10"
                style={{
                    background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 50%, rgba(0,0,0,1) 100%)`,
                    mixBlendMode: 'multiply',
                }}
            />
            {/* Subtle dark overlay for overall darkness */}
            <div
                className="pointer-events-none absolute inset-0 z-10"
                style={{
                    background: 'rgba(0,0,0,0.1)',
                }}
            />
            <div 
                ref={gameContainerRef} 
                id="phaser-game-container" 
                style={{ width: `${viewportWidth}px`, height: `${viewportHeight}px` }} 
                className="relative z-0"
            />
            
            {/* ChatGPT: give the message a more spooky feel with animations */}
            {roleMessage && (
                <div className="absolute inset-0 z-[1000] flex flex-col justify-center items-center pointer-events-none">
                    {/* Spooky mist background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-black/90 via-gray-800/80 to-black/90 animate-spookyMist pointer-events-none" style={{ filter: 'blur(2px)' }} />
                    {/* Flickering border and glowing text */}
                    <div className="relative p-10 rounded-3xl border-4 max-w-md shadow-2xl bg-gradient-to-br from-gray-900/90 to-black/90 border-gray-700 animate-spookyBorder">
                        <h2 className="text-5xl font-extrabold mb-4 text-center text-gray-200 drop-shadow-[0_0_16px_#444] animate-spookyGlow tracking-widest select-none" style={{ fontFamily: 'Creepster, \"Cinzel Decorative\", serif' }}>
                            {roleMessage}
                        </h2>
                        <div className="w-full flex justify-center">
                            <span className="block w-16 h-2 bg-gray-700 rounded-full opacity-60 animate-spookyPulse" />
                        </div>
                    </div>
                    <style jsx global>{`
                        @keyframes spookyMist {
                            0% { opacity: 0.95; filter: blur(2px) brightness(1); }
                            50% { opacity: 0.85; filter: blur(3px) brightness(1.1); }
                            100% { opacity: 0.95; filter: blur(2px) brightness(1); }
                        }
                        .animate-spookyMist { animation: spookyMist 3s ease-in-out infinite; }
                        @keyframes spookyGlow {
                            0%, 100% { text-shadow: 0 0 16px #444, 0 0 32px #222; }
                            50% { text-shadow: 0 0 32px #fff, 0 0 48px #222; }
                        }
                        .animate-spookyGlow { animation: spookyGlow 2.2s alternate infinite; }
                        @keyframes spookyPulse {
                            0%, 100% { opacity: 0.6; transform: scaleX(1); }
                            50% { opacity: 1; transform: scaleX(1.2); }
                        }
                        .animate-spookyPulse { animation: spookyPulse 1.5s infinite; }
                        @keyframes spookyBorder {
                            0%, 100% { box-shadow: 0 0 32px 8px #444c, 0 0 0 0 #000; }
                            50% { box-shadow: 0 0 48px 16px #222e, 0 0 8px 2px #000; }
                        }
                        .animate-spookyBorder { animation: spookyBorder 2.5s alternate infinite; }
                    `}</style>
                </div>
            )}

            {/* Game Over overlay with spooky style */}
            {gameOver && (
                <div className="absolute inset-0 z-[1000] flex flex-col justify-center items-center pointer-events-none">
                    {/* Spooky mist background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-black/90 via-gray-800/80 to-black/90 animate-spookyMist pointer-events-none" style={{ filter: 'blur(2px)' }} />
                    {/* Flickering border and glowing text */}
                    <div className={`relative p-10 rounded-3xl border-4 max-w-md shadow-2xl bg-gradient-to-br from-gray-900/90 to-black/90 border-gray-700 animate-spookyBorder pointer-events-auto`}>
                        <h2 className={`text-5xl font-extrabold mb-4 text-center drop-shadow-[0_0_16px_#444] animate-spookyGlow tracking-widest select-none ${isWinner ? 'text-green-400' : 'text-red-400'}`} style={{ fontFamily: 'Creepster, "Cinzel Decorative", serif' }}>
                            {isWinner
                                ? (isTagger
                                    ? '👻 The Tagger Prevails! 👻'
                                    : '🕯️ The Runner Escapes! 🕯️')
                                : '💀 Game Over 💀'}
                        </h2>
                        <p className="text-lg leading-relaxed mb-8 text-gray-200 text-center">
                            {isWinner
                                ? (isTagger
                                    ? 'You have haunted every runner. The night is yours!'
                                    : 'You slipped through the shadows and survived the tagger!')
                                : gameOverMessage}
                        </p>
                        <div className="w-full flex justify-center mb-6">
                            <span className="block w-16 h-2 bg-gray-700 rounded-full opacity-60 animate-spookyPulse" />
                        </div>
                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={handlePlayAgain}
                                className="px-6 py-3 text-base font-bold bg-blue-500 text-white border-none rounded-lg cursor-pointer transition-all duration-300 shadow-lg hover:bg-blue-600 hover:-translate-y-0.5 hover:shadow-xl"
                            >
                                Play Again
                            </button>
                            <button
                                onClick={handleReturnToHome}
                                className="px-6 py-3 text-base font-bold bg-gray-600 text-white border-none rounded-lg cursor-pointer transition-all duration-300 shadow-lg hover:bg-gray-700 hover:-translate-y-0.5 hover:shadow-xl"
                            >
                                Home
                            </button>
                        </div>
                    </div>
                    <style jsx global>{`
                        @keyframes spookyMist {
                            0% { opacity: 0.95; filter: blur(2px) brightness(1); }
                            50% { opacity: 0.85; filter: blur(3px) brightness(1.1); }
                            100% { opacity: 0.95; filter: blur(2px) brightness(1); }
                        }
                        .animate-spookyMist { animation: spookyMist 3s ease-in-out infinite; }
                        @keyframes spookyGlow {
                            0%, 100% { text-shadow: 0 0 16px #444, 0 0 32px #222; }
                            50% { text-shadow: 0 0 32px #fff, 0 0 48px #222; }
                        }
                        .animate-spookyGlow { animation: spookyGlow 2.2s alternate infinite; }
                        @keyframes spookyPulse {
                            0%, 100% { opacity: 0.6; transform: scaleX(1); }
                            50% { opacity: 1; transform: scaleX(1.2); }
                        }
                        .animate-spookyPulse { animation: spookyPulse 1.5s infinite; }
                        @keyframes spookyBorder {
                            0%, 100% { box-shadow: 0 0 32px 8px #444c, 0 0 0 0 #000; }
                            50% { box-shadow: 0 0 48px 16px #222e, 0 0 8px 2px #000; }
                        }
                        .animate-spookyBorder { animation: spookyBorder 2.5s alternate infinite; }
                    `}</style>
                </div>
            )}
        </div>
    );
};

export default PhaserGame;
