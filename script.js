// Global değişkenler olarak tanımlandı, böylece her yerden erişilebilirler
let memories = [];
let poems = [];
let specialDays = [];

// Sayfa yüklendiğinde mevcut kullanıcıyı belirle ve ilgili fonksiyonları çağır
document.addEventListener('DOMContentLoaded', async () => {
    // Önce kullanıcı adını belirle
    const usernameDisplay = document.getElementById('usernameDisplay');
    if (usernameDisplay) {
        // Kullanıcı adına göre hoş geldin metnini güncelle (örneğin welcome.html'den geliyorsa)
        // Eğer login mekanizması yoksa, varsayılan olarak Yusuf veya Ilayda olarak ayarlanabilir
        if (usernameDisplay.textContent === "Yusuf'um" || usernameDisplay.textContent === "Ilayda'm") {
            // Kullanıcı adı zaten ayarlıysa bir şey yapma
        } else {
            // Varsayılan kullanıcıyı ayarla
            usernameDisplay.textContent = "Yusuf'um"; // Başlangıçta Yusuf olarak kabul edelim
        }
    }

    // Yorum satırı olan migrateLocalStorageDataToFirebase() fonksiyonunu bir kez çalıştırmak için
    // bu satırı aktif edip (yorum işaretlerini kaldırıp), sayfayı bir kez yenileyin.
    // Veriler Firebase'e taşındıktan sonra bu satırı tekrar yorum satırı yapmayı UNUTMAYIN!
    // await migrateLocalStorageDataToFirebase();

    // Tüm verileri Firebase'den yükle
    await loadMemories();
    await loadPoems();
    await loadSpecialDays();
    await loadMood(); // Ruh halini de yükle

    // Gerekli dinleyicileri ata
    assignEventListeners();

    // Eğer URL'de bir tarih parametresi varsa, o tarihe git
    const selectedDateFromUrl = new URLSearchParams(window.location.search).get('date');
    if (selectedDateFromUrl) {
        showMemoryForDate(selectedDateFromUrl);
    } else {
        // En son anıyı göster veya anı yoksa boş hali göster
        if (memories.length > 0) {
            displayMemory(memories[0]);
        } else {
            displayEmptyMemory(); // Henüz anı yoksa
        }
    }

    // Countdown'ı başlat
    updateCountdown();
    setInterval(updateCountdown, 1000 * 60 * 60); // Saatlik güncelleme
});


// !!! DİKKAT: BU FONKSİYONU SADECE BİR KERE ÇALIŞTIRIN, ESKİ VERİLERİNİZİ TAŞIDIKTAN SONRA YORUM SATIRI YAPINIZ !!!
/*
async function migrateLocalStorageDataToFirebase() {
    const currentUser = document.getElementById('usernameDisplay').textContent === "Yusuf'um" ? 'Yusuf' : 'Ilayda';

    // Anıları taşı
    const localMemories = JSON.parse(localStorage.getItem(`${currentUser}_memories`) || '[]');
    for (const mem of localMemories) {
        await addDoc(collection(db, `users/${currentUser}/memories`), mem);
    }
    console.log('Anılar Firebase\'e taşındı.');
    localStorage.removeItem(`${currentUser}_memories`); // Yerelden sil

    // Şiirleri taşı
    const localPoems = JSON.parse(localStorage.getItem(`${currentUser}_poems`) || '[]');
    for (const p of localPoems) {
        await addDoc(collection(db, `users/${currentUser}/poems`), p);
    }
    console.log('Şiirler Firebase\'e taşındı.');
    localStorage.removeItem(`${currentUser}_poems`); // Yerelden sil

    // Özel günleri taşı
    const localSpecialDays = JSON.parse(localStorage.getItem(`${currentUser}_specialDays`) || '[]');
    for (const sd of localSpecialDays) {
        await addDoc(collection(db, `users/${currentUser}/specialDays`), sd);
    }
    console.log('Özel günler Firebase\'e taşındı.');
    localStorage.removeItem(`${currentUser}_specialDays`); // Yerelden sil

    // Ruh hallerini taşı (Eğer sadece sonuncuyu saklamak istiyorsan)
    const localMood = localStorage.getItem(`${currentUser}_mood`);
    const localPartnerMood = localStorage.getItem(`${currentUser}_partner_mood`);
    const localMoodReason = localStorage.getItem(`${currentUser}_mood_reason`);
    if (localMood) {
        await addDoc(collection(db, `users/${currentUser}/moods`), {
            timestamp: new Date().toISOString(),
            mood: localMood,
            partnerMood: localPartnerMood,
            reason: localMoodReason
        });
    }
    console.log('Ruh halleri Firebase\'e taşındı.');
    localStorage.removeItem(`${currentUser}_mood`);
    localStorage.removeItem(`${currentUser}_partner_mood`);
    localStorage.removeItem(`${currentUser}_mood_reason`);

    alert('Tüm yerel veriler Firebase\'e taşındı ve yerelden silindi!');
    // Sayfayı yenile ve migrateLocalStorageDataToFirebase() çağrısını yorum satırı yapmayı unutma!
}
*/
// migrateLocalStorageDataToFirebase(); // Verileri taşımak için bu satırı uncomment edin, sonra yorum satırı yapın!


