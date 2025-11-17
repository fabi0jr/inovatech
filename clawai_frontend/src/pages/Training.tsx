// src/pages/Training.tsx

import { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Upload,
  CheckCircle2,
  Loader2,
  Play,
  Plus,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  getRecentSessions,
  createSession,
  uploadTrainingFile,
  getPublicUrl,
  startTraining,
} from '@/lib/api';
import {
  type TrainingSession,
  type TrainingImage,
  type StartTrainingDto,
  ModelType,
  ItemCategory,
  PriorityLevel,
} from '@/types/api';
import ImageAnnotator from '@/components/ImageAnnotator';
import { toast } from 'sonner';

type TrainingStep = 'upload' | 'annotate' | 'parameters';

type UploadFileProgress = {
  id: string;
  filename: string;
  status: 'processing' | 'uploaded' | 'error';
};

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + ' years ago';
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + ' months ago';
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + ' days ago';
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + ' hours ago';
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + ' minutes ago';
  return Math.floor(seconds) + ' seconds ago';
}

export default function Training() {
  const [currentStep, setCurrentStep] = useState<TrainingStep>('upload');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [uploadProgress, setUploadProgress] = useState<UploadFileProgress[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const [formState, setFormState] = useState<StartTrainingDto>({
    modelType: ModelType.OBJECT_DETECTION,
    epochs: 100,
    learningRate: 0.001,
    batchSize: 32,
    itemName: '',
    description: '',
    category: ItemCategory.SAFETY,
    priority: PriorityLevel.HIGH,
    detectionThreshold: 85,
  });

  const {
    data: recentSessions,
    isLoading: isLoadingSessions,
  } = useQuery<TrainingSession[]>({
    queryKey: ['trainingSessions'],
    queryFn: getRecentSessions,
    refetchInterval: 5000, 
  });

  const activeSession = recentSessions?.find(s => s.id === activeSessionId);

  const createSessionMutation = useMutation({
    mutationFn: createSession,
    onSuccess: (newSession) => {
      queryClient.invalidateQueries({ queryKey: ['trainingSessions'] });
      setActiveSessionId(newSession.id);
      setIsCreateModalOpen(false);
      setNewSessionName('');
      toast.success(`Sessão "${newSession.name}" criada. Pode iniciar o upload.`);
    },
    onError: () => {
      toast.error('Erro ao criar sessão. Tente novamente.');
    }
  });

  const uploadFileMutation = useMutation({
    mutationFn: uploadTrainingFile,
    onSuccess: (data, variables) => {
      setUploadProgress((current) =>
        current.map((file) =>
          file.id === variables.file.name
            ? { ...file, status: 'uploaded' }
            : file,
        ),
      );
      queryClient.invalidateQueries({ queryKey: ['trainingSessions'] });
    },
    onError: (error, variables) => {
      setUploadProgress((current) =>
        current.map((file) =>
          file.id === variables.file.name
            ? { ...file, status: 'error' }
            : file,
        ),
      );
      toast.error(`Falha no upload do arquivo: ${variables.file.name}`);
    },
  });

  const startTrainingMutation = useMutation({
    mutationFn: startTraining,
    onSuccess: (data: TrainingSession) => {
      toast.success(`Treinamento "${data.name}" iniciado com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ['trainingSessions'] });
      setActiveSessionId(null);
      setCurrentStep('upload');
      setUploadProgress([]);
    },
    onError: (error) => {
      console.error('Erro ao iniciar treinamento:', error);
      toast.error('Erro ao iniciar treinamento. Tente novamente.');
    },
  });

  const handleCreateSession = () => {
    if (!newSessionName.trim()) {
      toast.warning('Por favor, dê um nome para a sessão.');
      return;
    }
    createSessionMutation.mutate({ name: newSessionName });
  };
  
  const handleBrowseClick = (
    e?: React.MouseEvent<HTMLDivElement | HTMLButtonElement>,
  ) => {
    e?.stopPropagation();
    if (!activeSessionId) {
      toast.info('Por favor, crie ou selecione uma sessão de treinamento primeiro.');
      setIsCreateModalOpen(true);
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!event.target.files || event.target.files.length === 0) return;
    if (!activeSessionId) {
       toast.error('Erro: Nenhuma sessão ativa para o upload.');
       return;
    }
    
    const files = Array.from(event.target.files);

    const newUploads: UploadFileProgress[] = files.map(file => ({
      id: file.name,
      filename: file.name,
      status: 'processing',
    }));
    setUploadProgress(current => [...current, ...newUploads]);

    files.forEach(file => {
      uploadFileMutation.mutate({ file, sessionId: activeSessionId });
    });

    event.target.value = '';
  };
  
  const handleGoToAnnotate = () => {
    if (!activeSession || activeSession.images.length === 0) {
      toast.warning('Faça upload de pelo menos uma imagem antes de continuar.');
      return;
    }
    const allFilesReady = uploadProgress.every(f => f.status === 'uploaded');
    if (uploadProgress.length > 0 && !allFilesReady) {
      toast.info('Aguarde o término de todos os uploads.');
      return;
    }
    setCurrentImageIndex(0);
    setCurrentStep('annotate');
  };

  const renderRecentSessions = () => {
    if (isLoadingSessions) {
      return Array(3).fill(0).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full bg-gray-800" />
      ));
    }
    if (!recentSessions || recentSessions.length === 0) {
      return (<p className="text-xs text-gray-500 text-center">Nenhuma sessão de treinamento.</p>);
    }
    return recentSessions.map((session) => (
      <button
        key={session.id}
        onClick={() => {
          setActiveSessionId(session.id);
          setUploadProgress([]);
          setCurrentStep('upload');
          toast.info(`Sessão "${session.name}" selecionada.`);
        }}
        className={`w-full p-2 bg-gray-800 rounded text-xs text-left hover:bg-gray-700 ${
          activeSessionId === session.id ? 'ring-2 ring-blue-500' : ''
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="font-medium">{session.name}</span>
          <span className={`px-2 py-0.5 rounded ${
            session.status === 'complete' ? 'bg-green-500/20 text-green-400'
            : session.status === 'processing' ? 'bg-blue-500/20 text-blue-400'
            : 'bg-red-500/20 text-red-400'
          }`}>
            {session.status}
          </span>
        </div>
        <div className="flex justify-between text-gray-500">
           <span>{formatTimeAgo(session.createdAt)}</span>
           <span>{session.images?.length || 0} imagens</span>
        </div>
      </button>
    ));
  };

  const handleFormInputChange = (
    field: keyof StartTrainingDto,
    value: string | number,
  ) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };
  
  const handleSubmitTraining = () => {
    if (!activeSessionId) {
      toast.error('Nenhuma sessão de ativa encontrada.');
      return;
    }
    const trainingParams: StartTrainingDto = {
      ...formState,
      epochs: Number(formState.epochs),
      learningRate: Number(formState.learningRate),
      batchSize: Number(formState.batchSize),
      detectionThreshold: Number(formState.detectionThreshold),
      itemName: formState.itemName || activeSession?.name || 'Modelo Treinado'
    };
    startTrainingMutation.mutate({ sessionId: activeSessionId, params: trainingParams });
  };
  
  const currentImage: TrainingImage | undefined = activeSession?.images?.[currentImageIndex];

  return (
    <div className="min-h-screen bg-[#0a0b14] text-white p-6">
      <div className="container mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">AI Training Module</h1>
          <p className="text-gray-400">Crie e gerencie seus modelos de detecção.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <Card className="bg-gray-900 border-gray-800 p-4">
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Nova Sessão de Treino
              </Button>
            </Card>
            <Card className="bg-gray-900 border-gray-800 p-4">
              <h3 className="text-sm font-semibold mb-3">Sessões Recentes</h3>
              <div className="space-y-2">{renderRecentSessions()}</div>
            </Card>
          </div>

          <div className="lg:col-span-3">
            {currentStep === 'upload' && (
              <div className="space-y-6">
                <Card className="bg-gray-900 border-gray-800 p-6">
                  <div className="flex justify-between items-center mb-4">
                     <h2 className="text-xl font-semibold">Etapa 1: Upload dos Dados</h2>
                    {activeSession && (
                      <div className="text-right">
                        <p className="text-sm text-gray-400">Sessão Ativa:</p>
                        <p className="text-lg font-medium text-blue-400">{activeSession.name}</p>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/jpeg,image/png"
                    multiple
                  />
                  <div
                    className={`border-2 border-dashed border-gray-700 rounded-lg p-12 text-center transition-colors ${
                      activeSessionId 
                        ? 'hover:border-blue-500 cursor-pointer' 
                        : 'opacity-50 cursor-not-allowed'
                    }`}
                    onClick={handleBrowseClick}
                  >
                    <Upload className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                    <p className="text-lg mb-2">Arraste e solte suas imagens aqui</p>
                    <p className="text-sm text-gray-500 mb-4">
                      {activeSessionId 
                        ? 'Formatos suportados: JPG, PNG.'
                        : 'Crie ou selecione uma sessão para começar.'}
                    </p>
                    <Button
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={handleBrowseClick}
                      disabled={!activeSessionId || uploadFileMutation.isPending}
                    >
                      Procurar Arquivos
                    </Button>
                  </div>
                  <div className="mt-6 space-y-2">
                    {uploadProgress.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
                      >
                        <span className="text-sm">{file.filename}</span>
                        <div className="flex items-center gap-2">
                          {file.status === 'uploaded' && (<CheckCircle2 className="w-4 h-4 text-green-400" />)}
                          {file.status === 'processing' && (<Loader2 className="w-4 h-4 animate-spin text-blue-400" />)}
                          {file.status === 'error' && (<span className="text-xs text-red-400 font-medium">Erro</span>)}
                        </div>
                      </div>
                    ))}
                  </div>
                   {activeSession && activeSession.images.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-sm font-semibold mb-2 text-gray-400">
                        Imagens na sessão ({activeSession.images.length}):
                      </h3>
                      <div className="grid grid-cols-5 gap-2">
                        {activeSession.images.map(img => (
                          <img 
                            key={img.id}
                            src={getPublicUrl(img.storagePath)}
                            alt={img.filename}
                            className="w-full h-24 object-cover rounded"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
                <div className="flex justify-end">
                  <Button
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={handleGoToAnnotate}
                    disabled={!activeSession || activeSession.images.length === 0 || uploadFileMutation.isPending}
                  >
                    {uploadFileMutation.isPending && (<Loader2 className="w-4 h-4 mr-2 animate-spin" />)}
                    Próximo: Anotação
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 'annotate' && activeSession && (
              <div className="space-y-6">
                <Card className="bg-gray-900 border-gray-800 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-semibold">Etapa 2: Anotação de Rótulos</h2>
                      <p className="text-sm text-gray-400 mt-1">
                        Sessão: <span className="text-blue-400">{activeSession.name}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                       <Button
                        variant="outline"
                        size="icon"
                        className="border-gray-700 text-gray-300 hover:bg-gray-800"
                        onClick={() => setCurrentImageIndex(i => i - 1)}
                        disabled={currentImageIndex === 0}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className="text-sm text-gray-400 w-20 text-center">
                        Imagem {currentImageIndex + 1} de {activeSession.images.length}
                      </span>
                       <Button
                        variant="outline"
                        size="icon"
                        className="border-gray-700 text-gray-300 hover:bg-gray-800"
                        onClick={() => setCurrentImageIndex(i => i + 1)}
                        disabled={currentImageIndex === activeSession.images.length - 1}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {currentImage ? (
                    <ImageAnnotator
                      key={currentImage.id}
                      imageId={currentImage.id}
                      imageUrl={getPublicUrl(currentImage.storagePath)}
                    />
                  ) : (
                    <div className="text-center p-10 text-gray-500"><Loader2 className="w-8 h-8 animate-spin" /><p className="mt-2">Carregando imagem...</p></div>
                  )}
                </Card>
                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    className="border-gray-700 text-gray-300 hover:bg-gray-800"
                    onClick={() => setCurrentStep('upload')}
                  >
                    Voltar (Upload)
                  </Button>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => setCurrentStep('parameters')}
                  >
                    Próximo: Parâmetros
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 'parameters' && activeSession && (
              <div className="space-y-6">
                 <div className="flex justify-between items-center mb-4">
                   <h2 className="text-xl font-semibold">Etapa 3: Parâmetros de Treinamento</h2>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Sessão Ativa:</p>
                      <p className="text-lg font-medium text-blue-400">{activeSession.name}</p>
                    </div>
                  </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="bg-gray-900 border-gray-800 p-6">
                    <h2 className="text-xl font-semibold mb-4">Parâmetros do Modelo</h2>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm text-gray-400">Tipo de Modelo</Label>
                        <Select
                          value={formState.modelType}
                          onValueChange={(value: ModelType) => handleFormInputChange('modelType', value)}
                        >
                          <SelectTrigger className="mt-1 bg-gray-950 border-gray-700"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value={ModelType.OBJECT_DETECTION}>Detecção de Objetos</SelectItem>
                            <SelectItem value={ModelType.CLASSIFICATION} disabled>Classificação (Em breve)</SelectItem>
                            <SelectItem value={ModelType.SEGMENTATION} disabled>Segmentação (Em breve)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-400">Épocas de Treinamento</Label>
                        <Input type="number" value={formState.epochs} onChange={(e) => handleFormInputChange('epochs', e.target.value)} className="mt-1 bg-gray-950 border-gray-700"/>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-400">Taxa de Aprendizado</Label>
                        <Input type="number" step="0.001" value={formState.learningRate} onChange={(e) => handleFormInputChange('learningRate', e.target.value)} className="mt-1 bg-gray-950 border-gray-700"/>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-400">Batch Size</Label>
                        <Input type="number" value={formState.batchSize} onChange={(e) => handleFormInputChange('batchSize', e.target.value)} className="mt-1 bg-gray-950 border-gray-700"/>
                      </div>
                    </div>
                  </Card>
                  <Card className="bg-gray-900 border-gray-800 p-6">
                    <h2 className="text-xl font-semibold mb-4">Registro do Item</h2>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm text-gray-400">Nome do Modelo (Item)</Label>
                        <Input placeholder="Ex: 'Pedra, Papel e Tesoura'" value={formState.itemName} onChange={(e) => handleFormInputChange('itemName', e.target.value)} className="mt-1 bg-gray-950 border-gray-700"/>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-400">Descrição</Label>
                        <Textarea placeholder="Descreva o que este modelo detecta" value={formState.description} onChange={(e) => handleFormInputChange('description', e.target.value)} className="mt-1 bg-gray-950 border-gray-700 min-h-[100px]"/>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-400">Categoria</Label>
                        <Select value={formState.category} onValueChange={(value: ItemCategory) => handleFormInputChange('category', value)}>
                          <SelectTrigger className="mt-1 bg-gray-950 border-gray-700"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value={ItemCategory.SAFETY}>Segurança (EPI)</SelectItem>
                            <SelectItem value={ItemCategory.PARTS}>Peças</SelectItem>
                            <SelectItem value={ItemCategory.DEFECTS}>Defeitos</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-400">Prioridade</Label>
                        <Select value={formState.priority} onValueChange={(value: PriorityLevel) => handleFormInputChange('priority', value)}>
                          <SelectTrigger className="mt-1 bg-gray-950 border-gray-700"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value={PriorityLevel.HIGH}>Alta</SelectItem>
                            <SelectItem value={PriorityLevel.MEDIUM}>Média</SelectItem>
                            <SelectItem value={PriorityLevel.LOW}>Baixa</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-400 mb-2 block">Limiar de Detecção (Confiança)</Label>
                        <div className="flex items-center gap-4">
                          <input type="range" min="0" max="100" value={formState.detectionThreshold} onChange={(e) => handleFormInputChange('detectionThreshold', e.target.value)} className="flex-1"/>
                          <span className="text-sm font-medium">{formState.detectionThreshold}%</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    className="border-gray-700 text-gray-300 hover:bg-gray-800"
                    onClick={() => setCurrentStep('annotate')}
                    disabled={startTrainingMutation.isPending}
                  >
                    Voltar (Anotação)
                  </Button>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={handleSubmitTraining}
                    disabled={startTrainingMutation.isPending}
                  >
                    {startTrainingMutation.isPending ? (<Loader2 className="w-4 h-4 mr-2 animate-spin" />) : (<Play className="w-4 h-4 mr-2" />)}
                    Iniciar Treinamento
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>Criar Nova Sessão de Treinamento</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right text-gray-400">Nome</Label>
              <Input id="name" value={newSessionName} onChange={(e) => setNewSessionName(e.target.value)} placeholder="Ex: Detecção de EPIs (Abril)" className="col-span-3 bg-gray-950 border-gray-700"/>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleCreateSession}
              disabled={createSessionMutation.isPending}
            >
              {createSessionMutation.isPending && (<Loader2 className="w-4 h-4 mr-2 animate-spin" />)}
              Criar Sessão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}