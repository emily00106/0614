// ===================== 基本變數 ===================== //
let currentDate = new Date();
let selectedDate = null;
let notes = {}; // 從伺服器載入

// ===================== 初始化 ===================== //
function loadNotes() {
    fetch('/notes')
        .then(res => res.json())
        .then(data => {
            notes = data;
            renderCalendar();
            if (selectedDate) showCurrentNotes();
        });
}

document.addEventListener('DOMContentLoaded', () => {
    // 等待所有內容加載完成後再執行
    renderCalendar();  // 先渲染行事曆
    loadNotes();  // 然後載入備註資料

    // 控制備註顯示/隱藏的功能
    const toggleBtn = document.getElementById('toggleNoteBtn');
    const noteInput = document.getElementById('noteInput');
    toggleBtn.addEventListener('click', () => {
        if (noteInput.classList.contains('open')) {
            noteInput.classList.remove('open');
            toggleBtn.textContent = '展開備註';
        } else {
            noteInput.classList.add('open');
            toggleBtn.textContent = '收起備註';
        }
    });
    loadNotes();
});




// ===================== 日曆渲染 ===================== //
function renderCalendar() {
    const monthTitle = document.getElementById('monthTitle');
    const calendarBody = document.getElementById('calendarBody');

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    monthTitle.textContent = `${year}年 ${month + 1}月`;

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const numDays = lastDay.getDate();
    const firstDayOfWeek = firstDay.getDay();

    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    calendarBody.innerHTML = '';
    let day = 1;

    for (let row = 0; row < 6; row++) {
        const tr = document.createElement('tr');
        for (let col = 0; col < 7; col++) {
            const td = document.createElement('td');

            if ((row === 0 && col >= firstDayOfWeek) || (row > 0 && day <= numDays)) {
                td.textContent = day;

                const paddedMonth = String(month + 1).padStart(2, '0');
                const paddedDay = String(day).padStart(2, '0');
                const key = `${year}-${paddedMonth}-${paddedDay}`;

                td.setAttribute('data-date', key);
                td.onclick = () => selectDate(key);

                if (key === todayKey) td.classList.add('today');

                if (notes[key]) {
                    td.style.backgroundColor = '#f0f0f0';
                    const noteDiv = document.createElement('div');
                    noteDiv.className = 'note-text';
                    notes[key].forEach(item => {
                        const itemDiv = document.createElement('div');
                        itemDiv.className = 'note-line';
                        itemDiv.textContent = item.text;
                        noteDiv.appendChild(itemDiv);
                    });
                    td.appendChild(document.createElement('br'));
                    td.appendChild(noteDiv);
                }
                day++;
            }
            tr.appendChild(td);
        }
        calendarBody.appendChild(tr);
        if (day > numDays) break;
    }
}

function changeMonth(offset) {
    currentDate.setMonth(currentDate.getMonth() + offset);
    renderCalendar();
}

function selectDate(dateKey) {
    selectedDate = dateKey;
    const noteInput = document.getElementById('noteInput');
    const toggleBtn = document.getElementById('toggleNoteBtn');
    noteInput.classList.add('open');
    toggleBtn.textContent = '收起備註';
    document.getElementById('noteText').value = '';
    showCurrentNotes();
}

function showCurrentNotes() {
    const container = document.getElementById('existingNotes');
    container.innerHTML = '';
    const dayNotes = notes[selectedDate] || [];
    dayNotes.forEach(note => {
        const itemDiv = document.createElement('div');
        const label = document.createElement('span');
        label.textContent = note.text;
        const delBtn = document.createElement('button');
        delBtn.textContent = '🗑';
        delBtn.onclick = () => deleteNote(note.id);
        itemDiv.appendChild(label);
        itemDiv.appendChild(delBtn);
        container.appendChild(itemDiv);
    });
}

// function saveNote() {
//     const text = document.getElementById('noteText').value.trim();
//     if (!text || !selectedDate) return;

