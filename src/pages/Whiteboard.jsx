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
  AlignLeft, AlignCenter, AlignRight,
  Highlighter, Palette, Type, StickyNote, Square, Circle, Diamond
} from 'lucide-react';
import './Whiteboard.css';

// --- Extensão Customizada para Tamanho de Fonte ---
const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() { return { types: ['textStyle'] } },
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        fontSize: {
          default: null,
          parseHTML: element => element.style.fontSize.replace(/['"]+/g, ''),
          renderHTML: attributes => {
            if (!attributes.fontSize) return {}
            return { style: `font-size: ${attributes.fontSize}` }
          },
        },
      },
    }]
  },
  addCommands() {
    return {
      setFontSize: fontSize => ({ chain }) => chain().setMark('textStyle', { fontSize }).run(),
      unsetFontSize: () => ({ chain }) => chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
    }
  },
});
// ---------------------------------------------------

// Menu Global Topo (Formatação de Texto)
const GlobalMenuBar = ({ editor }) => {
  const disabled = !editor;
  const currentFontSize = editor?.getAttributes('textStyle')?.fontSize?.replace('px', '') || '15';
  const fontSizes = [10, 12, 14, 15, 16, 18, 20, 24, 30, 36, 48, 64, 72];

  return (
    <div className={`wb-global-toolbar ${disabled ? 'disabled' : ''}`}>
      <select 
        className="wb-toolbar-select"
        disabled={disabled}
        value={currentFontSize}
        onChange={(e) => editor && editor.chain().focus().setFontSize(`${e.target.value}px`).run()}
        title="Tamanho da Fonte"
      >
        {fontSizes.map(size => <option key={size} value={size}>{size}</option>)}
      </select>
      <div className="wb-toolbar-divider" />
      <button onClick={() => editor && editor.chain().focus().toggleBold().run()} className={`wb-toolbar-btn ${editor?.isActive('bold') ? 'active' : ''}`} title="Negrito" disabled={disabled}><Bold size={16} /></button>
      <button onClick={() => editor && editor.chain().focus().toggleItalic().run()} className={`wb-toolbar-btn ${editor?.isActive('italic') ? 'active' : ''}`} title="Itálico" disabled={disabled}><Italic size={16} /></button>
      <button onClick={() => editor && editor.chain().focus().toggleUnderline().run()} className={`wb-toolbar-btn ${editor?.isActive('underline') ? 'active' : ''}`} title="Sublinhado" disabled={disabled}><UnderlineIcon size={16} /></button>
      <button onClick={() => editor && editor.chain().focus().toggleStrike().run()} className={`wb-toolbar-btn ${editor?.isActive('strike') ? 'active' : ''}`} title="Tachado" disabled={disabled}><Strikethrough size={16} /></button>
      <div className="wb-toolbar-divider" />
      <div className="wb-toolbar-color-picker" title="Cor do Texto">
        <Palette size={16} />
        <input type="color" onInput={(e) => editor && editor.chain().focus().setColor(e.target.value).run()} value={editor?.getAttributes('textStyle').color || '#000000'} disabled={disabled} />
      </div>
      <button onClick={() => editor && editor.chain().focus().toggleHighlight().run()} className={`wb-toolbar-btn ${editor?.isActive('highlight') ? 'active' : ''}`} title="Marca Texto" disabled={disabled}><Highlighter size={16} /></button>
      <div className="wb-toolbar-divider" />
      <button onClick={() => editor && editor.chain().focus().setTextAlign('left').run()} className={`wb-toolbar-btn ${editor?.isActive({ textAlign: 'left' }) ? 'active' : ''}`} title="Esquerda" disabled={disabled}><AlignLeft size={16} /></button>
      <button onClick={() => editor && editor.chain().focus().setTextAlign('center').run()} className={`wb-toolbar-btn ${editor?.isActive({ textAlign: 'center' }) ? 'active' : ''}`} title="Centralizar" disabled={disabled}><AlignCenter size={16} /></button>
      <button onClick={() => editor && editor.chain().focus().setTextAlign('right').run()} className={`wb-toolbar-btn ${editor?.isActive({ textAlign: 'right' }) ? 'active' : ''}`} title="Direita" disabled={disabled}><AlignRight size={16} /></button>
      <div className="wb-toolbar-divider" />
      <button onClick={() => editor && editor.chain().focus().toggleBulletList().run()} className={`wb-toolbar-btn ${editor?.isActive('bulletList') ? 'active' : ''}`} title="Lista" disabled={disabled}><List size={16} /></button>
      <button onClick={() => editor && editor.chain().focus().toggleOrderedList().run()} className={`wb-toolbar-btn ${editor?.isActive('orderedList') ? 'active' : ''}`} title="Lista Numérica" disabled={disabled}><ListOrdered size={16} /></button>
    </div>
  );
};

