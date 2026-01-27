
import React, { useState, useMemo, useEffect } from 'react';
import { ClipboardList, Calendar, MapPin, Search, BookOpen, Clock, Lock, GraduationCap } from 'lucide-react';
import { Aluno, Turma, Matricula, Usuario } from '../types';

interface PreparacaoTurmasProps {
  alunos: Aluno[];
  turmas: Turma[];
  matriculas: Matricula[];
  currentUser: Usuario;
}

const PreparacaoTurmas: React.FC<PreparacaoTurmasProps> = ({ alunos, turmas, matriculas, currentUser }) => {
  const isRegente = currentUser.nivel === 'Regente';
  
  // ATUALIZADO: Incluindo Gestor Master na permissão de troca de sigla
  const isGestorOrEstagiario = currentUser.nivel === 'Gestor' || currentUser.nivel === 'Gestor Master' || currentUser.nivel === 'Estagiário';
  
  const idHoje = useMemo(() => {
    const d = new Date().getDay();
    if (d === 0 || d === 6) return 'seg';
    const map: Record<number, string> = { 1: 'seg', 2: 'ter', 3: 'qua', 4: 'qui', 5: 'sex' };
    return map[d] || 'seg';
  }, []);

  const [filtroSigla, setFiltroSigla] = useState(isRegente ? (currentUser.nome || '') : '');
  const [filtroDia, setFiltroDia] = useState(idHoje);

  useEffect(() => {
    if (isRegente) {
      setFiltroSigla(currentUser.nome || '');
    }
  }, [currentUser, isRegente]);

  const diasSemana = [
    { id: 'seg', label: 'Segunda-feira' },
    { id: 'ter', label: 'Terça-feira' },
    { id: 'qua', label: 'Quarta-feira' },
    { id: 'qui', label: 'Quinta-feira' },
    { id: 'sex', label: 'Sexta-feira' },
  ];

  const formatEscolaridade = (aluno: Aluno) => {
    const sigla = aluno.etapa || '';
    const ano = aluno.anoEscolar || '';
    const turmaEscolar = aluno.turmaEscolar || '';
    if (!sigla && !ano) return 'Sem Classificação';
    let output = sigla;
    if (ano) output += (output ? `-${ano}` : ano);
    if (turmaEscolar) output += ` ${turmaEscolar}`;
    return output.trim();
  };

  const getEtapaPriority = (sigla: string) => {
    const s = sigla.toUpperCase();
    if (s.startsWith('EI')) return 1;
    if (s.startsWith('EF')) return 2;
    if (s.startsWith('EM')) return 3;
    return 4;
  };

  const siglasDisponiveis = useMemo(() => {
    const s = new Set<string>();
    alunos.forEach(a => {
      const formatted = formatEscolaridade(a);
      if (formatted !== 'Sem Classificação') s.add(formatted);
    });

    return Array.from(s).sort((a, b) => {
      const priorityA = getEtapaPriority(a);
      const priorityB = getEtapaPriority(b);
      if (priorityA !== priorityB) return priorityA - priorityB;
      return a.localeCompare(b, 'pt-BR', { numeric: true });
    });
  }, [alunos]);

  const resultLogistica = useMemo(() => {
    if (!filtroSigla || !filtroDia) return [];
    const siglaBusca = filtroSigla.toLowerCase().trim();

    const diaTerms: Record<string, string[]> = {
      'seg': ['seg', 'segunda', '2ª'],
      'ter': ['ter', 'terça', 'terca', '3ª'],
      'qua': ['qua', 'quarta', '4ª'],
      'qui': ['qui', 'quinta', '5ª'],
      'sex': ['sex', 'sexta', '6ª']
    };

    return alunos
      .filter(aluno => formatEscolaridade(aluno).toLowerCase().trim() === siglaBusca)
      .map(aluno => {
        const matriculasAluno = matriculas.filter(m => m.alunoId === aluno.id);
        const turmasDoDia = matriculasAluno
          .map(m => turmas.find(t => t.id === m.turmaId))
          .filter((t): t is Turma => {
            if (!t) return false;
            const h = t.horario.toLowerCase();
            return diaTerms[filtroDia]?.some(term => h.includes(term)) || false;
          });
        
        return { aluno, turmas: turmasDoDia };
      })
      .filter(item => item.turmas.length > 0)
      .sort((a, b) => a.aluno.nome.localeCompare(b.aluno.nome));
  }, [alunos, turmas, matriculas, filtroSigla, filtroDia]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Preparação de Turmas</h2>
          <p className="text-slate-500">Logística de saída para cursos extras.</p>
        </div>
        <div className="bg-amber-50 text-amber-700 px-4 py-2 rounded-xl border border-amber-100 flex items-center gap-2">
          <ClipboardList className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase">Relatório de Logística</span>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">
            Sigla Escolar {isRegente && <span className="text-blue-500 font-black">(FIXADO)</span>}
          </label>
          <div className="relative">
            <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
            <select 
              value={filtroSigla}
              disabled={isRegente}
              onChange={(e) => setFiltroSigla(e.target.value)}
              className={`w-full pl-12 pr-4 py-3 border-2 rounded-2xl outline-none transition-all font-bold appearance-none ${
                isRegente 
                ? 'bg-blue-50 border-blue-200 text-blue-700 cursor-not-allowed shadow-inner' 
                : 'bg-slate-50 border-slate-100 text-slate-700 focus:border-blue-500'
              }`}
            >
              <option value="">Selecione a Sigla</option>
              {siglasDisponiveis.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Dia da Semana</label>
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
            <select 
              value={filtroDia}
              onChange={(e) => setFiltroDia(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold text-slate-700 appearance-none"
            >
              {diasSemana.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {filtroSigla && filtroDia && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">Alunos em Cursos Extras</h3>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{filtroSigla} • {diasSemana.find(d => d.id === filtroDia)?.label}</p>
            </div>
            <span className="bg-blue-600 px-3 py-1 rounded-full text-xs font-bold">{resultLogistica.length} Alunos</span>
          </div>

          <div className="p-4">
            {resultLogistica.length > 0 ? (
              <div className="space-y-3">
                {resultLogistica.map(({ aluno, turmas }) => (
                  <div key={aluno.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black">
                        {aluno.nome.charAt(0)}
                      </div>
                      <p className="font-bold text-slate-800 leading-tight">{aluno.nome}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {turmas.map(t => (
                        <div key={t.id} className="flex items-center gap-2 bg-white border border-blue-100 px-3 py-1.5 rounded-xl shadow-sm">
                          <GraduationCap className="w-3.5 h-3.5 text-blue-500" />
                          <span className="text-xs font-black text-blue-700 uppercase">{t.nome}</span>
                          <span className="text-[9px] font-bold text-slate-400 border-l border-slate-200 pl-2 ml-1">{t.horario.split(' ')[0]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-20 text-center">
                <p className="text-slate-400 italic font-medium">Nenhum aluno possui cursos cadastrados para este dia.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PreparacaoTurmas;
