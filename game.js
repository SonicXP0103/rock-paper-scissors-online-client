const statusEl = document.getElementById('status');
const resultEl = document.getElementById('result');
const scoreEl = document.getElementById('score');
let socket;
let round = 0;
let shouldClearHistory = false;

function initGame()
{
  // 建立 WebSocket（來自 config.js）
  try {
    socket = new WebSocket(BACKEND_WS);
  } catch (e) {
    console.error('WebSocket 建立失敗：', e);
    statusEl.textContent = '無法建立 WebSocket，請檢查 BACKEND_WS';
  }
}

// 註冊監聽事件
function registerEventListeners()
{
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

    if (data.type === 'result')
    {
      resultEl.textContent = `結果：${data.message}`;
      if (data.score) {
        scoreEl.textContent = `比分：${data.score.self} - ${data.score.opponent}`;
      }

      // 這裡新增呼叫 addHistory
      addHistory(
        data.selfChoice,     // 玩家出拳
        data.opponentChoice, // 對手出拳
        data.message.includes("贏") ? "win" :
        data.message.includes("輸") ? "lose" : "draw"
      );

      enableButtons(false);
      enableChoices(false); // 禁止點擊圖片
    }

    // 倒數計時
    if (data.type === 'countdown') {
      statusEl.textContent = data.message;
    }

    if (data.type === 'gameover')
    {
      alert(data.message);
      scoreEl.textContent = '比分：0 - 0';
      shouldClearHistory = true; // 設定清除歷史紀錄的旗標
    }

    if (data.type === 'next')
    {
      statusEl.textContent = data.message;
      enableButtons(true); // 讓按鈕可以按
      enableChoices(true); // 讓圖片可以點擊

      // 清除歷史紀錄
      if (shouldClearHistory)
      {
        document.getElementById("historyBody").innerHTML = "";
        round = 0;
        shouldClearHistory = false; // 重置旗標
      }    
    }

  });

  socket.addEventListener('close', () => {
    statusEl.textContent = '❌ 與伺服器連線中斷';
  });

  document.querySelectorAll('.choice').forEach(img => {
    img.addEventListener('click', () => {
      const choice = img.dataset.choice; // 讀 data-choice
      sendChoice(choice);
      enableChoices(false); // 點完就不能再選
    });
  });  
}


function sendChoice(choice) {
  socket.send(JSON.stringify({ type: 'choice', choice }));
  statusEl.textContent = '你已出拳，等待對手...';
}

// 啟用或禁用按鈕
function enableButtons(enable)
{
  const buttons = document.querySelectorAll('button');
  buttons.forEach(button => {
    button.disabled = !enable;
  });
  if (enable) {
    statusEl.textContent = '請出拳！ ✌✊✋';
  } else {
    statusEl.textContent = '等待對手出拳...';
  }
}

// 啟用或禁用圖片選擇
function enableChoices(enable) {
  const choices = document.querySelectorAll('.choice');
  choices.forEach(img => {
    if (enable) {
      img.style.pointerEvents = "auto"; // 可點
      img.style.opacity = "1";
    } else {
      img.style.pointerEvents = "none"; // 禁止點擊
      img.style.opacity = "0.5";
    }
  });
  statusEl.textContent = enable ? '請選擇你的出拳 ✌✊✋' : '等待對手出拳...';
}

function addHistory(playerMove, opponentMove, result)
{
  round++;
  const historyBody = document.getElementById("historyBody");

  const row = document.createElement("tr");

  // 顏色強調結果
  let resultText = "";
  let color = "";
  if (result === "win") {
    resultText = "勝";
    color = "green";
  } else if (result === "lose") {
    resultText = "敗";
    color = "red";
  } else {
    resultText = "平";
    color = "gray";
  }

  row.innerHTML = `
    <td>${round}</td>
    <td>${translateMove(playerMove)}</td>
    <td>${translateMove(opponentMove)}</td>
    <td style="color:${color}; font-weight:bold;">${resultText}</td>
  `;

  historyBody.appendChild(row);
}

// 小工具：轉換拳種
function translateMove(move)
{
  switch (move) {
    case "scissors": return "✌";
    case "rock": return "✊";
    case "paper": return "✋";
    default: return move;
  }
}

// ==============================

initGame();

registerEventListeners();
