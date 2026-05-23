import { useState, useRef, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { Bold, Italic, Underline as UnderlineIcon, Strikethrough, List, ListOrdered } from 'lucide-react';
import './Whiteboard.css';

// Componente do Menu Global (fica no topo da tela)
const GlobalMenuBar = ({ editor }) => {
  // Se não houver nenhum editor selecionado, mostramos a barra mas desabilitada visualmente
  const disabled = !editor;

  return (
    <div className={`wb-global-toolbar ${disabled ? 'disabled' : ''}`}>
      <button
        onClick={() => editor && editor.chain().focus().toggleBold().run()}
        className={`wb-toolbar-btn ${editor?.isActive('bold') ? 'active' : ''}`}
        title="Negrito"
        disabled={disabled}
      >
        <Bold size={16} />
      </button>
      <button
        onClick={() => editor && editor.chain().focus().toggleItalic().run()}
        className={`wb-toolbar-btn ${editor?.isActive('italic') ? 'active' : ''}`}
        title="Itálico"
        disabled={disabled}
      >
        <Italic size={16} />
      </button>
      <button
        onClick={() => editor && editor.chain().focus().toggleUnderline().run()}
        className={`wb-toolbar-btn ${editor?.isActive('underline') ? 'active' : ''}`}
        title="Sublinhado"
        disabled={disabled}
      >
        <UnderlineIcon size={16} />
      </button>
      <button
        onClick={() => editor && editor.chain().focus().toggleStrike().run()}
        className={`wb-toolbar-btn ${editor?.isActive('strike') ? 'active' : ''}`}
        title="Tachado"
        disabled={disabled}
      >
        <Strikethrough size={16} />
      </button>
      <div className="wb-toolbar-divider" />
      <button
        onClick={() => editor && editor.chain().focus().toggleBulletList().run()}
        className={`wb-toolbar-btn ${editor?.isActive('bulletList') ? 'active' : ''}`}
        title="Lista"
        disabled={disabled}
      >
        <List size={16} />
      </button>
      <button
        onClick={() => editor && editor.chain().focus().toggleOrderedList().run()}
        className={`wb-toolbar-btn ${editor?.isActive('orderedList') ? 'active' : ''}`}
        title="Lista Numerada"
        disabled={disabled}
      >
        <ListOrdered size={16} />
      </button>
    </div>
  );
};

// Tijolo 1: O Bloco (Post-it) com TipTap
const DraggableNode = ({ node, updateNode, isCameraMoving, onEditorFocus, isActiveNode }) => {
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });

  // Configuração do Editor Rich Text
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
    ],
    content: node.text || '<p></p>',
    onFocus: ({ editor }) => {
      onEditorFocus(editor, node.id);
    },
    onBlur: ({ editor }) => {
      updateNode(node.id, { text: editor.getHTML() });
    }
  });

  const handlePointerDown = (e) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    
    // Se estiver clicando diretamente no texto para editar/selecionar, não inicia o arrasto
    if (e.target.closest('.ProseMirror')) {
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
      className={`wb-node ${isDragging ? 'wb-node--dragging' : ''} ${isCameraMoving ? 'wb-node--no-pointer' : ''} ${isActiveNode ? 'wb-node--active' : ''}`}
      style={{
        transform: `translate(${node.x}px, ${node.y}px)`,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={() => {
        if (editor) onEditorFocus(editor, node.id);
      }}
    >
      <div className="wb-node-drag-handle" title="Arraste por aqui ou pelas bordas" />
      <EditorContent editor={editor} className="wb-node-editor" />
    </div>
  );
};

export default function Whiteboard() {
  // Tijolo 0: O Canvas
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const startPan = useRef({ x: 0, y: 0 });

  // Estado global do editor focado
  const [activeEditor, setActiveEditor] = useState(null);
  const [activeNodeId, setActiveNodeId] = useState(null);

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
    
    // Se clicou no fundo do canvas, tira a seleção do editor
    setActiveEditor(null);
    setActiveNodeId(null);
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
        <h2 style={{ pointerEvents: 'auto' }}>Canvas</h2>
        
        {/* Barra de Formatação Global (Google Docs style) */}
        <GlobalMenuBar editor={activeEditor} />

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
              onEditorFocus={(editor, id) => {
                setActiveEditor(editor);
                setActiveNodeId(id);
              }}
              isActiveNode={activeNodeId === node.id}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
