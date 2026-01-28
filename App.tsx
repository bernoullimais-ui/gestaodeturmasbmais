
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
  Timer
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
  if (ano) {
    result += (result ? `-${ano}` : ano);
  }
  if (turma) {
    result += ` ${turma.replace(/Turma/gi, '').trim()}`;
  }
  
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
        const canceladosMap = new Map<string, CursoCancelado[]>();

        data.base.forEach((row: any) => {
          const nome = getFuzzyValue(row, ['estudante', 'nome', 'aluno']);
          if (!nome || nome.length < 2) return;
          const id = nome.replace(/\s+/g, '_').toLowerCase();
          const curso = getFuzzyValue(row, ['modalidade', 'curso', 'turma_sport', 'aula', 'plano', 'cur']).trim();
          const statusRaw = getFuzzyValue(row, ['status', 'ativo', 'situa', 'matri', 'situacao', 'ativado']).toLowerCase();
          const isAtivo = statusRaw === 'ativo' || statusRaw === 'ativa' || statusRaw === 'sim' || statusRaw.includes('at') || statusRaw === '1';
          const enrollmentDateRaw = getFuzzyValue(row, ['data da matricula', 'matricula', 'dt_mat', 'entrada', 'dt matricula']);
          const currentEnrollmentDate = parseToDate(enrollmentDateRaw);
          const cancellationDateRaw = getFuzzyValue(row, ['data de cancelamento', 'cancelamento', 'dt_canc', 'saida', 'dt cancelamento']);
          const nascRaw = getFuzzyValue(row, ['nasc', 'data de nascimento', 'nascimento', 'dt_nas']);
          const escolarCompleto = getFuzzyValue(row, ['estagio/anoescolar', 'estagio', 'escolaridade', 'sigla', 'etapa']);
          const etapa = mapEtapa(escolarCompleto);
          const ano = escolarCompleto.replace(/ensino|fundamental|médio|medio|infantil|educação|educacao|estágio|estagio|ano|série|serie|EF|EI|EM|[-/]/gi, ' ').trim();
          const teClean = getFuzzyValue(row, ['turma escolar', 'letra', 'classe', 'turmaescolar']).replace(/turma/gi, '').trim();
          
          // Mapeamento ampliado para Responsaveis
          const w1Raw = getFuzzyValue(row, ['whatsapp1', 'whatsapp 1', 'tel1', 'celular1']);
          const w2Raw = getFuzzyValue(row, ['whatsapp2', 'whatsapp 2', 'tel2', 'celular2', 'contato 2', 'fone 2']);
          const contactRaw = getFuzzyValue(row, ['whatsapp', 'tel', 'contato']);

          const existingAluno = newAlunosMap.get(id);
          const existingDate = existingAluno ? parseToDate(existingAluno.dataMatricula) : null;
          const shouldUpdateCadastral = !existingAluno || existingAluno.isLead || !existingDate || (currentEnrollmentDate && currentEnrollmentDate >= existingDate);

          if (shouldUpdateCadastral) {
            newAlunosMap.set(id, {
              id, nome, dataNascimento: nascRaw, contato: cleanPhonePrefix(contactRaw),
              etapa, anoEscolar: ano, turmaEscolar: teClean, dataMatricula: enrollmentDateRaw,
              email: getFuzzyValue(row, ['email', 'correio']),
              responsavel1: getFuzzyValue(row, ['responsavel 1', 'responsavel1', 'mae', 'mãe', 'mae/responsavel', 'responsavel'], ['turma', 'curso', 'modalidade', 'horario']),
              whatsapp1: cleanPhonePrefix(w1Raw),
              responsavel2: getFuzzyValue(row, ['responsavel 2', 'responsavel2', 'pai', 'pai/responsavel', 'responsável 2', 'contato 2'], ['turma', 'curso', 'modalidade', 'horario']),
              whatsapp2: cleanPhonePrefix(w2Raw),
              statusMatricula: statusRaw, dataCancelamento: cancellationDateRaw,
              cursosCanceladosDetalhes: existingAluno?.cursosCanceladosDetalhes || [], isLead: false
            });
          }

          if (curso) {
            if (isAtivo) {
              rawMatriculas.push({
                id: `M-${Math.random().toString(36).substr(2, 5)}`,
                alunoId: id, turmaId: curso, dataMatricula: enrollmentDateRaw
              });
            } else {
              const currentCancelados = canceladosMap.get(id) || [];
              if (!currentCancelados.some(c => c.nome === curso && c.dataMatricula === enrollmentDateRaw)) {
                canceladosMap.set(id, [...currentCancelados, {
                  nome: curso, dataMatricula: enrollmentDateRaw, dataCancelamento: cancellationDateRaw
                }]);
              }
            }
          }
        });

        newAlunosMap.forEach((aluno, id) => {
          const cancelados = canceladosMap.get(id) || [];
          aluno.cursosCanceladosDetalhes = cancelados;
          aluno.cursosCancelados = cancelados.map(c => c.nome);
        });

        setAlunos(Array.from(newAlunosMap.values()));
        setMatriculas(rawMatriculas);
      }

      if (data.experimental && Array.isArray(data.experimental)) {
        data.experimental.forEach((e: any) => {
          const nome = getFuzzyValue(e, ['estudante', 'aluno', 'nome']);
          if (!nome) return;
          const id = nome.replace(/\s+/g, '_').toLowerCase();
          const escolaridadeRaw = getFuzzyValue(e, ['escolaridade', 'etapa', 'nivel', 'sigla', 'estagio'], ['turma', 'curso', 'modalidade', 'aula', 'horario']);
          const anoRaw = getFuzzyValue(e, ['ano', 'serie', 'ano escolar', 'anoescolar'], ['turma', 'curso', 'modalidade']);
          const etapa = mapEtapa(escolaridadeRaw) || mapEtapa(anoRaw);
          const ano = anoRaw.replace(/ano|série|serie|ensino|fundamental|médio|medio|infantil|educação|educacao|EI|EF|EM|[-]/gi, '').trim();
          const turmaEscolar = getFuzzyValue(e, ['turma escolar', 'letra', 'classe', 'turmaescolar'], ['turma_sport', 'curso']).replace(/turma/gi, '').trim();
          const resp1 = getFuzzyValue(e, ['responsavel 1', 'responsavel1', 'mae', 'pai', 'mae/responsavel', 'responsavel'], ['turma', 'curso', 'modalidade', 'aula', 'horario', 'serie']);
          const zap1 = cleanPhonePrefix(getFuzzyValue(e, ['whatsapp1', 'celular', 'whatsapp 1', 'telefone', 'contato_fone']));
          
          if (!newAlunosMap.has(id)) {
            newAlunosMap.set(id, {
              id, nome, dataNascimento: '--', contato: zap1,
              etapa, anoEscolar: ano, turmaEscolar,
              responsavel1: resp1, whatsapp1: zap1,
              isLead: true, statusMatricula: 'Lead Qualificado'
            });
          }
        });
      }
      
      const nowStr = new Date().toLocaleString('pt-BR');
      setLastSync(nowStr);
      localStorage.setItem('last_sync', nowStr);
      if (!isAuto) {
        setSyncSuccess(`Dados atualizados.`);
        setTimeout(() => setSyncSuccess(null), 3000);
      }
    } catch (error: any) {
      if (!isAuto) setSyncError(`Falha na conexão com o Sheets.`);
    } finally {
      setIsLoading(false);
      scheduleNextAutoSync();
    }
  };

  const scheduleNextAutoSync = () => {
    if (autoSyncTimerRef.current) clearTimeout(autoSyncTimerRef.current);
    
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const currentTimeInMinutes = h * 60 + m;

    let delayInMinutes = 0;
    let nextScheduledTime = new Date(now);

    if (currentTimeInMinutes < 360) {
      delayInMinutes = 360 - currentTimeInMinutes;
    } else if (currentTimeInMinutes < 660) {
      delayInMinutes = 30;
    } else if (currentTimeInMinutes < 900) {
      delayInMinutes = 15;
    } else if (currentTimeInMinutes < 1200) {
      delayInMinutes = 45;
    } else {
      delayInMinutes = (1440 - currentTimeInMinutes) + 360;
    }

    nextScheduledTime.setMinutes(now.getMinutes() + delayInMinutes);
    setNextSyncTime(nextScheduledTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));

    autoSyncTimerRef.current = setTimeout(() => {
      syncFromSheets(true);
    }, delayInMinutes * 60 * 1000);
  };

  useEffect(() => {
    if (user && (user.nivel === 'Gestor' || user.nivel === 'Gestor Master')) {
      scheduleNextAutoSync();
    }
    return () => {
      if (autoSyncTimerRef.current) clearTimeout(autoSyncTimerRef.current);
    };
  }, [user]);

  const viewableTurmas = useMemo(() => {
    if (!user) return [];
    if (user.nivel === 'Gestor' || user.nivel === 'Gestor Master' || user.nivel === 'Regente' || user.nivel === 'Estagiário') return turmas;
    const userName = (user.nome || user.login).toLowerCase();
    return turmas.filter(t => t.professor.toLowerCase().includes(userName) || userName.includes(t.professor.toLowerCase()));
  }, [user, turmas]);

  const viewableAlunos = useMemo(() => {
    if (!user) return [];
    if (user.nivel === 'Gestor' || user.nivel === 'Gestor Master' || user.nivel === 'Estagiário') return alunos;
    if (user.nivel === 'Regente') {
      const siglaRegente = (user.nome || '').toLowerCase().trim();
      return alunos.filter(a => formatEscolaridade(a).toLowerCase().trim() === siglaRegente);
    }
    const turmasIds = viewableTurmas.map(t => t.id);
    const ids = new Set(matriculas.filter(m => turmasIds.includes(m.turmaId)).map(m => m.alunoId));
    return alunos.filter(a => ids.has(a.id));
  }, [user, alunos, viewableTurmas, matriculas]);

  const viewablePresencas = useMemo(() => {
    if (!user) return [];
    if (user.nivel === 'Gestor' || user.nivel === 'Gestor Master' || user.nivel === 'Estagiário') return presencas;
    const turmasIds = viewableTurmas.map(t => t.id);
    return presencas.filter(p => turmasIds.includes(p.turmaId));
  }, [user, presencas, viewableTurmas]);

  const alunosHojeCount = useMemo(() => {
    if (!user || user.nivel !== 'Regente') return 0;
    const today = new Date().getDay();
    const diaTermsMap: Record<number, string[]> = {
      1: ['seg', 'segunda', '2ª'], 2: ['ter', 'terça', 'terca', '3ª'],
      3: ['qua', 'quarta', '4ª'], 4: ['qui', 'quinta', '5ª'], 5: ['sex', 'sexta', '6ª']
    };
    const terms = diaTermsMap[today] || [];
    if (terms.length === 0) return 0;
    return viewableAlunos.filter(aluno => {
      const matriculasAluno = matriculas.filter(m => m.alunoId === aluno.id);
      return matriculasAluno.some(m => {
        const turmaInfo = turmas.find(t => t.id === m.turmaId);
        if (!turmaInfo) return false;
        const h = turmaInfo.horario.toLowerCase();
        return terms.some(term => h.includes(term));
      });
    }).length;
  }, [user, viewableAlunos, matriculas, turmas]);

  useEffect(() => {
    localStorage.setItem('data_alunos', JSON.stringify(alunos));
    localStorage.setItem('data_turmas', JSON.stringify(turmas));
    localStorage.setItem('data_matriculas', JSON.stringify(matriculas));
    localStorage.setItem('data_presencas', JSON.stringify(presencas));
    localStorage.setItem('data_usuarios', JSON.stringify(usuarios));
    localStorage.setItem('data_experimentais', JSON.stringify(experimentais));
    localStorage.setItem('data_acoes_retencao', JSON.stringify(acoesRetencao));
    localStorage.setItem('google_script_url', apiUrl);
  }, [alunos, turmas, matriculas, presencas, usuarios, experimentais, acoesRetencao, apiUrl]);

  const parseToDate = (dateVal: any): Date | null => {
    if (!dateVal || String(dateVal).trim() === '') return null;
    let s = String(dateVal).trim().toLowerCase();
    const monthsMap: Record<string, number> = {
      'jan': 0, 'fev': 1, 'mar': 2, 'abr': 3, 'mai': 4, 'jun': 5,
      'jul': 6, 'ago': 7, 'set': 8, 'out': 9, 'nov': 10, 'dez': 11
    };
    if (s.includes(' de ')) {
      const parts = s.split(/\s+de\s+|\s+|,/);
      const day = parseInt(parts[0]);
      const monthName = parts[1].replace('.', '').substring(0, 3);
      const year = parseInt(parts[2]);
      if (!isNaN(day) && !isNaN(year) && monthsMap[monthName] !== undefined) return new Date(year, monthsMap[monthName], day);
    }
    if (s.includes('t')) {
      const d = new Date(dateVal);
      return isNaN(d.getTime()) ? null : d;
    }
    const dateMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (dateMatch) {
      const d = parseInt(dateMatch[1]);
      const m = parseInt(dateMatch[2]);
      let y = parseInt(dateMatch[3]);
      if (y < 100) y += (y < 50 ? 2000 : 1900);
      return new Date(y, m - 1, d);
    }
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? null : d;
  };

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

  const cleanPhonePrefix = (val: string): string => {
    if (!val) return '';
    let cleaned = val.toString().trim();
    if (cleaned.startsWith('+55')) return cleaned.substring(3).trim();
    return cleaned;
  };

  const mapEtapa = (etapaRaw: string): string => {
    if (!etapaRaw) return '';
    const e = etapaRaw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    if (e.includes('infantil') || e.includes('ei') || e.includes('grupo') || e.includes('jardim')) return 'EI';
    if (e.includes('fundamental') || e.includes('ef')) return 'EF';
    if (e.includes('medio') || e.includes('em')) return 'EM';
    const numbers = e.match(/\d+/);
    if (numbers) {
      const num = parseInt(numbers[0]);
      if (num >= 1 && num <= 9 && (e.includes('ano') || e.includes('º'))) return 'EF';
      if (num >= 1 && num <= 3 && (e.includes('serie') || e.includes('ª'))) return 'EM';
      if (num >= 4 && num <= 6 && e.includes('grupo')) return 'EI';
    }
    return ''; 
  };

  const handleUpdateAluno = async (updatedAluno: Aluno) => {
    setAlunos(prev => prev.map(a => a.id === updatedAluno.id ? updatedAluno : a));
    setSyncError(null); setSyncSuccess(null);
    if (!apiUrl) return;
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        body: JSON.stringify({ action: 'update_aluno', data: updatedAluno })
      });
      const result = await response.json();
      if (!response.ok || result.status !== 'SUCCESS') throw new Error(result.message || 'Erro na planilha.');
      setSyncSuccess(`Alterações salvas.`);
      setTimeout(() => setSyncSuccess(null), 3000);
    } catch (error: any) { setSyncError(`Erro de rede: ${error.message}`); }
  };

  const handleCancelCurso = async (nomeAluno: string, nomeCurso: string, dataCancelamento: string) => {
    setSyncError(null); setSyncSuccess(null);
    if (!apiUrl) return;
    try {
      const response = await fetch(apiUrl, { 
        method: 'POST', 
        body: JSON.stringify({ action: 'cancel_curso', data: { nome: nomeAluno, curso: nomeCurso, dataCancelamento } }) 
      });
      const result = await response.json();
      if (!response.ok || result.status !== 'SUCCESS') throw new Error(result.message || 'Erro no processamento.');
      setSyncSuccess(`Encerramento registrado.`);
      await syncFromSheets();
    } catch (error: any) { setSyncError(`Erro: ${error.message}`); }
  };

  const handleLogout = () => { setUser(null); setCurrentView('dashboard'); };
  const handleRegistrarAcaoRetencao = (novaAcao: AcaoRetencao) => { setAcoesRetencao(prev => [...prev, novaAcao]); };
  const handleUpdateExperimental = (updated: AulaExperimental) => { setExperimentais(prev => prev.map(e => e.id === updated.id ? updated : e)); };
  const handleSavePresencas = (novasPresencas: Presenca[]) => {
    if (novasPresencas.length === 0) return;
    const { turmaId, data } = novasPresencas[0];
    const semConflitos = presencas.filter(p => !(p.turmaId === turmaId && p.data === data));
    setPresencas([...semConflitos, ...novasPresencas]);
  };

  if (!user) return <Login onLogin={setUser} usuarios={usuarios} />;

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
            {isGestorUser && (
              <div className="flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full border border-green-100">
                <Timer className="w-3.5 h-3.5 text-green-600" />
                <span className="text-[10px] font-black text-green-700 uppercase tracking-tight">Auto-Sync Ativo</span>
                {nextSyncTime && (
                  <span className="text-[9px] font-bold text-green-500 border-l border-green-200 pl-2 ml-1">Próximo: {nextSyncTime}</span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
             {lastSync && <span className="text-[10px] text-slate-400 font-bold tracking-tight">SINCRONIZADO: {lastSync}</span>}
             <span className="text-xs text-slate-400 font-medium bg-slate-100 px-2 py-1 rounded">v4.1.0</span>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {syncError && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-600"><AlertCircle className="w-5 h-5 shrink-0" /><p className="text-sm font-bold">{syncError}</p></div>}
          {syncSuccess && <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-2xl flex items-center gap-3 text-green-700"><CheckCircle2 className="w-5 h-5 shrink-0" /><p className="text-sm font-bold">{syncSuccess}</p></div>}
          {currentView === 'dashboard' && <Dashboard user={user} alunosCount={viewableAlunos.length} turmasCount={viewableTurmas.length} turmas={viewableTurmas} presencas={viewablePresencas} alunosHojeCount={alunosHojeCount} alunos={alunos} matriculas={matriculas} onNavigate={setCurrentView} />}
          {currentView === 'frequencia' && <Frequencia turmas={viewableTurmas} alunos={alunos} matriculas={matriculas} presencas={presencas} onSave={handleSavePresencas} />}
          {currentView === 'relatorios' && <Relatorios alunos={alunos} turmas={turmas} presencas={viewablePresencas} matriculas={matriculas} experimentais={experimentais} />}
          {currentView === 'turmas' && <TurmasList turmas={viewableTurmas} matriculas={matriculas} alunos={alunos} userNivel={user.nivel} />}
          {currentView === 'usuarios' && <UsuariosList usuarios={usuarios} />}
          {currentView === 'preparacao' && <PreparacaoTurmas currentUser={user} alunos={alunos} turmas={turmas} matriculas={matriculas} />}
          {currentView === 'experimental' && (
            <AulasExperimentais 
              experimentais={experimentais} 
              currentUser={user} 
              onUpdate={handleUpdateExperimental}
              whatsappConfig={{ url: whatsappApiUrl, token: whatsappToken }}
            />
          )}
          {currentView === 'dados-alunos' && (
            <DadosAlunos 
              alunos={alunos} 
              turmas={turmas} 
              matriculas={matriculas} 
              onUpdateAluno={handleUpdateAluno} 
              onCancelCurso={handleCancelCurso} 
              user={user}
              whatsappConfig={{ url: whatsappApiUrl, token: whatsappToken }}
            />
          )}
          {currentView === 'churn-risk' && (
            <ChurnRiskManagement 
              alunos={alunos} 
              matriculas={matriculas} 
              presencas={presencas} 
              turmas={turmas} 
              acoesRealizadas={acoesRetencao} 
              onRegistrarAcao={handleRegistrarAcaoRetencao} 
              currentUser={user}
              whatsappConfig={{ url: whatsappApiUrl, token: whatsappToken }}
            />
          )}
        </div>
      </main>
      {isSettingsOpen && isMaster && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl p-8 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <Settings className="w-6 h-6 text-slate-800" />
                <h3 className="text-2xl font-black">Configurações Gerais</h3>
              </div>
              <button onClick={() => setIsSettingsOpen(false)}><X className="w-6 h-6 text-slate-400" /></button>
            </div>
            
            <div className="space-y-8">
              <section className="space-y-4">
                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                  <Database className="w-4 h-4" /> Sincronização Google Sheets
                </h4>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">URL do Apps Script</label>
                  <input 
                    type="text" 
                    value={apiUrl} 
                    onChange={(e) => setApiUrl(e.target.value)} 
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl outline-none font-mono text-xs focus:border-blue-500" 
                    placeholder="https://script.google.com/macros/s/.../exec"
                  />
                </div>
              </section>

              <section className="space-y-4 border-t border-slate-100 pt-6">
                <h4 className="text-[10px] font-black text-green-600 uppercase tracking-widest flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" /> Integração de WhatsApp (Webhook)
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">URL do Webhook</label>
                    <input 
                      type="text" 
                      value={whatsappApiUrl} 
                      onChange={(e) => setwhatsappApiUrl(e.target.value)} 
                      className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl outline-none font-mono text-xs focus:border-green-500" 
                      placeholder="https://webhook.pluglead.com/webhook/..."
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Token de Acesso</label>
                    <input 
                      type="password" 
                      value={whatsappToken} 
                      onChange={(e) => setWhatsappToken(e.target.value)} 
                      className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-mono text-xs focus:border-green-500" 
                      placeholder="••••••••••••••••"
                    />
                  </div>
                </div>
              </section>
            </div>

            <button 
              onClick={() => { 
                localStorage.setItem('google_script_url', apiUrl); 
                localStorage.setItem('whatsapp_api_url', whatsappApiUrl);
                localStorage.setItem('whatsapp_token', whatsappToken);
                setIsSettingsOpen(false); 
                syncFromSheets(); 
              }} 
              className="w-full mt-10 bg-slate-900 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-slate-800 transition-all active:scale-95"
            >
              Salvar Todas as Alterações
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
