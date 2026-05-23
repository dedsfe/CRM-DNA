import { useState, useRef, useEffect, useCallback } from 'react';
import './Whiteboard.css';

// Tijolo 1: O Bloco (Post-it)
const DraggableNode = ({ node, updateNode, isCameraMoving }) => {
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e) => {
    e.stopPropagation(); // Previne que o canvas receba o clique
    if (e.button !== 0) return; // Apenas clique esquerdo
    setIsDragging(true);
    e.target.setPointerCapture(e.pointerId);
    startPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    startPos.current = { x: e.clientX, y: e.clientY };

    // Atualiza a posição do nó (ajustando pelo zoom da câmera se necessário, mas aqui a div já estará escalada pelo canvas, 
    // ou mantemos o nó solto do zoom para não distorcer o arrasto. 
    // Em um canvas absoluto com zoom em CSS transform, o dy e dx devem ser divididos pelo zoom)
    updateNode(node.id, {
      x: node.x + dx,
      y: node.y + dy
    });
  };

  const handlePointerUp = (e) => {
    setIsDragging(false);
    e.target.releasePointerCapture(e.pointerId);
  };

  return (
    <div
      className={`wb-node ${isDragging ? 'wb-node--dragging' : ''} ${isCameraMoving ? 'wb-node--no-pointer' : ''}`}
      style={{
        transform: `translate(${node.x}px, ${node.y}px)`,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <textarea
        className="wb-node-text"
        defaultValue={node.text}
        onPointerDown={(e) => e.stopPropagation()} // Permite clicar no texto sem arrastar imediatamente
        onBlur={(e) => updateNode(node.id, { text: e.target.value })}
        placeholder="Escreva algo..."
      />
    </div>
  );
};

export default function Whiteboard() {
  // Tijolo 0: O Canvas
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const startPan = useRef({ x: 0, y: 0 });

  // Tijolo 1: Estado dos nós
  const [nodes, setNodes] = useState([
    { id: '1', x: 100, y: 100, text: 'Meu primeiro bloco!' }
  ]);

  const canvasRef = useRef(null);

  // Manipulação de Arrastar o Canvas (Pan)
  const handlePointerDown = (e) => {
    // Middle click ou left click no fundo
    if (e.button !== 0 && e.button !== 1) return;
    setIsPanning(true);
    e.target.setPointerCapture(e.pointerId);
    startPan.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e) => {
    if (!isPanning) return;
    const dx = e.clientX - startPan.current.x;
    const dy = e.clientY - startPan.current.y;
    startPan.current = { x: e.clientX, y: e.clientY };
    setCamera((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
  };

  const handlePointerUp = (e) => {
    setIsPanning(false);
    e.target.releasePointerCapture(e.pointerId);
  };

  // Manipulação do Zoom (Wheel)
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const zoomSensitivity = 0.001;
    const delta = -e.deltaY * zoomSensitivity;
    setCamera((prev) => {
      let newZoom = prev.zoom + delta;
      // Limites de zoom
      newZoom = Math.max(0.2, Math.min(newZoom, 3));
      
      // Ajuste para dar zoom onde o mouse está (Complexo para Tijolo 0, faremos zoom no centro por agora)
      // Para manter simples, só ajustamos a escala.
      return { ...prev, zoom: newZoom };
    });
  }, []);

  // Anexar evento de wheel não-passivo
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('wheel', handleWheel, { passive: false });
      return () => canvas.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  const addNode = () => {
    const newNode = {
      id: Date.now().toString(),
      // Cria no centro da tela (ignorando o pan por agora para simplicidade)
      x: -camera.x / camera.zoom + window.innerWidth / 2 - 100,
      y: -camera.y / camera.zoom + window.innerHeight / 2 - 50,
      text: ''
    };
    setNodes((prev) => [...prev, newNode]);
  };

  const updateNode = (id, newProps) => {
    setNodes((prev) => prev.map(n => n.id === id ? { ...n, ...newProps } : n));
  };

  return (
    <div className="whiteboard-container">
      {/* Topbar do Whiteboard */}
      <div className="whiteboard-header">
        <h2>Canvas</h2>
        <div className="whiteboard-actions">
          <button className="btn btn-primary btn-sm" onClick={addNode}>
            + Adicionar Nota
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setCamera({ x: 0, y: 0, zoom: 1 })}>
            Recentralizar
          </button>
        </div>
      </div>

      {/* A "Lente" da Câmera (onde o CSS de pan e zoom acontece) */}
      <div 
        className={`whiteboard-canvas ${isPanning ? 'whiteboard-canvas--panning' : ''}`}
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          '--pan-x': camera.x,
          '--pan-y': camera.y,
          '--zoom': camera.zoom
        }}
      >
        {/* Camada que contém todos os nós e escala junto com o pan/zoom */}
        <div 
          className="whiteboard-layer"
          style={{
            transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`,
            transformOrigin: '0 0'
          }}
        >
          {nodes.map(node => (
            <DraggableNode 
              key={node.id} 
              node={node} 
              updateNode={updateNode} 
              isCameraMoving={isPanning}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
