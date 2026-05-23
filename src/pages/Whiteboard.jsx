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
  Trash2, Undo, Redo, Download
} from 'lucide-react';
import { toPng } from 'html-to-image';
import './Whiteboard.css';

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

const DraggableNode = ({ node, updateNode, updateMultipleNodes, selectedNodeIds, isCameraMoving, onEditorFocus, isActiveNode, cameraZoom, saveHistory, onConnectionStart }) => {
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });
  const startGroupPositions = useRef({}); // Para mover vários juntos

  const [resizeDir, setResizeDir] = useState(null);
  const startSize = useRef({ w: 0, h: 0, x: 0, y: 0 });

  const isTextMode = node.type === 'text';

  const editor = useEditor({
    extensions: [StarterKit, Underline, TextStyle, FontSize, Color, Highlight.configure({ multicolor: true }), TextAlign.configure({ types: ['heading', 'paragraph'] })],
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
    
    // Se clicou num nó que não estava selecionado sem segurar Shift, limpa e seleciona só ele
    if (!selectedNodeIds.includes(node.id) && !e.shiftKey) {
      onEditorFocus(editor, node.id, false); // Seleciona apenas este
    } else if (e.shiftKey) {
      onEditorFocus(editor, node.id, true); // Adiciona à seleção
    }

    saveHistory(); 
    setIsDragging(true);
    e.target.setPointerCapture(e.pointerId);
    startPos.current = { x: e.clientX, y: e.clientY };
    
    // Prepara as posições iniciais de TODOS os nós selecionados
    const currentSelected = selectedNodeIds.includes(node.id) ? selectedNodeIds : [node.id];
    startGroupPositions.current = currentSelected; // passamos a usar essa ref local apenas para guardar quem se move
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const dx = (e.clientX - startPos.current.x) / cameraZoom;
    const dy = (e.clientY - startPos.current.y) / cameraZoom;
    
    // Move este nó e todos os outros selecionados usando updateMultipleNodes
    // A função pai deve calcular `x = startX + dx` para cada um, ou podemos apenas passar dx/dy?
    // Passar dx/dy acumulado para o pai resolver!
    updateMultipleNodes(startGroupPositions.current, dx, dy);
    
    // Reset startPos for continuous smooth delta updates? 
    // No, better to pass dx/dy from the original click for precision, but `updateMultipleNodes` needs to know it's an offset.
    // Let's use relative incremental updates
    startPos.current = { x: e.clientX, y: e.clientY };
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
    e.target.setPointerCapture(e.pointerId);
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
      onClick={(e) => { 
        if (editor) onEditorFocus(editor, node.id, e.shiftKey); 
      }}
      data-id={node.id}
    >
      <div className="wb-node-shape-bg" />
      {isTextMode && <div className="wb-node-text-handle" />}
      <EditorContent editor={editor} className="wb-node-editor" />

      {/* Anchors de Conexão */}
      <div className="wb-connection-anchor wb-anchor-top" onPointerDown={handleConnectionPointerDown} title="Puxar seta para cima" />
      <div className="wb-connection-anchor wb-anchor-right" onPointerDown={handleConnectionPointerDown} title="Puxar seta para a direita" />
      <div className="wb-connection-anchor wb-anchor-bottom" onPointerDown={handleConnectionPointerDown} title="Puxar seta para baixo" />
      <div className="wb-connection-anchor wb-anchor-left" onPointerDown={handleConnectionPointerDown} title="Puxar seta para a esquerda" />

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
  
  // Modos de interação do Canvas
  const [interactionMode, setInteractionMode] = useState('none'); // 'panning', 'lassoing'
  const startInteraction = useRef({ x: 0, y: 0 });
  const [isSpaceDown, setIsSpaceDown] = useState(false);

  // Seleção Múltipla
  const [activeEditor, setActiveEditor] = useState(null); // mantido apenas para o TipTap toolbar
  const [selectedNodeIds, setSelectedNodeIds] = useState([]);
  const [lassoRect, setLassoRect] = useState(null); // {x, y, w, h} nas coordenadas do canvas

  // Estado Base
  const [nodes, setNodes] = useState([
    { id: '1', type: 'post-it', x: 200, y: 150, width: 260, height: 120, text: '<p><strong>Ideia Central</strong></p>' },
    { id: '2', type: 'rounded-rect', x: 600, y: 150, width: 200, height: 100, text: '<p style="text-align: center">Passo 1</p>' }
  ]);
  const [connections, setConnections] = useState([
    { id: 'c1', from: '1', to: '2' }
  ]);
  
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);

  // Draft Connection e Drag-Drop da Paleta
  const [draftConnection, setDraftConnection] = useState(null); // { fromId, mouseX, mouseY, anchorEl }
  const [draggedShape, setDraggedShape] = useState(null); // { type, mouseX, mouseY }

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

  // Captura do Spacebar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && !document.activeElement.closest('.ProseMirror')) {
        setIsSpaceDown(true);
      }
      
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        if (document.activeElement === document.body || document.activeElement === canvasRef.current) { e.preventDefault(); undo(); }
      }
      if (((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') || ((e.metaKey || e.ctrlKey) && e.key === 'y')) {
        if (document.activeElement === document.body || document.activeElement === canvasRef.current) { e.preventDefault(); redo(); }
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!document.activeElement.closest('.ProseMirror') && selectedNodeIds.length > 0) { e.preventDefault(); deleteSelectedNodes(); }
      }
    };
    const handleKeyUp = (e) => {
      if (e.code === 'Space') setIsSpaceDown(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [undo, redo, selectedNodeIds, nodes, connections]);

  const deleteSelectedNodes = () => {
    if (selectedNodeIds.length === 0) return;
    saveHistory();
    setNodes(prev => prev.filter(n => !selectedNodeIds.includes(n.id)));
    setConnections(prev => prev.filter(c => !selectedNodeIds.includes(c.from) && !selectedNodeIds.includes(c.to)));
    setSelectedNodeIds([]);
    setActiveEditor(null);
  };

  const canvasRef = useRef(null);

  // --- Eventos Globais de Mouse (Canvas) ---
  const handlePointerDown = (e) => {
    // Botão do Meio (1) ou Botão Direito (2) ou Space = PAN
    if (e.button === 1 || e.button === 2 || isSpaceDown) {
      setInteractionMode('panning');
    } 
    // Botão Esquerdo = LASSO
    else if (e.button === 0) {
      setInteractionMode('lassoing');
      setSelectedNodeIds([]); // Limpa a seleção ao clicar no fundo
      setActiveEditor(null);
      setLassoRect({ 
        startX: (e.clientX - camera.x) / camera.zoom, 
        startY: (e.clientY - camera.y) / camera.zoom,
        x: (e.clientX - camera.x) / camera.zoom,
        y: (e.clientY - camera.y) / camera.zoom,
        w: 0, h: 0 
      });
    }
    e.target.setPointerCapture(e.pointerId);
    startInteraction.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e) => {
    if (interactionMode === 'panning') {
      const dx = e.clientX - startInteraction.current.x;
      const dy = e.clientY - startInteraction.current.y;
      startInteraction.current = { x: e.clientX, y: e.clientY };
      setCamera((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
    } 
    else if (interactionMode === 'lassoing') {
      const currentX = (e.clientX - camera.x) / camera.zoom;
      const currentY = (e.clientY - camera.y) / camera.zoom;
      
      const newLasso = {
        ...lassoRect,
        x: Math.min(lassoRect.startX, currentX),
        y: Math.min(lassoRect.startY, currentY),
        w: Math.abs(currentX - lassoRect.startX),
        h: Math.abs(currentY - lassoRect.startY)
      };
      setLassoRect(newLasso);

      // Calcular interseção e atualizar seleção
      const newSelectedIds = nodes.filter(n => {
        return (
          n.x < newLasso.x + newLasso.w &&
          n.x + (n.width || 260) > newLasso.x &&
          n.y < newLasso.y + newLasso.h &&
          n.y + (n.height || 120) > newLasso.y
        );
      }).map(n => n.id);
      setSelectedNodeIds(newSelectedIds);
    }
  };

  const handlePointerUp = (e) => {
    if (interactionMode !== 'none') {
      setInteractionMode('none');
      setLassoRect(null);
      e.target.releasePointerCapture(e.pointerId);
    }
  };

  // --- Zoom ---
  const handleWheel = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) return; // Zoom normal do navegador ignorado se quisermos, mas aqui usamos wheel.
    e.preventDefault();
    const zoomSensitivity = 0.001;
    const delta = -e.deltaY * zoomSensitivity;
    setCamera((prev) => {
      let newZoom = prev.zoom + delta;
      newZoom = Math.max(0.1, Math.min(newZoom, 5));
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

  // --- Nós e Conexões ---
  const addNodeAtPosition = (type, clientX, clientY) => {
    saveHistory();
    const defaultSizes = { 'text': { w: 200, h: 50 }, 'post-it': { w: 260, h: 120 }, 'rounded-rect': { w: 200, h: 100 }, 'circle': { w: 160, h: 160 }, 'diamond': { w: 180, h: 180 } };
    const size = defaultSizes[type] || { w: 200, h: 100 };
    
    // Coordenada do Mouse convertida para Coordenada do Mundo (Canvas)
    const worldX = (clientX - camera.x) / camera.zoom - size.w / 2;
    const worldY = (clientY - camera.y) / camera.zoom - size.h / 2;

    const newNode = {
      id: Date.now().toString(),
      type: type,
      x: worldX, y: worldY,
      width: size.w, height: size.h,
      text: '<p style="text-align: center"></p>'
    };
    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeIds([newNode.id]);
  };

  const updateNode = (id, newProps) => setNodes((prev) => prev.map(n => n.id === id ? { ...n, ...newProps } : n));

  const updateMultipleNodes = (idsToMove, dx, dy) => {
    setNodes(prev => prev.map(n => {
      if (idsToMove.includes(n.id)) {
        return { ...n, x: n.x + dx, y: n.y + dy };
      }
      return n;
    }));
  };

  const handleEditorFocus = (editor, id, isShift) => {
    setActiveEditor(editor);
    if (isShift) {
      setSelectedNodeIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    } else {
      setSelectedNodeIds([id]);
    }
  };

  // --- Lógica Rastro da Seta ---
  const handleConnectionStart = (fromId, clientX, clientY) => {
    setDraftConnection({ fromId, mouseX: clientX, mouseY: clientY });
  };
  
  // Como o capture está na âncora, usamos um event listener global de window para arrastar e soltar
  useEffect(() => {
    if (!draftConnection) return;
    
    const onMove = (e) => {
      setDraftConnection(prev => ({ ...prev, mouseX: e.clientX, mouseY: e.clientY }));
    };
    const onUp = (e) => {
      const elements = document.elementsFromPoint(e.clientX, e.clientY);
      const targetNodeEl = elements.find(el => el.classList.contains('wb-node'));
      
      if (targetNodeEl) {
        const toId = targetNodeEl.getAttribute('data-id');
        if (toId && toId !== draftConnection.fromId) {
          saveHistory();
          setConnections(prev => [...prev, { id: Date.now().toString(), from: draftConnection.fromId, to: toId }]);
        }
      }
      setDraftConnection(null);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    }
  }, [draftConnection, saveHistory]);


  // --- Lógica Drag-and-Drop da Paleta ---
  useEffect(() => {
    if (!draggedShape) return;
    
    const onMove = (e) => {
      setDraggedShape(prev => ({ ...prev, mouseX: e.clientX, mouseY: e.clientY }));
    };
    const onUp = (e) => {
      addNodeAtPosition(draggedShape.type, e.clientX, e.clientY);
      setDraggedShape(null);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    }
  }, [draggedShape, camera]);


  // --- Exportar PNG Corrigido ---
  const handleExport = () => {
    if (canvasRef.current) {
      // Exportamos o contêiner inteiro em vez de a layer de tamanho zero
      toPng(canvasRef.current, { backgroundColor: '#f8fafc' }).then((dataUrl) => {
        const link = document.createElement('a');
        link.download = 'crm-dna-whiteboard.png';
        link.href = dataUrl;
        link.click();
      }).catch(err => {
        console.error('Erro na exportação:', err);
        alert('Erro ao exportar a imagem. Tente reduzir o zoom ou o número de elementos visíveis.');
      });
    }
  };

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
          <polygon points="0,-5 10,0 0,5" transform={`translate(${toX}, ${toY}) rotate(${Math.atan2(toY - fromY, toX - fromX) * 180 / Math.PI})`} fill="#64748b" />
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
    
    const toX = (draftConnection.mouseX - camera.x) / camera.zoom;
    const toY = (draftConnection.mouseY - camera.y) / camera.zoom;

    const dx = Math.abs(toX - fromX);
    const cp1x = fromX + dx / 2;
    const cp2x = toX - dx / 2;

    return <path d={`M ${fromX} ${fromY} C ${cp1x} ${fromY}, ${cp2x} ${toY}, ${toX} ${toY}`} className="wb-connection-path draft" />;
  };

  return (
    <div className={`whiteboard-container ${isSpaceDown ? 'whiteboard-container--space' : ''}`}>
      <div className="whiteboard-header">
        <h2 style={{ pointerEvents: 'auto' }}>Canvas</h2>
        <GlobalMenuBar 
          editor={activeEditor} onDelete={deleteSelectedNodes}
          canUndo={past.length > 0} canRedo={future.length > 0} onUndo={undo} onRedo={redo}
        />
        <div className="whiteboard-actions">
          <button className="btn btn-secondary btn-sm" onClick={handleExport} title="Baixar Imagem PNG"><Download size={16} /> Exportar</button>
        </div>
      </div>

      <div className="wb-left-palette">
        <button onPointerDown={(e) => { e.preventDefault(); setDraggedShape({ type: 'text', mouseX: e.clientX, mouseY: e.clientY }); }} title="Texto Solto"><Type size={20} /></button>
        <button onPointerDown={(e) => { e.preventDefault(); setDraggedShape({ type: 'post-it', mouseX: e.clientX, mouseY: e.clientY }); }} title="Nota (Post-it)"><StickyNote size={20} /></button>
        <div className="wb-palette-divider" />
        <button onPointerDown={(e) => { e.preventDefault(); setDraggedShape({ type: 'rounded-rect', mouseX: e.clientX, mouseY: e.clientY }); }} title="Retângulo"><Square size={20} /></button>
        <button onPointerDown={(e) => { e.preventDefault(); setDraggedShape({ type: 'circle', mouseX: e.clientX, mouseY: e.clientY }); }} title="Círculo"><Circle size={20} /></button>
        <button onPointerDown={(e) => { e.preventDefault(); setDraggedShape({ type: 'diamond', mouseX: e.clientX, mouseY: e.clientY }); }} title="Losango (Decisão)"><Diamond size={20} /></button>
      </div>

      <div 
        className={`whiteboard-canvas ${interactionMode === 'panning' ? 'whiteboard-canvas--panning' : ''}`}
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onContextMenu={(e) => e.preventDefault()} // Impede menu de contexto ao arrastar com botão direito
        tabIndex={0} 
        style={{ '--pan-x': camera.x, '--pan-y': camera.y, '--zoom': camera.zoom }}
      >
        <div 
          className="whiteboard-layer"
          style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`, transformOrigin: '0 0' }}
        >
          <svg className="wb-connections-svg" style={{ overflow: 'visible', position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}>
            {renderConnections()}
            {renderDraftConnection()}
          </svg>

          {nodes.map(node => (
            <DraggableNode 
              key={node.id} node={node} 
              updateNode={updateNode} 
              updateMultipleNodes={updateMultipleNodes}
              selectedNodeIds={selectedNodeIds}
              isCameraMoving={interactionMode === 'panning' || !!draftConnection || !!draggedShape} 
              cameraZoom={camera.zoom}
              onEditorFocus={handleEditorFocus}
              isActiveNode={selectedNodeIds.includes(node.id)} 
              saveHistory={() => saveHistory(nodes, connections)}
              onConnectionStart={handleConnectionStart}
            />
          ))}

          {/* Renderiza a caixa do Lasso Tool */}
          {lassoRect && (
            <div 
              className="wb-lasso-rect" 
              style={{
                left: lassoRect.x, top: lassoRect.y,
                width: lassoRect.w, height: lassoRect.h
              }} 
            />
          )}
        </div>
      </div>

      {/* Fantasma do bloco sendo arrastado da paleta */}
      {draggedShape && (
        <div 
          className={`wb-node wb-node--${draggedShape.type} wb-drag-ghost`}
          style={{
            position: 'fixed',
            pointerEvents: 'none',
            left: draggedShape.mouseX,
            top: draggedShape.mouseY,
            transform: 'translate(-50%, -50%)',
            width: draggedShape.type === 'text' ? 200 : 160,
            height: draggedShape.type === 'text' ? 50 : 100,
            opacity: 0.7,
            zIndex: 9999
          }}
        >
          <div className="wb-node-shape-bg" />
        </div>
      )}
    </div>
  );
}
