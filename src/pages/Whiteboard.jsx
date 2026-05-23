import { useState, useRef, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { Bold, Italic, Underline as UnderlineIcon, Strikethrough, List, ListOrdered } from 'lucide-react';
import './Whiteboard.css';

// Componente do Menu Fixo de Formatação (aparece quando focado)
const MenuBar = ({ editor }) => {
  if (!editor) return null;

  return (
    <div className="wb-toolbar">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`wb-toolbar-btn ${editor.isActive('bold') ? 'active' : ''}`}
        title="Negrito"
      >
        <Bold size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`wb-toolbar-btn ${editor.isActive('italic') ? 'active' : ''}`}
        title="Itálico"
      >
        <Italic size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`wb-toolbar-btn ${editor.isActive('underline') ? 'active' : ''}`}
        title="Sublinhado"
      >
        <UnderlineIcon size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={`wb-toolbar-btn ${editor.isActive('strike') ? 'active' : ''}`}
        title="Tachado"
      >
        <Strikethrough size={16} />
      </button>
      <div className="wb-toolbar-divider" />
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`wb-toolbar-btn ${editor.isActive('bulletList') ? 'active' : ''}`}
        title="Lista"
      >
        <List size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`wb-toolbar-btn ${editor.isActive('orderedList') ? 'active' : ''}`}
        title="Lista Numerada"
      >
        <ListOrdered size={16} />
      </button>
    </div>
  );
};

// Tijolo 1: O Bloco (Post-it) com TipTap
const DraggableNode = ({ node, updateNode, isCameraMoving }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });

  // Configuração do Editor Rich Text
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
    ],
    content: node.text || '<p></p>',
    onFocus: () => setIsFocused(true),
    onBlur: ({ editor }) => {
      // Pequeno delay para permitir clique nos botões da toolbar antes de esconder
      setTimeout(() => setIsFocused(false), 200);
      updateNode(node.id, { text: editor.getHTML() });
    }
  });

  const handlePointerDown = (e) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    
    // Se estiver clicando diretamente no texto para editar/selecionar, não inicia o arrasto
    if (e.target.closest('.ProseMirror') || e.target.closest('.wb-toolbar')) {
      return; 
    }

    setIsDragging(true);
    e.target.setPointerCapture(e.pointerId);
    startPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    startPos.current = { x: e.clientX, y: e.clientY };

    updateNode(node.id, {
      x: node.x + dx,
      y: node.y + dy
    });
  };

  const handlePointerUp = (e) => {
    if (isDragging) {
      setIsDragging(false);
      e.target.releasePointerCapture(e.pointerId);
    }
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
      <div className="wb-node-drag-handle" title="Arraste por aqui ou pelas bordas" />
      {editor && isFocused && <MenuBar editor={editor} />}
      <EditorContent editor={editor} className="wb-node-editor" />
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
    { id: '1', x: 100, y: 100, text: '<p>Meu primeiro bloco <strong>rico</strong>!</p>' }
  ]);

  const canvasRef = useRef(null);

  // Manipulação de Arrastar o Canvas (Pan)
  const handlePointerDown = (e) => {
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
    if (isPanning) {
      setIsPanning(false);
      e.target.releasePointerCapture(e.pointerId);
    }
  };

  // Manipulação do Zoom (Wheel)
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const zoomSensitivity = 0.001;
    const delta = -e.deltaY * zoomSensitivity;
    setCamera((prev) => {
      let newZoom = prev.zoom + delta;
      newZoom = Math.max(0.2, Math.min(newZoom, 3));
      return { ...prev, zoom: newZoom };
    });
  }, []);

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
      x: -camera.x / camera.zoom + window.innerWidth / 2 - 100,
      y: -camera.y / camera.zoom + window.innerHeight / 2 - 50,
      text: '<p></p>'
    };
    setNodes((prev) => [...prev, newNode]);
  };

  const updateNode = (id, newProps) => {
    setNodes((prev) => prev.map(n => n.id === id ? { ...n, ...newProps } : n));
  };

  return (
    <div className="whiteboard-container">
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
