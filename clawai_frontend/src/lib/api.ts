import axios from 'axios';
import {
  type TrainingSession,
  type Annotation,
  type StartTrainingDto
} from '@/types/api';

const API_URL = 'http://localhost:3001';

export const apiClient = axios.create({
  baseURL: API_URL,
});

// --- FUNÇÃO HELPER DE URL ---
/**
 * Converte um storagePath (ex: "uploads/foo.png") em uma URL pública.
 */
export const getPublicUrl = (storagePath: string) => {
    return `${API_URL}/${storagePath}`;
  };

// --- NOVAS FUNÇÕES ADICIONADAS ---

/**
 * Busca as sessões de treinamento recentes.
 */
export const getRecentSessions = async (): Promise<TrainingSession[]> => {
  const { data } = await apiClient.get('/training/sessions/recent');
  return data;
};

/**
 * Cria uma nova sessão de treinamento.
 */
export const createSession = async (dto: {
  name: string;
}): Promise<TrainingSession> => {
  const { data } = await apiClient.post('/training/sessions', dto);
  return data;
};

/**
 * Faz upload de um arquivo para uma sessão específica.
 */
export const uploadTrainingFile = async (vars: {
  file: File;
  sessionId: string;
}) => {
  const formData = new FormData();
  formData.append('file', vars.file);
  formData.append('sessionId', vars.sessionId);

  const { data } = await apiClient.post('/training/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;

};  

  /**
 * Busca as anotações de uma imagem específica.
 */
export const getAnnotations = async (
imageId: string,
): Promise<Annotation[]> => {
const { data } = await apiClient.get(
    `/training/images/${imageId}/annotations`,
);
return data;
};
  
  /**
   * Salva (sobrescreve) as anotações de uma imagem.
   */
export const saveAnnotations = async (vars: {
    imageId: string;
    annotations: Omit<Annotation, 'id'>[]; // Envia um array sem o 'id'
  }) => {
    const { data } = await apiClient.post(
      `/training/images/${vars.imageId}/annotations`,
      vars.annotations, // Envia o array de anotações no body
    );
    return data;
  };

/**
 * Dispara o início do processo de treinamento no backend.
 */
export const startTraining = async (vars: {
  sessionId: string;
  params: StartTrainingDto;
}) => {
  const { data } = await apiClient.post(
    `/training/sessions/${vars.sessionId}/start`,
    vars.params, // Envia os parâmetros do formulário no body
  );
  return data;
};
