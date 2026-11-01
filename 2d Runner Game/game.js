const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let frameCount = 0;
let score = 0;
let coins = 0;
let level = 1;
let isGameOver = false;

// LocalStorage থেকে হাই স্কোর এবং হাইয়েস্ট কয়েন লোড করা
let highScore = localStorage.getItem("advancedRunnerHighScore") || 0;
let highestCoins = localStorage.getItem("advancedRunnerHighestCoins") || 0;

let baseSpeed = 5;       
let spawnInterval = 110; 

// Web Audio API Sound Effects Generator
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    let osc = audioCtx.createOscillator();
    let gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    let now = audioCtx.currentTime;
    if (type === 'jump') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
    } else if (type === 'coin') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.setValueAtTime(900, now + 0.08);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
    } else if (type === 'powerup') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.3);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    } else if (type === 'gameover') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.linearRampToValueAtTime(80, now + 0.4);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
    }
}

// Player Object with Double Jump & Powers
const player = {
    x: 80,
    y: 280,
    width: 48,
    height: 64,
    dy: 0,
    gravity: 0.65,
    jumpPower: -12,
    jumpCount: 0,
    maxJumps: 2,
    isGrounded: false,
    animFrame: 0,
    animTimer: 0,
    hasShield: false,
    hasMagnet: false,
    magnetTimer: 0
};

let obstacles = [];
let collectibleItems = [];
let dustParticles = [];
let clouds = [
    {x: 100, y: 80, speed: 1},
    {x: 400, y: 50, speed: 0.8},
    {x: 700, y: 100, speed: 1.2}
];

// Controls
function jump() {
    if (isGameOver) {
        resetGame();
        return;
    }
    if (player.jumpCount < player.maxJumps) {
        player.dy = player.jumpPower;
        player.isGrounded = false;
        player.jumpCount++;
        playSound('jump');

        for (let i = 0; i < 4; i++) {
            dustParticles.push({
                x: player.x + 20,
                y: 350,
                dx: (Math.random() - 0.5) * 4,
                dy: -Math.random() * 3,
                radius: Math.random() * 3 + 1,
                alpha: 1
            });
        }
    }
}

document.addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
        e.preventDefault();
        jump();
    }
});
canvas.addEventListener("click", jump);

// Spawn Obstacles & Collectibles
function spawnEntities() {
    if (frameCount % Math.max(45, spawnInterval) === 0) {
        const obstacleHeight = Math.floor(Math.random() * 25) + 35;
        obstacles.push({
            x: canvas.width,
            y: 350 - obstacleHeight,
            width: 25,
            height: obstacleHeight,
            color: "#D32F2F"
        });
    }

    if (frameCount % 90 === 0) {
        const typeRand = Math.random();
        let itemType = "coin";
        let color = "#FFD700";

        if (typeRand > 0.85) {
            itemType = "shield";
            color = "#00B0FF";
        } else if (typeRand > 0.70) {
            itemType = "magnet";
            color = "#E91E63";
        }

        collectibleItems.push({
            x: canvas.width,
            y: Math.random() > 0.5 ? 260 : 180,
            width: 20,
            height: 20,
            type: itemType,
            color: color
        });
    }
}