//     fetch('/notes', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ date: selectedDate, text })
//     })
//     .then(res => res.json())
//     .then(() => {
//         loadNotes();
//         document.getElementById('noteText').value = '';
//     });
// }

// function deleteNote(noteId) {
//     fetch(`/notes/${noteId}`, { method: 'DELETE' })
//     .then(res => res.json())
//     .then(() => loadNotes());
// }
function saveNote() {
    const text = document.getElementById('noteText').value.trim();
    if (!text || !selectedDate) return;

    fetch('/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, text })
    })
    .then(res => {
        if (!res.ok) return res.json().then(data => { throw data; });
        return res.json();
    })
    .then(() => {
        loadNotes();
        document.getElementById('noteText').value = '';
    })
    .catch(err => {
        alert(err.error || '發生錯誤，請稍後再試');
    });
}

function resetNotes() {
    alert('請逐筆刪除備註，或清除資料庫資料。');
}

function cancelEdit() {
    document.getElementById('noteInput').classList.remove('open');
    selectedDate = null;
}

function deleteNote(noteId) {
    fetch(`/notes/${noteId}`, { method: 'DELETE' })
        .then(res => res.json())
        .then(() => loadNotes());
}


// ===================== 付款功能 ===================== //
// 顯示當前時間（年月日時分秒）
function displayCurrentTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    const currentTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    document.getElementById('current-time').textContent = currentTime;
}

// 每秒更新一次時間
setInterval(displayCurrentTime, 1000);

// 當付款按鈕被點擊時
document.getElementById('payment-button').addEventListener('click', function() {
    const amount = document.getElementById('amount').value;

    // 檢查金額是否為 0 或空
    if (amount === '' || parseFloat(amount) === 0) {
        alert('金額不能為0');
        return;
    }

    // 顯示懸浮視窗
    document.getElementById('success-modal').style.display = 'block';
    document.getElementById('modal-overlay').style.display = 'block';

    // 等待幾秒鐘後跳轉到首頁
    setTimeout(function() {
        window.location.href = "/";  // 跳轉到首頁
    }, 2000);
});

// 點擊背景時隱藏懸浮視窗
document.getElementById('modal-overlay').addEventListener('click', function() {
    document.getElementById('success-modal').style.display = 'none';
    document.getElementById('modal-overlay').style.display = 'none';
});






// ===================== 登入註冊 ===================== //
// 顯示登入表單和背景遮罩
function showLoginForm() {
    // 顯示背景遮罩
    document.getElementById('login-page').style.display = 'flex';

    // 顯示登入表單
    document.getElementById('loginForm').style.display = 'block';
}

// 關閉登入表單和背景遮罩
function closeLoginForm() {
    // 隱藏背景遮罩
    document.getElementById('login-page').style.display = 'none';

    // 隱藏登入表單
    document.getElementById('loginForm').style.display = 'none';
}

// function showRegisterForm() {
//     document.getElementById('registerForm').style.display = 'block';
// }
// function closeRegisterForm() {
//     document.getElementById('registerForm').style.display = 'none';
// }

function register() {
    const username = document.getElementById('registerUsername').value.trim();
    const password = document.getElementById('registerPassword').value;
    fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    }).then(res => res.json())
      .then(data => {
          if (data.error) alert(data.error);
          else {
              alert('註冊成功！');
              closeRegisterForm();
          }
      });
}

function login() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    // 發送登入請求
    fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) 
            alert(data.error);
        else{
            // 登入成功
            alert('登入成功');

            // 刷新頁面後應用儲存的顏色
            window.location.reload();  // 強制重新載入，確保顏色選擇區顯示
        }
    });
}




function logout() {
    fetch('/logout')
        .then(() => window.location.reload());
}

function resetAll() {
    if (!confirm("⚠️ 確定要刪除所有使用者與備註？這個操作無法還原！")) return;

    fetch('/admin/reset', { method: 'DELETE' })
        .then(res => res.json())
        .then(data => {
            alert(data.message || '已重置');
            window.location.reload();
        })
        .catch(() => alert('操作失敗'));
}