// Yardımcı Fonksiyon: Güncel kullanıcıyı al
function getCurrentUser() {
    const usernameDisplay = document.getElementById('usernameDisplay');
    return usernameDisplay.textContent === "Yusuf'um" ? 'Yusuf' : 'Ilayda';
}


// --- Anı Yönetimi (Memories) ---

// Anıları Firebase'den yükle
async function loadMemories() {
    const currentUser = getCurrentUser();
    memories = []; // Mevcut anıları temizle

    const querySnapshot = await getDocs(collection(db, `users/${currentUser}/memories`));
    querySnapshot.forEach((doc) => {
        memories.push({ id: doc.id, ...doc.data() });
    });

    // Tarihe göre sırala (en yeniden en eskiye)
    memories.sort((a, b) => new Date(b.date) - new Date(a.date));

    updateMemoryList(); // Anı listesini güncelle
}

// Yeni anı ekleme/kaydetme fonksiyonu
async function saveMemory(memory) {
    const currentUser = getCurrentUser();
    if (memory.id) {
        // Mevcut anıyı güncelle
        const memoryRef = doc(db, `users/${currentUser}/memories`, memory.id);
        await updateDoc(memoryRef, memory);
        console.log("Anı güncellendi: ", memory.id);
    } else {
        // Yeni anı ekle
        const docRef = await addDoc(collection(db, `users/${currentUser}/memories`), memory);
        memory.id = docRef.id; // Yeni eklenen anının id'sini ata
        console.log("Yeni anı eklendi ID: ", docRef.id);
    }
    await loadMemories(); // Anıları yeniden yükle
    updateMemoryList(); // Anı listesini güncelle
}

// Anı silme fonksiyonu
async function deleteMemory(memoryId) {
    const currentUser = getCurrentUser();
    await deleteDoc(doc(db, `users/${currentUser}/memories`, memoryId));
    console.log("Anı silindi: ", memoryId);
    await loadMemories(); // Anıları yeniden yükle
    updateMemoryList(); // Anı listesini güncelle
    displayEmptyMemory(); // Boş anı göster
}

// Anıyı göster
function displayMemory(memory) {
    const memoryDisplay = document.getElementById('memoryDisplay');
    memoryDisplay.innerHTML = `
        <h3 id="memoryDate">${memory.date}</h3>
        <p id="memoryContent">${memory.content.replace(/\n/g, '<br>')}</p>
        <button id="editMemoryBtn">Düzenle</button>
        <button id="deleteMemoryBtn">Sil</button>
    `;
    document.getElementById('editMemoryBtn').onclick = () => editMemory(memory.id);
    document.getElementById('deleteMemoryBtn').onclick = () => deleteMemory(memory.id);
}

// Anı formunu göster
function showMemoryForm(memory = {}) {
    document.getElementById('memoryDateInput').value = memory.date || '';
    document.getElementById('memoryContentInput').value = memory.content || '';
    document.getElementById('memoryIdInput').value = memory.id || ''; // Eğer güncelleme ise ID'yi tut
    document.getElementById('memoryModal').style.display = 'block';
}

