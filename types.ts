
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, 
  Calendar, 
  BarChart3, 
  LogOut, 
  Menu, 
  X, 
  LayoutDashboard,
  GraduationCap,
  PlusCircle,
  CheckCircle2,
  Database,
  CloudSync,
  RefreshCw,
  AlertCircle,
  Settings,
  Check,
  ShieldCheck,
  Lock,
  Code,
  ClipboardList,
  FlaskConical,
  Contact2,
  UserX,
  MessageCircle,
  Zap,
  Timer,
  ArrowRight
} from 'lucide-react';
import { Aluno, Turma, Matricula, Presenca, Usuario, ViewType, AulaExperimental, CursoCancelado, AcaoRetencao } from './types';
import { INITIAL_ALUNOS, INITIAL_TURMAS, INITIAL_MATRICULAS, INITIAL_PRESENCAS, INITIAL_USUARIOS } from './constants';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Frequencia from './components/Frequencia';
import Relatorios from './components/Relatorios';
import TurmasList from './components/TurmasList';
import UsuariosList from './components/UsuariosList';
import PreparacaoTurmas from './components/PreparacaoTurmas';
import AulasExperimentais from './components/AulasExperimentais';
import DadosAlunos from './components/DadosAlunos';
import ChurnRiskManagement from './components/ChurnRiskManagement';

const BPlusLogo: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <text x="5" y="80" fontFamily="Arial Black, sans-serif" fontSize="85" fill="#1d3ba3" fontWeight="900">B</text>
    <path d="M60 45 L95 45 M77.5 25 L77.5 65" stroke="#00a396" strokeWidth="12" strokeLinecap="round" />
  </svg>
);

const formatEscolaridade = (aluno: Aluno) => {
  const etapa = (aluno.etapa || '').trim();
  const ano = (aluno.anoEscolar || '').trim();
  const turma = (aluno.turmaEscolar || '').trim();
  if (!etapa && !ano) return 'Sem Classificação';
  let result = etapa;
  if (ano) result += (result ? `-${ano}` : ano);
  if (turma) result += ` ${turma.replace(/Turma/gi, '').trim()}`;
  return result.trim() || 'Sem Classificação';
};

const DEFAULT_API_URL = "https://script.google.com/macros/s/AKfycbxR3xc5QoxvEBC0nFaGojOT2v8KG32dmGoSMcYuGt-IJr9TxZ8TLgaGoWWU-3jE-VpfiA/exec";
const DEFAULT_WHATSAPP_URL = "https://webhook.pluglead.com/webhook/f119b7961a1c6530df9dcec417de5f3e";

