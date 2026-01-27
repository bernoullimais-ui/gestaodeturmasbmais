
import { Aluno, Turma, Matricula, Presenca, Usuario } from './types';

export const INITIAL_ALUNOS: Aluno[] = [
  { id: 'joao_silva', nome: 'João Silva', dataNascimento: '2015-05-12', contato: '(11) 98888-7777' },
];

export const INITIAL_TURMAS: Turma[] = [
  { id: 'Judô Infantil', nome: 'Judô Infantil', horario: '09:00', professor: 'Prof. Ricardo' },
];

export const INITIAL_MATRICULAS: Matricula[] = [
  { id: 'M1', alunoId: 'joao_silva', turmaId: 'Judô Infantil' },
];

export const INITIAL_PRESENCAS: Presenca[] = [];

export const INITIAL_USUARIOS: Usuario[] = [
  { login: 'admin', senha: 'admin', nivel: 'Gestor Master' },
  { login: 'professor', senha: '123', nivel: 'Professor' }
