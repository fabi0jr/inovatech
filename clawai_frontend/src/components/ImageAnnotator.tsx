import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Trash2, Loader2, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAnnotations, saveAnnotations } from '@/lib/api';
import { type Annotation } from '@/types/api';
import { Skeleton } from './ui/skeleton';

// A interface BoundingBox é o nosso "estado interno"
// que será derivado da API.
interface BoundingBox extends Omit<Annotation, 'id'> {
  // O 'id' pode ser o UUID do banco ou um ID temporário (timestamp)
  id: string;
}

interface ImageAnnotatorProps {
  imageUrl: string;
  imageId: string; // ID da imagem no banco de dados
}

export default function ImageAnnotator({
  imageUrl,
  imageId,
}: ImageAnnotatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [annotations, setAnnotations] = useState<BoundingBox[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentBox, setCurrentBox] = useState<Omit<BoundingBox, 'id'> | null>(
    null,
  );
  const [imageLoaded, setImageLoaded] = useState(false);

  // --- MUDANÇA 1: Armazenar o objeto Image no Ref ---
  // Inicializamos o objeto Image aqui e o mantemos
  const imageRef = useRef(new Image());
  
  const queryClient = useQueryClient();

  // --- HOOKS DA API ---

  // 1. Query para BUSCAR as anotações desta imagem
  const {
    data: fetchedAnnotations,
    isLoading: isLoadingAnnotations,
    error,
  } = useQuery<Annotation[]>({
    queryKey: ['annotations', imageId],
    queryFn: () => getAnnotations(imageId),
    refetchOnWindowFocus: false,
  });

  // 2. Mutação para SALVAR as anotações
  const saveMutation = useMutation({
    mutationFn: (annotationsToSave: Omit<Annotation, 'id'>[]) =>
      saveAnnotations({ imageId, annotations: annotationsToSave }),
    onSuccess: (savedAnnotations) => {
      queryClient.setQueryData(['annotations', imageId], savedAnnotations);
    },
    onError: (err) => {
      console.error('Erro ao salvar anotações:', err);
      // TODO: Mostrar um toast de erro
    },
  });

  // --- EFEITOS ---

  // --- MUDANÇA 2: Efeito de carregamento de imagem mais robusto ---
  // Efeito para carregar a imagem no canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageUrl){
      // --- LOG 9 ---
      console.warn('>>> 9. ImageAnnotator: Effect pulado (sem canvas ou imageUrl)', { canvas, imageUrl });
      // -----------
      return;
    } 

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Pega o objeto Image do ref
    const img = imageRef.current;
    img.crossOrigin = 'anonymous'; 

    // Define os handlers ANTES de definir o .src
    img.onload = () => {
      if (canvasRef.current) {
        canvasRef.current.width = img.width;
        canvasRef.current.height = img.height;
        setImageLoaded(true);
      }
    };
    img.onerror = () => {
      console.error('Erro ao carregar a imagem:', imageUrl);
      setImageLoaded(false);
    };

    img.src = imageUrl;
    
  }, [imageUrl, isLoadingAnnotations]);

  // Efeito para popular o estado interno quando a API retornar os dados
  useEffect(() => {
    if (fetchedAnnotations) {
      setAnnotations(fetchedAnnotations.map((ann) => ({ ...ann })));
    }
  }, [fetchedAnnotations]);

  // Efeito para redesenhar o canvas quando o estado mudar
  useEffect(() => {
    if (imageLoaded) {
      redrawCanvas();
    }
  }, [annotations, currentBox, imageLoaded]);
  // --- LÓGICA DE DESENHO ---

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.drawImage(img, 0, 0);

    // Desenha anotações salvas
    annotations.forEach((box) => {
      drawBox(ctx, box, '#3b82f6');
    });

    // Desenha anotação atual
    if (currentBox) {
      drawBox(ctx, { ...currentBox, id: 'current' }, '#22c55e');
    }
  };

  const drawBox = (
    ctx: CanvasRenderingContext2D,
    box: BoundingBox | (Omit<BoundingBox, 'id'> & { id: 'current' }),
    color: string,
  ) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(box.x, box.y, box.width, box.height);

    ctx.fillStyle = color;
    const labelText = box.label || 'Unlabeled';
    ctx.font = '14px Arial';
    const textWidth = ctx.measureText(labelText).width;
    ctx.fillRect(box.x, box.y - 20, textWidth + 10, 20);

    ctx.fillStyle = 'white';
    ctx.fillText(labelText, box.x + 5, box.y - 5);
  };

  // --- HANDLERS DE EVENTOS (Corrigidos para enviar dados limpos) ---

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setIsDrawing(true);
    setStartPos({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const width = x - startPos.x;
    const height = y - startPos.y;

    setCurrentBox({
      x: startPos.x,
      y: startPos.y,
      width,
      height,
      label: '',
    });
  };

  const handleMouseUp = () => {
    if (currentBox && Math.abs(currentBox.width) > 10 && Math.abs(currentBox.height) > 10) {
      const normalizedBox: BoundingBox = {
        id: Date.now().toString(), // ID temporário
        x: currentBox.width < 0 ? currentBox.x + currentBox.width : currentBox.x,
        y: currentBox.height < 0 ? currentBox.y + currentBox.height : currentBox.y,
        width: Math.abs(currentBox.width),
        height: Math.abs(currentBox.height),
        label: '',
      };

      const newAnnotations = [...annotations, normalizedBox];
      setAnnotations(newAnnotations);
      
      // Mapeia o array para remover o campo 'id' antes de enviar
      const annotationsToSave = newAnnotations.map(({ id, ...rest }) => rest);
      saveMutation.mutate(annotationsToSave); // Salva na API
    }
    setIsDrawing(false);
    setCurrentBox(null);
  };

  const handleLabelChange = (id: string, label: string) => {
    const newAnnotations = annotations.map((box) =>
      box.id === id ? { ...box, label } : box,
    );
    setAnnotations(newAnnotations);
  };

  const handleSaveAnnotations = () => {
    // Mapeia o array para remover o campo 'id' antes de enviar
    const annotationsToSave = annotations.map(({ id, ...rest }) => rest);
    saveMutation.mutate(annotationsToSave); // Salva na API
  };

  const deleteAnnotation = (id: string) => {
    const newAnnotations = annotations.filter((box) => box.id !== id);
    setAnnotations(newAnnotations);
    
    // Mapeia o array para remover o campo 'id' antes de enviar
    const annotationsToSave = newAnnotations.map(({ id, ...rest }) => rest);
    saveMutation.mutate(annotationsToSave); // Salva na API
  };
  
  // --- RENDERIZAÇÃO ---

  if (isLoadingAnnotations) {
    return (
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
           <Skeleton className="w-full h-[600px] bg-gray-800" />
        </div>
        <div className="lg:col-span-1">
           <Skeleton className="w-full h-[600px] bg-gray-800" />
        </div>
      </div>
    )
  }
  
  if (error) {
     return (
      <div className="flex flex-col items-center justify-center p-10 bg-gray-900 border-gray-800 rounded-lg">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Error Loading Annotations</h3>
        <p className="text-sm text-gray-400">Could not load data for this image. Please try again.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card className="p-4 bg-gray-900 border-gray-800">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-white mb-2">Image Canvas</h3>
            <p className="text-sm text-gray-400">
              Click and drag to draw bounding boxes.
            </p>
          </div>
          <div className="overflow-auto max-h-[600px] bg-gray-950 rounded-lg">
            {!imageLoaded && (
               <div className="w-full h-[600px] flex items-center justify-center">
                 <Loader2 className="w-8 h-8 animate-spin" />
               </div>
            )}
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className={`cursor-crosshair ${imageLoaded ? 'block' : 'hidden'}`}
            />
          </div>
        </Card>
      </div>

      <div className="lg:col-span-1">
        <Card className="p-4 bg-gray-900 border-gray-800">
          <h3 className="text-lg font-semibold text-white mb-4">
            Annotations ({annotations.length})
            {saveMutation.isPending && (
              <Loader2 className="w-4 h-4 ml-2 inline animate-spin" />
            )}
          </h3>

          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {annotations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No annotations yet</p>
                <p className="text-sm mt-2">Draw boxes on the image to start</p>
              </div>
            ) : (
              annotations.map((box, index) => (
                <div
                  key={box.id}
                  className="p-3 bg-gray-800 rounded-lg border border-gray-700"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-300">
                      {box.label || `Box ${index + 1}`}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteAnnotation(box.id)}
                      className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-950"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs text-gray-400">Label</Label>
                      <Input
                        value={box.label}
                        onChange={(e) => handleLabelChange(box.id, e.target.value)}
                        onBlur={handleSaveAnnotations}
                        placeholder="Enter object label"
                        className="mt-1 bg-gray-950 border-gray-700 text-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                      <div>X: {Math.round(box.x)}px</div>
                      <div>Y: {Math.round(box.y)}px</div>
                      <div>W: {Math.round(box.width)}px</div>
                      <div>H: {Math.round(box.height)}px</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}