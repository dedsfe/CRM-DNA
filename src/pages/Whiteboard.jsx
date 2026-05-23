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
  Highlighter, Palette, Type, StickyNote, Square, Circle, Diamond,
  Trash2, Undo, Redo, Download, ArrowRight
} from 'lucide-react';
import { toPng } from 'html-to-image';
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

// Menu Global Topo
const GlobalMenuBar = ({ editor, onDelete, canUndo, canRedo, onUndo, onRedo }) => {
  const disabled = !editor;
  const currentFontSize = editor?.getAttributes('textStyle')?.fontSize?.replace('px', '') || '15';
  const fontSizes = [10, 12, 14, 15, 16, 18, 20, 24, 30, 36, 48, 64, 72];

  return (
    <div className={`wb-global-toolbar`}>
      <button onClick={onUndo} className="wb-toolbar-btn" title="Desfazer (Ctrl+Z)" disabled={!canUndo}><Undo size={16} /></button>
      <button onClick={onRedo} className="wb-toolbar-btn" title="Refazer (Ctrl+Y)" disabled={!canRedo}><Redo size={16} /></button>
      <div className="wb-toolbar-divider" />
      <select className="wb-toolbar-select" disabled={disabled} value={currentFontSize} onChange={(e) => editor && editor.chain().focus().setFontSize(`${e.target.value}px`).run()} title="Tamanho da Fonte">
        {fontSizes.map(size => <option key={size} value={size}>{size}</option>)}
      </select>
      <div className="wb-toolbar-divider" />
      <button onClick={() => editor && editor.chain().focus().toggleBold().run()} className={`wb-toolbar-btn ${editor?.isActive('bold') ? 'active' : ''}`} disabled={disabled}><Bold size={16} /></button>
      <button onClick={() => editor && editor.chain().focus().toggleItalic().run()} className={`wb-toolbar-btn ${editor?.isActive('italic') ? 'active' : ''}`} disabled={disabled}><Italic size={16} /></button>
      <button onClick={() => editor && editor.chain().focus().toggleUnderline().run()} className={`wb-toolbar-btn ${editor?.isActive('underline') ? 'active' : ''}`} disabled={disabled}><UnderlineIcon size={16} /></button>
      <button onClick={() => editor && editor.chain().focus().toggleStrike().run()} className={`wb-toolbar-btn ${editor?.isActive('strike') ? 'active' : ''}`} disabled={disabled}><Strikethrough size={16} /></button>
      <div className="wb-toolbar-divider" />
      <div className="wb-toolbar-color-picker" style={{ opacity: disabled ? 0.5 : 1 }}>
        <Palette size={16} />
        <input type="color" onInput={(e) => editor && editor.chain().focus().setColor(e.target.value).run()} value={editor?.getAttributes('textStyle').color || '#000000'} disabled={disabled} />
      </div>
      <button onClick={() => editor && editor.chain().focus().toggleHighlight().run()} className={`wb-toolbar-btn ${editor?.isActive('highlight') ? 'active' : ''}`} disabled={disabled}><Highlighter size={16} /></button>
      <div className="wb-toolbar-divider" />
      <button onClick={() => editor && editor.chain().focus().setTextAlign('left').run()} className={`wb-toolbar-btn ${editor?.isActive({ textAlign: 'left' }) ? 'active' : ''}`} disabled={disabled}><AlignLeft size={16} /></button>
      <button onClick={() => editor && editor.chain().focus().setTextAlign('center').run()} className={`wb-toolbar-btn ${editor?.isActive({ textAlign: 'center' }) ? 'active' : ''}`} disabled={disabled}><AlignCenter size={16} /></button>
      <button onClick={() => editor && editor.chain().focus().setTextAlign('right').run()} className={`wb-toolbar-btn ${editor?.isActive({ textAlign: 'right' }) ? 'active' : ''}`} disabled={disabled}><AlignRight size={16} /></button>
      <div className="wb-toolbar-divider" />
      <button onClick={() => editor && editor.chain().focus().toggleBulletList().run()} className={`wb-toolbar-btn ${editor?.isActive('bulletList') ? 'active' : ''}`} disabled={disabled}><List size={16} /></button>
      <button onClick={() => editor && editor.chain().focus().toggleOrderedList().run()} className={`wb-toolbar-btn ${editor?.isActive('orderedList') ? 'active' : ''}`} disabled={disabled}><ListOrdered size={16} /></button>
      <div className="wb-toolbar-divider" />
      <button onClick={onDelete} className="wb-toolbar-btn" disabled={disabled} style={{ color: disabled ? undefined : 'var(--red-600)' }}><Trash2 size={16} /></button>
    </div>
  );
};