// Draw Runner Character
function drawPlayer(x, y, width, height) {
    ctx.save();
    ctx.strokeStyle = player.hasShield ? "#00B0FF" : "#1A237E";
    ctx.fillStyle = player.hasShield ? "#00B0FF" : "#1A237E";
    ctx.lineWidth = player.hasShield ? 6 : 4;
    ctx.lineCap = "round";

    const centerX = x + width / 2;
    const headY = y + 12;

    ctx.beginPath();
    ctx.arc(centerX, headY, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(centerX, headY + 10);
    ctx.lineTo(centerX, y + 40);
    ctx.stroke();

    if (!player.isGrounded) {
        ctx.beginPath();
        ctx.moveTo(centerX, headY + 15);
        ctx.lineTo(centerX - 15, headY + 5);
        ctx.moveTo(centerX, headY + 15);
        ctx.lineTo(centerX + 15, headY + 25);
        ctx.moveTo(centerX, y + 40);
        ctx.lineTo(centerX - 12, y + 52);
        ctx.lineTo(centerX - 5, y + 62);
        ctx.moveTo(centerX, y + 40);
        ctx.lineTo(centerX + 15, y + 48);
        ctx.lineTo(centerX + 20, y + 60);
        ctx.stroke();
    } else {
        const cycle = player.animFrame % 4;
        let legOffset = (cycle === 0 || cycle === 2) ? 12 : -12;
        if (cycle === 1 || cycle === 3) legOffset = 0;

        ctx.beginPath();
        ctx.moveTo(centerX, headY + 15);
        ctx.lineTo(centerX - legOffset, headY + 28);
        ctx.moveTo(centerX, headY + 15);
        ctx.lineTo(centerX + legOffset, headY + 28);
        ctx.moveTo(centerX, y + 40);
        ctx.lineTo(centerX + legOffset, y + 64);
        ctx.moveTo(centerX, y + 40);
        ctx.lineTo(centerX - legOffset, y + 64);
        ctx.stroke();
    }

    ctx.restore();
}

function update() {
    if (isGameOver) return;

    frameCount++;
    score++; // স্বাভাবিকভাবে প্রতি ফ্রেমে ১ পয়েন্ট করে বাড়বে

    level = Math.floor(score / 250) + 1;
    const currentSpeed = baseSpeed + (level - 1) * 1.3;
    spawnInterval = 110 - (level - 1) * 10;

    if (player.hasMagnet) {
        player.magnetTimer--;
        if (player.magnetTimer <= 0) player.hasMagnet = false;
    }

    clouds.forEach(cloud => {
        cloud.x -= cloud.speed;
        if (cloud.x + 60 < 0) cloud.x = canvas.width + 50;
    });

    player.dy += player.gravity;
    player.y += player.dy;

    if (player.isGrounded) {
        player.animTimer++;
        if (player.animTimer % 6 === 0) {
            player.animFrame++;
        }
    }

    if (player.y + player.height >= 350) {
        player.y = 350 - player.height;
        player.dy = 0;
        player.isGrounded = true;
        player.jumpCount = 0;
    }

    // Obstacles Collision
    for (let i = 0; i < obstacles.length; i++) {
        let obs = obstacles[i];
        obs.x -= currentSpeed;

        if (
            player.x + 10 < obs.x + obs.width &&
            player.x + player.width - 10 > obs.x &&
            player.y < obs.y + obs.height &&
            player.y + player.height > obs.y
        ) {
            if (player.hasShield) {
                player.hasShield = false;
                obstacles.splice(i, 1);
                playSound('powerup');
            } else {
                isGameOver = true;
                playSound('gameover');

                // High Score এবং Highest Coins আপডেট ও সেভ করা
                if (score > highScore) {
                    highScore = score;
                    localStorage.setItem("advancedRunnerHighScore", highScore);
                }
                if (coins > highestCoins) {
                    highestCoins = coins;
                    localStorage.setItem("advancedRunnerHighestCoins", highestCoins);
                }
            }
        }
    }

    // Collectibles Collision & Magnet
    for (let i = collectibleItems.length - 1; i >= 0; i--) {
        let item = collectibleItems[i];
        item.x -= currentSpeed;

        if (player.hasMagnet && item.type === "coin") {
            let dx = (player.x + player.width / 2) - item.x;
            let dy = (player.y + player.height / 2) - item.y;
            item.x += dx * 0.1;
            item.y += dy * 0.1;
        }

        if (
            player.x < item.x + item.width &&
            player.x + player.width > item.x &&
            player.y < item.y + item.height &&
            player.y + player.height > item.y
        ) {
            if (item.type === "coin") {
                coins += 1;
                score += 50; // প্রতিটি কয়েন ধরলে স্কোরে অতিরিক্ত ৫০ পয়েন্ট যোগ হবে!
                playSound('coin');
            } else if (item.type === "shield") {
                player.hasShield = true;
                playSound('powerup');
            } else if (item.type === "magnet") {
                player.hasMagnet = true;
                player.magnetTimer = 300;
                playSound('powerup');
            }
            collectibleItems.splice(i, 1);
        }
    }

    obstacles = obstacles.filter(obs => obs.x + obs.width > 0);
    collectibleItems = collectibleItems.filter(item => item.x + item.width > 0);

    dustParticles.forEach(p => {
        p.x += p.dx;
        p.y += p.dy;
        p.alpha -= 0.03;
    });
    dustParticles = dustParticles.filter(p => p.alpha > 0);

    spawnEntities();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    clouds.forEach(cloud => {
        ctx.beginPath();
        ctx.arc(cloud.x, cloud.y, 20, 0, Math.PI * 2);
        ctx.arc(cloud.x + 15, cloud.y - 10, 15, 0, Math.PI * 2);
        ctx.arc(cloud.x + 30, cloud.y, 18, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.fillStyle = "#388E3C";
    ctx.fillRect(0, 350, canvas.width, 50);
    ctx.fillStyle = "#8D6E63";
    ctx.fillRect(0, 360, canvas.width, 40);

    dustParticles.forEach(p => {
        ctx.fillStyle = `rgba(200, 200, 200, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
    });

    drawPlayer(player.x, player.y, player.width, player.height);

    for (let obs of obstacles) {
        ctx.fillStyle = obs.color;
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        ctx.strokeStyle = "#5D4037";
        ctx.lineWidth = 2;
        ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
    }

    for (let item of collectibleItems) {
        ctx.fillStyle = item.color;
        ctx.beginPath();
        if (item.type === "coin") {
            ctx.arc(item.x + 10, item.y + 10, 10, 0, Math.PI * 2);
        } else {
            ctx.rect(item.x, item.y, item.width, item.height);
        }
        ctx.fill();
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // UI Text
    ctx.fillStyle = "#000000";
    ctx.font = "bold 16px Arial";
    ctx.fillText("Score: " + score, 20, 30);
    ctx.fillText("Coins: " + coins, 20, 55);
    ctx.fillStyle = "#1A237E";
    ctx.fillText("Level: " + level, 130, 30);
    
    ctx.fillStyle = "#D32F2F";
    ctx.fillText("High Score: " + highScore, 610, 30);
    ctx.fillText("Max Coins: " + highestCoins, 610, 55);

    if (player.hasShield) {
        ctx.fillStyle = "#00B0FF";
        ctx.fillText("🛡️ SHIELD ACTIVE", 310, 30);
    }
    if (player.hasMagnet) {
        ctx.fillStyle = "#E91E63";
        ctx.fillText("🧲 MAGNET ACTIVE", 310, 55);
    }

    // Game Over Screen
    if (isGameOver) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#FF5252";
        ctx.font = "bold 42px Arial";
        ctx.fillText("GAME OVER", 270, 140);

        ctx.fillStyle = "#FFFFFF";
        ctx.font = "19px Arial";
        ctx.fillText("Final Score: " + score + " | Collected Coins: " + coins, 230, 185);
        ctx.fillText("High Score: " + highScore + " | Max Coins: " + highestCoins, 230, 215);
        
        if (score === highScore && score > 0) {
            ctx.fillStyle = "#FFD700";
            ctx.font = "bold 20px Arial";
            ctx.fillText("🎉 New Score Record!", 310, 250);
        }
        if (coins === highestCoins && coins > 0) {
            ctx.fillStyle = "#00B0FF";
            ctx.font = "bold 20px Arial";
            ctx.fillText("🪙 New Coin Record!", 310, 280);
        }

        ctx.fillStyle = "#FFFFFF";
        ctx.font = "18px Arial";
        ctx.fillText("Press Space or Click to Restart", 275, 330);
    }
}

function resetGame() {
    player.y = 280;
    player.dy = 0;
    player.jumpCount = 0;
    player.hasShield = false;
    player.hasMagnet = false;
    obstacles = [];
    collectibleItems = [];
    dustParticles = [];
    score = 0;
    coins = 0;
    level = 1;
    frameCount = 0;
    isGameOver = false;
    gameLoop();
}

function gameLoop() {
    update();
    draw();
    if (!isGameOver) {
        requestAnimationFrame(gameLoop);
    }
}

gameLoop();