// Anı formunu kapat
function closeMemoryForm() {
    document.getElementById('memoryModal').style.display = 'none';
    document.getElementById('memoryForm').reset();
    document.getElementById('memoryIdInput').value = ''; // ID'yi temizle
}

// Anıyı düzenle
function editMemory(id) {
    const memoryToEdit = memories.find(mem => mem.id === id);
    if (memoryToEdit) {
        showMemoryForm(memoryToEdit);
    }
}

// Tarihe göre anıyı göster
function showMemoryForDate(date) {
    const foundMemory = memories.find(mem => mem.date === date);
    if (foundMemory) {
        displayMemory(foundMemory);
    } else {
        displayEmptyMemory();
        // Eğer belirli bir tarihte anı yoksa, formda o tarihi hazır göster
        document.getElementById('addMemoryBtn').click(); // Anı ekle butonuna tıkla
        document.getElementById('memoryDateInput').value = date;
    }
}

// Anı listesini güncelle
function updateMemoryList() {
    const memoryList = document.getElementById('memoryList');
    memoryList.innerHTML = '';
    memories.forEach(memory => {
        const li = document.createElement('li');
        const link = document.createElement('a');
        link.href = `#`; // Linki geçersiz kıl
        link.textContent = memory.date;
        link.onclick = (e) => {
            e.preventDefault(); // Varsayılan link davranışını engelle
            displayMemory(memory);
        };
        li.appendChild(link);
        memoryList.appendChild(li);
    });
}

// Boş anı göster (hiç anı yoksa)
function displayEmptyMemory() {
    const memoryDisplay = document.getElementById('memoryDisplay');
    memoryDisplay.innerHTML = '<p>Henüz bu tarihte bir anı yok.</p>';
}


// --- Şiir Yönetimi (Poems) ---

// Şiirleri Firebase'den yükle
async function loadPoems() {
    const currentUser = getCurrentUser();
    poems = []; // Mevcut şiirleri temizle

    const querySnapshot = await getDocs(collection(db, `users/${currentUser}/poems`));
    querySnapshot.forEach((doc) => {
        poems.push({ id: doc.id, ...doc.data() });
    });

    updatePoemList(); // Şiir listesini güncelle
}

// Yeni şiir ekleme/kaydetme fonksiyonu
async function addPoem(poem) {
    const currentUser = getCurrentUser();
    if (poem.id) {
        // Mevcut şiiri güncelle
        const poemRef = doc(db, `users/${currentUser}/poems`, poem.id);
        await updateDoc(poemRef, poem);
        console.log("Şiir güncellendi: ", poem.id);
    } else {
        // Yeni şiir ekle
        const docRef = await addDoc(collection(db, `users/${currentUser}/poems`), poem);
        poem.id = docRef.id; // Yeni eklenen şiirin id'sini ata
        console.log("Yeni şiir eklendi ID: ", docRef.id);
    }
    await loadPoems(); // Şiirleri yeniden yükle
    updatePoemList(); // Şiir listesini güncelle
}

// Şiir silme fonksiyonu
async function deletePoem(poemId) {
    const currentUser = getCurrentUser();
    await deleteDoc(doc(db, `users/${currentUser}/poems`, poemId));
    console.log("Şiir silindi: ", poemId);
    await loadPoems(); // Şiirleri yeniden yükle
    updatePoemList(); // Şiir listesini güncelle
    displayPoem(null); // Şiiri gösterimini sıfırla
}

// Şiir listesini güncelle
function updatePoemList() {
    const poemList = document.getElementById('poemList');
    poemList.innerHTML = '';
    poems.forEach(poem => {
        const li = document.createElement('li');
        const link = document.createElement('a');
        link.href = `#`;
        link.textContent = poem.title;
        link.onclick = (e) => {
            e.preventDefault();
            displayPoem(poem);
        };
        li.appendChild(link);
        poemList.appendChild(li);
    });
}

// Şiiri göster
function displayPoem(poem) {
    const poemDisplay = document.getElementById('poemDisplay');
    if (poem) {
        poemDisplay.innerHTML = `
            <h3 id="poemTitleDisplay">${poem.title}</h3>
            <p id="poemContentDisplay">${poem.content.replace(/\n/g, '<br>')}</p>
            <button id="editPoemBtn">Düzenle</button>
            <button id="deletePoemBtn">Sil</button>
        `;
        document.getElementById('editPoemBtn').onclick = () => showPoemForm(poem);
        document.getElementById('deletePoemBtn').onclick = () => deletePoem(poem.id);
    } else {
        poemDisplay.innerHTML = '<p>Henüz bir şiir seçili değil.</p>';
    }
}