// Tijolo 1: O Bloco Renderizável
const DraggableNode = ({ node, updateNode, isCameraMoving, onEditorFocus, isActiveNode, cameraZoom, saveHistory, onConnectionStart, onConnectionDrop }) => {
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });

  const [resizeDir, setResizeDir] = useState(null);
  const startSize = useRef({ w: 0, h: 0, x: 0, y: 0 });

  const isTextMode = node.type === 'text';

  const editor = useEditor({
    extensions: [
      StarterKit, Underline, TextStyle, FontSize, Color, Highlight.configure({ multicolor: true }), TextAlign.configure({ types: ['heading', 'paragraph'] })
    ],
    content: node.text || '<p></p>',
    onFocus: ({ editor }) => onEditorFocus(editor, node.id),
    onBlur: ({ editor }) => {
      const currentHtml = editor.getHTML();
      if (currentHtml !== node.text) {
        saveHistory(); 
        updateNode(node.id, { text: currentHtml });
      }
    }
  });

  useEffect(() => {
    if (editor && node.text !== editor.getHTML()) {
      editor.commands.setContent(node.text);
    }
  }, [node.text, editor]);

  // --- Movimentação ---
  const handlePointerDown = (e) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    if (e.target.closest('.ProseMirror') || e.target.closest('.wb-resize-handle') || e.target.closest('.wb-connection-anchor')) return; 
    
    saveHistory(); 
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

  // --- Redimensionamento ---
  const handleResizePointerDown = (e, dir) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    
    saveHistory(); 
    setResizeDir(dir);
    e.target.setPointerCapture(e.pointerId);
    startPos.current = { x: e.clientX, y: e.clientY };
    startSize.current = { w: node.width || 260, h: node.height || 120, x: node.x, y: node.y };
  };

  const handleResizePointerMove = (e) => {
    if (!resizeDir) return;
    const dx = (e.clientX - startPos.current.x) / cameraZoom;
    const dy = (e.clientY - startPos.current.y) / cameraZoom;

    let newW = startSize.current.w, newH = startSize.current.h;
    let newX = startSize.current.x, newY = startSize.current.y;

    if (resizeDir.includes('right')) newW += dx;
    if (resizeDir.includes('bottom')) newH += dy;
    if (resizeDir.includes('left')) { newW -= dx; newX += dx; }
    if (resizeDir.includes('top')) { newH -= dy; newY += dy; }

    const minW = isTextMode ? 50 : 100, minH = isTextMode ? 30 : 100;
    if (newW < minW) { if (resizeDir.includes('left')) newX -= (minW - newW); newW = minW; }
    if (newH < minH) { if (resizeDir.includes('top')) newY -= (minH - newH); newH = minH; }

    updateNode(node.id, { width: newW, height: newH, x: newX, y: newY });
  };

  const handleResizePointerUp = (e) => {
    if (resizeDir) {
      setResizeDir(null);
      e.target.releasePointerCapture(e.pointerId);
    }
  };

  // --- Conexão ---
  const handleConnectionPointerDown = (e) => {
    e.stopPropagation();
    onConnectionStart(node.id, e.clientX, e.clientY);
  };

  const typeClass = `wb-node--${node.type || 'post-it'}`;
  const activeClass = isActiveNode ? 'wb-node--active' : '';
  const noPointerClass = isCameraMoving ? 'wb-node--no-pointer' : '';

  return (
    <div
      className={`wb-node ${typeClass} ${activeClass} ${noPointerClass}`}
      style={{ transform: `translate(${node.x}px, ${node.y}px)`, width: node.width || 260, height: node.height || 120 }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onMouseUp={() => onConnectionDrop(node.id)}
      onClick={() => { if (editor) onEditorFocus(editor, node.id); }}
    >
      <div className="wb-node-shape-bg" />
      {!isTextMode && <div className="wb-node-drag-handle" title="Arraste por aqui" />}
      {isTextMode && <div className="wb-node-text-handle" />}
      <EditorContent editor={editor} className="wb-node-editor" />

      {/* Anchor de Conexão (Para puxar seta) */}
      <div 
        className="wb-connection-anchor" 
        onPointerDown={handleConnectionPointerDown}
        title="Arraste para conectar com outro bloco"
      >
        <ArrowRight size={12} />
      </div>

      <div className="wb-resize-handles">
        {['top-left', 'top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left'].map(dir => (
          <div key={dir} className={`wb-resize-handle wb-resize-${dir}`} onPointerDown={(e) => handleResizePointerDown(e, dir)} onPointerMove={handleResizePointerMove} onPointerUp={handleResizePointerUp} />
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

  // --- STATE E HISTÓRICO ---
  const [nodes, setNodes] = useState([
    { id: '1', type: 'post-it', x: 200, y: 150, width: 260, height: 120, text: '<p><strong>Ideia Central</strong></p>' },
    { id: '2', type: 'rounded-rect', x: 600, y: 150, width: 200, height: 100, text: '<p style="text-align: center">Passo 1</p>' }
  ]);
  const [connections, setConnections] = useState([
    { id: 'c1', from: '1', to: '2' }
  ]);
  
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);

  // --- STATE DE RASCUNHO DE CONEXÃO ---
  const [draftConnection, setDraftConnection] = useState(null); // { fromId, mouseX, mouseY }

  const saveHistory = useCallback((currentNodes = nodes, currentConns = connections) => {
    setPast(prev => [...prev, { nodes: currentNodes, conns: currentConns }].slice(-50));
    setFuture([]);
  }, [nodes, connections]);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    setFuture([{ nodes, conns: connections }, ...future]);
    setPast(newPast);
    setNodes(previous.nodes);
    setConnections(previous.conns);
  }, [past, future, nodes, connections]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);
    setPast([...past, { nodes, conns: connections }]);
    setFuture(newFuture);
    setNodes(next.nodes);
    setConnections(next.conns);
  }, [past, future, nodes, connections]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        if (document.activeElement === document.body || document.activeElement === canvasRef.current) { e.preventDefault(); undo(); }
      }
      if (((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') || ((e.metaKey || e.ctrlKey) && e.key === 'y')) {
        if (document.activeElement === document.body || document.activeElement === canvasRef.current) { e.preventDefault(); redo(); }
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!document.activeElement.closest('.ProseMirror') && activeNodeId) { e.preventDefault(); deleteActiveNode(); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, activeNodeId, nodes, connections]);

  const deleteActiveNode = () => {
    if (!activeNodeId) return;
    saveHistory();
    setNodes(prev => prev.filter(n => n.id !== activeNodeId));
    setConnections(prev => prev.filter(c => c.from !== activeNodeId && c.to !== activeNodeId));
    setActiveNodeId(null);
    setActiveEditor(null);
  };

  const canvasRef = useRef(null);

  // --- Lógica de Arrastar Canvas ou Conexão Rascunho ---
  const handlePointerDown = (e) => {
    if (e.button !== 0 && e.button !== 1) return;
    setIsPanning(true);
    e.target.setPointerCapture(e.pointerId);
    startPan.current = { x: e.clientX, y: e.clientY };
    setActiveEditor(null);
    setActiveNodeId(null);
  };

  const handlePointerMove = (e) => {
    if (draftConnection) {
      setDraftConnection(prev => ({ ...prev, mouseX: e.clientX, mouseY: e.clientY }));
      return;
    }
    if (!isPanning) return;
    const dx = e.clientX - startPan.current.x;
    const dy = e.clientY - startPan.current.y;
    startPan.current = { x: e.clientX, y: e.clientY };
    setCamera((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
  };

  const handlePointerUp = (e) => {
    if (draftConnection) {
      setDraftConnection(null); // Abort se soltou no vazio
    }
    if (isPanning) {
      setIsPanning(false);
      e.target.releasePointerCapture(e.pointerId);
    }
  };

  // --- Funções de Conexão (Setas) ---
  const handleConnectionStart = (fromId, clientX, clientY) => {
    setDraftConnection({ fromId, mouseX: clientX, mouseY: clientY });
  };

  const handleConnectionDrop = (toId) => {
    if (draftConnection && draftConnection.fromId !== toId) {
      saveHistory();
      setConnections(prev => [...prev, { id: Date.now().toString(), from: draftConnection.fromId, to: toId }]);
      setDraftConnection(null);
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
    saveHistory();
    const defaultSizes = { 'text': { w: 200, h: 50 }, 'post-it': { w: 260, h: 120 }, 'rounded-rect': { w: 200, h: 100 }, 'circle': { w: 160, h: 160 }, 'diamond': { w: 180, h: 180 } };
    const size = defaultSizes[type] || { w: 200, h: 100 };
    const newNode = {
      id: Date.now().toString(),
      type: type,
      x: -camera.x / camera.zoom + window.innerWidth / 2 - (size.w / 2),
      y: -camera.y / camera.zoom + window.innerHeight / 2 - (size.h / 2),
      width: size.w, height: size.h,
      text: '<p style="text-align: center"></p>'
    };
    setNodes((prev) => [...prev, newNode]);
    setTimeout(() => setActiveNodeId(newNode.id), 100);
  };

  const updateNode = (id, newProps) => setNodes((prev) => prev.map(n => n.id === id ? { ...n, ...newProps } : n));

  // --- Exportar para PNG ---
  const handleExport = () => {
    if (canvasRef.current) {
      const exportElement = canvasRef.current.querySelector('.whiteboard-layer');
      toPng(exportElement, { backgroundColor: '#f8fafc' }).then((dataUrl) => {
        const link = document.createElement('a');
        link.download = 'crm-dna-whiteboard.png';
        link.href = dataUrl;
        link.click();
      });
    }
  };

  // --- Renderização de Conexões (SVG) ---
  const renderConnections = () => {
    return connections.map(conn => {
      const fromNode = nodes.find(n => n.id === conn.from);
      const toNode = nodes.find(n => n.id === conn.to);
      if (!fromNode || !toNode) return null;

      const fromX = fromNode.x + (fromNode.width || 260) / 2;
      const fromY = fromNode.y + (fromNode.height || 120) / 2;
      const toX = toNode.x + (toNode.width || 260) / 2;
      const toY = toNode.y + (toNode.height || 120) / 2;

      const dx = Math.abs(toX - fromX);
      const cp1x = fromX + dx / 2;
      const cp2x = toX - dx / 2;

      return (
        <g key={conn.id}>
          <path d={`M ${fromX} ${fromY} C ${cp1x} ${fromY}, ${cp2x} ${toY}, ${toX} ${toY}`} className="wb-connection-path" />
          <polygon points="0,-4 8,0 0,4" transform={`translate(${toX}, ${toY}) rotate(${Math.atan2(toY - fromY, toX - fromX) * 180 / Math.PI})`} fill="#64748b" />
        </g>
      );
    });
  };

  const renderDraftConnection = () => {
    if (!draftConnection) return null;
    const fromNode = nodes.find(n => n.id === draftConnection.fromId);
    if (!fromNode) return null;

    const fromX = fromNode.x + (fromNode.width || 260) / 2;
    const fromY = fromNode.y + (fromNode.height || 120) / 2;
    
    // Converter mouse (tela) para coordenadas do canvas interno (desfazendo pan e zoom)
    const toX = (draftConnection.mouseX - camera.x) / camera.zoom;
    const toY = (draftConnection.mouseY - camera.y) / camera.zoom;

    const dx = Math.abs(toX - fromX);
    const cp1x = fromX + dx / 2;
    const cp2x = toX - dx / 2;

    return <path d={`M ${fromX} ${fromY} C ${cp1x} ${fromY}, ${cp2x} ${toY}, ${toX} ${toY}`} className="wb-connection-path draft" />;
  };

  return (
    <div className="whiteboard-container">
      {/* Cabeçalho */}
      <div className="whiteboard-header">
        <h2 style={{ pointerEvents: 'auto' }}>Canvas</h2>
        <GlobalMenuBar 
          editor={activeEditor} onDelete={deleteActiveNode}
          canUndo={past.length > 0} canRedo={future.length > 0} onUndo={undo} onRedo={redo}
        />
        <div className="whiteboard-actions">
          <button className="btn btn-secondary btn-sm" onClick={handleExport} title="Baixar Imagem PNG"><Download size={16} /> Exportar</button>
        </div>
      </div>

      {/* Paleta Esquerda */}
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
        tabIndex={0} 
        style={{ '--pan-x': camera.x, '--pan-y': camera.y, '--zoom': camera.zoom }}
      >
        <div 
          className="whiteboard-layer"
          style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`, transformOrigin: '0 0' }}
        >
          {/* Camada SVG de Conexões */}
          <svg className="wb-connections-svg" style={{ overflow: 'visible', position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}>
            {renderConnections()}
            {renderDraftConnection()}
          </svg>

          {nodes.map(node => (
            <DraggableNode 
              key={node.id} node={node} updateNode={updateNode} 
              isCameraMoving={isPanning || !!draftConnection} cameraZoom={camera.zoom}
              onEditorFocus={(editor, id) => { setActiveEditor(editor); setActiveNodeId(id); }}
              isActiveNode={activeNodeId === node.id} saveHistory={() => saveHistory(nodes, connections)}
              onConnectionStart={handleConnectionStart} onConnectionDrop={handleConnectionDrop}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
