const WebSocket = require('ws');
const http = require('http');

const server = http.createServer();
const wss = new WebSocket.Server({ server });

const WIN_SCORE = 3;
const COUNTDOWN_SECONDS = 3;

// ==============================

class Player {
  constructor(ws) {
    this.ws = ws;
    this.score = 0;
    this.choice = null;
    this.room = null;
  }

  send(data) {
    this.ws.send(JSON.stringify(data));
  }

  reset() {
    this.score = 0;
    this.choice = null;
  }
}

class Room {
  constructor(id, player1, player2) {
    this.id = id;
    this.players = [player1, player2];
    player1.room = this;
    player2.room = this;
    console.log(`✅ 房間 ${id} 建立完成`);

    player1.send({ type: 'matched', message: '配對成功！你是玩家 1' });
    player2.send({ type: 'matched', message: '配對成功！你是玩家 2' });
  }

  compareChoices(choice1, choice2) {
    if (choice1 === choice2) return { winner: 'draw', msg1: '平手', msg2: '平手' };
    const wins = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
    if (wins[choice1] === choice2) return { winner: 'p1', msg1: '你贏了 🎉', msg2: '你輸了 😢' };
    return { winner: 'p2', msg1: '你輸了 😢', msg2: '你贏了 🎉' };
  }

  handleChoice(player, choice) {
    player.choice = choice;

    const [p1, p2] = this.players;
    if (p1.choice && p2.choice) {
      const result = this.compareChoices(p1.choice, p2.choice);

      if (result.winner === 'p1') p1.score++;
      else if (result.winner === 'p2') p2.score++;

      p1.send({ type: 'result', message: result.msg1, score: { self: p1.score, opponent: p2.score } });
      p2.send({ type: 'result', message: result.msg2, score: { self: p2.score, opponent: p1.score } });

      if (p1.score >= WIN_SCORE || p2.score >= WIN_SCORE) {
        p1.send({ type: 'gameover', message: p1.score >= WIN_SCORE ? '你贏得整場比賽 🏆' : '你輸掉整場比賽 😢' });
        p2.send({ type: 'gameover', message: p2.score >= WIN_SCORE ? '你贏得整場比賽 🏆' : '你輸掉整場比賽 😢' });
        p1.reset();
        p2.reset();
      }

      p1.choice = p2.choice = null;
      this.startCountdown();
    }
  }

  startCountdown() {
    let countdown = COUNTDOWN_SECONDS;
    const [p1, p2] = this.players;

    const timer = setInterval(() => {
      p1.send({ type: 'countdown', message: `下一局 ${countdown} 秒後開始...` });
      p2.send({ type: 'countdown', message: `下一局 ${countdown} 秒後開始...` });
      countdown--;

      if (countdown < 0) {
        clearInterval(timer);
        p1.send({ type: 'next', message: '請出拳！ ✊✋✌' });
        p2.send({ type: 'next', message: '請出拳！ ✊✋✌' });
      }
    }, 1000);
  }
}

class GameServer {
  constructor() {
    this.waitingPlayers = [];
    this.roomIdCounter = 1;

    const server = http.createServer();
    this.wss = new WebSocket.Server({ server });
    this.wss.on('connection', (ws) => this.onConnection(ws));

    server.listen(3000, () => console.log('✅ 伺服器啟動於 ws://localhost:3000'));
  }

  onConnection(ws) {
    console.log('🟢 玩家連線');
    const player = new Player(ws);
    player.send({ type: 'status', message: '已連線，等待配對中...' });

    this.waitingPlayers.push(player);
    this.tryMatchPlayers();

    ws.on('message', (msg) => {
      const data = JSON.parse(msg);
      if (data.type === 'choice' && player.room) {
        player.room.handleChoice(player, data.choice);
      }
    });

    ws.on('close', () => {
      console.log('🔴 玩家離線');
      this.waitingPlayers = this.waitingPlayers.filter(p => p !== player);
    });
  }

  tryMatchPlayers() {
    if (this.waitingPlayers.length >= 2) {
      const p1 = this.waitingPlayers.shift();
      const p2 = this.waitingPlayers.shift();
      new Room(`room-${this.roomIdCounter++}`, p1, p2);
    }
  }
}

// ==============================

const gameServer = new GameServer();
