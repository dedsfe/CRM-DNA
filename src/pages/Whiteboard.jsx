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

// --- Funções Matemáticas de Física e Ancoragem ---
const getStraightPath = (fromX, fromY, toX, toY) => {
  const cpX = (fromX + toX) / 2;
  const cpY = (fromY + toY) / 2;
  const angle = Math.atan2(toY - fromY, toX - fromX) * 180 / Math.PI;
  return { path: `M ${fromX} ${fromY} Q ${cpX} ${cpY}, ${toX} ${toY}`, angle };
};

const getRopePath = (fromX, fromY, toX, toY) => {
  const dx = Math.abs(toX - fromX);
  const dy = Math.abs(toY - fromY);
  const dist = Math.sqrt(dx * dx + dy * dy);
  
  // Tensão realista da corda
  const sag = Math.min(dist * 0.45, 300) + 20; 
  
  const cpX = (fromX + toX) / 2;
  const cpY = Math.max(fromY, toY) + sag;
  const angle = Math.atan2(toY - cpY, toX - cpX) * 180 / Math.PI;

  return { path: `M ${fromX} ${fromY} Q ${cpX} ${cpY}, ${toX} ${toY}`, angle };
};

const getAnchorPosition = (node, anchor) => {
  const cx = node.x + (node.width || 260) / 2;
  const cy = node.y + (node.height || 120) / 2;
  switch (anchor) {
    case 'top': return { x: cx, y: node.y };
    case 'bottom': return { x: cx, y: node.y + (node.height || 120) };
    case 'left': return { x: node.x, y: cy };
    case 'right': return { x: node.x + (node.width || 260), y: cy };
    default: return { x: cx, y: cy }; // center fallback
  }
};