const App: React.FC = () => {
  const [user, setUser] = useState<Usuario | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(localStorage.getItem('last_sync'));
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);
  const [nextSyncTime, setNextSyncTime] = useState<string | null>(null);
  
  const autoSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [apiUrl, setApiUrl] = useState(() => {
    const saved = localStorage.getItem('google_script_url');
    return (saved && saved.trim() !== "") ? saved : DEFAULT_API_URL;
  });
  
  const [whatsappApiUrl, setwhatsappApiUrl] = useState(localStorage.getItem('whatsapp_api_url') || DEFAULT_WHATSAPP_URL);
  const [whatsappToken, setWhatsappToken] = useState(localStorage.getItem('whatsapp_token') || '');
  
  const [alunos, setAlunos] = useState<Aluno[]>(() => {
    const saved = localStorage.getItem('data_alunos');
    return saved ? JSON.parse(saved) : INITIAL_ALUNOS;
  });
  const [turmas, setTurmas] = useState<Turma[]>(() => {
    const saved = localStorage.getItem('data_turmas');
    const parsed = saved ? JSON.parse(saved) : INITIAL_TURMAS;
    return [...parsed].sort((a, b) => a.nome.localeCompare(b.nome));
  });
  const [matriculas, setMatriculas] = useState<Matricula[]>(() => {
    const saved = localStorage.getItem('data_matriculas');
    return saved ? JSON.parse(saved) : INITIAL_MATRICULAS;
  });
  const [presencas, setPresencas] = useState<Presenca[]>(() => {
    const saved = localStorage.getItem('data_presencas');
    return saved ? JSON.parse(saved) : INITIAL_PRESENCAS;
  });
  const [usuarios, setUsuarios] = useState<Usuario[]>(() => {
    const saved = localStorage.getItem('data_usuarios');
    return saved ? JSON.parse(saved) : INITIAL_USUARIOS;
  });
  const [experimentais, setExperimentais] = useState<AulaExperimental[]>(() => {
    const saved = localStorage.getItem('data_experimentais');
    return saved ? JSON.parse(saved) : [];
  });
  const [acoesRetencao, setAcoesRetencao] = useState<AcaoRetencao[]>(() => {
    const saved = localStorage.getItem('data_acoes_retencao');
    return saved ? JSON.parse(saved) : [];
  });

  const getFuzzyValue = (obj: any, keys: string[], forbiddenTerms: string[] = []) => {
    if (!obj) return '';
    const objKeys = Object.keys(obj);
    const normalize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "").trim();
    const forbiddenNormalized = forbiddenTerms.map(t => normalize(t));
    for (const searchKey of keys) {
      const normalizedSearch = normalize(searchKey);
      const exactMatch = objKeys.find(k => {
        const nk = normalize(k);
        if (forbiddenNormalized.some(f => nk === f || nk.includes(f))) return false;
        return nk === normalizedSearch;
      });
      if (exactMatch) return String(obj[exactMatch]).trim();
    }
    for (const searchKey of keys) {
      const normalizedSearch = normalize(searchKey);
      if (normalizedSearch.length < 3) continue;
      const partialMatch = objKeys.find(k => {
        const nk = normalize(k);
        if (forbiddenNormalized.some(f => nk === f || nk.includes(f))) return false;
        return nk.includes(normalizedSearch);
      });
      if (partialMatch) return String(obj[partialMatch]).trim();
    }
    return '';
  };

  const syncFromSheets = async (isAuto: boolean = false) => {
    const urlToUse = apiUrl.trim();
    if (!urlToUse) return;

    if (!isAuto) setIsLoading(true);
    setSyncError(null);
    
    try {
      const cacheBuster = `&t=${Date.now()}`;
      const finalUrl = urlToUse.includes('?') ? `${urlToUse}${cacheBuster}` : `${urlToUse}?${cacheBuster}`;
      const response = await fetch(finalUrl);
      if (!response.ok) throw new Error(`Erro ${response.status}`);
      const data = await response.json();
      
      const newAlunosMap = new Map<string, Aluno>();

      if (data.usuarios && Array.isArray(data.usuarios)) {
        const mappedUsuarios = data.usuarios.map((u: any) => ({
          login: getFuzzyValue(u, ['login', 'usuario', 'id', 'operador']),
          senha: String(getFuzzyValue(u, ['senha', 'password', 'key', 'pass'])),
          nivel: getFuzzyValue(u, ['nivel', 'acesso', 'role', 'tipo']) as any,
          nome: getFuzzyValue(u, ['nome', 'name', 'colaborador'])
        })).filter(u => u.login);
        if (mappedUsuarios.length > 0) setUsuarios(mappedUsuarios);
      }

      if (data.turmas && Array.isArray(data.turmas)) {
        const mappedTurmas = data.turmas.map((t: any) => ({
          id: getFuzzyValue(t, ['nome', 'turma', 'curso', 'modalidade', 'id']),
          nome: getFuzzyValue(t, ['nome', 'turma', 'curso', 'modalidade']),
          horario: getFuzzyValue(t, ['horario', 'hora', 'dias', 'periodo']),
          professor: getFuzzyValue(t, ['professor', 'instrutor', 'regente', 'profe']),
          capacidade: parseInt(getFuzzyValue(t, ['capacidade', 'vagas', 'max', 'limite'])) || 0
        })).filter(t => t.nome);
        if (mappedTurmas.length > 0) setTurmas(mappedTurmas);
      }

      if (data.base && Array.isArray(data.base)) {
        const rawMatriculas: Matricula[] = [];
        data.base.forEach((row: any) => {
          const nome = getFuzzyValue(row, ['estudante', 'nome', 'aluno']);
          if (!nome || nome.length < 2) return;
          const id = nome.replace(/\s+/g, '_').toLowerCase();
          const curso = getFuzzyValue(row, ['modalidade', 'curso', 'turma_sport', 'aula', 'plano', 'cur']).trim();
          const statusRaw = getFuzzyValue(row, ['status', 'ativo', 'situa', 'matri', 'situacao', 'ativado']).toLowerCase();
          const isAtivo = statusRaw === 'ativo' || statusRaw === 'ativa' || statusRaw === 'sim' || statusRaw.includes('at') || statusRaw === '1';
          
          if (!newAlunosMap.has(id)) {
            newAlunosMap.set(id, {
              id, nome, 
              dataNascimento: getFuzzyValue(row, ['nasc', 'data de nascimento', 'nascimento']),
              contato: getFuzzyValue(row, ['whatsapp', 'tel', 'contato']),
              responsavel1: getFuzzyValue(row, ['responsavel 1', 'mae']),
              whatsapp1: getFuzzyValue(row, ['whatsapp1']),
              statusMatricula: statusRaw
            });
          }
          if (curso && isAtivo) {
            rawMatriculas.push({ id: `M-${Math.random()}`, alunoId: id, turmaId: curso });
          }
        });
        setAlunos(Array.from(newAlunosMap.values()));
        setMatriculas(rawMatriculas);
      }
      
      const nowStr = new Date().toLocaleString('pt-BR');
      setLastSync(nowStr);
      localStorage.setItem('last_sync', nowStr);
      
      // Lógica de Logoff Automático se for nível Start
      if (user?.nivel === 'Start') {
        setTimeout(() => {
          setUser(null);
        }, 1500);
      } else if (!isAuto) {
        setSyncSuccess(`Dados atualizados.`);
        setTimeout(() => setSyncSuccess(null), 3000);
      }
    } catch (error: any) {
      if (!isAuto) setSyncError(`Falha na conexão com a planilha.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => { setUser(null); setCurrentView('dashboard'); };

  // Salvar no LocalStorage
  useEffect(() => {
    localStorage.setItem('data_alunos', JSON.stringify(alunos));
    localStorage.setItem('data_turmas', JSON.stringify(turmas));
    localStorage.setItem('data_matriculas', JSON.stringify(matriculas));
    localStorage.setItem('data_usuarios', JSON.stringify(usuarios));
    localStorage.setItem('google_script_url', apiUrl);
  }, [alunos, turmas, matriculas, usuarios, apiUrl]);

  if (!user) return <Login onLogin={setUser} usuarios={usuarios} />;

  // Tela de "Start" (Boot do Equipamento)
  if (user.nivel === 'Start') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-[40px] shadow-2xl p-10 text-center animate-in fade-in zoom-in-95 duration-500">
          <div className="bg-white p-4 rounded-3xl shadow-xl border border-slate-50 inline-block mb-8">
            <BPlusLogo className="w-16 h-16" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Primeiro Acesso B+</h2>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-8">Equipamento novo detectado. Sincronize para liberar os logins.</p>
          
          <button 
            onClick={() => syncFromSheets(false)}
            disabled={isLoading}
            className={`w-full py-6 rounded-2xl font-black text-lg shadow-xl transition-all flex items-center justify-center gap-3 ${isLoading ? 'bg-slate-100 text-slate-400' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20'}`}
          >
            {isLoading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <CloudSync className="w-6 h-6" />}
            {isLoading ? 'Sincronizando...' : 'Atualizar'}
          </button>

          {isLoading && (
            <p className="mt-6 text-xs font-black text-blue-600 animate-pulse uppercase">Aguarde: Preparando ambiente...</p>
          )}

          {lastSync && !isLoading && (
            <div className="mt-8 p-4 bg-green-50 rounded-2xl border border-green-100 animate-in fade-in">
               <p className="text-xs font-bold text-green-700">Equipamento Pronto!</p>
               <p className="text-[10px] text-green-600 font-black uppercase mt-1">Retornando para a tela de login...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const isGestorUser = user.nivel === 'Gestor' || user.nivel === 'Gestor Master';
  const isMaster = user.nivel === 'Gestor Master';

  return (
    <div className="flex h-screen bg-slate-50">
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setIsSidebarOpen(false)}/>}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-slate-900 text-white transform transition-transform duration-300 z-30 lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-10">
            <div className="bg-white p-1.5 rounded-lg"><BPlusLogo className="w-8 h-8" /></div>
            <h1 className="text-xl font-bold tracking-tight">Gestão de Turmas B+</h1>
          </div>
          <nav className="flex-1 space-y-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Professor', 'Gestor', 'Gestor Master', 'Regente', 'Estagiário'] },
              { id: 'dados-alunos', label: 'Dados de Alunos', icon: Contact2, roles: ['Gestor', 'Gestor Master'] },
              { id: 'turmas', label: 'Turmas', icon: GraduationCap, roles: ['Professor', 'Gestor', 'Gestor Master'] },
              { id: 'preparacao', label: 'Preparação', icon: ClipboardList, roles: ['Gestor', 'Gestor Master', 'Regente', 'Estagiário'] },
              { id: 'experimental', label: 'Experimental', icon: FlaskConical, roles: ['Gestor', 'Gestor Master', 'Regente', 'Estagiário', 'Professor'] },
              { id: 'frequencia', label: 'Frequência', icon: CheckCircle2, roles: ['Professor', 'Gestor', 'Gestor Master'] },
              { id: 'relatorios', label: 'Relatórios', icon: BarChart3, roles: ['Gestor', 'Gestor Master'] },
              { id: 'usuarios', label: 'Usuários', icon: ShieldCheck, roles: ['Gestor', 'Gestor Master'] },
              { id: 'churn-risk', label: 'Risco de Evasão', icon: UserX, roles: ['Gestor', 'Gestor Master'] },
            ].filter(item => item.roles.includes(user.nivel)).map((item) => (
              <button key={item.id} onClick={() => { setCurrentView(item.id as ViewType); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === item.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
          {isGestorUser && (
            <div className="mt-6 space-y-2 border-t border-slate-800 pt-6">
              <button onClick={() => syncFromSheets(false)} disabled={isLoading} className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-slate-700 font-bold transition-all ${isLoading ? 'opacity-50' : 'hover:bg-slate-800'}`}>
                {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CloudSync className="w-5 h-5" />}
                {isLoading ? 'Sincronizando...' : 'Atualizar Dados'}
              </button>
              {isMaster && (
                <button onClick={() => setIsSettingsOpen(true)} className="w-full flex items-center justify-center gap-2 py-2 text-xs text-slate-500 hover:text-white"><Lock className="w-4 h-4" /> Configurações</button>
              )}
            </div>
          )}
          <div className="mt-auto pt-6 border-t border-slate-800 text-center">
            <div className="mb-4 text-left px-4">
              <p className="text-[10px] font-black text-slate-500 uppercase">Usuário Logado</p>
              <p className="text-xs font-bold text-white truncate">{user.nome || user.login}</p>
              <p className="text-[9px] text-blue-400 font-bold uppercase">{user.nivel}</p>
            </div>
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-400"><LogOut className="w-5 h-5" /> <span className="font-medium">Sair</span></button>
          </div>
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2 text-slate-600" onClick={() => setIsSidebarOpen(true)}><Menu className="w-6 h-6" /></button>
            <div className="flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full border border-green-100">
              <Timer className="w-3.5 h-3.5 text-green-600" />
              <span className="text-[10px] font-black text-green-700 uppercase tracking-tight">Auto-Sync Ativo</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
             {lastSync && <span className="text-[10px] text-slate-400 font-bold tracking-tight">SINCRONIZADO: {lastSync}</span>}
             <span className="text-xs text-slate-400 font-medium bg-slate-100 px-2 py-1 rounded">v4.1.0</span>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {syncError && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-600"><AlertCircle className="w-5 h-5 shrink-0" /><p className="text-sm font-bold">{syncError}</p></div>}
          {syncSuccess && <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-2xl flex items-center gap-3 text-green-700"><CheckCircle2 className="w-5 h-5 shrink-0" /><p className="text-sm font-bold">{syncSuccess}</p></div>}
          
          {currentView === 'dashboard' && <Dashboard user={user} alunosCount={alunos.length} turmasCount={turmas.length} turmas={turmas} presencas={presencas} alunos={alunos} matriculas={matriculas} onNavigate={setCurrentView} />}
          {currentView === 'frequencia' && <Frequencia turmas={turmas} alunos={alunos} matriculas={matriculas} presencas={presencas} onSave={() => {}} />}
          {currentView === 'relatorios' && <Relatorios alunos={alunos} turmas={turmas} presencas={presencas} matriculas={matriculas} experimentais={experimentais} />}
          {currentView === 'turmas' && <TurmasList turmas={turmas} matriculas={matriculas} alunos={alunos} userNivel={user.nivel} />}
          {currentView === 'usuarios' && <UsuariosList usuarios={usuarios} />}
          {currentView === 'preparacao' && <PreparacaoTurmas currentUser={user} alunos={alunos} turmas={turmas} matriculas={matriculas} />}
          {currentView === 'experimental' && <AulasExperimentais experimentais={experimentais} currentUser={user} onUpdate={() => {}} />}
          {currentView === 'dados-alunos' && <DadosAlunos alunos={alunos} turmas={turmas} matriculas={matriculas} user={user} />}
          {currentView === 'churn-risk' && <ChurnRiskManagement alunos={alunos} matriculas={matriculas} presencas={presencas} turmas={turmas} acoesRealizadas={acoesRetencao} onRegistrarAcao={() => {}} currentUser={user} />}
        </div>
      </main>

      {isSettingsOpen && isMaster && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[32px] p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-slate-800">Configurações</h3>
              <button onClick={() => setIsSettingsOpen(false)}><X className="w-6 h-6 text-slate-300" /></button>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">URL do Apps Script</label>
              <input type="text" value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-mono text-xs focus:border-blue-500" />
            </div>
            <button onClick={() => { localStorage.setItem('google_script_url', apiUrl); setIsSettingsOpen(false); syncFromSheets(); }} className="w-full mt-8 bg-slate-900 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-slate-800 transition-all">Salvar e Sincronizar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