// Şiir formunu göster
function showPoemForm(poem = {}) {
    document.getElementById('poemTitleInput').value = poem.title || '';
    document.getElementById('poemContentInput').value = poem.content || '';
    document.getElementById('poemIdInput').value = poem.id || ''; // Eğer güncelleme ise ID'yi tut
    document.getElementById('poemModal').style.display = 'block';
}

// Şiir formunu kapat
function closePoemForm() {
    document.getElementById('poemModal').style.display = 'none';
    document.getElementById('poemForm').reset();
    document.getElementById('poemIdInput').value = ''; // ID'yi temizle
}


// --- Özel Gün Yönetimi (Special Days) ---

// Özel günleri Firebase'den yükle
async function loadSpecialDays() {
    const currentUser = getCurrentUser();
    specialDays = []; // Mevcut özel günleri temizle

    const querySnapshot = await getDocs(collection(db, `users/${currentUser}/specialDays`));
    querySnapshot.forEach((doc) => {
        specialDays.push({ id: doc.id, ...doc.data() });
    });

    // Tarihe göre sırala
    specialDays.sort((a, b) => new Date(a.date) - new Date(b.date));

    updateSpecialDayList(); // Özel gün listesini güncelle
}

// Yeni özel gün ekleme/kaydetme fonksiyonu
async function addSpecialDay(day) {
    const currentUser = getCurrentUser();
    if (day.id) {
        // Mevcut özel günü güncelle
        const specialDayRef = doc(db, `users/${currentUser}/specialDays`, day.id);
        await updateDoc(specialDayRef, day);
        console.log("Özel gün güncellendi: ", day.id);
    } else {
        // Yeni özel gün ekle
        const docRef = await addDoc(collection(db, `users/${currentUser}/specialDays`), day);
        day.id = docRef.id; // Yeni eklenen özel günün id'sini ata
        console.log("Yeni özel gün eklendi ID: ", docRef.id);
    }
    await loadSpecialDays(); // Özel günleri yeniden yükle
    updateSpecialDayList(); // Özel gün listesini güncelle
}

// Özel gün silme fonksiyonu
async function deleteSpecialDay(dayId) {
    const currentUser = getCurrentUser();
    await deleteDoc(doc(db, `users/${currentUser}/specialDays`, dayId));
    console.log("Özel gün silindi: ", dayId);
    await loadSpecialDays(); // Özel günleri yeniden yükle
    updateSpecialDayList(); // Özel gün listesini güncelle
    displaySpecialDay(null); // Özel gün gösterimini sıfırla
}

// Özel gün listesini güncelle
function updateSpecialDayList() {
    const specialDayList = document.getElementById('specialDayList');
    specialDayList.innerHTML = '';
    specialDays.forEach(day => {
        const li = document.createElement('li');
        const link = document.createElement('a');
        link.href = `#`;
        link.textContent = `${day.date}: ${day.name}`;
        link.onclick = (e) => {
            e.preventDefault();
            displaySpecialDay(day);
        };
        li.appendChild(link);
        specialDayList.appendChild(li);
    });
}

// Özel günü göster
function displaySpecialDay(day) {
    const specialDayDisplay = document.getElementById('specialDayDisplay');
    if (day) {
        specialDayDisplay.innerHTML = `
            <h3 id="specialDayDateDisplay">${day.date}</h3>
            <p id="specialDayNameDisplay">${day.name}</p>
            <p id="specialDayDescriptionDisplay">${day.description.replace(/\n/g, '<br>')}</p>
            <button id="editSpecialDayBtn">Düzenle</button>
            <button id="deleteSpecialDayBtn">Sil</button>
        `;
        document.getElementById('editSpecialDayBtn').onclick = () => showSpecialDayForm(day);
        document.getElementById('deleteSpecialDayBtn').onclick = () => deleteSpecialDay(day.id);
    } else {
        specialDayDisplay.innerHTML = '<p>Henüz bir özel gün seçili değil.</p>';
    }
}

