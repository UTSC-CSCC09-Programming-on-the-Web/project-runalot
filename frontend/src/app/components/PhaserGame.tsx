import React, { useEffect, useRef } from 'react';
import * as Phaser from 'phaser';
import io from 'socket.io-client';


interface PhaserGameProps {
    // Props can be added here if needed later, e.g., to pass game configurations
}


class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        const tilesetURL = '/assets/tilesets/tileset.png'; // Using the same name as before for simplicity
        console.log(`Initiating preload for your 8x8 tileset (32x32 tiles) from: ${tilesetURL}`);
        this.load.spritesheet('tileset_custom', tilesetURL, { // New key: 'tileset_custom'
            frameWidth: 32, // Your tile width
            frameHeight: 32  // Your tile height
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

// Main Scene for basic game elements
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
        // console.log('MainScene preload'); // Standard Phaser log, can be kept or removed
    }

    create() {

        const mapWidth = 30;
        const mapHeight = 30;
        const tilePixelWidth = 32; 
        const tilePixelHeight = 32;

        const targetTileIndex = 1;
        const borderTileIndex = 304; // New border tile index
        const obstacleTileIndex = 41; // Obstacle tile index

        // Generate base layer (ground)
        const groundData: number[][] = [];
        for (let y = 0; y < mapHeight; y++) {
            const row: number[] = [];
            for (let x = 0; x < mapWidth; x++) {
                row.push(targetTileIndex);
            }
            groundData.push(row);
        }

        // Use OBSTACLE_MATRIX for obstacles
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

        // Create ground layer (base)
        const groundLayer = map.createBlankLayer('ground', tileset, 0, 0);
        groundLayer?.putTilesAt(groundData, 0, 0);
        groundLayer?.setDepth(0);

        // Create obstacle+border layer
        const obstacleLayer = map.createBlankLayer('obstacles', tileset, 0, 0);
        obstacleLayer?.putTilesAt(obstacleData, 0, 0);
        // Recalculate collision after putTilesAt
        obstacleLayer?.setCollision([borderTileIndex, obstacleTileIndex], true, true);
        obstacleLayer?.setDepth(1);
        obstacleLayer?.setAlpha(1); // Ensure obstacle layer is fully opaque

        // World dimensions are simpler: mapWidthInTiles * tilePixelWidth
        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.cameras.main.setZoom(1.4);

        if (!obstacleLayer) {
            throw new Error('Tileset failed to load.');
        }

        // Use scale so the sprite visually fits a 32x32 tile
        const player = this.physics.add.sprite(32, 32, 'player');
        player.setOrigin(0, 0); // Top-left origin so (x, y) matches backend
        player.setDisplaySize(32, 32); // Visually fit in a 32x32 tile
        player.body.setSize(32, 32); // Physics body is 32x32
        player.body.setOffset(8, 8); // Center body in 48x48 sprite (offset = (48-32)/2)
        this.cameras.main.startFollow(player);
        this.player = player;

        // Animations for each direction, 4 frames each
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


        this.cursors = this.input.keyboard?.createCursorKeys(); // Keep for easy access to key states if needed, but direct event handling is better for press/release.

        // After generating obstacleData and creating the player
        // Store map and player position as matrices for backend use
        this.mapMatrix = obstacleData.map(row => [...row]);
        // this.playerPosition = { x: player.x, y: player.y }; // Player position will be updated by server

        // Setup keyboard event handling for sending messages
        this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
            this.handleKeyEvent(event.key, 'keyPress');
        });

        this.input.keyboard?.on('keyup', (event: KeyboardEvent) => {
            this.handleKeyEvent(event.key, 'keyRelease');
        });
    }

    private sendKeySocketMessage(key: string, type: 'keyPress' | 'keyRelease') {
        if (this.socket && this.socket.connected) {
            this.socket.emit(type, { key, timestamp: Date.now() });
        } else {
            if (!this.socket) this.socket = this.game.registry.get('socket');
            if (!this.socket || !this.socket.connected) {
                console.warn('Socket.io not connected. Key event not sent.');
            } else {
                this.socket.emit(type, { key, timestamp: Date.now() });
            }
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
        // Ensure clientId is available if it wasn't at init/create
        if (!this.localClientId) {
            this.localClientId = this.game.registry.get('clientId');
        }

        // Use this.lastServerUpdate which is populated by the registry event listener
        const currentServerUpdate = this.lastServerUpdate;

        if (currentServerUpdate) {
            this.handleGameStateUpdate(currentServerUpdate);
            this.lastServerUpdate = null;
        }

        // Local animation updates for the local player (based on pressed keys)
        if (this.player && this.pressedKeys.size > 0) {
            if (this.pressedKeys.has('Left')) this.player.anims.play('left', true);
            else if (this.pressedKeys.has('Right')) this.player.anims.play('right', true);
            else if (this.pressedKeys.has('Up')) this.player.anims.play('up', true);
            else if (this.pressedKeys.has('Down')) this.player.anims.play('down', true);
        } else if (this.player && this.pressedKeys.size === 0) {
            const localPlayerData = this.lastServerUpdate?.players[this.localClientId!];
            if (localPlayerData && localPlayerData.vx === 0 && localPlayerData.vy === 0) {
                 this.player.anims.stop();
            }
        }
    }

    private handleGameStateUpdate(gameState: any) {
        if (!gameState || !gameState.players) {
            // console.warn('[MainScene HGSUpdate] Received invalid or empty gameState:', gameState);
            return;
        }
        // console.log('[MainScene HGSUpdate] Handling gameState:', JSON.parse(JSON.stringify(gameState)));

        if (!this.localClientId) {
            // console.warn('[MainScene HGSUpdate] localClientId is not set yet. Skipping player updates.');
            return;
        }

        const serverPlayers = gameState.players;
        const allServerPlayerIds = Object.keys(serverPlayers);

        // Update local player
        if (this.player && serverPlayers[this.localClientId]) { // Check if localClientId exists in serverPlayers
            const playerData = serverPlayers[this.localClientId];
            // console.log(`[MainScene HGSUpdate] LocalPlayer (${this.localClientId}): ServerData: P(${playerData.x.toFixed(2)}, ${playerData.y.toFixed(2)}) V(${playerData.vx.toFixed(2)}, ${playerData.vy.toFixed(2)}). CurrentSprite: P(${this.player.x.toFixed(2)}, ${this.player.y.toFixed(2)})`);

            const positionChanged = Math.abs(this.player.x - playerData.x) > 0.1 || Math.abs(this.player.y - playerData.y) > 0.1; // Lowered threshold for logging
            // console.log(`[MainScene HGSUpdate] LocalPlayer (${this.localClientId}): Position changed for tween? ${positionChanged}. DiffX: ${Math.abs(this.player.x - playerData.x)}, DiffY: ${Math.abs(this.player.y - playerData.y)}`);

            if (positionChanged) {
                // console.log(`[MainScene HGSUpdate] LocalPlayer (${this.localClientId}): CREATING TWEEN from (${this.player.x.toFixed(2)}, ${this.player.y.toFixed(2)}) to (${playerData.x.toFixed(2)}, ${playerData.y.toFixed(2)})`);
                this.tweens.add({
                    targets: this.player,
                    x: playerData.x,
                    y: playerData.y,
                    duration: 80, // Slightly less than typical server tick interval for catch-up
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

const PhaserGame: React.FC<PhaserGameProps> = () => {
    const gameContainerRef = useRef<HTMLDivElement>(null);
    const gameInstanceRef = useRef<Phaser.Game | null>(null);
    const wsRef = useRef<any>(null); // Ref to hold the socket.io instance


    useEffect(() => {
        // Initialize socket.io connection
        let socketIoClient: any = null;
        if (typeof window !== 'undefined' && !wsRef.current) {

                const url = 'http://localhost:4242';
                console.log(`Connecting to socket.io server at ${url}`);
                socketIoClient = io(url);

                socketIoClient.on('connect', () => {
                    console.log('Socket.io connection established');
                    wsRef.current = socketIoClient;
                    if (gameInstanceRef.current) {
                        gameInstanceRef.current.registry.set('socket', socketIoClient);
                        console.log('Socket.io instance stored in Phaser Registry.');
                    }
                });

                socketIoClient.on('gameStateUpdate', (payload: any) => {
                    if (gameInstanceRef.current) {
                        gameInstanceRef.current.registry.set('serverGameState', payload);
                    }
                });

                socketIoClient.on('welcome', (data: any) => {
                    if (gameInstanceRef.current) {
                        gameInstanceRef.current.registry.set('clientId', data.clientId);
                    }
                });

                socketIoClient.on('chat', (data: any) => {
                    console.log(`Chat from ${data.senderId}: ${data.payload}`);
                });

                socketIoClient.on('error', (err: any) => {
                    console.error('Socket.io error:', err);
                });

                socketIoClient.on('disconnect', (reason: string) => {
                    console.log('Socket.io connection closed:', reason);
                    wsRef.current = null;
                });
        }

        // Initialize Phaser Game
        if (typeof window !== 'undefined' && gameContainerRef.current && !gameInstanceRef.current) {
            // Orthogonal map dimensions
            const mapTilesWide = 40;
            const mapTilesHigh = 40;
            const tilePixelWidth = 32;
            const tilePixelHeight = 32;

            const gameWorldWidth = mapTilesWide * tilePixelWidth; // 30 * 32 = 960
            const gameWorldHeight = mapTilesHigh * tilePixelHeight; // 30 * 32 = 960

            // Viewport size
            const viewportWidth = Math.min(gameWorldWidth, 720);
            const viewportHeight = Math.min(gameWorldHeight, 600);

            const config: Phaser.Types.Core.GameConfig = {
                type: Phaser.AUTO,
                width: viewportWidth,
                height: viewportHeight,
                parent: gameContainerRef.current,
                scene: [BootScene, MainScene],
                physics: { // Physics might not be used yet but good to have configured
                    default: 'arcade',
                },
                pixelArt: true,
                render: {
                    antialias: false,
                    pixelArt: true,
                }
            };

            gameInstanceRef.current = new Phaser.Game(config);
            console.log('Phaser Game instance created with orthogonal config:', config);
        }

        return () => {
            if (gameInstanceRef.current) {
                console.log('Destroying Phaser Game instance');
                gameInstanceRef.current.destroy(true);
                gameInstanceRef.current = null;
            }
            if (wsRef.current) {
                wsRef.current.disconnect && wsRef.current.disconnect();
                wsRef.current = null;
            }
        };
    }, []);

    // Adjust div style to match viewport
    const mapTilesWide = 30;
    const mapTilesHigh = 30;
    const tilePixelWidth = 32;
    const tilePixelHeight = 32;
    const gameWorldWidth = mapTilesWide * tilePixelWidth;
    const gameWorldHeight = mapTilesHigh * tilePixelHeight;
    const viewportWidth = Math.min(gameWorldWidth, 720);
    const viewportHeight = Math.min(gameWorldHeight, 600);


    return <div ref={gameContainerRef} id="phaser-game-container" style={{ width: `${viewportWidth}px`, height: `${viewportHeight}px`, overflow: 'hidden' }} />;
};

export default PhaserGame;
