let currentXP = 0;
let currentLevel = 1;
const xpPerLevel = 100;

function nextStep(stepId) {
    const activeCard = document.querySelector('.card.active');
    if (activeCard) activeCard.classList.remove('active');

    const nextCard = document.getElementById(stepId);
    if (nextCard) nextCard.classList.add('active');

    // Initialize water if sandbox is opened
    if (stepId === 'sandbox') {
        if (!waterSim) {
            waterSim = new Water();
        } else {
            waterSim.init(); // Recalculate dimensions
        }
    }

    // Play fail SFX and stop music
    if (stepId === 'gameover') {
        const music = document.getElementById('bg-music');
        if (music) music.pause();

        const failSfx = document.getElementById('fail-sfx');
        if (failSfx) {
            failSfx.volume = 1.0;
            failSfx.play();
        }
    }

    if (stepId === 'finish') {
        document.getElementById('final-level-val').innerText = currentLevel;
        document.getElementById('final-xp-val').innerText = currentXP;
    }
}

// Global Interaction Handler (Starts music on first click anywhere)
document.addEventListener('click', () => {
    const music = document.getElementById('bg-music');
    if (music && music.paused) {
        music.volume = 0.15;
        music.play().catch(e => console.log("Autoplay still blocked"));
    }
}, { once: true });

// Global click SFX
document.addEventListener('click', (e) => {
    if (e.target.closest('button') || e.target.closest('.option-btn') || e.target.closest('.spawn-btn')) {
        const clickSfx = document.getElementById('click-sfx');
        if (clickSfx) {
            clickSfx.volume = 1.0; // Max volume for better punch
            clickSfx.currentTime = 0;
            clickSfx.play();
        }
    }
});

let currentSteps = ['intro', 'theory', 'sandbox', 'bio', 'q1', 'q2', 'q3', 'q4', 'q5', 'finish'];

document.addEventListener('DOMContentLoaded', () => {
    shuffleQuestions();
});

function startQuiz() {
    // Find the first question ID in currentSteps after 'bio'
    const bioIndex = currentSteps.indexOf('bio');
    const firstQuestionId = currentSteps[bioIndex + 1];
    nextStep(firstQuestionId);
}

function shuffleQuestions() {
    const questionIds = ['q1', 'q2', 'q3', 'q4', 'q5'];
    const main = document.getElementById('app');

    // Shuffle question array
    for (let i = questionIds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questionIds[i], questionIds[j]] = [questionIds[j], questionIds[i]];
    }

    // Update the steps array with the new order
    currentSteps = ['intro', 'theory', 'sandbox', 'bio', ...questionIds, 'finish'];

    // Re-order DOM and update badges
    questionIds.forEach((id, index) => {
        const card = document.getElementById(id);
        if (card) {
            const badge = card.querySelector('.badge');
            if (badge) badge.innerText = `Otázka ${index + 1}`;
            main.appendChild(card);
        }
    });

    // Ensure gameover and finish stay at the bottom
    main.appendChild(document.getElementById('gameover'));
    main.appendChild(document.getElementById('finish'));
}

let streak = 0;