// Özel gün formunu göster
function showSpecialDayForm(day = {}) {
    document.getElementById('specialDayDateInput').value = day.date || '';
    document.getElementById('specialDayNameInput').value = day.name || '';
    document.getElementById('specialDayDescriptionInput').value = day.description || '';
    document.getElementById('specialDayIdInput').value = day.id || ''; // Eğer güncelleme ise ID'yi tut
    document.getElementById('specialDayModal').style.display = 'block';
}

// Özel gün formunu kapat
function closeSpecialDayForm() {
    document.getElementById('specialDayModal').style.display = 'none';
    document.getElementById('specialDayForm').reset();
    document.getElementById('specialDayIdInput').value = ''; // ID'yi temizle
}


// --- Ruh Hali Yönetimi (Mood) ---

// Ruh halini Firebase'den yükle ve göster
async function loadMood() {
    const currentUser = getCurrentUser();
    const moodQuerySnapshot = await getDocs(collection(db, `users/${currentUser}/moods`));
    let latestMood = null;
    let latestTimestamp = 0;

    moodQuerySnapshot.forEach((doc) => {
        const data = doc.data();
        const timestamp = new Date(data.timestamp).getTime();
        if (timestamp > latestTimestamp) {
            latestTimestamp = timestamp;
            latestMood = data;
        }
    });

    if (latestMood) {
        document.getElementById('moodDisplay').textContent = `Benim Ruh Halim: ${latestMood.mood}`;
        document.getElementById('partnerMoodDisplay').textContent = `Sevgilimin Ruh Halim: ${latestMood.partnerMood}`;
        document.getElementById('moodReasonDisplay').textContent = `Neden: ${latestMood.reason || 'Belirtilmemiş'}`;
    } else {
        document.getElementById('moodDisplay').textContent = 'Ruh hali henüz belirlenmedi.';
        document.getElementById('partnerMoodDisplay').textContent = '';
        document.getElementById('moodReasonDisplay').textContent = '';
    }
}

// Ruh halini kaydet
async function saveMood(myMood, partnerMood, reason) {
    const currentUser = getCurrentUser();
    await addDoc(collection(db, `users/${currentUser}/moods`), {
        timestamp: new Date().toISOString(), // Kayıt tarihi
        mood: myMood,
        partnerMood: partnerMood,
        reason: reason
    });
    console.log("Ruh hali kaydedildi.");
    await loadMood(); // Ruh halini yeniden yükle ve göster
}

// Ruh hali formunu göster
function showMoodForm() {
    // Formu sıfırla
    document.getElementById('myMood').value = '';
    document.getElementById('partnerMood').value = '';
    document.getElementById('moodReason').value = '';
    document.getElementById('moodModal').style.display = 'block';
}

// Ruh hali formunu kapat
function closeMoodForm() {
    document.getElementById('moodModal').style.display = 'none';
    document.getElementById('moodForm').reset();
}


// --- Ortak ve Dinleyici Atama Fonksiyonları ---

