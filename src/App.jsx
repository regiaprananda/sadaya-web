import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  Video, Square, PlayCircle, X, LogOut, ShieldAlert, 
  Calendar, Clock, User, KeyRound, CheckCircle2, AlertCircle,
  Loader2, UserPlus, LogIn, Camera, FolderOpen, 
  ImagePlus, Edit2, Trash2, Save, Users, FileVideo, ShieldCheck,
  Search, Filter, ArrowLeft, ChevronRight, CalendarDays
} from 'lucide-react';
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInAnonymously
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  setDoc,
  doc, 
  serverTimestamp 
} from "firebase/firestore";

// ==========================================
// KONFIGURASI FIREBASE
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyD3RLbdK30xtwnjWCLJodUlEWDFsgsDydg",
  authDomain: "sadaya-absensi.firebaseapp.com",
  projectId: "sadaya-absensi",
  storageBucket: "sadaya-absensi.firebasestorage.app",
  messagingSenderId: "905518501882",
  appId: "1:905518501882:web:b7a83e3a6dca7ea3165e43"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "sadaya-absen-app"; 

// ==========================================
// KONFIGURASI CLOUDINARY
// ==========================================
const cloudinaryCloudName = "dpcnjavbt"; 
const cloudinaryUploadPreset = "sadaya_piket";

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [appUser, setAppUser] = useState(null);
  const [isLoadingInit, setIsLoadingInit] = useState(true);
  const [authState, setAuthState] = useState('auth_screen'); 
  const [activeVideo, setActiveVideo] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      try { 
        const userCredential = await signInAnonymously(auth); 
        setFirebaseUser(userCredential.user);
      } catch (err) { console.error("Auth init error:", err); }
    };
    initAuth();

    const checkSavedAccount = async () => {
      const savedAccountId = localStorage.getItem('sadaya_accountId');
      if (savedAccountId) {
        try {
          const profileSnap = await getDoc(doc(db, 'artifacts', appId, 'accounts', savedAccountId, 'profile', 'data'));
          if (profileSnap.exists()) {
            setAppUser(profileSnap.data());
            setAuthState('logged_in');
          } else {
            localStorage.removeItem('sadaya_accountId');
          }
        } catch (error) { console.error("Gagal memeriksa profil:", error); }
      }
      setIsLoadingInit(false);
    };

    checkSavedAccount();
  }, []);

  useEffect(() => {
    if (authState === 'logged_in') window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [authState]);

  const handleLoginSuccess = (userData) => { 
    localStorage.setItem('sadaya_accountId', userData.accountId);
    setAppUser(userData); 
    setAuthState('logged_in'); 
  };
  
  const handleLogout = () => { 
    localStorage.removeItem('sadaya_accountId');
    setAppUser(null);
    setAuthState('auth_screen'); 
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };

  if (isLoadingInit) {
    return (
      <div className="min-h-screen bg-[#ECE1C9] flex flex-col items-center justify-center animate-in fade-in duration-1000">
        <Loader2 className="w-14 h-14 text-[#8D5B30] animate-spin mb-6" />
        <p className="text-[#8D5B30] font-black tracking-[0.3em] text-sm animate-pulse uppercase">Memuat Sistem</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#ECE1C9] text-[#342B22] font-sans selection:bg-[#CFA96F]/40 relative overflow-x-hidden scroll-smooth">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden opacity-40">
        <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-[#CFA96F] rounded-full blur-[120px] mix-blend-multiply"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-[#8D5B30] rounded-full blur-[120px] mix-blend-multiply"></div>
      </div>

      <div className="relative z-10 w-full h-full">
        {authState === 'auth_screen' ? (
          <AuthScreen onSuccess={handleLoginSuccess} />
        ) : (
          <MainRouter firebaseUser={firebaseUser} appUser={appUser} onUpdateProfile={(newData) => setAppUser({...appUser, ...newData})} onLogout={handleLogout} onPlayVideo={setActiveVideo} />
        )}
      </div>

      {activeVideo && <VideoModal videoUrl={activeVideo} onClose={() => setActiveVideo(null)} />}
    </div>
  );
}

// ==========================================
// KOMPONEN: LAYAR LOGIN & REGISTER
// ==========================================
function AuthScreen({ onSuccess }) {
  const [role, setRole] = useState('member'); 
  const [mode, setMode] = useState('login'); 
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [nta, setNta] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    
    const cleanNta = nta.trim().toUpperCase();
    const accountId = `${role}_${cleanNta}`;
    
    try {
      const docRef = doc(db, 'artifacts', appId, 'accounts', accountId, 'profile', 'data');
      const docSnap = await getDoc(docRef);

      if (mode === 'login') {
        if (!docSnap.exists()) setError('Akun tidak ditemukan. Silakan SIGN UP.');
        else if (docSnap.data().password !== password) setError('Password salah.');
        else onSuccess(docSnap.data()); 
      } else {
        if (docSnap.exists()) { setError('Akun dengan NTA ini sudah terdaftar! Silakan SIGN IN.'); setLoading(false); return; }
        if (password.length < 4) { setError('Password minimal 4 karakter.'); setLoading(false); return; }
        if (role === 'admin' && cleanNta !== 'SANKARASUKSES') { setError('Akses Ditolak: Kode Admin tidak valid!'); setLoading(false); return; }

        const newProfile = { accountId, name, nta: cleanNta, password, role, avatarUrl: null, createdAt: serverTimestamp() };
        await setDoc(docRef, newProfile);
        onSuccess(newProfile); 
      }
    } catch (err) { setError('Terjadi kesalahan jaringan. Coba lagi.'); } 
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 lg:p-8 animate-in fade-in zoom-in-95 duration-700 ease-out">
      <div className="flex flex-col lg:flex-row w-full max-w-md lg:max-w-5xl bg-[#ECE1C9]/95 lg:bg-white/95 backdrop-blur-xl border-4 lg:border-2 border-[#CFA96F]/40 lg:border-[#CFA96F]/20 rounded-[2rem] lg:rounded-[3rem] shadow-[0_20px_50px_rgba(52,43,34,0.15)] relative overflow-hidden transition-all duration-500 hover:shadow-[0_30px_60px_rgba(141,91,48,0.2)]">
        
        <div className="hidden lg:flex flex-col justify-center items-center w-1/2 bg-gradient-to-br from-[#8D5B30] to-[#514C34] p-16 relative overflow-hidden text-[#ECE1C9]">
          <div className="absolute top-[-20%] left-[-20%] w-[400px] h-[400px] bg-[#CFA96F]/30 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-[-20%] right-[-20%] w-[400px] h-[400px] bg-[#342B22]/40 rounded-full blur-[100px]"></div>
          
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="flex gap-8 mb-10">
              <div className="w-[120px] h-[120px] bg-white rounded-full p-2 shadow-2xl border-4 border-[#CFA96F] overflow-hidden transform transition-all duration-500 hover:scale-110 hover:rotate-3">
                <img src="https://res.cloudinary.com/dpcnjavbt/image/upload/q_auto/f_auto/v1778137492/Sadaya-Logo.jpg_qrrfph.jpg" alt="Logo SADAYA" className="w-full h-full object-cover rounded-full bg-white" onError={(e)=>{e.target.onerror = null; e.target.src="[https://placehold.co/200x200/ECE1C9/8D5B30?text=S](https://placehold.co/200x200/ECE1C9/8D5B30?text=S)"}} />
              </div>
              <div className="w-[120px] h-[120px] bg-white rounded-full p-2 shadow-2xl border-4 border-[#CFA96F] overflow-hidden transform transition-all duration-500 hover:scale-110 hover:-rotate-3">
                <img src="https://res.cloudinary.com/dpcnjavbt/image/upload/q_auto/f_auto/v1778137492/kabinet-logo.jpg_rxile1.jpg" alt="Logo Kabinet" className="w-full h-full object-contain rounded-full bg-white" onError={(e)=>{e.target.onerror = null; e.target.src="[https://placehold.co/200x200/ECE1C9/8D5B30?text=K](https://placehold.co/200x200/ECE1C9/8D5B30?text=K)"}} />
              </div>
            </div>
            <h1 className="text-7xl font-black mb-4 tracking-[0.15em] drop-shadow-lg text-white">SADAYA</h1>
            <p className="text-sm font-black tracking-[0.4em] uppercase text-[#CFA96F] drop-shadow-md">Sistem Verifikasi Terpadu</p>
            <div className="mt-12 h-1 w-24 bg-[#CFA96F]/50 rounded-full"></div>
            <p className="mt-8 text-sm font-bold text-[#ECE1C9]/80 max-w-sm leading-relaxed">Platform pelaporan kebersihan dan kedisiplinan resmi untuk anggota Kabinet Sankara.</p>
          </div>
        </div>

        <div className="w-full lg:w-1/2 p-8 lg:p-14 flex flex-col justify-center relative">
          
          <div className="text-center mb-8 lg:hidden animate-in slide-in-from-top-4 duration-500">
            <div className="flex justify-center items-center gap-6 mb-6">
              <div className="w-[84px] h-[84px] bg-white rounded-full p-1 shadow-lg border-[3px] border-[#CFA96F] flex items-center justify-center overflow-hidden transition-transform hover:scale-105">
                <img src="[https://placehold.co/200x200/ECE1C9/8D5B30?text=SADAYA](https://placehold.co/200x200/ECE1C9/8D5B30?text=SADAYA)" alt="Logo SADAYA Mobile" className="w-full h-full object-cover rounded-full" onError={(e) => { e.target.onerror = null; e.target.src = "[https://placehold.co/200x200/ECE1C9/8D5B30?text=S](https://placehold.co/200x200/ECE1C9/8D5B30?text=S)" }} />
              </div>
              <div className="w-[84px] h-[84px] bg-white rounded-full p-2 shadow-lg border-[3px] border-[#CFA96F] flex items-center justify-center overflow-hidden transition-transform hover:scale-105">
                <img src="[https://placehold.co/200x200/ECE1C9/8D5B30?text=KABINET](https://placehold.co/200x200/ECE1C9/8D5B30?text=KABINET)" alt="Logo Kabinet Mobile" className="w-full h-full object-contain rounded-full" onError={(e) => { e.target.onerror = null; e.target.src = "[https://placehold.co/200x200/ECE1C9/8D5B30?text=K](https://placehold.co/200x200/ECE1C9/8D5B30?text=K)" }} />
              </div>
            </div>
            <h1 className="text-4xl font-black text-[#8D5B30] mb-1 tracking-[0.15em] drop-shadow-sm">SADAYA</h1>
            <p className="text-[#342B22]/70 text-[10px] font-black tracking-[0.2em] uppercase">Sistem Verifikasi Terpadu</p>
          </div>

          <div className="animate-in slide-in-from-bottom-8 duration-700 delay-100 fill-mode-both">
            <div className="flex bg-[#ECE1C9]/50 lg:bg-[#FDFBF7] rounded-2xl p-1.5 mb-5 border-2 border-[#CFA96F]/30 shadow-inner">
              <button 
                type="button" onClick={() => {setRole('member'); setError('');}} 
                className={`flex-1 py-3.5 text-[11px] lg:text-xs font-black rounded-xl transition-all duration-300 flex items-center justify-center gap-2 tracking-widest ${role === 'member' ? 'bg-[#8D5B30] text-[#ECE1C9] shadow-md transform scale-[1.02]' : 'text-[#8D5B30]/60 hover:text-[#8D5B30] hover:bg-[#8D5B30]/5'}`}
              >
                <User className="w-4 h-4" /> ANGGOTA
              </button>
              <button 
                type="button" onClick={() => {setRole('admin'); setError('');}} 
                className={`flex-1 py-3.5 text-[11px] lg:text-xs font-black rounded-xl transition-all duration-300 flex items-center justify-center gap-2 tracking-widest ${role === 'admin' ? 'bg-[#342B22] text-[#CFA96F] shadow-md transform scale-[1.02]' : 'text-[#8D5B30]/60 hover:text-[#8D5B30] hover:bg-[#8D5B30]/5'}`}
              >
                <ShieldCheck className="w-4 h-4" /> ADMIN
              </button>
            </div>

            <div className="flex bg-[#342B22]/5 lg:bg-[#342B22]/5 rounded-xl p-1 mb-8 border border-[#CFA96F]/30">
              <button 
                type="button" onClick={() => {setMode('login'); setError(''); setPassword('');}} 
                className={`flex-1 py-3 text-[11px] font-black rounded-lg transition-all duration-300 tracking-[0.15em] ${mode === 'login' ? 'bg-white text-[#8D5B30] shadow-sm border border-[#CFA96F]/20 scale-100' : 'text-[#8D5B30]/60 hover:text-[#8D5B30]'}`}
              >
                SIGN IN
              </button>
              <button 
                type="button" onClick={() => {setMode('register'); setError(''); setPassword('');}} 
                className={`flex-1 py-3 text-[11px] font-black rounded-lg transition-all duration-300 tracking-[0.15em] ${mode === 'register' ? 'bg-white text-[#8D5B30] shadow-sm border border-[#CFA96F]/20 scale-100' : 'text-[#8D5B30]/60 hover:text-[#8D5B30]'}`}
              >
                SIGN UP
              </button>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-[#793B2B]/10 border-l-4 border-[#793B2B] rounded-r-xl flex items-start gap-3 text-[#793B2B] text-sm font-bold shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" /> <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {mode === 'register' && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="block text-[10px] lg:text-[11px] font-black text-[#8D5B30] mb-2 uppercase tracking-widest">Nama Lengkap</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="block w-full px-5 py-4 border-2 border-[#CFA96F]/40 bg-white/70 lg:bg-white rounded-xl text-[#342B22] focus:outline-none focus:border-[#8D5B30] focus:ring-4 focus:ring-[#8D5B30]/10 focus:bg-white font-bold transition-all shadow-sm hover:border-[#CFA96F]" placeholder="Contoh: Budi Santoso" required />
                </div>
              )}

              <div className="animate-in fade-in slide-in-from-top-2 duration-300 delay-75 fill-mode-both">
                <label className="block text-[10px] lg:text-[11px] font-black text-[#8D5B30] mb-2 uppercase tracking-widest">
                  {role === 'admin' ? 'KODE ADMIN' : 'Nomor Tanda Anggota'}
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none transition-colors group-focus-within:text-[#8D5B30]">
                    <User className="h-5 w-5 text-[#CFA96F] transition-colors group-focus-within:text-[#8D5B30]" />
                  </div>
                  <input type="text" value={nta} onChange={(e) => setNta(e.target.value)} className="block w-full pl-14 pr-5 py-4 border-2 border-[#CFA96F]/40 bg-white/70 lg:bg-white rounded-xl text-[#342B22] font-bold focus:outline-none focus:border-[#8D5B30] focus:ring-4 focus:ring-[#8D5B30]/10 focus:bg-white transition-all shadow-sm hover:border-[#CFA96F]" placeholder={role === 'admin' ? (mode === 'register' ? 'Masukkan Kode Rahasia' : 'Masukkan Kode Admin') : 'Masukkan NTA'} required />
                </div>
              </div>

              <div className="animate-in fade-in slide-in-from-top-2 duration-300 delay-150 fill-mode-both">
                <label className="block text-[10px] lg:text-[11px] font-black text-[#8D5B30] mb-2 uppercase tracking-widest">Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none transition-colors group-focus-within:text-[#8D5B30]">
                    <KeyRound className="h-5 w-5 text-[#CFA96F] transition-colors group-focus-within:text-[#8D5B30]" />
                  </div>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="block w-full pl-14 pr-5 py-4 border-2 border-[#CFA96F]/40 bg-white/70 lg:bg-white rounded-xl text-[#342B22] font-bold focus:outline-none focus:border-[#8D5B30] focus:ring-4 focus:ring-[#8D5B30]/10 focus:bg-white transition-all shadow-sm hover:border-[#CFA96F]" placeholder="Masukkan Password" required />
                </div>
              </div>

              <button type="submit" disabled={loading} className={`w-full py-4 px-4 font-black tracking-[0.2em] rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 mt-8 flex justify-center items-center gap-3 border transform active:scale-95 hover:-translate-y-1 ${role === 'admin' ? 'bg-[#342B22] hover:bg-black text-[#CFA96F] border-[#8D5B30] hover:shadow-[0_10px_20px_rgba(52,43,34,0.3)]' : 'bg-[#8D5B30] hover:bg-[#793B2B] text-[#ECE1C9] border-[#793B2B] hover:shadow-[0_10px_20px_rgba(141,91,48,0.3)]'}`}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (mode === 'login' ? <LogIn className="w-5 h-5 transition-transform group-hover:translate-x-1" /> : <UserPlus className="w-5 h-5 transition-transform group-hover:scale-110" />)}
                <span>{mode === 'login' ? 'MASUK SEKARANG' : 'DAFTAR SEKARANG'}</span>
              </button>
            </form>
            
            <div className="mt-12 text-center lg:hidden">
              <p className="text-[10px] font-black text-[#8D5B30]/50 tracking-[0.3em]">KABINET SANKARA</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// PENGATUR ALUR (ROUTER)
// ==========================================
function MainRouter({ firebaseUser, appUser, onUpdateProfile, onLogout, onPlayVideo }) {
  if (appUser?.role === 'admin') {
    return <AdminDashboard onLogout={onLogout} onPlayVideo={onPlayVideo} />;
  }
  return <UserDashboard firebaseUser={firebaseUser} appUser={appUser} onUpdateProfile={onUpdateProfile} onLogout={onLogout} onPlayVideo={onPlayVideo} />;
}

// ==========================================
// KOMPONEN: DASHBOARD ADMIN
// ==========================================
function AdminDashboard({ onLogout, onPlayVideo }) {
  const [allRecords, setAllRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('az'); 
  const [selectedMember, setSelectedMember] = useState(null); 

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'admin_attendance'));
        let fetchedRecords = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), timestamp: doc.data().timestamp ? doc.data().timestamp.toDate() : new Date() }));
        setAllRecords(fetchedRecords);
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchAllData();
  }, []);

  const membersList = useMemo(() => {
    const map = new Map();
    allRecords.forEach(r => {
      if (!map.has(r.nta)) { map.set(r.nta, { userId: r.userId, name: r.name, nta: r.nta, avatarUrl: r.avatarUrl, records: [] }); }
      map.get(r.nta).records.push(r);
    });
    Array.from(map.values()).forEach(m => m.records.sort((a,b) => b.timestamp - a.timestamp));
    return Array.from(map.values());
  }, [allRecords]);

  let filteredMembers = membersList.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()) || m.nta.toLowerCase().includes(searchTerm.toLowerCase()));
  if (sortBy === 'az') filteredMembers.sort((a, b) => a.name.localeCompare(b.name));
  else if (sortBy === 'za') filteredMembers.sort((a, b) => b.name.localeCompare(a.name));
  else filteredMembers.sort((a, b) => b.records[0].timestamp - a.records[0].timestamp); 

  const todayStr = new Date().toLocaleDateString('id-ID');
  const todayRecords = allRecords.filter(r => r.timestamp.toLocaleDateString('id-ID') === todayStr);

  if (selectedMember) return <MemberDetailView member={selectedMember} onBack={() => setSelectedMember(null)} onPlayVideo={onPlayVideo} />;

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-8 flex flex-col min-h-screen animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-[#8D5B30] tracking-tight drop-shadow-sm">PANEL ADMIN</h1>
          <p className="text-xs md:text-sm font-black tracking-[0.2em] uppercase text-[#CFA96F] mt-2">Pusat Data Piket SADAYA</p>
        </div>
        <button onClick={onLogout} className="flex items-center gap-2 text-[11px] font-black text-[#793B2B] bg-white px-6 py-3.5 rounded-full border-2 border-[#793B2B]/40 hover:bg-[#793B2B] hover:text-white hover:shadow-lg hover:-translate-y-1 active:scale-95 transition-all duration-300 uppercase tracking-widest">
          <LogOut className="w-4 h-4" /> KUNCI LAYAR
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-8 mb-10">
        <div className="bg-gradient-to-br from-[#8D5B30] to-[#793B2B] rounded-[2rem] p-8 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 text-white/10 transform transition-transform duration-700 group-hover:scale-110 group-hover:rotate-6"><FileVideo className="w-40 h-40" /></div>
          <p className="text-[10px] md:text-xs font-black tracking-[0.3em] uppercase text-[#ECE1C9] mb-2 relative z-10">Video Piket Hari Ini</p>
          <p className="text-6xl md:text-7xl font-black relative z-10 drop-shadow-md">{todayRecords.length}</p>
        </div>
        <div className="bg-gradient-to-br from-[#514C34] to-[#342B22] rounded-[2rem] p-8 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 text-white/10 transform transition-transform duration-700 group-hover:scale-110 group-hover:-rotate-6"><Users className="w-40 h-40" /></div>
          <p className="text-[10px] md:text-xs font-black tracking-[0.3em] uppercase text-[#ECE1C9] mb-2 relative z-10">Total Anggota Terdata</p>
          <p className="text-6xl md:text-7xl font-black relative z-10 drop-shadow-md">{membersList.length}</p>
        </div>
      </div>

      <div className="bg-[#FDFBF7] border-2 border-[#CFA96F]/60 rounded-[2rem] lg:rounded-[3rem] p-6 lg:p-10 relative overflow-hidden shadow-2xl flex-grow flex flex-col">
        <h2 className="text-2xl font-black text-[#8D5B30] mb-8 flex items-center gap-3 border-b-2 border-[#CFA96F]/30 pb-5">
          <ShieldAlert className="w-7 h-7 text-[#CFA96F]" /> Direktori Anggota
        </h2>

        <div className="mb-8 flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#CFA96F] group-focus-within:text-[#8D5B30] transition-colors" />
            <input type="text" placeholder="Cari nama anggota atau NTA..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-14 pr-5 py-4 rounded-xl border-2 border-[#CFA96F]/40 focus:border-[#8D5B30] focus:ring-4 focus:ring-[#8D5B30]/10 focus:outline-none bg-white font-bold text-[#342B22] shadow-sm transition-all text-sm md:text-base" />
          </div>
          <div className="lg:w-64 relative group">
            <Filter className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#CFA96F] group-focus-within:text-[#8D5B30] transition-colors" />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full pl-14 pr-5 py-4 rounded-xl border-2 border-[#CFA96F]/40 focus:border-[#8D5B30] focus:ring-4 focus:ring-[#8D5B30]/10 focus:outline-none bg-white font-bold text-[#342B22] appearance-none shadow-sm transition-all cursor-pointer text-sm md:text-base">
              <option value="az">Nama (A - Z)</option>
              <option value="za">Nama (Z - A)</option>
              <option value="newest">Laporan Terbaru</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 flex-grow"><Loader2 className="w-14 h-14 text-[#8D5B30] animate-spin mb-4" /><p className="text-sm font-bold text-[#8D5B30] tracking-widest uppercase animate-pulse">Menarik Data...</p></div>
        ) : filteredMembers.length === 0 ? (
          <div className="flex-grow flex items-center justify-center p-20 border-2 border-dashed border-[#CFA96F]/50 rounded-[2rem]"><p className="font-bold text-[#8D5B30]/60 text-lg">Tidak ada anggota yang cocok dengan pencarian.</p></div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {filteredMembers.map((m, index) => (
              <div key={m.nta} onClick={() => setSelectedMember(m)} className="bg-white border-2 border-[#CFA96F]/40 rounded-[1.5rem] p-5 flex items-center justify-between gap-4 hover:border-[#8D5B30] hover:shadow-xl cursor-pointer transition-all duration-300 group hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${index * 50}ms` }}>
                <div className="flex items-center gap-4 lg:gap-5 overflow-hidden">
                  <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-full bg-[#ECE1C9] border-2 border-[#CFA96F] overflow-hidden flex items-center justify-center flex-shrink-0 group-hover:border-[#8D5B30] transition-colors">
                    {m.avatarUrl ? <img src={m.avatarUrl} alt="Avatar Anggota" className="w-full h-full object-cover" /> : <User className="w-7 h-7 text-[#8D5B30]" />}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-black text-[#342B22] text-lg lg:text-xl leading-tight group-hover:text-[#8D5B30] transition-colors truncate">{m.name}</h4>
                    <p className="text-xs lg:text-sm font-bold text-[#8D5B30] mt-1">NTA: {m.nta}</p>
                  </div>
                </div>
                <div className="flex items-center gap-5 flex-shrink-0 pl-2">
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] font-black tracking-widest text-[#CFA96F] uppercase">Total Data</p>
                    <p className="text-sm font-black text-[#342B22] bg-[#ECE1C9] px-3 py-1 rounded-full mt-1">{m.records.length} Video</p>
                  </div>
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-[#FDFBF7] border-2 border-[#CFA96F]/50 rounded-full flex items-center justify-center group-hover:bg-[#8D5B30] group-hover:border-[#8D5B30] transition-colors">
                    <ChevronRight className="w-5 h-5 lg:w-6 lg:h-6 text-[#8D5B30] group-hover:text-white group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <footer className="mt-auto pt-16 pb-8 text-center border-t border-[#CFA96F]/40 mt-12"><h2 className="text-xl font-black tracking-[0.4em] text-[#8D5B30] mb-2 uppercase drop-shadow-sm">KABINET SANKARA</h2></footer>
    </div>
  );
}

// ==========================================
// KOMPONEN: TAMPILAN DETAIL PROFIL ANGGOTA 
// ==========================================
function MemberDetailView({ member, onBack, onPlayVideo }) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const availableMonths = useMemo(() => {
    const months = new Set();
    member.records.forEach(r => { const d = r.timestamp; months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`); });
    return Array.from(months).sort().reverse(); 
  }, [member]);

  const [selectedMonth, setSelectedMonth] = useState(availableMonths[0] || "");
  
  useEffect(() => {
    if (availableMonths.length > 0 && (!selectedMonth || !availableMonths.includes(selectedMonth))) {
      setSelectedMonth(availableMonths[0]);
    }
  }, [availableMonths, selectedMonth]);

  const displayedRecords = useMemo(() => {
    if (!selectedMonth) return [];
    return member.records.filter(r => { const d = r.timestamp; const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; return mStr === selectedMonth; });
  }, [member, selectedMonth]);

  const formatMonthName = (monthStr) => {
    const [y, m] = monthStr.split('-');
    const date = new Date(parseInt(y), parseInt(m) - 1, 1);
    return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  };
  const getDayName = (date) => date.toLocaleDateString('id-ID', { weekday: 'long' });
  const getFullDate = (date) => date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const getTime = (date) => date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col min-h-screen animate-in slide-in-from-right-10 duration-500 fade-in">
      <button onClick={onBack} className="flex items-center gap-2 text-[11px] lg:text-xs font-black text-[#8D5B30] hover:text-[#793B2B] mb-8 w-fit transition-all duration-300 hover:-translate-x-2 bg-white/50 px-4 py-2 rounded-full border border-[#CFA96F]/40 shadow-sm tracking-widest uppercase group">
        <ArrowLeft className="w-4 h-4 lg:w-5 lg:h-5 transition-transform group-hover:-translate-x-1" /> KEMBALI KE DIREKTORI
      </button>

      <div className="bg-white/80 backdrop-blur-md border-2 border-[#CFA96F]/40 rounded-[2rem] p-6 lg:p-10 mb-8 flex flex-col sm:flex-row items-center justify-start gap-6 lg:gap-8 shadow-lg hover:shadow-xl transition-shadow duration-300 text-center sm:text-left relative overflow-hidden">
         <div className="absolute right-0 top-0 w-64 h-64 bg-[#CFA96F]/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="w-28 h-28 lg:w-32 lg:h-32 rounded-full bg-[#8D5B30] flex items-center justify-center shadow-xl border-4 border-white overflow-hidden flex-shrink-0 z-10">
          {member.avatarUrl ? <img src={member.avatarUrl} alt="Profil Member" className="w-full h-full object-cover" /> : <User className="w-14 h-14 lg:w-16 lg:h-16 text-[#ECE1C9]" />}
        </div>
        <div className="z-10">
          <p className="text-[10px] lg:text-xs text-[#CFA96F] font-black uppercase tracking-[0.3em] mb-2 drop-shadow-sm">PROFIL ANGGOTA</p>
          <h2 className="text-3xl lg:text-4xl font-black text-[#342B22] leading-tight mb-2">{member.name}</h2>
          <p className="text-sm lg:text-base text-[#8D5B30] font-bold bg-[#ECE1C9] px-4 py-1.5 rounded-full inline-block shadow-sm">NTA: {member.nta}</p>
        </div>
      </div>

      <div className="bg-[#FDFBF7] border-2 border-[#CFA96F] rounded-[2rem] lg:rounded-[3rem] p-6 lg:p-10 shadow-2xl flex-grow">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 border-b-2 border-[#CFA96F]/30 pb-6">
          <h3 className="text-xl lg:text-2xl font-black text-[#8D5B30] flex items-center gap-3"><FileVideo className="w-6 h-6 lg:w-8 lg:h-8 text-[#CFA96F]" /> Riwayat Video Piket</h3>
          {availableMonths.length > 0 && (
            <div className="relative w-full md:w-auto group">
              <CalendarDays className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#CFA96F] group-focus-within:text-[#8D5B30] transition-colors" />
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-full md:w-64 pl-14 pr-5 py-4 rounded-xl border-2 border-[#CFA96F]/40 focus:border-[#8D5B30] focus:ring-4 focus:ring-[#8D5B30]/10 focus:outline-none bg-white font-bold text-[#342B22] appearance-none cursor-pointer shadow-sm transition-all text-sm lg:text-base">
                {availableMonths.map(m => <option key={m} value={m}>{formatMonthName(m)}</option>)}
              </select>
            </div>
          )}
        </div>

        {availableMonths.length === 0 ? (
          <div className="text-center p-16 border-2 border-dashed border-[#CFA96F]/50 rounded-[2rem] font-bold text-[#8D5B30]/60 text-lg">Anggota ini belum memiliki riwayat piket.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
            {displayedRecords.map((record, index) => (
              <div key={record.id} className="bg-white border-2 border-[#CFA96F]/40 hover:border-[#8D5B30] rounded-[1.5rem] p-5 lg:p-6 flex flex-col sm:flex-row justify-between sm:items-center gap-6 transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1 group animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${index * 50}ms` }}>
                <div>
                  <p className="text-[10px] lg:text-[11px] font-black text-[#CFA96F] uppercase tracking-[0.2em] mb-1">{getDayName(record.timestamp)}</p>
                  <p className="text-lg lg:text-xl font-black text-[#342B22] mb-2">{getFullDate(record.timestamp)}</p>
                  <p className="text-xs lg:text-sm font-bold text-[#8D5B30] flex items-center gap-2 bg-[#ECE1C9]/50 px-3 py-1.5 rounded-lg inline-flex"><Clock className="w-4 h-4" /> Pukul {getTime(record.timestamp)} WIB</p>
                </div>
                <button onClick={() => onPlayVideo(record.videoUrl)} className="flex items-center justify-center gap-2 px-6 py-4 bg-[#8D5B30] hover:bg-[#793B2B] text-white font-black tracking-widest text-[11px] lg:text-xs rounded-xl transition-all duration-300 shadow-md hover:shadow-lg w-full sm:w-auto active:scale-95 group-hover:ring-4 ring-[#8D5B30]/20">
                  <PlayCircle className="w-5 h-5 lg:w-6 lg:h-6" /> LIHAT BUKTI
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// KOMPONEN: DASHBOARD USER (ANGGOTA) 
// ==========================================
function UserDashboard({ firebaseUser, appUser, onUpdateProfile, onLogout, onPlayVideo }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [records, setRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => { 
    const timer = setInterval(() => setCurrentDate(new Date()), 60000); 
    return () => clearInterval(timer); 
  }, []);

  const fetchRecords = useCallback(async () => {
    if (!appUser) return;
    setLoadingRecords(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'artifacts', appId, 'accounts', appUser.accountId, 'attendance'));
      let fetchedRecords = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), timestamp: doc.data().timestamp ? doc.data().timestamp.toDate() : new Date() }));
      fetchedRecords.sort((a, b) => b.timestamp - a.timestamp);
      setRecords(fetchedRecords);
    } catch (error) { console.error(error); } finally { setLoadingRecords(false); }
  }, [appUser]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const formattedDate = currentDate.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const formattedTime = currentDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-8 flex flex-col min-h-screen animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="flex justify-end mb-6">
        <button onClick={onLogout} className="flex items-center gap-2 text-[11px] font-black text-[#793B2B] bg-white px-6 py-3.5 rounded-full border-2 border-[#793B2B]/40 hover:bg-[#793B2B] hover:text-white hover:shadow-lg hover:-translate-y-1 active:scale-95 transition-all duration-300 uppercase tracking-widest">
          <LogOut className="w-4 h-4" /> KUNCI LAYAR
        </button>
      </div>

      <header className="mb-12 text-center relative">
        <h1 className="text-5xl lg:text-7xl font-black text-[#8D5B30] mb-4 tracking-[0.1em] drop-shadow-md">SADAYA</h1>
        <p className="text-[#8D5B30] text-xs lg:text-sm font-black tracking-[0.3em] uppercase flex items-center justify-center gap-2 bg-[#CFA96F]/20 inline-flex px-6 py-2 rounded-full border border-[#CFA96F]/50 shadow-sm">
          <ShieldAlert className="w-4 h-4 lg:w-5 lg:h-5 text-[#CFA96F]" /> Pelaporan Kebersihan
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8 mb-12">
        <div className="bg-white/80 backdrop-blur-md border-2 border-[#CFA96F]/40 rounded-[2rem] p-6 lg:p-8 flex flex-col justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden order-2 lg:order-1 group">
           <div className="absolute left-0 bottom-0 w-40 h-40 bg-[#8D5B30]/5 rounded-full blur-3xl -ml-10 -mb-10 transition-transform duration-700 group-hover:scale-150"></div>
          <div className="flex items-center justify-start gap-5 mb-6 z-10">
            <div className="w-12 h-12 rounded-xl bg-[#8D5B30]/10 flex items-center justify-center"><Calendar className="w-6 h-6 lg:w-7 lg:h-7 text-[#8D5B30]" /></div>
            <div><p className="text-[10px] lg:text-[11px] text-[#CFA96F] font-black tracking-[0.2em] uppercase mb-1">Tanggal Hari Ini</p><p className="text-base lg:text-lg text-[#342B22] font-black tracking-wide">{formattedDate}</p></div>
          </div>
          <div className="flex items-center justify-start gap-5 z-10">
            <div className="w-12 h-12 rounded-xl bg-[#CFA96F]/10 flex items-center justify-center"><Clock className="w-6 h-6 lg:w-7 lg:h-7 text-[#CFA96F]" /></div>
            <div><p className="text-[10px] lg:text-[11px] text-[#8D5B30] font-black tracking-[0.2em] uppercase mb-1">Waktu Aktual</p><p className="text-base lg:text-lg text-[#342B22] font-black tracking-wide">{formattedTime} WIB</p></div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#FDFBF7] to-white backdrop-blur-md border-2 border-[#CFA96F]/50 rounded-[2rem] p-6 lg:p-8 flex flex-col shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden order-1 lg:order-2 group">
          <div className="absolute right-0 top-0 w-40 h-40 bg-[#CFA96F]/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform duration-700 group-hover:scale-150"></div>
          <div className="flex items-center gap-5 lg:gap-6 z-10 flex-grow mb-6">
            <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-full bg-[#8D5B30] flex items-center justify-center shadow-lg border-[4px] border-[#ECE1C9] overflow-hidden flex-shrink-0 relative group-hover:border-[#CFA96F] transition-colors">
              {appUser?.avatarUrl ? <img src={appUser.avatarUrl} alt="Avatar Login" className="w-full h-full object-cover" /> : <User className="w-10 h-10 lg:w-12 lg:h-12 text-[#ECE1C9]" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] lg:text-[11px] text-[#CFA96F] font-black uppercase tracking-[0.2em] mb-1.5 drop-shadow-sm">Anggota Login</p>
              <p className="text-xl lg:text-3xl font-black text-[#342B22] leading-tight mb-2 truncate">{appUser?.name}</p>
              <p className="text-xs lg:text-sm text-[#8D5B30] font-bold bg-[#ECE1C9] px-3 py-1 rounded-md inline-block">NTA: {appUser?.nta}</p>
            </div>
          </div>
          <div className="pt-4 border-t-2 border-[#CFA96F]/20 z-10 flex justify-end">
            <button onClick={() => setIsEditModalOpen(true)} className="flex items-center gap-2 text-[11px] lg:text-xs font-black text-[#8D5B30] hover:text-[#ECE1C9] bg-[#CFA96F]/20 hover:bg-[#8D5B30] px-5 py-3 rounded-xl transition-all duration-300 uppercase tracking-widest shadow-sm active:scale-95"><Edit2 className="w-4 h-4" /> Edit Profil</button>
          </div>
        </div>
      </div>

      <main className="flex-grow flex flex-col gap-10">
        <div className="bg-[#FDFBF7] border-2 border-[#CFA96F]/60 rounded-[2rem] lg:rounded-[3rem] p-6 lg:p-12 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-[#8D5B30] to-[#CFA96F]"></div>
          <h2 className="text-2xl lg:text-3xl font-black text-[#8D5B30] mb-8 flex items-center gap-3"><Camera className="w-8 h-8 text-[#CFA96F]" /> Modul Pelaporan Piket</h2>
          
          <VideoRecorder firebaseUser={firebaseUser} appUser={appUser} onRecordSuccess={fetchRecords} />
        </div>

        <div className="mb-12">
          <h3 className="text-sm lg:text-base font-black text-[#8D5B30] mb-6 px-2 uppercase tracking-[0.2em] flex items-center gap-3"><ShieldAlert className="w-5 h-5 lg:w-6 lg:h-6 text-[#CFA96F]" /> Riwayat Pengunggahan Anda</h3>
          {loadingRecords ? (
            <div className="flex flex-col justify-center items-center p-12"><Loader2 className="w-12 h-12 text-[#8D5B30] animate-spin mb-4" /><p className="text-xs font-bold text-[#8D5B30] uppercase tracking-widest animate-pulse">Menarik Data Server...</p></div>
          ) : records.length === 0 ? (
            <div className="bg-white/50 border-2 border-[#CFA96F]/40 rounded-[2rem] p-16 text-center text-[#8D5B30]/60 border-dashed font-bold shadow-sm text-lg">Belum ada riwayat piket yang tersimpan.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
              {records.map((record, idx) => (
                <div key={record.id} className="bg-white border-2 border-[#CFA96F]/40 hover:border-[#8D5B30] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 rounded-[1.5rem] p-6 flex items-center justify-between group animate-in fade-in slide-in-from-bottom-4" style={{animationDelay: `${idx * 50}ms`}}>
                  <div>
                    <p className="text-base lg:text-lg font-black text-[#342B22] mb-1">{record.timestamp.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    <p className="text-xs lg:text-sm text-[#8D5B30] font-bold mt-2 flex items-center gap-2 bg-[#ECE1C9]/50 px-3 py-1.5 rounded-lg inline-flex"><Clock className="w-4 h-4 text-[#CFA96F]" /> Pukul {record.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <button onClick={() => onPlayVideo(record.videoUrl)} className="w-14 h-14 lg:w-16 lg:h-16 bg-gradient-to-br from-[#ECE1C9] to-white group-hover:from-[#8D5B30] group-hover:to-[#793B2B] rounded-2xl flex items-center justify-center transition-all duration-300 border-2 border-[#CFA96F]/50 group-hover:border-[#8D5B30] shadow-md group-hover:shadow-lg transform active:scale-90 flex-shrink-0">
                    <PlayCircle className="w-6 h-6 lg:w-8 lg:h-8 text-[#8D5B30] group-hover:text-white transition-colors" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="mt-auto pt-16 pb-8 text-center border-t border-[#CFA96F]/40">
        <div className="inline-block relative group cursor-default">
          <h2 className="relative text-2xl lg:text-3xl font-black tracking-[0.4em] text-[#8D5B30] mb-3 transition-transform group-hover:scale-105 duration-500">KABINET SANKARA</h2>
        </div>
        <p className="text-[#342B22]/60 text-[10px] font-black tracking-[0.3em] uppercase mt-2">TEMPATNA NGUMPUL RAME KU KARYA</p>
      </footer>

      {isEditModalOpen && <EditProfileModal appUser={appUser} firebaseUser={firebaseUser} onClose={() => setIsEditModalOpen(false)} onUpdate={(newData) => onUpdateProfile(newData)} />}
    </div>
  );
}

// ==========================================
// KOMPONEN: PEREKAM & PENGUNGGAH VIDEO 
// ==========================================
function VideoRecorder({ firebaseUser, appUser, onRecordSuccess }) {
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const fileInputRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false); 

  useEffect(() => {
    let interval;
    if (isRecording) interval = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    else setRecordingTime(0);
    return () => clearInterval(interval);
  }, [isRecording]);

  const stopCamera = useCallback(() => { 
    if (stream) { stream.getTracks().forEach(track => track.stop()); setStream(null); setIsCameraActive(false); } 
  }, [stream]);

  useEffect(() => { 
    return () => {
      if (stream) { stream.getTracks().forEach(track => track.stop()); }
    }; 
  }, [stream]);

  const startCamera = async () => {
    try {
      setErrorMsg(''); setSuccessMsg('');
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: true });
      setStream(mediaStream); setIsCameraActive(true);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
    } catch (err) { setErrorMsg('Kamera ditolak. Gunakan tombol "PILIH FILE" jika Anda membukanya di browser.'); }
  };

  const startRecording = () => {
    if (!stream) return;
    let options = { mimeType: 'video/webm;codecs=vp8,opus' };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) options = { mimeType: 'video/webm' };
    const mediaRecorder = new MediaRecorder(stream, options);
    mediaRecorderRef.current = mediaRecorder;
    const chunks = [];
    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    mediaRecorder.onstop = async () => { const blob = new Blob(chunks, { type: 'video/webm' }); stopCamera(); await uploadToCloudinary(blob); };
    mediaRecorder.start(); setIsRecording(true);
  };

  const stopRecording = () => { if (mediaRecorderRef.current && isRecording) { mediaRecorderRef.current.stop(); setIsRecording(false); } };

  const handleFileUpload = async (event) => {
    setSuccessMsg('');
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) { setErrorMsg('Harap pilih file video (MP4/WebM).'); if(fileInputRef.current) fileInputRef.current.value = ''; return; }
    await uploadToCloudinary(file);
  };

  const uploadToCloudinary = async (videoBlob) => {
    if (!appUser || !firebaseUser) return;
    setIsUploading(true); setErrorMsg(''); setSuccessMsg('');
    try {
      const formData = new FormData();
      formData.append('file', videoBlob);
      formData.append('upload_preset', cloudinaryUploadPreset);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/video/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      const downloadURL = data.secure_url;

      if(downloadURL) {
        const safePlayableUrl = downloadURL.replace(/\.(webm|mkv|ogg)$/i, '.mp4');
        await addDoc(collection(db, 'artifacts', appId, 'accounts', appUser.accountId, 'attendance'), { timestamp: serverTimestamp(), videoUrl: safePlayableUrl });
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'admin_attendance'), { userId: firebaseUser.uid, name: appUser.name, nta: appUser.nta, avatarUrl: appUser.avatarUrl || null, timestamp: serverTimestamp(), videoUrl: safePlayableUrl });
        
        setSuccessMsg("Laporan Piket berhasil disimpan! Anda bisa melaporkan piket lagi.");
        onRecordSuccess();
      } else setErrorMsg("Gagal upload ke Cloud. Periksa koneksi internet.");
    } catch (error) { setErrorMsg("Koneksi server gagal."); } 
    finally { setIsUploading(false); setIsCameraActive(false); if(fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const formatTime = (seconds) => { const m = Math.floor(seconds / 60).toString().padStart(2, '0'); const s = (seconds % 60).toString().padStart(2, '0'); return `${m}:${s}`; };

  return (
    <div className="space-y-6 max-w-3xl mx-auto w-full">
      {errorMsg && <div className="p-4 bg-[#793B2B]/10 border-2 border-[#793B2B]/30 rounded-2xl text-[#793B2B] font-bold text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300 shadow-sm"><AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" /> <p>{errorMsg}</p></div>}
      {successMsg && <div className="p-5 bg-green-900/10 border-2 border-green-800/30 rounded-2xl text-green-800 font-bold text-base flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300 shadow-sm"><CheckCircle2 className="w-6 h-6 flex-shrink-0 mt-0.5" /> <p>{successMsg}</p></div>}
      
      <div className={`relative w-full aspect-video bg-[#342B22] rounded-[1.5rem] lg:rounded-[2.5rem] overflow-hidden border-4 lg:border-[6px] transition-all duration-300 ${isRecording ? 'border-[#793B2B] shadow-[0_0_40px_rgba(121,59,43,0.5)] scale-[1.02]' : 'border-[#CFA96F] shadow-xl'}`}>
        {!isCameraActive && !isUploading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-[#ECE1C9] p-6 text-center bg-gradient-to-br from-[#8D5B30]/20 to-[#342B22]/40 backdrop-blur-sm">
            <Video className="w-16 h-16 lg:w-20 lg:h-20 mb-4 text-[#CFA96F] opacity-80" />
            <p className="text-base lg:text-lg font-black tracking-wide drop-shadow-md">Kamera Tidak Aktif</p>
            <p className="text-[10px] lg:text-xs text-[#ECE1C9]/60 mt-3 font-bold tracking-[0.2em] uppercase bg-[#342B22]/50 px-4 py-2 rounded-full border border-white/10">Silakan Rekam atau Pilih File</p>
          </div>
        ) : isUploading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-[#CFA96F] p-6 text-center bg-[#342B22]/95 backdrop-blur-md z-20">
            <Loader2 className="w-16 h-16 lg:w-20 lg:h-20 mb-6 animate-spin" />
            <p className="text-2xl lg:text-3xl font-black tracking-[0.2em] text-[#ECE1C9] drop-shadow-lg">MENGUNGGAH...</p>
            <p className="text-[10px] lg:text-xs text-[#CFA96F] mt-3 font-black tracking-[0.3em] uppercase bg-[#8D5B30]/20 px-4 py-2 rounded-full">Memproses ke Server</p>
          </div>
        ) : (
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover">
             <track kind="captions" />
          </video>
        )}
        
        {isRecording && !isUploading && (
          <div className="absolute top-4 right-4 lg:top-6 lg:right-6 flex items-center gap-3 bg-[#342B22]/80 backdrop-blur-md px-5 py-2.5 rounded-full border-2 border-[#793B2B] z-20 shadow-lg">
            <div className="w-3.5 h-3.5 rounded-full bg-[#793B2B] animate-pulse shadow-[0_0_10px_rgba(121,59,43,0.8)]"></div>
            <span className="text-[#ECE1C9] text-base lg:text-lg font-mono font-black tracking-widest">{formatTime(recordingTime)}</span>
          </div>
        )}
      </div>
      
      <div className="flex flex-col sm:flex-row justify-center gap-4 lg:gap-6 mt-8">
        {!isCameraActive && !isUploading && !isRecording && (
          <button onClick={startCamera} className="px-6 py-4 lg:py-5 bg-[#CFA96F] hover:bg-[#8D5B30] text-[#342B22] hover:text-[#ECE1C9] font-black tracking-widest lg:text-lg rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 shadow-md hover:shadow-xl hover:-translate-y-1 active:scale-95 flex-1 w-full"><Camera className="w-6 h-6" /> NYALAKAN KAMERA</button>
        )}
        {!isCameraActive && !isUploading && !isRecording && (
          <div className="flex-1 relative w-full">
             <input type="file" accept="video/*" ref={fileInputRef} onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
             <button className="w-full px-6 py-4 lg:py-5 bg-white border-4 border-[#8D5B30] text-[#8D5B30] hover:bg-[#ECE1C9] font-black tracking-widest lg:text-lg rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 shadow-sm hover:shadow-lg hover:-translate-y-1 active:scale-95"><FolderOpen className="w-6 h-6" /> PILIH FILE VIDEO</button>
          </div>
        )}
        {isCameraActive && !isRecording && !isUploading && (
          <button onClick={startRecording} className="px-8 py-4 lg:py-5 bg-[#8D5B30] hover:bg-[#793B2B] text-[#ECE1C9] font-black tracking-[0.2em] lg:text-lg rounded-2xl transition-all duration-300 hover:shadow-xl hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3 shadow-lg border border-[#793B2B] w-full"><div className="w-5 h-5 rounded-full bg-[#ECE1C9] animate-pulse"></div> MULAI REKAMAN</button>
        )}
        {isRecording && !isUploading && (
          <button onClick={stopRecording} className="px-8 py-4 lg:py-5 bg-[#342B22] hover:bg-black text-[#ECE1C9] font-black tracking-[0.2em] lg:text-lg rounded-2xl border border-[#CFA96F]/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3 shadow-md w-full"><Square className="w-5 h-5 fill-current text-[#793B2B]" /> SELESAIKAN REKAMAN</button>
        )}
      </div>
    </div>
  );
}

// ==========================================
// KOMPONEN: MODAL EDIT PROFIL 
// ==========================================
function EditProfileModal({ appUser, firebaseUser, onClose, onUpdate }) {
  const [name, setName] = useState(appUser?.name || '');
  const [nta, setNta] = useState(appUser?.nta || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  const handleSave = async () => {
    if (!name || !nta) return;
    setIsSaving(true);
    const cleanNta = appUser.role === 'admin' ? nta : nta.toUpperCase();
    try {
      await setDoc(doc(db, 'artifacts', appId, 'accounts', appUser.accountId, 'profile', 'data'), { name, nta: cleanNta }, { merge: true });
      onUpdate({ name, nta: cleanNta });
      onClose();
    } catch (error) { alert("Gagal menyimpan."); } finally { setIsSaving(false); }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert("Pilih file gambar."); return; }
    setIsUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', cloudinaryUploadPreset);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      const downloadURL = data.secure_url;

      if(downloadURL) {
        await setDoc(doc(db, 'artifacts', appId, 'accounts', appUser.accountId, 'profile', 'data'), { avatarUrl: downloadURL }, { merge: true });
        onUpdate({ avatarUrl: downloadURL });
      }
    } catch (error) { alert("Gagal mengunggah foto."); } 
    finally { setIsUploadingPhoto(false); if(fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleDeletePhoto = async () => {
    if (!window.confirm("Hapus foto profil?")) return;
    setIsUploadingPhoto(true);
    try {
      await setDoc(doc(db, 'artifacts', appId, 'accounts', appUser.accountId, 'profile', 'data'), { avatarUrl: null }, { merge: true });
      onUpdate({ avatarUrl: null });
    } catch (error) { console.error(error); } finally { setIsUploadingPhoto(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-[#342B22]/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[#ECE1C9] border-[3px] border-[#CFA96F] rounded-[2rem] lg:rounded-[3rem] w-full max-w-md lg:max-w-lg shadow-2xl relative animate-in zoom-in-95 duration-500 max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-5 lg:p-6 border-b-2 border-[#CFA96F]/30 flex items-center justify-between bg-white relative z-10 shrink-0">
          <h3 className="text-lg font-black text-[#8D5B30] tracking-widest flex items-center gap-2"><Edit2 className="w-5 h-5 text-[#CFA96F]" /> EDIT PROFIL</h3>
          <button onClick={onClose} className="p-2.5 text-[#793B2B] hover:text-[#ECE1C9] hover:bg-[#793B2B] rounded-full transition-all duration-300 active:scale-90 bg-[#793B2B]/10"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 lg:p-8 space-y-6 bg-gradient-to-b from-white/50 to-[#ECE1C9]/20 overflow-y-auto flex-1">
          <div className="flex flex-col items-center gap-5">
            <div className="w-24 h-24 lg:w-28 lg:h-28 rounded-full bg-[#8D5B30] flex items-center justify-center shadow-xl border-[6px] border-white overflow-hidden relative transition-transform hover:scale-105 duration-300 shrink-0">
              {isUploadingPhoto ? <Loader2 className="w-10 h-10 text-[#ECE1C9] animate-spin" /> : appUser?.avatarUrl ? <img src={appUser.avatarUrl} alt="Preview Foto" className="w-full h-full object-cover" /> : <User className="w-12 h-12 text-[#ECE1C9]" />}
            </div>
            <div className="flex items-center justify-center gap-3 w-full shrink-0">
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handlePhotoUpload} />
              <button onClick={() => fileInputRef.current?.click()} disabled={isUploadingPhoto} className="flex-1 text-xs lg:text-sm font-black tracking-widest px-4 py-3 bg-[#8D5B30] hover:bg-[#CFA96F] text-white rounded-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 shadow-md active:scale-95"><ImagePlus className="w-4 h-4" /> UPLOAD BARU</button>
              {appUser?.avatarUrl && <button onClick={handleDeletePhoto} disabled={isUploadingPhoto} className="px-4 py-3 bg-[#793B2B]/10 hover:bg-[#793B2B] text-[#793B2B] hover:text-white rounded-xl transition-all duration-300 flex items-center justify-center disabled:opacity-50 shadow-sm active:scale-95"><Trash2 className="w-4 h-4 lg:w-5 lg:h-5" /></button>}
            </div>
          </div>
          <hr className="border-[#CFA96F]/30 shrink-0" />
          <div className="space-y-4 shrink-0">
            <div><label className="block text-[10px] lg:text-xs font-black text-[#8D5B30] mb-2 uppercase tracking-widest">Nama Lengkap</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} className="block w-full px-5 py-3 lg:py-4 border-2 border-[#CFA96F]/50 bg-white rounded-xl font-bold focus:outline-none focus:border-[#8D5B30] focus:ring-4 focus:ring-[#8D5B30]/10 transition-all shadow-sm text-sm lg:text-base" /></div>
            <div><label className="block text-[10px] lg:text-xs font-black text-[#8D5B30] mb-2 uppercase tracking-widest">{appUser?.role === 'admin' ? 'Kode Admin' : 'NTA'}</label><input type="text" value={nta} onChange={(e) => setNta(e.target.value)} className="block w-full px-5 py-3 lg:py-4 border-2 border-[#CFA96F]/50 bg-white rounded-xl font-bold focus:outline-none focus:border-[#8D5B30] focus:ring-4 focus:ring-[#8D5B30]/10 transition-all shadow-sm text-sm lg:text-base" /></div>
          </div>
          <button onClick={handleSave} disabled={isSaving || !name || !nta} className="w-full py-4 lg:py-5 bg-[#8D5B30] hover:bg-[#793B2B] text-[#ECE1C9] text-sm lg:text-base font-black tracking-[0.2em] rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-1 active:scale-95 transition-all duration-300 flex justify-center items-center gap-3 mt-2 shrink-0"><Save className="w-5 h-5" /> SIMPAN PERUBAHAN</button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// KOMPONEN: POPUP PEMUTAR VIDEO 
// ==========================================
function VideoModal({ videoUrl, onClose }) {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-10 bg-[#342B22]/95 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-[#ECE1C9] border-[3px] border-[#CFA96F] rounded-[2rem] lg:rounded-[3rem] w-full max-w-5xl overflow-hidden shadow-2xl transform transition-all animate-in zoom-in-95 duration-500">
        <div className="p-5 lg:p-6 border-b-2 border-[#CFA96F]/30 flex items-center justify-between bg-white relative z-20">
          <h3 className="font-black text-[#8D5B30] flex items-center gap-3 text-lg lg:text-xl tracking-widest"><ShieldAlert className="w-6 h-6 text-[#CFA96F]" /> BUKTI PIKET</h3>
          <button onClick={onClose} className="p-2.5 lg:p-3 text-[#793B2B] hover:text-[#ECE1C9] hover:bg-[#793B2B] rounded-full transition-all duration-300 active:scale-90 bg-[#793B2B]/10"><X className="w-6 h-6" /></button>
        </div>
        <div className="bg-[#1a1511] aspect-video flex items-center justify-center relative border-b-4 lg:border-b-8 border-[#8D5B30]">
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-0">
              <Loader2 className="w-12 h-12 text-[#CFA96F] animate-spin mb-4" />
              <p className="text-[#CFA96F] text-xs font-black tracking-widest uppercase animate-pulse">Menyiapkan Video...</p>
            </div>
          )}
          <video 
            src={videoUrl} 
            controls 
            autoPlay 
            playsInline
            onCanPlay={() => setIsLoading(false)}
            className="w-full h-full object-contain relative z-10 shadow-inner" 
          >
            <track kind="captions" />
          </video>
        </div>
      </div>
    </div>
  );
}