function checkAnswer(btn, isCorrect, xpReward) {
    const parent = btn.parentElement;
    const buttons = parent.querySelectorAll('.option-btn');
    const feedback = parent.querySelector('.feedback') || parent.nextElementSibling;

    const successMsgs = ["SIGMA ENERGY! +50 XP", "W RIZLLER! +50 XP", "NO CAP! Ty to víš. +50 XP", "GIGACHAD BRAIN! +50 XP"];
    const failMsgs = ["L RATIO! Lockni se.", "SKIBIDI ERROR! Zkus se víc focusnout.", "MID VIBES! To nebylo ono.", "COOKED! Zkus to znova."];

    // Prevent multiple clicks
    if (parent.classList.contains('answered')) return;
    parent.classList.add('answered');

    buttons.forEach(b => b.disabled = true);

    if (isCorrect) {
        streak++;
        btn.classList.add('correct');
        let msg = successMsgs[Math.floor(Math.random() * successMsgs.length)];
        if (streak >= 3) {
            msg = `🔥 STREAK ${streak}! +100 XP (Aura boost)`;
            xpReward = 100;
        }
        feedback.innerText = msg;
        feedback.style.color = "#00ff80";
        addXP(xpReward);
    } else {
        streak = 0;
        btn.classList.add('wrong');
        const msg = failMsgs[Math.floor(Math.random() * failMsgs.length)];
        feedback.innerText = `${msg} (${xpReward} XP)`;
        feedback.style.color = "#ff0055";
        addXP(xpReward);

        // Highlight correct one anyway
        buttons.forEach(b => {
            if (b.innerText.includes('Sinkne') ||
                b.innerText.includes('Vztlaková') ||
                b.innerText.includes('Density') ||
                b.innerText.includes('Syracuse') ||
                b.innerText.includes('vytlačí mega weight')) {
                b.classList.add('correct');
            }
        });
    }

    setTimeout(() => {
        if (currentXP < 0) {
            nextStep('gameover');
            return;
        }

        const currentCardId = btn.closest('.card').id;
        let nextId = 'finish';

        const currentIndex = currentSteps.indexOf(currentCardId);
        if (currentIndex !== -1 && currentIndex < currentSteps.length - 1) {
            nextId = currentSteps[currentIndex + 1];
        }

        nextStep(nextId);
    }, 2000);
}

function addXP(amount) {
    currentXP += amount;

    // Level up logic
    if (currentXP >= xpPerLevel) {
        currentLevel++;
        currentXP -= xpPerLevel;
        showToast(`LEVEL UP! Teď seš Level ${currentLevel} 👑`);
    } else if (amount > 0) {
        showToast(`+${amount} XP! No cap.`);
    } else if (amount < 0) {
        showToast(`${amount} XP! Lockni se.`);
    }

    updateStats();
}

function updateStats() {
    document.getElementById('xp-val').innerText = currentXP;
    document.getElementById('level-val').innerText = currentLevel;

    const fillPercent = (currentXP / xpPerLevel) * 100;
    document.getElementById('xp-fill').style.width = fillPercent + '%';
}

function showToast(text) {
    const toast = document.getElementById('toast');
    toast.innerText = text;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Sandbox Logic: Realistic Water Physics
class Water {
    constructor() {
        this.canvas = document.getElementById('water-canvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.points = [];
        this.count = 40;
        this.currentHeight = 0.5; // Start at 50%
        this.tension = 0.025;
        this.damping = 0.025;
        this.spread = 0.2;

        this.init();
        this.animate();
    }

    init() {
        this.canvas.width = this.canvas.offsetWidth || 600;
        this.canvas.height = this.canvas.offsetHeight || 250;
        this.points = [];
        const targetY = this.canvas.height * (1 - this.currentHeight);
        for (let i = 0; i < this.count; i++) {
            this.points.push({
                x: (this.canvas.width / (this.count - 1)) * i,
                y: targetY,
                v: 0
            });
        }
    }

    splash(x, velocity) {
        if (this.points.length === 0) return;
        const index = Math.round((x / this.canvas.width) * (this.count - 1));
        if (index >= 0 && index < this.count) {
            this.points[index].v = velocity;
            // Also affect neighbors for a "bigger" splash
            if (index > 0) this.points[index - 1].v = velocity * 0.5;
            if (index < this.count - 1) this.points[index + 1].v = velocity * 0.5;
        }
    }

    update() {
        const targetY = this.canvas.height * (1 - this.currentHeight);

        for (let i = 0; i < this.count; i++) {
            const p = this.points[i];
            const diff = targetY - p.y;
            p.v += this.tension * diff - this.damping * p.v;
            p.y += p.v;
        }

        const leftDeltas = new Array(this.count).fill(0);
        const rightDeltas = new Array(this.count).fill(0);

        for (let j = 0; j < 8; j++) {
            for (let i = 0; i < this.count; i++) {
                if (i > 0) {
                    leftDeltas[i] = this.spread * (this.points[i].y - this.points[i - 1].y);
                    this.points[i - 1].v += leftDeltas[i];
                }
                if (i < this.count - 1) {
                    rightDeltas[i] = this.spread * (this.points[i].y - this.points[i + 1].y);
                    this.points[i + 1].v += rightDeltas[i];
                }
            }

            for (let i = 0; i < this.count; i++) {
                if (i > 0) this.points[i - 1].y += leftDeltas[i];
                if (i < this.count - 1) this.points[i + 1].y += rightDeltas[i];
            }
        }
    }

    render() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Back Wave (Multiple layers like the video)
        this.drawWave('rgba(112, 0, 255, 0.3)', 15);
        this.drawWave('rgba(0, 242, 255, 0.2)', 8);

        // Draw Front Wave (Main)
        const grad = this.ctx.createLinearGradient(0, this.canvas.height * (1 - this.currentHeight) - 50, 0, this.canvas.height);
        grad.addColorStop(0, 'rgba(0, 242, 255, 0.8)');
        grad.addColorStop(1, 'rgba(112, 0, 255, 0.5)');
        this.drawWave(grad, 0);

        // Surface Highlight
        this.drawSurface();
    }

    drawWave(style, offset) {
        this.ctx.fillStyle = style;
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.canvas.height);
        this.ctx.lineTo(0, this.points[0].y + offset);

        for (let i = 0; i < this.count - 1; i++) {
            const p1 = this.points[i];
            const p2 = this.points[i + 1];
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            this.ctx.quadraticCurveTo(p1.x, p1.y + offset, midX, midY + offset);
        }

        this.ctx.lineTo(this.canvas.width, this.points[this.count - 1].y + offset);
        this.ctx.lineTo(this.canvas.width, this.canvas.height);
        this.ctx.closePath();
        this.ctx.fill();
    }

    drawSurface() {
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.points[0].y);
        for (let i = 0; i < this.count - 1; i++) {
            const p1 = this.points[i];
            const p2 = this.points[i + 1];
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            this.ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
        }
        this.ctx.strokeStyle = '#00f2ff';
        this.ctx.lineWidth = 4;
        this.ctx.stroke();
    }

    animate() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.animate());
    }
}