function assignEventListeners() {
    // Menü butonları
    document.getElementById('menuButton').addEventListener('click', () => {
        const menu = document.getElementById('mainMenu');
        if (menu) { // Menü elementinin varlığını kontrol et
            menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
        }
    });

    // Menü linkleri
    const memoriesLink = document.getElementById('memoriesLink');
    if (memoriesLink) {
        memoriesLink.addEventListener('click', () => {
            document.querySelectorAll('.content-section').forEach(sec => sec.style.display = 'none');
            const section = document.getElementById('memoriesSection');
            if (section) section.style.display = 'block';
            const menu = document.getElementById('mainMenu');
            if (menu) menu.style.display = 'none';
        });
    }

    const poemsLink = document.getElementById('poemsLink');
    if (poemsLink) {
        poemsLink.addEventListener('click', () => {
            document.querySelectorAll('.content-section').forEach(sec => sec.style.display = 'none');
            const section = document.getElementById('poemsSection');
            if (section) section.style.display = 'block';
            const menu = document.getElementById('mainMenu');
            if (menu) menu.style.display = 'none';
        });
    }

    const specialDaysLink = document.getElementById('specialDaysLink');
    if (specialDaysLink) {
        specialDaysLink.addEventListener('click', () => {
            document.querySelectorAll('.content-section').forEach(sec => sec.style.display = 'none');
            const section = document.getElementById('specialDaysSection');
            if (section) section.style.display = 'block';
            const menu = document.getElementById('mainMenu');
            if (menu) menu.style.display = 'none';
        });
    }

    const moodLink = document.getElementById('moodLink');
    if (moodLink) {
        moodLink.addEventListener('click', () => {
            document.querySelectorAll('.content-section').forEach(sec => sec.style.display = 'none');
            const section = document.getElementById('moodSection');
            if (section) section.style.display = 'block';
            const menu = document.getElementById('mainMenu');
            if (menu) menu.style.display = 'none';
        });
    }


    // Anı Modal Dinleyicileri
    const addMemoryBtn = document.getElementById('addMemoryBtn');
    if (addMemoryBtn) addMemoryBtn.addEventListener('click', () => showMemoryForm());
    const closeMemoryModal = document.getElementById('closeMemoryModal');
    if (closeMemoryModal) closeMemoryModal.addEventListener('click', () => closeMemoryForm());
    const memoryForm = document.getElementById('memoryForm');
    if (memoryForm) {
        memoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const memoryId = document.getElementById('memoryIdInput').value;
            const memoryDate = document.getElementById('memoryDateInput').value;
            const memoryContent = document.getElementById('memoryContentInput').value;
            await saveMemory({ id: memoryId, date: memoryDate, content: memoryContent });
            closeMemoryForm();
        });
    }

    // Şiir Modal Dinleyicileri
    const addPoemBtn = document.getElementById('addPoemBtn');
    if (addPoemBtn) addPoemBtn.addEventListener('click', () => showPoemForm());
    const closePoemModal = document.getElementById('closePoemModal');
    if (closePoemModal) closePoemModal.addEventListener('click', () => closePoemForm());
    const poemForm = document.getElementById('poemForm');
    if (poemForm) {
        poemForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const poemId = document.getElementById('poemIdInput').value;
            const poemTitle = document.getElementById('poemTitleInput').value;
            const poemContent = document.getElementById('poemContentInput').value;
            await addPoem({ id: poemId, title: poemTitle, content: poemContent });
            closePoemForm();
        });
    }

    // Özel Gün Modal Dinleyicileri
    const addSpecialDayBtn = document.getElementById('addSpecialDayBtn');
    if (addSpecialDayBtn) addSpecialDayBtn.addEventListener('click', () => showSpecialDayForm());
    const closeSpecialDayModal = document.getElementById('closeSpecialDayModal');
    if (closeSpecialDayModal) closeSpecialDayModal.addEventListener('click', () => closeSpecialDayForm());
    const specialDayForm = document.getElementById('specialDayForm');
    if (specialDayForm) {
        specialDayForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const specialDayId = document.getElementById('specialDayIdInput').value;
            const specialDayDate = document.getElementById('specialDayDateInput').value;
            const specialDayName = document.getElementById('specialDayNameInput').value;
            const specialDayDescription = document.getElementById('specialDayDescriptionInput').value;
            await addSpecialDay({ id: specialDayId, date: specialDayDate, name: specialDayName, description: specialDayDescription });
            closeSpecialDayForm();
        });
    }

    // Ruh Hali Modal Dinleyicileri
    const setMoodBtn = document.getElementById('setMoodBtn');
    if (setMoodBtn) setMoodBtn.addEventListener('click', () => showMoodForm());
    const closeMoodModal = document.getElementById('closeMoodModal');
    if (closeMoodModal) closeMoodModal.addEventListener('click', () => closeMoodForm());
    const moodForm = document.getElementById('moodForm');
    if (moodForm) {
        moodForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const myMood = document.getElementById('myMood').value;
            const partnerMood = document.getElementById('partnerMood').value;
            const moodReason = document.getElementById('moodReason').value;
            await saveMood(myMood, partnerMood, moodReason);
            closeMoodForm();
        });
    }

    // Otomatik tarih seçimi için takvim dinleyicisi
    const memoryDateInput = document.getElementById('memoryDateInput');
    if (memoryDateInput) {
        memoryDateInput.addEventListener('change', (event) => {
            const selectedDate = event.target.value;
            const memoryDateDisplay = document.getElementById('memoryDate');
            if (memoryDateDisplay) {
                memoryDateDisplay.textContent = selectedDate;
            }
        });
    }


    // URL'deki username parametresini oku
    const urlParams = new URLSearchParams(window.location.search);
    const usernameParam = urlParams.get('username');
    if (usernameParam) {
        const usernameDisplay = document.getElementById('usernameDisplay');
        if (usernameDisplay) {
            usernameDisplay.textContent = usernameParam === 'Yusuf' ? "Yusuf'um" : (usernameParam === 'Ilayda' ? "Ilayda'm" : '');
            // Eğer usernameDisplay elementi varsa, içeriğini username parametresine göre ayarla
        }
    } else {
        // Eğer URL'de username yoksa ve welcome.html'den geliniyorsa,
        // session storage'dan kullanıcı adını al
        const storedUsername = sessionStorage.getItem('loggedInUser');
        if (storedUsername) {
            const usernameDisplay = document.getElementById('usernameDisplay');
            if (usernameDisplay) {
                usernameDisplay.textContent = storedUsername === 'Yusuf' ? "Yusuf'um" : (storedUsername === 'Ilayda' ? "Ilayda'm" : '');
            }
        }
    }
}

