import { useState, useRef, useEffect, useCallback } from 'react';
import { Extension } from '@tiptap/core';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { TextAlign } from '@tiptap/extension-text-align';
import { 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, 
  List, ListOrdered, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Highlighter, Palette
} from 'lucide-react';
import './Whiteboard.css';

// --- Extensão Customizada para Tamanho de Fonte (Estilo Excel/Word) ---
const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return {
      types: ['textStyle'],
    }
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize.replace(/['"]+/g, ''),
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {}
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              }
            },
          },
        },
      },
    ]
  },
  addCommands() {
    return {
      setFontSize: fontSize => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize })
          .run()
      },
      unsetFontSize: () => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize: null })
          .removeEmptyTextStyle()
          .run()
      },
    }
  },
});
// --------------------------------------------------------------------

// Componente do Menu Global (fica no topo da tela)
const GlobalMenuBar = ({ editor }) => {
  const disabled = !editor;

  // Pegar o tamanho de fonte atual, ou usar padrão (15px) se não houver um definido
  const currentFontSize = editor?.getAttributes('textStyle')?.fontSize?.replace('px', '') || '15';

  const fontSizes = [10, 12, 14, 15, 16, 18, 20, 24, 30, 36, 48, 64, 72];

  return (
    <div className={`wb-global-toolbar ${disabled ? 'disabled' : ''}`}>
      
      {/* Seletor de Tamanho de Fonte */}
      <select 
        className="wb-toolbar-select"
        disabled={disabled}
        value={currentFontSize}
        onChange={(e) => {
          if (editor) {
            editor.chain().focus().setFontSize(`${e.target.value}px`).run();
          }
        }}
        title="Tamanho da Fonte"
      >
        {fontSizes.map(size => (
          <option key={size} value={size}>{size}</option>
        ))}
      </select>

      <div className="wb-toolbar-divider" />

      {/* Formatação Básica */}
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

      {/* Cores e Marca Texto */}
      <div className="wb-toolbar-color-picker" title="Cor do Texto">
        <Palette size={16} />
        <input
          type="color"
          onInput={(e) => editor && editor.chain().focus().setColor(e.target.value).run()}
          value={editor?.getAttributes('textStyle').color || '#000000'}
          disabled={disabled}
        />
      </div>
      <button
        onClick={() => editor && editor.chain().focus().toggleHighlight().run()}
        className={`wb-toolbar-btn ${editor?.isActive('highlight') ? 'active' : ''}`}
        title="Marca Texto"
        disabled={disabled}
      >
        <Highlighter size={16} />
      </button>

      <div className="wb-toolbar-divider" />

      {/* Alinhamento */}
      <button
        onClick={() => editor && editor.chain().focus().setTextAlign('left').run()}
        className={`wb-toolbar-btn ${editor?.isActive({ textAlign: 'left' }) ? 'active' : ''}`}
        title="Alinhar à Esquerda"
        disabled={disabled}
      >
        <AlignLeft size={16} />
      </button>
      <button
        onClick={() => editor && editor.chain().focus().setTextAlign('center').run()}
        className={`wb-toolbar-btn ${editor?.isActive({ textAlign: 'center' }) ? 'active' : ''}`}
        title="Centralizar"
        disabled={disabled}
      >
        <AlignCenter size={16} />
      </button>
      <button
        onClick={() => editor && editor.chain().focus().setTextAlign('right').run()}
        className={`wb-toolbar-btn ${editor?.isActive({ textAlign: 'right' }) ? 'active' : ''}`}
        title="Alinhar à Direita"
        disabled={disabled}
      >
        <AlignRight size={16} />
      </button>

      <div className="wb-toolbar-divider" />

      {/* Listas */}
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
      TextStyle,
      FontSize,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
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
    { id: '1', x: 100, y: 100, text: '<p><span style="font-size: 24px"><strong>Ideia Genial!</strong></span></p><p>Podemos formatar do jeito que quisermos agora.</p>' }
  ]);

  const canvasRef = useRef(null);

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
        
        {/* Barra de Formatação Global */}
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