const Connection = ({ conn, nodes }) => {
  const [snapped, setSnapped] = useState(!conn.isNew);

  useEffect(() => {
    if (conn.isNew && !snapped) {
      // 30ms para renderizar o frame da corda com gravidade e engatilhar a transição CSS
      const timer = setTimeout(() => {
        setSnapped(true);
        conn.isNew = false; 
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [conn, snapped]);

  const fromNode = nodes.find(n => n.id === conn.from);
  const toNode = nodes.find(n => n.id === conn.to);
  if (!fromNode || !toNode) return null;

  const fromPos = getAnchorPosition(fromNode, conn.fromAnchor || 'center');
  const toPos = getAnchorPosition(toNode, conn.toAnchor || 'center');

  const { path, angle } = snapped 
    ? getStraightPath(fromPos.x, fromPos.y, toPos.x, toPos.y)
    : getRopePath(fromPos.x, fromPos.y, toPos.x, toPos.y);

  return (
    <g>
      <path d={path} className="wb-connection-path wb-anim-snap" />
      <polygon points="0,-6 12,0 0,6" transform={`translate(${toPos.x}, ${toPos.y}) rotate(${angle})`} fill="#64748b" className="wb-connection-arrowhead wb-anim-snap" />
    </g>
  );
};


const DraggableNode = ({ node, updateNode, updateMultipleNodes, selectedNodeIds, isCameraMoving, isDrafting, onEditorFocus, isActiveNode, cameraZoom, saveHistory, onConnectionStart }) => {
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });
  const startGroupPositions = useRef({}); 

  const [resizeDir, setResizeDir] = useState(null);
  const startSize = useRef({ w: 0, h: 0, x: 0, y: 0 });

  const isTextMode = node.type === 'text';

  const editor = useEditor({
    extensions: [StarterKit, Underline, TextStyle, FontSize, Color, Highlight.configure({ multicolor: true }), TextAlign.configure({ types: ['heading', 'paragraph'] })],
    content: node.text || '<p></p>',
    onFocus: ({ editor }) => {},
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
    if (e.target.closest('.ProseMirror') && isActiveNode && !e.shiftKey) return; 
    if (e.target.closest('.wb-resize-handle') || e.target.closest('.wb-connection-anchor')) return; 
    
    if (e.shiftKey) {
      onEditorFocus(editor, node.id, true); 
    } else if (!selectedNodeIds.includes(node.id)) {
      onEditorFocus(editor, node.id, false); 
    } else {
      onEditorFocus(editor, node.id, false, true); 
    }

    saveHistory(); 
    setIsDragging(true);
    e.target.setPointerCapture(e.pointerId);
    startPos.current = { x: e.clientX, y: e.clientY };
    
    const currentSelected = (selectedNodeIds.includes(node.id) || e.shiftKey) 
      ? Array.from(new Set([...selectedNodeIds, node.id])) 
      : [node.id];
    startGroupPositions.current = currentSelected;
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const dx = (e.clientX - startPos.current.x) / cameraZoom;
    const dy = (e.clientY - startPos.current.y) / cameraZoom;
    
    updateMultipleNodes(startGroupPositions.current, dx, dy);
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

  const handleConnectionPointerDown = (e, anchor) => {
    e.stopPropagation();
    e.preventDefault(); 
    onConnectionStart(node.id, anchor, e.clientX, e.clientY);
  };

  const typeClass = `wb-node--${node.type || 'post-it'}`;
  const activeClass = isActiveNode ? 'wb-node--active' : '';
  const noPointerClass = isCameraMoving ? 'wb-node--no-pointer' : '';
  const draftingClass = isDrafting ? 'wb-node--drafting' : '';

  return (
    <div
      className={`wb-node ${typeClass} ${activeClass} ${noPointerClass} ${draftingClass}`}
      style={{ transform: `translate(${node.x}px, ${node.y}px)`, width: node.width || 260, height: node.height || 120 }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      data-id={node.id}
    >
      <div className="wb-node-shape-bg" />
      {isTextMode && <div className="wb-node-text-handle" />}
      <EditorContent editor={editor} className="wb-node-editor" />

      {/* Anchors de Conexão */}
      <div className="wb-connection-anchor wb-anchor-top" data-anchor="top" onPointerDown={(e) => handleConnectionPointerDown(e, 'top')} title="Puxar seta para cima" />
      <div className="wb-connection-anchor wb-anchor-right" data-anchor="right" onPointerDown={(e) => handleConnectionPointerDown(e, 'right')} title="Puxar seta para a direita" />
      <div className="wb-connection-anchor wb-anchor-bottom" data-anchor="bottom" onPointerDown={(e) => handleConnectionPointerDown(e, 'bottom')} title="Puxar seta para baixo" />
      <div className="wb-connection-anchor wb-anchor-left" data-anchor="left" onPointerDown={(e) => handleConnectionPointerDown(e, 'left')} title="Puxar seta para a esquerda" />

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
  
  const [interactionMode, setInteractionMode] = useState('none');
  const startInteraction = useRef({ x: 0, y: 0 });
  const [isSpaceDown, setIsSpaceDown] = useState(false);

  const [activeEditor, setActiveEditor] = useState(null); 
  const [selectedNodeIds, setSelectedNodeIds] = useState([]);
  const [lassoRect, setLassoRect] = useState(null); 

  const [nodes, setNodes] = useState([
    { id: '1', type: 'post-it', x: 200, y: 150, width: 260, height: 120, text: '<p><strong>Ideia Central</strong></p>' },
    { id: '2', type: 'rounded-rect', x: 600, y: 150, width: 200, height: 100, text: '<p style="text-align: center">Passo 1</p>' }
  ]);
  const [connections, setConnections] = useState([
    { id: 'c1', from: '1', to: '2' }
  ]);
  
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);

  const [draftConnection, setDraftConnection] = useState(null); 
  const [draggedShape, setDraggedShape] = useState(null); 

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

  const handlePointerDown = (e) => {
    if (e.button === 1 || e.button === 2 || isSpaceDown) {
      setInteractionMode('panning');
    } 
    else if (e.button === 0) {
      setInteractionMode('lassoing');
      if (!e.shiftKey) {
        setSelectedNodeIds([]); 
      }
      setActiveEditor(null);
      
      const rect = canvasRef.current.getBoundingClientRect();
      const xInside = e.clientX - rect.left;
      const yInside = e.clientY - rect.top;
      
      setLassoRect({ 
        startX: (xInside - camera.x) / camera.zoom, 
        startY: (yInside - camera.y) / camera.zoom,
        x: (xInside - camera.x) / camera.zoom,
        y: (yInside - camera.y) / camera.zoom,
        w: 0, h: 0 
      });
    }
    e.target.setPointerCapture(e.pointerId);
    startInteraction.current = { x: e.clientX, y: e.clientY };
  };

  // --- Lógica Rastro da Seta (Gravidade) ---
  const draftRef = useRef(null);

  const handleConnectionStart = useCallback((fromId, fromAnchor, clientX, clientY) => {
    draftRef.current = { fromId, fromAnchor, mouseX: clientX, mouseY: clientY };
    setDraftConnection(draftRef.current);

    const onMove = (e) => {
      draftRef.current = { ...draftRef.current, mouseX: e.clientX, mouseY: e.clientY };
      setDraftConnection(draftRef.current);
    };

    const onUp = (e) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      
      const draft = draftRef.current;
      if (draft) {
        const elements = document.elementsFromPoint(e.clientX, e.clientY);
        const targetAnchorEl = elements.find(el => el.classList.contains('wb-connection-anchor'));
        const targetNodeEl = elements.find(el => el.classList.contains('wb-node'));
        
        if (targetNodeEl) {
          const toId = targetNodeEl.getAttribute('data-id');
          if (toId && toId !== draft.fromId) {
            
            let toAnchor = 'center';
            if (targetAnchorEl) {
              toAnchor = targetAnchorEl.getAttribute('data-anchor');
            } else {
              // Calcula a âncora mais próxima do ponto onde o usuário soltou dentro do node
              const nodeRect = targetNodeEl.getBoundingClientRect();
              const cx = nodeRect.left + nodeRect.width / 2;
              const cy = nodeRect.top + nodeRect.height / 2;
              const dx = e.clientX - cx;
              const dy = e.clientY - cy;
              
              if (Math.abs(dx) > Math.abs(dy)) {
                toAnchor = dx > 0 ? 'right' : 'left';
              } else {
                toAnchor = dy > 0 ? 'bottom' : 'top';
              }
            }

            setConnections(prev => {
              saveHistory(nodes, prev);
              return [...prev, { id: Date.now().toString(), from: draft.fromId, fromAnchor: draft.fromAnchor, to: toId, toAnchor, isNew: true }];
            });
          }
        }
      }
      draftRef.current = null;
      setDraftConnection(null);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [nodes, saveHistory]);
  
  // --- Eventos Globais do Container ---
  const handleContainerPointerMove = (e) => {
    if (draggedShape) {
      setDraggedShape(prev => ({ ...prev, mouseX: e.clientX, mouseY: e.clientY }));
      return;
    }
    
    if (interactionMode === 'panning') {
      const dx = e.clientX - startInteraction.current.x;
      const dy = e.clientY - startInteraction.current.y;
      startInteraction.current = { x: e.clientX, y: e.clientY };
      setCamera((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
    } 
    else if (interactionMode === 'lassoing') {
      const rect = canvasRef.current.getBoundingClientRect();
      const xInside = e.clientX - rect.left;
      const yInside = e.clientY - rect.top;
      const currentX = (xInside - camera.x) / camera.zoom;
      const currentY = (yInside - camera.y) / camera.zoom;
      
      const newLasso = {
        ...lassoRect,
        x: Math.min(lassoRect.startX, currentX),
        y: Math.min(lassoRect.startY, currentY),
        w: Math.abs(currentX - lassoRect.startX),
        h: Math.abs(currentY - lassoRect.startY)
      };
      setLassoRect(newLasso);

      const newSelectedIds = nodes.filter(n => {
        return (
          n.x < newLasso.x + newLasso.w &&
          n.x + (n.width || 260) > newLasso.x &&
          n.y < newLasso.y + newLasso.h &&
          n.y + (n.height || 120) > newLasso.y
        );
      }).map(n => n.id);
      
      setSelectedNodeIds(prev => Array.from(new Set([...prev, ...newSelectedIds])));
    }
  };

  const handleContainerPointerUp = (e) => {
    if (draggedShape) {
      addNodeAtPosition(draggedShape.type, e.clientX, e.clientY);
      setDraggedShape(null);
      if (e.target.hasPointerCapture && e.target.hasPointerCapture(e.pointerId)) e.target.releasePointerCapture(e.pointerId);
      return;
    }
    
    if (interactionMode !== 'none') {
      setInteractionMode('none');
      setLassoRect(null);
      if (e.target.hasPointerCapture && e.target.hasPointerCapture(e.pointerId)) e.target.releasePointerCapture(e.pointerId);
    }
  };

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const zoomSensitivity = 0.005;
      const delta = -e.deltaY * zoomSensitivity;
      setCamera((prev) => {
        let newZoom = prev.zoom + delta;
        newZoom = Math.max(0.1, Math.min(newZoom, 5));
        return { ...prev, zoom: newZoom };
      });
    } else {
      setCamera((prev) => ({
        ...prev,
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY
      }));
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('wheel', handleWheel, { passive: false });
      return () => canvas.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  const addNodeAtPosition = (type, clientX, clientY) => {
    saveHistory();
    const defaultSizes = { 'text': { w: 200, h: 50 }, 'post-it': { w: 260, h: 120 }, 'rounded-rect': { w: 200, h: 100 }, 'circle': { w: 160, h: 160 }, 'diamond': { w: 180, h: 180 } };
    const size = defaultSizes[type] || { w: 200, h: 100 };
    
    const rect = canvasRef.current.getBoundingClientRect();
    const xInsideCanvas = clientX - rect.left;
    const yInsideCanvas = clientY - rect.top;

    const worldX = (xInsideCanvas - camera.x) / camera.zoom - size.w / 2;
    const worldY = (yInsideCanvas - camera.y) / camera.zoom - size.h / 2;

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

  const renderDraftConnection = () => {
    if (!draftConnection) return null;
    const fromNode = nodes.find(n => n.id === draftConnection.fromId);
    if (!fromNode) return null;

    const fromPos = getAnchorPosition(fromNode, draftConnection.fromAnchor);
    
    const rect = canvasRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
    const toX = (draftConnection.mouseX - rect.left - camera.x) / camera.zoom;
    const toY = (draftConnection.mouseY - rect.top - camera.y) / camera.zoom;

    // Conexão solta (puxando) é uma corda com gravidade
    const { path, angle } = getRopePath(fromPos.x, fromPos.y, toX, toY);

    return (
      <g>
        <path d={path} className="wb-connection-path draft" />
        <polygon points="0,-8 16,0 0,8" transform={`translate(${toX}, ${toY}) rotate(${angle})`} fill="#60a5fa" className="wb-connection-arrowhead draft" />
      </g>
    );
  };

  return (
    <div 
      className={`whiteboard-container ${isSpaceDown ? 'whiteboard-container--space' : ''}`}
      onPointerMove={handleContainerPointerMove}
      onPointerUp={handleContainerPointerUp}
    >
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
        <button onPointerDown={(e) => { e.preventDefault(); e.target.setPointerCapture(e.pointerId); setDraggedShape({ type: 'text', mouseX: e.clientX, mouseY: e.clientY }); }} title="Texto Solto"><Type size={20} /></button>
        <button onPointerDown={(e) => { e.preventDefault(); e.target.setPointerCapture(e.pointerId); setDraggedShape({ type: 'post-it', mouseX: e.clientX, mouseY: e.clientY }); }} title="Nota (Post-it)"><StickyNote size={20} /></button>
        <div className="wb-palette-divider" />
        <button onPointerDown={(e) => { e.preventDefault(); e.target.setPointerCapture(e.pointerId); setDraggedShape({ type: 'rounded-rect', mouseX: e.clientX, mouseY: e.clientY }); }} title="Retângulo"><Square size={20} /></button>
        <button onPointerDown={(e) => { e.preventDefault(); e.target.setPointerCapture(e.pointerId); setDraggedShape({ type: 'circle', mouseX: e.clientX, mouseY: e.clientY }); }} title="Círculo"><Circle size={20} /></button>
        <button onPointerDown={(e) => { e.preventDefault(); e.target.setPointerCapture(e.pointerId); setDraggedShape({ type: 'diamond', mouseX: e.clientX, mouseY: e.clientY }); }} title="Losango (Decisão)"><Diamond size={20} /></button>
      </div>

      <div 
        className={`whiteboard-canvas ${interactionMode === 'panning' ? 'whiteboard-canvas--panning' : ''}`}
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onContextMenu={(e) => e.preventDefault()}
        tabIndex={0} 
        style={{ '--pan-x': camera.x, '--pan-y': camera.y, '--zoom': camera.zoom }}
      >
        <div 
          className="whiteboard-layer"
          style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`, transformOrigin: '0 0' }}
        >
          <svg className="wb-connections-svg" style={{ overflow: 'visible', position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}>
            {connections.map(conn => <Connection key={conn.id} conn={conn} nodes={nodes} />)}
            {renderDraftConnection()}
          </svg>

          {nodes.map(node => (
            <DraggableNode 
              key={node.id} node={node} 
              updateNode={updateNode} 
              updateMultipleNodes={updateMultipleNodes}
              selectedNodeIds={selectedNodeIds}
              isCameraMoving={interactionMode === 'panning' || !!draggedShape} 
              isDrafting={draftConnection?.fromId === node.id}
              cameraZoom={camera.zoom}
              onEditorFocus={handleEditorFocus}
              isActiveNode={selectedNodeIds.includes(node.id)} 
              saveHistory={() => saveHistory(nodes, connections)}
              onConnectionStart={handleConnectionStart}
            />
          ))}

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
