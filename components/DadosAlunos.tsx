
import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Phone, 
  Calendar, 
  Mail, 
  User, 
  BookOpen, 
  GraduationCap, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Clock,
  ExternalLink,
  MessageCircle,
  Building2,
  Trash2,
  Edit2,
  X,
  Save,
  UserCheck,
  RefreshCw,
  CalendarDays,
  Contact2,
  ShieldAlert,
  Zap,
  Send
} from 'lucide-react';
import { Aluno, Turma, Matricula, CursoCancelado, Usuario } from '../types';

interface DadosAlunosProps {
  alunos: Aluno[];
  turmas: Turma[];
  matriculas: Matricula[];
  onUpdateAluno?: (aluno: Aluno) => void;
  onCancelCurso?: (nomeAluno: string, nomeCurso: string, dataCancelamento: string) => Promise<void>;
  user: Usuario;
  whatsappConfig?: {
    url: string;
    token: string;
  };
}

const DadosAlunos: React.FC<DadosAlunosProps> = ({ 
  alunos, 
  turmas, 
  matriculas, 
  onUpdateAluno, 
  onCancelCurso, 
  user,
  whatsappConfig 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [phoneFilter, setPhoneFilter] = useState('');
  const [editingAluno, setEditingAluno] = useState<Aluno | null>(null);
  const [cancellingCourse, setCancellingCourse] = useState<{aluno: Aluno, curso: string, isEditing?: boolean} | null>(null);
  const [messagingTarget, setMessagingTarget] = useState<{name: string, phone: string, studentName: string} | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [cancelDate, setCancelDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  
  const isGestor = user.nivel === 'Gestor' || user.nivel === 'Gestor Master';

  const parseDate = (dateVal: any): Date => {
    if (!dateVal || String(dateVal).trim() === '' || String(dateVal).toLowerCase() === 'null') return new Date(0);
    try {
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

      const dateMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
      if (dateMatch) {
        const d = parseInt(dateMatch[1]);
        const m = parseInt(dateMatch[2]);
        let y = parseInt(dateMatch[3]);
        if (y < 100) y += (y < 50 ? 2000 : 1900);
        return new Date(y, m - 1, d);
      }

      const d = new Date(dateVal);
      if (!isNaN(d.getTime())) return d;
    } catch (e) {}
    return new Date(0);
  };

  const filteredAlunos = useMemo(() => {
    return alunos.filter(aluno => {
      const matchesName = aluno.nome.toLowerCase().includes(searchTerm.toLowerCase());
      const phone1 = (aluno.whatsapp1 || '').replace(/\D/g, '');
      const phone2 = (aluno.whatsapp2 || '').replace(/\D/g, '');
      const filterPhone = phoneFilter.replace(/\D/g, '');
      const matchesPhone = filterPhone === '' || phone1.includes(filterPhone) || phone2.includes(filterPhone);
      return matchesName && matchesPhone;
    });
  }, [alunos, searchTerm, phoneFilter]);

  const formatEscolaridade = (aluno: Aluno) => {
    const sigla = aluno.etapa || '';
    const ano = aluno.anoEscolar || '';
    const turmaEscolar = aluno.turmaEscolar || '';
    if (!sigla && !ano) return '--';
    let output = sigla;
    if (ano) output += (output ? `-${ano}` : ano);
    if (turmaEscolar) output += ` ${turmaEscolar}`;
    return output.trim();
  };

  const formatDisplayDate = (dateVal: any, shortYear: boolean = false) => {
    const date = parseDate(dateVal);
    if (date.getTime() === 0) return '--';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    let year = String(date.getFullYear());
    if (shortYear) year = year.slice(-2);
    return `${day}/${month}/${year}`;
  };

  const toShortDateString = (dateVal: any) => {
    const date = parseDate(dateVal);
    if (date.getTime() === 0) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  };

  const isValidContact = (contact: string | undefined) => {
    if (!contact) return false;
    const cleaned = contact.replace(/\D/g, '');
    return cleaned.length >= 8 && !contact.startsWith('#');
  };

  const handleSaveEdit = async () => {
    if (!editingAluno || !onUpdateAluno) return;
    setIsSaving(true);
    try { await onUpdateAluno(editingAluno); setEditingAluno(null); } catch (error) { alert('Falha ao salvar.'); } finally { setIsSaving(false); }
  };

  const handleConfirmCancel = async () => {
    if (!cancellingCourse || !onCancelCurso) return;
    setIsSaving(true);
    try {
      await onCancelCurso(cancellingCourse.aluno.nome, cancellingCourse.curso, cancelDate);
      setCancellingCourse(null);
    } catch (error) {
      alert('Falha ao processar.');
    } finally {
      setIsSaving(false);
    }
  };

  const openEditCancelDate = (aluno: Aluno, curso: CursoCancelado) => {
    setCancellingCourse({ aluno, curso: curso.nome, isEditing: true });
    if (curso.dataCancelamento) {
      const d = parseDate(curso.dataCancelamento);
      setCancelDate(d.getTime() > 0 ? d.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    } else {
      setCancelDate(new Date().toISOString().split('T')[0]);
    }
  };

  const handleSendMessage = async () => {
    if (!messagingTarget || !customMessage.trim()) return;
    const fone = messagingTarget.phone.replace(/\D/g, '');
    if (whatsappConfig?.url) {
      setIsSendingMessage(true);
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (whatsappConfig.token) {
          headers['Authorization'] = `Bearer ${whatsappConfig.token}`;
          headers['apikey'] = whatsappConfig.token;
        }
        await fetch(whatsappConfig.url, {
          method: 'POST',
          headers,
          body: JSON.stringify({ "data.contact.Phone[0]": `55${fone}`, "message": customMessage })
        });
        setMessagingTarget(null);
        setCustomMessage('');
      } catch (error) {
        window.open(`https://wa.me/55${fone}?text=${encodeURIComponent(customMessage)}`, '_blank');
      } finally {
        setIsSendingMessage(false);
      }
    } else {
      window.open(`https://wa.me/55${fone}?text=${encodeURIComponent(customMessage)}`, '_blank');
      setMessagingTarget(null);
    }
  };

  const ETAPA_OPTIONS = ['EI', 'EF', 'EM'];
  const ANO_OPTIONS = ['Grupo 4', 'Grupo 5', '1º', '2º', '3º', '4º', '5º', '6º', '7º', '8º', '9º', '1ª', '2ª', '3ª'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Dados de Alunos</h2>
          <p className="text-slate-500 italic">Gestão administrativa e histórico escolar.</p>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl border border-blue-100">
          <Building2 className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-wider">Acesso: Gestor</span>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
          <input type="text" placeholder="Buscar por Nome..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-bold" />
        </div>
        <div className="relative">
          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
          <input type="text" placeholder="Buscar por Telefone..." value={phoneFilter} onChange={(e) => setPhoneFilter(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-bold" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
        {filteredAlunos.length > 0 ? filteredAlunos.map(aluno => {
          const turmasAtivas = turmas
            .filter(t => matriculas.some(m => m.alunoId === aluno.id && m.turmaId.trim().toLowerCase() === t.nome.trim().toLowerCase()))
            .map(t => ({ ...t, dataMatricula: matriculas.find(m => m.alunoId === aluno.id && m.turmaId.trim().toLowerCase() === t.nome.trim().toLowerCase())?.dataMatricula }));

          const turmasCanceladas = [...(aluno.cursosCanceladosDetalhes || [])].sort((a, b) => parseDate(b.dataCancelamento).getTime() - parseDate(a.dataCancelamento).getTime());
          const isAtivo = turmasAtivas.length > 0;
          const isLead = !!aluno.isLead;
          const dataUltimoCancelamento = !isAtivo && !isLead && turmasCanceladas.length > 0 ? turmasCanceladas[0].dataCancelamento : null;

          return (
            <div key={aluno.id} className={`bg-white rounded-[32px] shadow-sm border overflow-hidden flex flex-col hover:shadow-lg transition-all ${isLead && !isAtivo ? 'border-purple-200' : !isAtivo ? 'border-red-100 opacity-95' : 'border-slate-100'}`}>
              <div className="p-6 bg-slate-50 flex items-start justify-between border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl shadow-sm ${isAtivo ? 'bg-blue-600 text-white' : isLead ? 'bg-purple-600 text-white' : 'bg-slate-300 text-slate-500'}`}>{aluno.nome.charAt(0)}</div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 leading-tight">{aluno.nome}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg border ${
                        isAtivo ? 'bg-blue-100 text-blue-700 border-blue-200' : 
                        isLead ? 'bg-purple-100 text-purple-700 border-purple-200' : 
                        'bg-red-50 text-red-600 border-red-100'
                      }`}>
                        {isAtivo ? 'ATIVO' : isLead ? 'LEAD QUALIFICADO' : dataUltimoCancelamento ? `CANCELADO EM ${formatDisplayDate(dataUltimoCancelamento)}` : 'CANCELADO'}
                      </span>
                    </div>
                  </div>
                </div>
                {isGestor && (
                   <button onClick={() => setEditingAluno(aluno)} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-600 transition-all shadow-sm flex items-center gap-2 text-xs font-black uppercase tracking-wider">
                     <Edit2 className="w-4 h-4" /> Editar
                   </button>
                )}
              </div>

              <div className="p-6 flex flex-col gap-8 flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Matrícula Inicial</p>
                      <div className="flex items-center gap-2 font-bold text-slate-700"><CheckCircle className="w-4 h-4 text-blue-500" />{isLead ? 'Experimental' : formatDisplayDate(aluno.dataMatricula)}</div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Escolaridade</p>
                      <div className="flex items-center gap-2 font-bold text-slate-700"><BookOpen className="w-4 h-4 text-blue-500" />{formatEscolaridade(aluno)}</div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Nascimento</p>
                      <div className="flex items-center gap-2 font-bold text-slate-700"><Calendar className="w-4 h-4 text-blue-500" />{formatDisplayDate(aluno.dataNascimento)}</div>
                    </div>
                  </div>

                  <div className="space-y-5 border-l border-slate-50 md:pl-6">
                    {/* Responsável 1 */}
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsável 1</p>
                      <div className="font-bold text-slate-700 text-sm leading-tight mb-1">{aluno.responsavel1 || '--'}</div>
                      {isValidContact(aluno.whatsapp1) && (
                        <button 
                          onClick={() => {
                            setMessagingTarget({ name: aluno.responsavel1 || 'Responsável', phone: aluno.whatsapp1!, studentName: aluno.nome });
                            setCustomMessage(`Olá ${aluno.responsavel1?.split(' ')[0]}, aqui é da coordenação da B+. Gostaria de falar sobre o(a) aluno(a) ${aluno.nome.split(' ')[0]}.`);
                          }}
                          className="flex items-center gap-2 text-green-600 font-bold text-xs hover:bg-green-50 px-2 py-1 rounded-lg transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" /> {aluno.whatsapp1}
                        </button>
                      )}
                    </div>

                    {/* Responsável 2 */}
                    {(aluno.responsavel2 || aluno.whatsapp2) && (
                      <div className="space-y-1 pt-2 border-t border-slate-50">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsável 2</p>
                        <div className="font-bold text-slate-700 text-sm leading-tight mb-1">{aluno.responsavel2 || '--'}</div>
                        {isValidContact(aluno.whatsapp2) && (
                          <button 
                            onClick={() => {
                              setMessagingTarget({ name: aluno.responsavel2 || 'Responsável', phone: aluno.whatsapp2!, studentName: aluno.nome });
                              setCustomMessage(`Olá ${aluno.responsavel2?.split(' ')[0]}, aqui é da coordenação da B+. Gostaria de falar sobre o(a) aluno(a) ${aluno.nome.split(' ')[0]}.`);
                            }}
                            className="flex items-center gap-2 text-green-600 font-bold text-xs hover:bg-green-50 px-2 py-1 rounded-lg transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5" /> {aluno.whatsapp2}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-50">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5"><CheckCircle className="w-3 h-3" /> Cursos Ativos</p>
                    <div className="space-y-2">
                      {turmasAtivas.length > 0 ? turmasAtivas.map(t => (
                        <div key={t.id} className="bg-blue-50 p-3 rounded-2xl border border-blue-100 shadow-sm flex items-center justify-between group">
                           <div>
                             <p className="text-[11px] font-black text-blue-800 uppercase leading-none mb-1.5">{t.nome}</p>
                             <p className="text-[10px] font-bold text-blue-400 flex items-center gap-1.5"><Clock className="w-3 h-3" /> Mat: {formatDisplayDate(t.dataMatricula, true)}</p>
                           </div>
                           {isGestor && (
                             <button onClick={() => setCancellingCourse({aluno, curso: t.nome})} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100" title="Cancelar Curso"><Trash2 className="w-4 h-4" /></button>
                           )}
                        </div>
                      )) : <p className="text-[10px] text-slate-300 italic">Nenhum curso ativo</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-red-400 uppercase tracking-widest flex items-center gap-1.5"><ShieldAlert className="w-3 h-3" /> Histórico de Saídas</p>
                    <div className="space-y-2">
                      {turmasCanceladas.length > 0 ? turmasCanceladas.map((c, i) => (
                        <div key={i} className="bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group">
                           <div className="flex-1">
                             <p className="text-[11px] font-black text-slate-500 uppercase leading-none mb-1.5 line-through">{c.nome}</p>
                             <div className="text-[9px] font-bold text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                               <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> Mat: {formatDisplayDate(c.dataMatricula, true)}</span>
                               <span className="flex items-center gap-1.5 text-red-400"><XCircle className="w-3 h-3" /> Canc: {formatDisplayDate(c.dataCancelamento, true)}</span>
                             </div>
                           </div>
                           {isGestor && (
                             <button onClick={() => openEditCancelDate(aluno, c)} className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all opacity-0 group-hover:opacity-100" title="Corrigir Data"><Edit2 className="w-3 h-3" /></button>
                           )}
                        </div>
                      )) : <p className="text-[10px] text-slate-300 italic">Sem histórico</p>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="col-span-full py-20 text-center"><AlertCircle className="w-10 h-10 text-slate-300 mx-auto" /><p className="text-slate-400 font-bold">Nenhum estudante encontrado.</p></div>
        )}
      </div>

      {editingAluno && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
          <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-8 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center font-black text-xl">{editingAluno.nome.charAt(0)}</div>
                <h3 className="text-2xl font-black">Editar Cadastro</h3>
              </div>
              <button onClick={() => setEditingAluno(null)} className="p-3 hover:bg-white/10 rounded-2xl transition-all"><X className="w-6 h-6" /></button>
            </div>

            <div className="p-8 max-h-[70vh] overflow-y-auto space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nome Completo</label>
                  <input type="text" value={editingAluno.nome} onChange={(e) => setEditingAluno({...editingAluno, nome: e.target.value})} className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nascimento (dd/mm/aa)</label>
                  <input type="text" placeholder="dd/mm/aa" value={toShortDateString(editingAluno.dataNascimento)} onChange={(e) => setEditingAluno({...editingAluno, dataNascimento: e.target.value})} className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Etapa (EI/EF/EM)</label>
                  <select value={editingAluno.etapa || ''} onChange={(e) => setEditingAluno({...editingAluno, etapa: e.target.value})} className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold">
                    <option value="">Selecione...</option>
                    {ETAPA_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Ano/Série</label>
                  <select value={editingAluno.anoEscolar || ''} onChange={(e) => setEditingAluno({...editingAluno, anoEscolar: e.target.value})} className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold">
                    <option value="">Selecione...</option>
                    {ANO_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Turma (Letra)</label>
                  <input type="text" value={editingAluno.turmaEscolar || ''} onChange={(e) => setEditingAluno({...editingAluno, turmaEscolar: e.target.value})} className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" />
                </div>
              </div>

              {/* Seção de Responsáveis na Edição */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Responsável 1</label>
                    <input type="text" value={editingAluno.responsavel1 || ''} onChange={(e) => setEditingAluno({...editingAluno, responsavel1: e.target.value})} className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">WhatsApp 1</label>
                    <input type="text" value={editingAluno.whatsapp1 || ''} onChange={(e) => setEditingAluno({...editingAluno, whatsapp1: e.target.value})} className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Responsável 2</label>
                    <input type="text" value={editingAluno.responsavel2 || ''} onChange={(e) => setEditingAluno({...editingAluno, responsavel2: e.target.value})} className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">WhatsApp 2</label>
                    <input type="text" value={editingAluno.whatsapp2 || ''} onChange={(e) => setEditingAluno({...editingAluno, whatsapp2: e.target.value})} className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
              <button onClick={() => setEditingAluno(null)} className="flex-1 py-4 font-black text-slate-400 uppercase">Desistir</button>
              <button onClick={handleSaveEdit} disabled={isSaving} className={`flex-[2] py-4 rounded-3xl font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl transition-all ${isSaving ? 'bg-slate-300' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/20'}`}>
                {isSaving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {isSaving ? 'Gravando...' : 'Salvar no Sheets'}
              </button>
            </div>
          </div>
        </div>
      )}

      {cancellingCourse && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl p-8 animate-in zoom-in-95">
             <div className="flex justify-between items-start mb-6">
                <div className={`p-3 rounded-2xl ${cancellingCourse.isEditing ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
                  {cancellingCourse.isEditing ? <Edit2 className="w-6 h-6" /> : <Trash2 className="w-6 h-6" />}
                </div>
                <button onClick={() => setCancellingCourse(null)}><X className="w-6 h-6 text-slate-300" /></button>
             </div>
             <h3 className="text-xl font-black text-slate-800 leading-tight">
               {cancellingCourse.isEditing ? 'Ajustar Data' : 'Encerrar Curso'}
             </h3>
             <div className="mt-6 space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data Efetiva</label>
                <input type="date" value={cancelDate} onChange={(e) => setCancelDate(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none" />
             </div>
             <div className="mt-8 flex flex-col gap-3">
                <button onClick={handleConfirmCancel} disabled={isSaving} className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg transition-all ${isSaving ? 'bg-slate-300' : cancellingCourse.isEditing ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'}`}>
                  {isSaving ? '...' : 'Confirmar'}
                </button>
             </div>
          </div>
        </div>
      )}

      {messagingTarget && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl p-8 animate-in zoom-in-95">
             <div className="flex justify-between items-start mb-6">
                <div className={`p-4 rounded-2xl ${whatsappConfig?.url ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                  {whatsappConfig?.url ? <Zap className="w-6 h-6 fill-current" /> : <MessageCircle className="w-6 h-6" />}
                </div>
                <button onClick={() => setMessagingTarget(null)}><X className="w-6 h-6 text-slate-300" /></button>
             </div>
             <h3 className="text-xl font-black text-slate-800 leading-tight">Enviar Mensagem</h3>
             <textarea 
               value={customMessage} 
               onChange={(e) => setCustomMessage(e.target.value)} 
               className="w-full mt-6 px-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-medium outline-none focus:border-green-500 min-h-[120px] resize-none"
             />
             <button 
               onClick={handleSendMessage} 
               disabled={isSendingMessage} 
               className={`w-full mt-8 py-4 rounded-2xl font-black uppercase text-sm flex items-center justify-center gap-3 shadow-xl transition-all ${
                 isSendingMessage ? 'bg-slate-300' : 
                 whatsappConfig?.url ? 'bg-green-600 text-white shadow-green-600/20' : 
                 'bg-slate-900 text-white shadow-slate-900/20'
               }`}
             >
               {isSendingMessage ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
               {isSendingMessage ? 'Enviando...' : 'Disparar'}
             </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DadosAlunos;