// Countdown fonksiyonu (ilk tanışma gününüzden beri geçen günleri hesaplar)
function updateCountdown() {
    const startDate = new Date('2024-03-24'); // İlk tanıştığınız tarih (Yıl-Ay-Gün)
    const now = new Date();
    const diffTime = Math.abs(now - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const daysPassedElement = document.getElementById('daysPassed');
    if (daysPassedElement) {
        daysPassedElement.textContent = diffDays;
    }
}

// Sürpriz Anı/Mesaj Göster fonksiyonu (HTML'de onclick ile çağrılabilir)
function showRandomMemory() {
    const surpriseDisplayDiv = document.getElementById('surpriseDisplay');
    if (!surpriseDisplayDiv) {
        console.warn("Element with ID 'surpriseDisplay' not found.");
        return;
    }
    surpriseDisplayDiv.innerHTML = ''; // Önceki içeriği temizle

    if (memories.length === 0) {
        surpriseDisplayDiv.innerHTML = '<p>Henüz anı yok. Eklemek için "Anılarım" bölümünü kullanın.</p>';
        return;
    }

    const randomIndex = Math.floor(Math.random() * memories.length);
    const randomMemory = memories[randomIndex];

    const textContent = randomMemory.surpriseText || randomMemory.content.substring(0, Math.min(randomMemory.content.length, 200)) + (randomMemory.content.length > 200 ? '...' : ''); // İlk 200 karakter veya tamamı

    const textSection = document.createElement('div');
    textSection.classList.add('content-text-area');
    textSection.innerHTML = `<h3>Rastgele Anı</h3><p>"${textContent}"</p><p>Tarih: ${randomMemory.date}</p>`;
    surpriseDisplayDiv.appendChild(textSection);

    // Medya gösterimi (eğer anının içinde media varsa)
    if (randomMemory.media && randomMemory.media.length > 0) {
        const mediaSection = document.createElement('div');
        mediaSection.classList.add('media-section');
        const randomMediaItem = randomMemory.media[Math.floor(Math.random() * randomMemory.media.length)];

        if (randomMediaItem.type === 'image') {
            const img = document.createElement('img');
            img.src = randomMediaItem.src;
            img.alt = randomMediaItem.alt || 'Görsel';
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            img.style.borderRadius = '8px';
            img.style.marginTop = '15px';
            mediaSection.appendChild(img);
        } else if (randomMediaItem.type === 'video') {
            const video = document.createElement('video');
            video.src = randomMediaItem.src;
            video.controls = true;
            video.style.maxWidth = '100%';
            video.style.height = 'auto';
            video.style.borderRadius = '8px';
            video.style.marginTop = '15px';
            mediaSection.appendChild(video);
        }
        surpriseDisplayDiv.appendChild(mediaSection);
    }
}