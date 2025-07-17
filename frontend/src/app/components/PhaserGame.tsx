import React, { useEffect, useRef, useState } from 'react';
import * as Phaser from 'phaser';
import {Socket} from 'socket.io-client';
import Peer from 'peerjs';


interface PhaserGameProps {
    // Props can be added here if needed later, e.g., to pass game configurations
    socketIo: any;
    clientId: string;
    roomId: string;
}


class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        const tilesetURL = '/assets/tilesets/tileset.png';
        console.log(`Initiating preload for your 8x8 tileset (32x32 tiles) from: ${tilesetURL}`);
        this.load.spritesheet('tileset_custom', tilesetURL, {
            frameWidth: 32,
            frameHeight: 32
        });
        this.load.spritesheet('player', '/assets/sprites/george.png', {
            frameWidth: 48,
            frameHeight: 48
        });
    }

    create() {
        console.log('BootScene create, starting MainScene');
        this.scene.start('MainScene');
    }
}


const OBSTACLE_MATRIX: number[][] = [
[304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304,304],
[304,-1,-1,-1,41,-1,-1,-1,-1,-1,-1,41,-1,-1,-1,41,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,41,304],
[304,41,-1,41,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,41,41,-1,-1,-1,-1,-1,-1,41,-1,-1,-1,-1,-1,-1,304],
[304,-1,-1,-1,-1,-1,41,-1,-1,-1,-1,-1,41,-1,-1,-1,-1,-1,-1,41,-1,41,-1,-1,41,-1,41,-1,-1,304],
[304,-1,-1,-1,-1,-1,-1,41,-1,41,41,-1,-1,-1,-1,-1,-1,-1,41,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,304],
[304,-1,-1,41,-1,-1,-1,-1,-1,-1,-1,41,-1,41,-1,-1,-1,41,-1,-1,-1,41,-1,-1,-1,-1,-1,-1,-1,304],
[304,-1,-1,41,-1,-1,-1,41,-1,-1,41,-1,-1,-1,-1,-1,41,-1,41,-1,-1,-1,41,-1,-1,-1,-1,-1,-1,304],
[304,-1,41,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,41,-1,-1,-1,-1,41,-1,-1,-1,41,-1,-1,-1,-1,-1,-1,304],
[304,-1,-1,-1,41,-1,41,-1,-1,-1,41,-1,-1,-1,-1,-1,-1,-1,-1,-1,41,-1,-1,-1,-1,-1,-1,-1,-1,304],
[304,-1,-1,-1,41,-1,-1,41,-1,-1,-1,-1,-1,-1,41,41,-1,-1,-1,-1,-1,-1,-1,41,-1,-1,-1,-1,-1,304],
[304,-1,-1,41,-1,-1,-1,-1,-1,-1,-1,41,41,-1,-1,-1,-1,-1,41,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,304],
[304,41,-1,41,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,41,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,41,304],
[304,-1,41,-1,-1,41,-1,-1,41,-1,-1,-1,-1,41,-1,-1,-1,-1,-1,41,-1,-1,-1,-1,-1,-1,41,-1,-1,304],
[304,-1,-1,41,-1,41,41,-1,-1,-1,41,-1,-1,-1,41,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,41,-1,-1,41,304],
[304,-1,-1,-1,-1,-1,41,-1,-1,41,-1,-1,41,-1,-1,41,-1,41,-1,-1,-1,-1,-1,-1,-1,-1,41,-1,-1,304],
[304,-1,41,-1,-1,41,-1,-1,41,-1,-1,-1,-1,-1,-1,41,-1,-1,-1,41,-1,41,-1,41,-1,-1,-1,-1,-1,304],
[304,-1,41,-1,-1,-1,-1,-1,-1,41,-1,-1,-1,-1,-1,41,-1,-1,-1,-1,-1,-1,-1,-1,-1,41,-1,-1,-1,304],
[304,-1,-1,41,-1,-1,-1,41,-1,41,-1,41,-1,-1,-1,-1,41,-1,41,-1,-1,-1,41,-1,-1,-1,-1,-1,-1,304],
[304,-1,-1,-1,41,-1,-1,41,-1,-1,-1,-1,-1,-1,41,-1,-1,41,-1,-1,-1,-1,-1,41,-1,-1,-1,-1,-1,304],
[304,-1,-1,-1,-1,-1,-1,-1,-1,41,-1,-1,41,-1,-1,-1,41,-1,-1,-1,41,41,-1,-1,-1,-1,41,-1,-1,304],
[304,-1,41,-1,41,-1,-1,-1,41,-1,-1,-1,41,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,41,-1,-1,-1,304],
[304,-1,-1,-1,-1,-1,-1,41,-1,-1,-1,-1,-1,-1,41,-1,-1,41,-1,41,-1,-1,-1,-1,-1,-1,41,-1,41,304],
[304,-1,-1,-1,-1,-1,41,-1,-1,41,41,-1,-1,-1,41,-1,41,-1,-1,-1,41,-1,-1,-1,-1,41,-1,-1,-1,304],
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

        const targetTileIndex = 1;
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


        const player = this.physics.add.sprite(96, 128, 'player');
        player.setOrigin(0, 0);
        player.setDisplaySize(32, 32);
        player.body.setSize(32, 32);
        player.body.setOffset(8, 8);
        
        this.cameras.main.startFollow(player);
        
        this.player = player;


        this.anims.create({
            key: 'down',
            frames: [{key: 'player', frame: 0}, {key: 'player', frame: 4}, {key: 'player', frame: 8}, {key: 'player', frame: 12}],
            frameRate: 8,
            repeat: -1
        });
        this.anims.create({
            key: 'left',
            frames: [{key: 'player', frame: 1}, {key: 'player', frame: 5}, {key: 'player', frame: 9}, {key: 'player', frame: 13}],
            frameRate: 8,
            repeat: -1
        });
        this.anims.create({
            key: 'up',
            frames: [{key: 'player', frame: 2}, {key: 'player', frame: 6}, {key: 'player', frame: 10}, {key: 'player', frame: 14}],
            frameRate: 8,
            repeat: -1
        });
        this.anims.create({
            key: 'right',
            frames: [{key: 'player', frame: 3}, {key: 'player', frame: 7}, {key: 'player', frame: 11}, {key: 'player', frame: 15}],
            frameRate: 8,
            repeat: -1
        });


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
            if (playerData.vx < 0) this.player.anims.play('left', true);
            else if (playerData.vx > 0) this.player.anims.play('right', true);
            else if (playerData.vy < 0) this.player.anims.play('up', true);
            else if (playerData.vy > 0) this.player.anims.play('down', true);
            else this.player.anims.stop(); // Idle if no velocity
        }

        // Update or create other players
        allServerPlayerIds.forEach(clientId => {
            if (clientId === this.localClientId) return; // Already handled

            const playerData = serverPlayers[clientId];
            let otherPlayerSprite = this.otherPlayers.get(clientId);

            if (!otherPlayerSprite) { // Create new sprite for new player
                console.log(`Creating sprite for new player ${clientId}`);
                otherPlayerSprite = this.physics.add.sprite(playerData.x, playerData.y, 'player');
                otherPlayerSprite.setOrigin(0, 0);
                otherPlayerSprite.setDisplaySize(32, 32);
                otherPlayerSprite.body.setSize(32, 32);
                otherPlayerSprite.body.setOffset(8, 8);
                this.otherPlayers.set(clientId, otherPlayerSprite);
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
            if (playerData.vx < 0) otherPlayerSprite.anims.play('left', true);
            else if (playerData.vx > 0) otherPlayerSprite.anims.play('right', true);
            else if (playerData.vy < 0) otherPlayerSprite.anims.play('up', true);
            else if (playerData.vy > 0) otherPlayerSprite.anims.play('down', true);
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

const PhaserGame: React.FC<PhaserGameProps> = ({ socketIo, clientId, roomId }) => {
    const gameContainerRef = useRef<HTMLDivElement>(null);
    const gameInstanceRef = useRef<Phaser.Game | null>(null);
    const [gameOver, setGameOver] = useState(false);
    const [gameOverMessage, setGameOverMessage] = useState('');
    const [isWinner, setIsWinner] = useState(false);
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

        // Register listeners
        socketIo.on('connect', onConnect);
        socketIo.on('disconnect', onDisconnect);
        socketIo.on('gameStateUpdate', onGameStateUpdate);
        socketIo.on('gameOver', onGameOver);
        socketIo.on('winGame', onWinGame);

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
        window.location.href = '/play'; // Redirect to dashboard to start a new game
    };

    const handleReturnToDashboard = () => {
        socketIo.disconnect();
        window.location.href = '/dashboard';
    };


    return (
        <div 
            className="relative overflow-hidden"
            style={{ width: `${viewportWidth}px`, height: `${viewportHeight}px` }}
        >
            <div 
                ref={gameContainerRef} 
                id="phaser-game-container" 
                style={{ width: `${viewportWidth}px`, height: `${viewportHeight}px` }} 
            />
            
            {gameOver && (
                <div className="absolute inset-0 bg-black bg-opacity-80 flex flex-col justify-center items-center text-white text-2xl font-sans text-center z-[1000]">
                    <div className={`
                        ${isWinner 
                            ? 'bg-gradient-to-br from-green-500 to-green-600 border-green-800' 
                            : 'bg-gradient-to-br from-red-500 to-red-600 border-red-800'
                        }
                        p-8 rounded-2xl border-4 shadow-2xl max-w-md
                        animate-[fadeIn_0.5s_ease-in-out]
                    `}>
                        <h2 className="text-4xl font-bold mb-5 drop-shadow-lg">
                            {isWinner ? '🎉 Victory! 🎉' : '💥 Game Over 💥'}
                        </h2>
                        
                        <p className="text-lg leading-relaxed mb-8">
                            {gameOverMessage}
                        </p>
                        
                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={handlePlayAgain}
                                className="px-6 py-3 text-base font-bold bg-blue-500 text-white border-none rounded-lg cursor-pointer transition-all duration-300 shadow-lg hover:bg-blue-600 hover:-translate-y-0.5 hover:shadow-xl"
                            >
                                Play Again
                            </button>
                            
                            <button
                                onClick={handleReturnToDashboard}
                                className="px-6 py-3 text-base font-bold bg-gray-600 text-white border-none rounded-lg cursor-pointer transition-all duration-300 shadow-lg hover:bg-gray-700 hover:-translate-y-0.5 hover:shadow-xl"
                            >
                                Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PhaserGame;
