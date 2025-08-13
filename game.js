const statusEl = document.getElementById('status');
const resultEl = document.getElementById('result');
const scoreEl = document.getElementById('score');

//const socket = new WebSocket('ws://localhost:3000');
// 建立 WebSocket（來自 config.js）
let socket;
try {
  socket = new WebSocket(BACKEND_WS);
} catch (e) {
  console.error('WebSocket 建立失敗：', e);
  statusEl.textContent = '無法建立 WebSocket，請檢查 BACKEND_WS';
}

function initGame()
{
  try {
    socket = new WebSocket(BACKEND_WS);
  } catch (e) {
    console.error('WebSocket 建立失敗：', e);
    statusEl.textContent = '無法建立 WebSocket，請檢查 BACKEND_WS';
  }
}

function sendChoice(choice) {
  socket.send(JSON.stringify({ type: 'choice', choice }));
  statusEl.textContent = '你已出拳，等待對手...';
}

function enableButtons(enable)
{
  const buttons = document.querySelectorAll('button');
  buttons.forEach(button => {
    button.disabled = !enable;
  });
  if (enable) {
    statusEl.textContent = '請出拳！ ✊✋✌';
  } else {
    statusEl.textContent = '等待對手出拳...';
  }
}

// ==============================

socket.addEventListener('open', () => {
  console.log('✅ 已連線到伺服器');
  statusEl.textContent = '已連線到伺服器，等待配對中...';
});

// 接收結果
socket.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  console.log('📩 收到訊息:', data);

  if (data.type === 'status') {
    statusEl.textContent = data.message;
  }

  if (data.type === 'matched') {
    statusEl.textContent = data.message + '，準備出拳！';
    scoreEl.textContent = '比分：0 - 0';
  }

  if (data.type === 'result') {
    resultEl.textContent = `結果：${data.message}`;
    if (data.score) {
      scoreEl.textContent = `比分：${data.score.self} - ${data.score.opponent}`;
    }
    enableButtons(false);
  }

  if (data.type === 'countdown') {
    statusEl.textContent = data.message;
  }

  if (data.type === 'next') {
    statusEl.textContent = data.message;
    enableButtons(true); // 讓按鈕可以按
  }

  if (data.type === 'gameover') {
    alert(data.message);
    scoreEl.textContent = '比分：0 - 0';
  }

});

socket.addEventListener('close', () => {
  statusEl.textContent = '❌ 與伺服器連線中斷';
});
