// 제공해주신 웹 앱의 Firebase 구성 설정
const firebaseConfig = {
  apiKey: "AIzaSyBTuRrT-cdGRrBchKiIrHdzAebPini9ww0",
  authDomain: "memojang-6be54.firebaseapp.com",
  projectId: "memojang-6be54",
  storageBucket: "memojang-6be54.firebasestorage.app",
  messagingSenderId: "387820809656",
  appId: "1:387820809656:web:20ff72e7db62d1df38734d"
};

// 1. Firebase 및 Firestore 초기화
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// DOM 요소 선택
const memoForm = document.getElementById('memo-form');
const memoTitle = document.getElementById('memo-title');
const memoContent = document.getElementById('memo-content');
const submitBtn = document.getElementById('submit-btn');
const cancelBtn = document.getElementById('cancel-btn');
const memoList = document.getElementById('memo-list');

// 현재 수정 중인 메모의 ID 관리 (null이면 작성 모드, 값이 있으면 수정 모드)
let editId = null;

// 2. [READ] 실시간 메모 목록 불러오기
// 'memos' 컬렉션에서 생성시간(createdAt) 내림차순으로 데이터 정렬 후 감시
db.collection('memos').orderBy('createdAt', 'desc').onSnapshot((snapshot) => {
  memoList.innerHTML = ''; // 목록 비우기
  
  if (snapshot.empty) {
    memoList.innerHTML = '<p class="no-memo">작성된 메모가 없습니다. 첫 메모를 남겨보세요!</p>';
    return;
  }

  snapshot.forEach((doc) => {
    const memo = doc.data();
    const id = doc.id;

    // 안전한 화면 출력을 위한 이스케이프 처리 및 요소 생성
    const memoCard = document.createElement('div');
    memoCard.className = 'memo-card';
    memoCard.innerHTML = `
      <h3>${escapeHtml(memo.title)}</h3>
      <p>${escapeHtml(memo.content)}</p>
      <div class="memo-actions">
        <button class="edit-btn" data-id="${id}" data-title="${escapeHtml(memo.title)}" data-content="${escapeHtml(memo.content)}">수정</button>
        <button class="delete-btn" data-id="${id}">삭제</button>
      </div>
    `;
    memoList.appendChild(memoCard);
  });
}, (error) => {
  console.error("데이터 읽기 오류:", error);
  memoList.innerHTML = '<p class="no-memo">데이터를 불러오는 중 오류가 발생했습니다. 규칙(Rules)을 확인하세요.</p>';
});

// 3. [CREATE & UPDATE] 메모 저장 이벤트
memoForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const title = memoTitle.value.trim();
  const content = memoContent.value.trim();

  if (!title || !content) return;

  try {
    if (editId === null) {
      // [CREATE] 새 메모 등록
      await db.collection('memos').add({
        title: title,
        content: content,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } else {
      // [UPDATE] 기존 메모 수정
      await db.collection('memos').doc(editId).update({
        title: title,
        content: content,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      resetForm();
    }
    memoForm.reset();
  } catch (error) {
    console.error("저장 오류 발생:", error);
    alert("메모를 저장하지 못했습니다. 콘솔 창을 확인하세요.");
  }
});

// 4. [DELETE 및 수정모드 전환] 이벤트 위임(Event Delegation) 활용
memoList.addEventListener('click', async (e) => {
  const target = e.target;
  const id = target.dataset.id;

  // [DELETE] 삭제 버튼을 눌렀을 때
  if (target.classList.contains('delete-btn')) {
    if (confirm('이 메모를 삭제하시겠습니까?')) {
      try {
        await db.collection('memos').doc(id).delete();
        // 수정 중이던 메모를 삭제했다면 입력 폼 초기화
        if (editId === id) resetForm();
      } catch (error) {
        console.error("삭제 오류 발생:", error);
      }
    }
  } 
  // 수정 버튼을 눌렀을 때 (폼으로 데이터 전송 및 수정 모드 셋팅)
  else if (target.classList.contains('edit-btn')) {
    editId = id;
    memoTitle.value = target.dataset.title;
    memoContent.value = target.dataset.content;
    
    submitBtn.textContent = '메모 수정';
    cancelBtn.classList.remove('hidden');
    
    // 화면 최상단 폼 위치로 부드럽게 스크롤 이동
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

// 수정 취소 버튼 클릭 이벤트
cancelBtn.addEventListener('click', () => {
  memoForm.reset();
  resetForm();
});

// 폼 상태 초기화 함수
function resetForm() {
  editId = null;
  submitBtn.textContent = '메모 저장';
  cancelBtn.classList.add('hidden');
}

// XSS(보안 공격) 방지를 위한 텍스트 치환 함수
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
