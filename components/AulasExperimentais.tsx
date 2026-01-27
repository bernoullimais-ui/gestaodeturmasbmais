
import React, { useState, useMemo } from 'react';
import { 
  FlaskConical, 
  Calendar, 
  GraduationCap, 
  Clock, 
  Info, 
  ShieldCheck, 
  Lock, 
  MessageCircle, 
  Zap, 
  CheckCircle2, 
  XCircle, 
  ChevronDown, 
  ChevronUp, 
  Send,
  Timer,
  RefreshCw,
  Bell
} from 'lucide-react';
import { AulaExperimental, Usuario } from '../types';

interface AulasExperimentaisProps {
  experimentais: AulaExperimental[];
  currentUser: Usuario;
  onUpdate: (updated: AulaExperimental) => void;
  whatsappConfig?: {
    url: string;
    token: string;
  };
}

const AulasExperimentais: React.FC<AulasExperimentaisProps> = ({ 
  experimentais, 
  currentUser, 
  onUpdate,
  whatsappConfig 
}) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  
  // ATUALIZADO: Incluindo Gestor Master na verificação de permissão
  const isGestor = currentUser.nivel === 'Gestor' || currentUser.nivel === 'Gestor Master';
  const isProfessor = currentUser.nivel === 'Professor';
  const isRegente = currentUser.nivel === 'Regente';

  const normalizeSheetDate = (dateStr: string) => {
    if (!dateStr) return '';
    if (dateStr.includes('T')) return dateStr.split('T')[0];
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.toLocaleDateString('en-CA');
    return dateStr;
  };

  const filteredExperimentais = useMemo(() => {
    const filtered = experimentais.filter(exp => {
      if (isRegente) {
        const userSigla = (currentUser.nome || '').toLowerCase().trim();
        const studentSigla = (exp.sigla || '').toLowerCase().trim();
        if (!studentSigla.includes(userSigla)) return false;
      }
      if (!selectedDate) return true;
      const normalized = normalizeSheetDate(exp.aula);
      return normalized.includes(selectedDate);
    });

    return [...filtered].sort((a, b) => a.estudante.localeCompare(b.estudante));
  }, [experimentais, selectedDate, currentUser, isRegente]);

  const handleStatusUpdate = (exp: AulaExperimental, newStatus: 'Presente' | 'Ausente') => {
    onUpdate({
      ...exp,
      status: newStatus,
      dataStatusAtualizado: new Date().toISOString()
    });
  };

  const handleObsUpdate = (exp: AulaExperimental, obs: string) => {
    onUpdate({ ...exp, observacaoProfessor: obs });
  };

  const handleSendConfirmation = async (exp: AulaExperimental) => {
    if (!whatsappConfig?.url || !exp.whatsapp1) return;
    
    const fone = exp.whatsapp1.replace(/\D/g, '');
    const primeiroNome = exp.estudante.split(' ')[0];
    const msg = `Olá ${exp.responsavel1?.split(' ')[0] || 'família'}, aqui é da coordenação da B+. Passando para confirmar a aula experimental do(a) ${primeiroNome} para amanhã, dia ${new Date(normalizeSheetDate(exp.aula) + 'T12:00:00').toLocaleDateString('pt-BR')}. Estaremos esperando por vocês para acolher o(a) ${primeiroNome} com muito carinho!`;

    setIsProcessing(exp.id + '-conf');
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (whatsappConfig.token) {
        headers['Authorization'] = `Bearer ${whatsappConfig.token}`;
        headers['apikey'] = whatsappConfig.token;
      }
      await fetch(whatsappConfig.url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ "data.contact.Phone[0]": `55${fone}`, "message": msg })
      });
      onUpdate({ ...exp, confirmationSent: true });
    } catch (e) {
      alert('Falha no envio do Webhook.');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleSendFollowUp = async (exp: AulaExperimental) => {
    if (!whatsappConfig?.url || !exp.whatsapp1) return;
    
    const fone = exp.whatsapp1.replace(/\D/g, '');
    const primeiroNome = exp.estudante.split(' ')[0];
    const msg = `Olá ${exp.responsavel1?.split(' ')[0] || 'família'}, aqui é da B+. Como foi a percepção do(a) ${primeiroNome} e de vocês sobre a aula experimental hoje? Gostaríamos muito de saber se gostariam de formalizar a matrícula para que ele(a) possa continuar evoluindo com a gente!`;

    setIsProcessing(exp.id + '-follow');
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (whatsappConfig.token) {
        headers['Authorization'] = `Bearer ${whatsappConfig.token}`;
        headers['apikey'] = whatsappConfig.token;
      }
      await fetch(whatsappConfig.url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ "data.contact.Phone[0]": `55${fone}`, "message": msg })
      });
      onUpdate({ ...exp, followUpSent: true });
    } catch (e) {
      alert('Falha no envio do Webhook.');
    } finally {
      setIsProcessing(null);
    }
  };

  const canSendFollowUp = (exp: AulaExperimental) => {
    if (exp.status !== 'Presente' || !exp.dataStatusAtualizado || exp.followUpSent) return false;
    const diffMs = new Date().getTime() - new Date(exp.dataStatusAtualizado).getTime();
    return diffMs >= (6 * 60 * 60 * 1000); 
  };

  const isTimeForConfirmation = (exp: AulaExperimental) => {
    if (exp.confirmationSent || exp.status !== 'Pendente') return false;
    const aulaDate = new Date(normalizeSheetDate(exp.aula) + 'T00:00:00');
    const today = new Date();
    const diffDays = (aulaDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 1.2 && diffDays > 0;
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Funil Experimental</h2>
          <p className="text-slate-500">Gestão de novos leads, agendamentos e automação comercial.</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl shadow-lg shadow-purple-600/20">
            <FlaskConical className="w-4 h-4" />
            <span className="text-xs font-black uppercase tracking-wider">Aba: Experimental</span>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
        <div className="max-w-xs w-full">
          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-wider ml-1">Filtrar por Data da Aula</label>
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
            />
          </div>
        </div>
        <div className="flex gap-4">
           <div className="bg-green-50 px-4 py-3 rounded-2xl border border-green-100 flex-1">
             <p className="text-[9px] font-black text-green-600 uppercase">Fase do Funil</p>
             <p className="text-sm font-bold text-slate-700">Conversão de Matrículas</p>
           </div>
           <div className="bg-blue-50 px-4 py-3 rounded-2xl border border-blue-100 flex-1">
             <p className="text-[9px] font-black text-blue-600 uppercase">Sincronização</p>
             <p className="text-sm font-bold text-slate-700">Real-time Sheets</p>
           </div>
        </div>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FlaskConical className="w-5 h-5 text-purple-400" />
            <div>
              <h3 className="font-bold text-lg">Agendamentos Experimentais</h3>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-none mt-1">
                {selectedDate ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { dateStyle: 'long' }) : 'Todos os registros'}
              </p>
            </div>
          </div>
          <div className="bg-purple-600 px-3 py-1.5 rounded-xl text-xs font-black shadow-lg shadow-purple-600/20">
            {filteredExperimentais.length} {filteredExperimentais.length === 1 ? 'Lead' : 'Leads'}
          </div>
        </div>

        <div className="divide-y divide-slate-50">
          {filteredExperimentais.length > 0 ? filteredExperimentais.map((exp) => (
            <div key={exp.id} className={`group transition-all ${expandedId === exp.id ? 'bg-slate-50/50' : 'hover:bg-slate-50/30'}`}>
              <div className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-center gap-4 flex-1">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl shadow-sm transition-transform ${exp.status === 'Presente' ? 'bg-green-600 text-white' : exp.status === 'Ausente' ? 'bg-red-500 text-white' : 'bg-purple-500 text-white'}`}>
                    {exp.estudante.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg font-bold text-slate-900 leading-tight">{exp.estudante}</h4>
                      <span className="text-[9px] font-black uppercase bg-purple-100 text-purple-600 px-2 py-0.5 rounded border border-purple-200">LEAD QUALIFICADO</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5">
                      <span className="text-[10px] font-black text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{exp.sigla}</span>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                        <GraduationCap className="w-3.5 h-3.5 text-slate-300" />
                        {exp.curso}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:flex lg:items-center gap-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsável</span>
                    <span className="text-sm font-bold text-slate-700">{exp.responsavel1 || '--'}</span>
                  </div>
                  
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">STATUS AULA</span>
                    <div className="flex gap-1 mt-1">
                      {(isGestor || isProfessor) ? (
                        <>
                          <button onClick={() => handleStatusUpdate(exp, 'Presente')} title="Confirmar Presença" className={`p-1.5 rounded-lg border transition-all ${exp.status === 'Presente' ? 'bg-green-600 border-green-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-300 hover:text-green-600'}`}>
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleStatusUpdate(exp, 'Ausente')} title="Marcar Ausência" className={`p-1.5 rounded-lg border transition-all ${exp.status === 'Ausente' ? 'bg-red-500 border-red-500 text-white shadow-md' : 'bg-white border-slate-200 text-slate-300 hover:text-red-500'}`}>
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded border ${exp.status === 'Presente' ? 'bg-green-100 text-green-600 border-green-200' : exp.status === 'Ausente' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-slate-100 text-slate-400'}`}>
                          {exp.status}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="col-span-2 lg:col-span-1 flex items-center gap-2">
                    <button 
                      onClick={() => setExpandedId(expandedId === exp.id ? null : exp.id)}
                      className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${exp.observacaoProfessor ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >
                      {exp.observacaoProfessor ? <ShieldCheck className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                      Feedback {expandedId === exp.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>

              {expandedId === exp.id && (
                <div className="px-6 pb-6 pt-2 animate-in slide-in-from-top-4 duration-300 flex flex-col md:flex-row gap-6">
                  <div className="flex-1 space-y-4">
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                         <Zap className="w-3 h-3 text-amber-500 fill-current" /> Feedback do Professor para a Família
                       </p>
                       <textarea 
                          value={exp.observacaoProfessor || ''}
                          onChange={(e) => handleObsUpdate(exp, e.target.value)}
                          disabled={!isProfessor && !isGestor}
                          placeholder="Como foi o interesse e habilidade do estudante durante a aula experimental?"
                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-medium outline-none focus:border-purple-500 min-h-[100px] resize-none"
                       />
                    </div>
                  </div>

                  {isGestor && (
                    <div className="w-full md:w-80 space-y-3">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Automações de Funil</p>
                      <button 
                        onClick={() => handleSendConfirmation(exp)}
                        disabled={isProcessing === exp.id + '-conf' || exp.confirmationSent || exp.status !== 'Pendente'}
                        className={`w-full p-4 rounded-2xl border-2 flex flex-col items-start gap-1 transition-all ${
                          exp.confirmationSent ? 'bg-green-50 border-green-200 text-green-700 opacity-70' :
                          isTimeForConfirmation(exp) ? 'bg-amber-50 border-amber-300 animate-pulse shadow-amber-500/20 shadow-lg' :
                          'bg-white border-slate-100 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-[10px] font-black uppercase">Confirmação de Aula</span>
                          {exp.confirmationSent ? <CheckCircle2 className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                        </div>
                        <span className="text-xs font-bold leading-tight">Enviar Boas-vindas (24h antes)</span>
                      </button>

                      <button 
                        onClick={() => handleSendFollowUp(exp)}
                        disabled={isProcessing === exp.id + '-follow' || exp.followUpSent || !canSendFollowUp(exp)}
                        className={`w-full p-4 rounded-2xl border-2 flex flex-col items-start gap-1 transition-all ${
                          exp.followUpSent ? 'bg-blue-50 border-blue-200 text-blue-700 opacity-70' :
                          canSendFollowUp(exp) ? 'bg-purple-600 border-purple-600 text-white shadow-purple-600/30 shadow-xl scale-[1.02]' :
                          'bg-white border-slate-100 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className={`text-[10px] font-black uppercase ${canSendFollowUp(exp) ? 'text-purple-100' : ''}`}>Follow-up Comercial</span>
                          {exp.followUpSent ? <CheckCircle2 className="w-4 h-4" /> : <Timer className="w-4 h-4" />}
                        </div>
                        <span className="text-xs font-bold leading-tight">Consultar Percepção (6h pós)</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )) : (
            <div className="p-24 text-center space-y-6">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                <FlaskConical className="w-10 h-10 text-slate-200" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-slate-800">Sem agendamentos para esta data</h4>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AulasExperimentais;