// Tijolo 1: O Bloco Renderizável (Formas e Tamanhos)
const DraggableNode = ({ node, updateNode, isCameraMoving, onEditorFocus, isActiveNode, cameraZoom }) => {
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });

  // Resizing state
  const [resizeDir, setResizeDir] = useState(null);
  const startSize = useRef({ w: 0, h: 0, x: 0, y: 0 });

  const isTextMode = node.type === 'text';

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
    onFocus: ({ editor }) => onEditorFocus(editor, node.id),
    onBlur: ({ editor }) => updateNode(node.id, { text: editor.getHTML() })
  });

  // --- Movimentação (Dragging) ---
  const handlePointerDown = (e) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    if (e.target.closest('.ProseMirror') || e.target.closest('.wb-resize-handle')) return; 
    setIsDragging(true);
    e.target.setPointerCapture(e.pointerId);
    startPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const dx = (e.clientX - startPos.current.x) / cameraZoom;
    const dy = (e.clientY - startPos.current.y) / cameraZoom;
    startPos.current = { x: e.clientX, y: e.clientY };
    updateNode(node.id, { x: node.x + dx, y: node.y + dy });
  };

  const handlePointerUp = (e) => {
    if (isDragging) {
      setIsDragging(false);
      e.target.releasePointerCapture(e.pointerId);
    }
  };

  // --- Redimensionamento (Resizing) ---
  const handleResizePointerDown = (e, dir) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    setResizeDir(dir);
    e.target.setPointerCapture(e.pointerId);
    startPos.current = { x: e.clientX, y: e.clientY };
    startSize.current = { 
      w: node.width || 260, 
      h: node.height || 120, 
      x: node.x, 
      y: node.y 
    };
  };

  const handleResizePointerMove = (e) => {
    if (!resizeDir) return;
    
    // Calcula o deslocamento e compensa o zoom para que o resize acompanhe 1:1 o mouse na tela
    const dx = (e.clientX - startPos.current.x) / cameraZoom;
    const dy = (e.clientY - startPos.current.y) / cameraZoom;

    let newW = startSize.current.w;
    let newH = startSize.current.h;
    let newX = startSize.current.x;
    let newY = startSize.current.y;

    if (resizeDir.includes('right')) newW += dx;
    if (resizeDir.includes('bottom')) newH += dy;
    if (resizeDir.includes('left')) { newW -= dx; newX += dx; }
    if (resizeDir.includes('top')) { newH -= dy; newY += dy; }

    // Limites Mínimos
    const minW = isTextMode ? 50 : 100;
    const minH = isTextMode ? 30 : 100;

    if (newW < minW) {
      if (resizeDir.includes('left')) newX -= (minW - newW);
      newW = minW;
    }
    if (newH < minH) {
      if (resizeDir.includes('top')) newY -= (minH - newH);
      newH = minH;
    }

    updateNode(node.id, { width: newW, height: newH, x: newX, y: newY });
  };

  const handleResizePointerUp = (e) => {
    if (resizeDir) {
      setResizeDir(null);
      e.target.releasePointerCapture(e.pointerId);
    }
  };

  // Prepara as classes CSS baseadas no Type e ActiveState
  const typeClass = `wb-node--${node.type || 'post-it'}`;
  const activeClass = isActiveNode ? 'wb-node--active' : '';
  const noPointerClass = isCameraMoving ? 'wb-node--no-pointer' : '';

  return (
    <div
      className={`wb-node ${typeClass} ${activeClass} ${noPointerClass}`}
      style={{ 
        transform: `translate(${node.x}px, ${node.y}px)`,
        width: node.width || 260,
        height: node.height || 120
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={() => { if (editor) onEditorFocus(editor, node.id); }}
    >
      {/* Container de fundo para formatos complexos (ex: Diamond usa rotate) */}
      <div className="wb-node-shape-bg" />

      {/* Alça superior para arraste quando não é texto solto */}
      {!isTextMode && <div className="wb-node-drag-handle" title="Arraste por aqui" />}
      
      {/* No texto solto, o próprio contorno tracejado atua como área de arraste, mas adicionamos um padzinho no topo */}
      {isTextMode && <div className="wb-node-text-handle" />}

      <EditorContent editor={editor} className="wb-node-editor" />

      {/* Alças de Redimensionamento (Aparecem quando ativo ou hover) */}
      <div className="wb-resize-handles">
        {['top-left', 'top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left'].map(dir => (
          <div 
            key={dir}
            className={`wb-resize-handle wb-resize-${dir}`}
            onPointerDown={(e) => handleResizePointerDown(e, dir)}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
          />
        ))}
      </div>
    </div>
  );
};

export default function Whiteboard() {
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const startPan = useRef({ x: 0, y: 0 });

  const [activeEditor, setActiveEditor] = useState(null);
  const [activeNodeId, setActiveNodeId] = useState(null);

  const [nodes, setNodes] = useState([
    { id: '1', type: 'post-it', x: 200, y: 150, width: 260, height: 120, text: '<p><strong>Post-it Original</strong></p><p>Agora redimensionável!</p>' },
    { id: '2', type: 'rounded-rect', x: 500, y: 150, width: 200, height: 100, text: '<p style="text-align: center">Etapa 1</p>' }
  ]);

  const canvasRef = useRef(null);

  const handlePointerDown = (e) => {
    if (e.button !== 0 && e.button !== 1) return;
    setIsPanning(true);
    e.target.setPointerCapture(e.pointerId);
    startPan.current = { x: e.clientX, y: e.clientY };
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

  const addNode = (type) => {
    const defaultSizes = {
      'text': { w: 200, h: 50 },
      'post-it': { w: 260, h: 120 },
      'rounded-rect': { w: 200, h: 100 },
      'circle': { w: 160, h: 160 },
      'diamond': { w: 180, h: 180 }
    };
    
    const size = defaultSizes[type] || { w: 200, h: 100 };

    const newNode = {
      id: Date.now().toString(),
      type: type,
      x: -camera.x / camera.zoom + window.innerWidth / 2 - (size.w / 2),
      y: -camera.y / camera.zoom + window.innerHeight / 2 - (size.h / 2),
      width: size.w,
      height: size.h,
      text: '<p style="text-align: center"></p>'
    };
    setNodes((prev) => [...prev, newNode]);
  };

  const updateNode = (id, newProps) => {
    setNodes((prev) => prev.map(n => n.id === id ? { ...n, ...newProps } : n));
  };

  return (
    <div className="whiteboard-container">
      {/* Cabeçalho */}
      <div className="whiteboard-header">
        <h2 style={{ pointerEvents: 'auto' }}>Canvas</h2>
        <GlobalMenuBar editor={activeEditor} />
        <div className="whiteboard-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => setCamera({ x: 0, y: 0, zoom: 1 })}>
            Recentralizar
          </button>
        </div>
      </div>

      {/* Paleta Esquerda (Miro Style) */}
      <div className="wb-left-palette">
        <button onClick={() => addNode('text')} title="Texto Solto"><Type size={20} /></button>
        <button onClick={() => addNode('post-it')} title="Nota (Post-it)"><StickyNote size={20} /></button>
        <div className="wb-palette-divider" />
        <button onClick={() => addNode('rounded-rect')} title="Retângulo"><Square size={20} /></button>
        <button onClick={() => addNode('circle')} title="Círculo"><Circle size={20} /></button>
        <button onClick={() => addNode('diamond')} title="Losango (Decisão)"><Diamond size={20} /></button>
      </div>

      <div 
        className={`whiteboard-canvas ${isPanning ? 'whiteboard-canvas--panning' : ''}`}
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{ '--pan-x': camera.x, '--pan-y': camera.y, '--zoom': camera.zoom }}
      >
        <div 
          className="whiteboard-layer"
          style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`, transformOrigin: '0 0' }}
        >
          {nodes.map(node => (
            <DraggableNode 
              key={node.id} 
              node={node} 
              updateNode={updateNode} 
              isCameraMoving={isPanning}
              cameraZoom={camera.zoom}
              onEditorFocus={(editor, id) => { setActiveEditor(editor); setActiveNodeId(id); }}
              isActiveNode={activeNodeId === node.id}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