let waterSim;
document.addEventListener('DOMContentLoaded', () => {
    shuffleQuestions();
    // Initialize if we are somehow starting on sandbox
    if (document.getElementById('sandbox').classList.contains('active')) {
        waterSim = new Water();
    }
});

const objectTypes = {
    banana: { emoji: '🍌', density: 0.9, name: 'Banana', splash: 8 },
    metalBall: { emoji: '🎱', density: 7.8, name: 'Heavy Ball', splash: 25 },
    feather: { emoji: '🍃', density: 0.1, name: 'Leaf', splash: 2 },
    ice: { emoji: '🧊', density: 0.92, name: 'Ice', splash: 10 }
};

function spawnObject(type) {
    const tank = document.getElementById('tank');
    const objectsInTank = document.getElementById('objects-in-tank');
    const info = document.getElementById('buoyancy-info');
    const objData = objectTypes[type];

    if (!tank || !objectsInTank || !waterSim) return;

    const div = document.createElement('div');
    div.className = 'sim-object';
    div.innerText = objData.emoji;

    const left = Math.random() * (tank.clientWidth - 60);
    div.style.left = left + 'px';
    div.style.top = '-60px';

    objectsInTank.appendChild(div);

    setTimeout(() => {
        const waterTop = tank.clientHeight * (1 - waterSim.currentHeight);
        let targetTop;
        let infoText = "";

        if (objData.density < 1) {
            targetTop = waterTop - 40;
            infoText = `W! ${objData.name} floatuje. Menší density než voda. No cap.`;
            waterSim.currentHeight += 0.01;
        } else {
            targetTop = tank.clientHeight - 60;
            infoText = `L ratio! ${objData.name} sinkuje. Je moc thicc.`;
            waterSim.currentHeight += 0.03;
        }

        div.style.top = targetTop + 'px';
        info.innerText = infoText;

        // Trigger Splash
        setTimeout(() => {
            waterSim.splash(left + 30, objData.splash);
            const splashSfx = document.getElementById('splash-sfx');
            if (splashSfx) {
                splashSfx.volume = 0.5;
                splashSfx.currentTime = 0;
                splashSfx.play().catch(() => { });
            }
        }, 300); // Approximate time of impact

        setTimeout(() => {
            div.style.opacity = '0';
            setTimeout(() => {
                div.remove();
                waterSim.currentHeight -= (objData.density < 1 ? 0.01 : 0.03);
            }, 1000);
        }, 5000);
    }, 100);
}
