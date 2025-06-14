// ===================== 基本變數 ===================== //
let currentDate = new Date();
let selectedDate = null;
let notes = {}; // 從伺服器載入

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


// ===================== 登入註冊 ===================== //
function showLoginForm() {
    document.getElementById('loginForm').style.display = 'block';
}
function closeLoginForm() {
    document.getElementById('loginForm').style.display = 'none';
}
function showRegisterForm() {
    document.getElementById('registerForm').style.display = 'block';
}
function closeRegisterForm() {
    document.getElementById('registerForm').style.display = 'none';
}

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
    fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    }).then(res => res.json())
      .then(data => {
          if (data.error) alert(data.error);
          else {
              alert('登入成功');
              window.location.reload();
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
